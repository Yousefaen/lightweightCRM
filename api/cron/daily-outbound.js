// ============================================================
// /api/cron/daily-outbound.js
// ------------------------------------------------------------
// Vercel Cron handler for the autonomous lead-sourcing pipeline.
//
// Flow per run:
//   1. Verify Authorization: Bearer ${CRON_SECRET}
//   2. Load config from config/automation.json
//   3. Pick N stalest domains from automation_domains (Supabase)
//   4. For each domain:
//        - Call Hunter.io domain-search
//        - Filter by target personas + min confidence
//        - Dedupe against existing contacts.email in Supabase
//   5. For each qualified lead:
//        - Load writing_samples from Supabase
//        - Call Anthropic Messages API to draft in Yousef's voice
//        - Insert contact + outreach row (status='draft') to Supabase
//   6. Update last_checked_at on processed domains
//   7. Write run row to automation_runs with stats + errors
//   8. Return JSON summary
//
// Auth model:
//   - Cron endpoint is called by Vercel's cron scheduler, which
//     sends `Authorization: Bearer ${CRON_SECRET}` automatically
//     when CRON_SECRET is defined as a Vercel env var.
//   - Database writes use SUPABASE_SERVICE_ROLE_KEY which bypasses
//     Row Level Security. Never expose this key to the client bundle.
//
// Required Vercel env vars:
//   - VITE_SUPABASE_URL           (already set)
//   - SUPABASE_SERVICE_ROLE_KEY   (NEW — add in Vercel dashboard)
//   - ANTHROPIC_API_KEY           (already set)
//   - HUNTER_API_KEY              (already set)
//   - CRON_SECRET                 (NEW — any random 32+ char string)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const HUNTER_URL = 'https://api.hunter.io/v2/domain-search';

// ---------- helpers ----------

async function loadConfig(supabase) {
  // Try loading config from Supabase automation_config table first
  try {
    const { data, error } = await supabase
      .from('automation_config')
      .select('key, value');
    if (!error && data && data.length > 0) {
      const config = {};
      for (const row of data) {
        config[row.key] = row.value;
      }
      return config;
    }
  } catch {
    // fall through to filesystem
  }

  // Fallback to static config file
  const here = path.dirname(fileURLToPath(import.meta.url));
  const configPath = path.resolve(here, '../../config/automation.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function createServiceClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function matchesPersona(title, personas) {
  if (!title) return false;
  const lower = title.toLowerCase();
  return personas.some((p) => lower.includes(p.toLowerCase()));
}

// ---------- hunter ----------

async function hunterDomainSearch(domain, apiKey) {
  const url = `${HUNTER_URL}?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=25`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hunter ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  const emails = body?.data?.emails || [];
  const companyName = body?.data?.organization || domain;
  return emails.map((e) => ({
    email: e.value,
    firstName: e.first_name || '',
    lastName: e.last_name || '',
    fullName: [e.first_name, e.last_name].filter(Boolean).join(' ') || e.value,
    position: e.position || '',
    linkedin: e.linkedin || '',
    confidence: typeof e.confidence === 'number' ? e.confidence : 0,
    company: companyName,
  }));
}

// ---------- anthropic ----------

async function draftEmail({ lead, writingSamples, apiKey, modelId, maxTokens }) {
  const samplesBlock = writingSamples
    .map((s, i) => `<sample_${i + 1} label="${s.label}">\n${s.content}\n</sample_${i + 1}>`)
    .join('\n\n');

  const systemPrompt = [
    'You are a writing assistant drafting cold outreach for Yousef Abouelnour, a second-year MBA at Harvard Business School.',
    '',
    'Match his voice exactly by studying the writing samples provided. Key rules:',
    "- Opens with 'Hey [Name]' — never 'Hi', 'Dear', or 'Hello'.",
    '- Signs off with just "Thanks" — never "Best", "Regards", or "Looking forward to hearing from you".',
    '- No emojis. No "pick your brain". No "I hope this finds you well".',
    '- Conversational but direct. Under 180 words for LinkedIn InMail / Message. Under 400 words for Email.',
    '- Self-identifies as "2nd year MBA at HBS" (never "second-year MBA student at Harvard Business School").',
    '- Bounded asks like "15-20 minutes would be great" or "happy to work around your schedule".',
    '',
    'Critical constraint: Do NOT fabricate specific papers, products, launches, funding events, or quotes. If you cannot ground a claim in publicly obvious context (the person\'s title + company), stay general. It is better to be slightly generic than to hallucinate facts.',
    '',
    `Output format — return ONLY two XML tags, nothing else:\n<subject>Subject line prefixed with "HBS Student Research: "</subject>\n<body>Message body</body>`,
  ].join('\n');

  const userPrompt = [
    '<writing_samples>',
    samplesBlock || '(no samples available — infer voice from system prompt)',
    '</writing_samples>',
    '',
    '<recipient>',
    `Name: ${lead.fullName}`,
    `Title: ${lead.position || '(unknown)'}`,
    `Company: ${lead.company}`,
    `Email: ${lead.email}`,
    '</recipient>',
    '',
    '<context>',
    `Channel: LinkedIn InMail`,
    `Yousef is researching the synthetic research / agent-based simulation category and wants 15-20 minutes to learn how ${lead.company} is thinking about the space.`,
    '</context>',
    '',
    'Draft the outreach now.',
  ].join('\n');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text.slice(0, 300)}`);
  }

  const body = await res.json();
  const text = body?.content?.[0]?.text || '';
  const subjectMatch = text.match(/<subject>([\s\S]*?)<\/subject>/);
  const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/);
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : `HBS Student Research: ${lead.company}`,
    body: bodyMatch ? bodyMatch[1].trim() : text.trim(),
  };
}

// ---------- supabase helpers ----------

async function pickDomainsForRun(supabase, maxDomains) {
  // Stalest first. NULLs sort FIRST on ascending order in Postgres,
  // which is what we want — untouched domains get picked before
  // ones we've already checked.
  const { data, error } = await supabase
    .from('automation_domains')
    .select('domain, label, lane, last_checked_at')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(maxDomains);
  if (error) throw error;
  return data || [];
}

async function fetchExistingEmails(supabase) {
  const { data, error } = await supabase
    .from('contacts')
    .select('email')
    .not('email', 'is', null);
  if (error) throw error;
  return new Set((data || []).map((r) => (r.email || '').toLowerCase()).filter(Boolean));
}

async function fetchWritingSamples(supabase) {
  const { data, error } = await supabase
    .from('writing_samples')
    .select('label, content')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}

async function insertContactAndDraft(supabase, { lead, domainInfo, draft }) {
  // Insert contact first, then outreach row referencing it.
  const { data: contactRow, error: contactErr } = await supabase
    .from('contacts')
    .insert({
      name: lead.fullName,
      title: lead.position || '',
      company: lead.company || domainInfo.label,
      email: lead.email,
      linkedin_url: lead.linkedin || '',
      tags: ['auto-sourced', domainInfo.lane, domainInfo.label.toLowerCase().replace(/\s+/g, '-')],
      notes: `Auto-sourced via Hunter on ${new Date().toISOString().slice(0, 10)} from ${domainInfo.domain}. Hunter confidence: ${lead.confidence}. Review draft before sending.`,
      status: 'active',
    })
    .select()
    .single();
  if (contactErr) throw contactErr;

  const { error: outreachErr } = await supabase
    .from('outreach')
    .insert({
      contact_id: contactRow.id,
      channel: 'LinkedIn InMail',
      subject: draft.subject,
      message_content: draft.body,
      status: 'draft',
    });
  if (outreachErr) throw outreachErr;

  return contactRow;
}

async function markDomainsChecked(supabase, domains, timestamp) {
  const updates = domains.map((d) =>
    supabase
      .from('automation_domains')
      .update({ last_checked_at: timestamp })
      .eq('domain', d.domain)
  );
  await Promise.all(updates);
}

async function insertRunLog(supabase, { startedAt, finishedAt, domainsProcessed, stats, errors, triggeredBy }) {
  const { error } = await supabase.from('automation_runs').insert({
    started_at: startedAt,
    finished_at: finishedAt,
    triggered_by: triggeredBy,
    domains_processed: domainsProcessed,
    stats,
    errors,
  });
  if (error) console.error('[cron] failed to write run log:', error);
}

// ---------- main handler ----------

export default async function handler(req, res) {
  // --- auth ---
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const triggeredBy = req.query?.manual === '1' ? 'manual' : 'cron';
  const startedAt = new Date().toISOString();
  const stats = {
    domainsProcessed: 0,
    hunterCallsMade: 0,
    leadsFound: 0,
    leadsQualified: 0,
    leadsDeduplicated: 0,
    draftsGenerated: 0,
  };
  const errors = [];
  const domainsProcessed = [];
  let supabase;

  try {
    supabase = createServiceClient();
    const config = await loadConfig(supabase);

    // --- load state ---
    const [domains, existingEmails, samples] = await Promise.all([
      pickDomainsForRun(supabase, config.guardrails.maxDomainsPerRun),
      fetchExistingEmails(supabase),
      fetchWritingSamples(supabase),
    ]);

    if (domains.length === 0) {
      return res.status(200).json({ ok: true, message: 'No domains configured', stats });
    }

    // --- process each domain ---
    for (const domainInfo of domains) {
      domainsProcessed.push(domainInfo.domain);
      stats.domainsProcessed += 1;

      if (config.guardrails.excludedDomains.includes(domainInfo.domain)) {
        errors.push({ stage: 'domain', domain: domainInfo.domain, error: 'Excluded' });
        continue;
      }

      let rawLeads = [];
      try {
        rawLeads = await hunterDomainSearch(domainInfo.domain, process.env.HUNTER_API_KEY);
        stats.hunterCallsMade += 1;
        stats.leadsFound += rawLeads.length;
      } catch (err) {
        errors.push({ stage: 'hunter', domain: domainInfo.domain, error: String(err.message || err) });
        continue;
      }

      const qualified = rawLeads.filter(
        (l) =>
          l.confidence >= config.guardrails.minEmailConfidence &&
          matchesPersona(l.position, config.targetPersonas)
      );
      stats.leadsQualified += qualified.length;

      const fresh = qualified.filter((l) => !existingEmails.has(l.email.toLowerCase()));
      stats.leadsDeduplicated += qualified.length - fresh.length;

      // cap drafts per run across all domains
      const remainingBudget = config.guardrails.maxLeadsPerRun - stats.draftsGenerated;
      const toDraft = fresh.slice(0, Math.max(0, remainingBudget));

      for (const lead of toDraft) {
        try {
          const draft = await draftEmail({
            lead,
            writingSamples: samples,
            apiKey: process.env.ANTHROPIC_API_KEY,
            modelId: config.modelId,
            maxTokens: config.maxTokens,
          });
          await insertContactAndDraft(supabase, { lead, domainInfo, draft });
          existingEmails.add(lead.email.toLowerCase()); // prevent dupes within same run
          stats.draftsGenerated += 1;
        } catch (err) {
          errors.push({
            stage: 'draft',
            domain: domainInfo.domain,
            email: lead.email,
            error: String(err.message || err),
          });
        }
      }
    }

    // --- mark domains checked ---
    const finishedAt = new Date().toISOString();
    await markDomainsChecked(supabase, domains, finishedAt);
    await insertRunLog(supabase, {
      startedAt,
      finishedAt,
      domainsProcessed,
      stats,
      errors,
      triggeredBy,
    });

    return res.status(200).json({
      ok: true,
      triggeredBy,
      startedAt,
      finishedAt,
      domainsProcessed,
      stats,
      errors,
    });
  } catch (fatal) {
    const finishedAt = new Date().toISOString();
    errors.push({ stage: 'fatal', error: String(fatal.message || fatal) });
    if (supabase) {
      await insertRunLog(supabase, {
        startedAt,
        finishedAt,
        domainsProcessed,
        stats,
        errors,
        triggeredBy,
      }).catch(() => {});
    }
    return res.status(500).json({ ok: false, error: String(fatal.message || fatal), stats, errors });
  }
}
