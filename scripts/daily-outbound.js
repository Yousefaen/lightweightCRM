#!/usr/bin/env node
/**
 * scripts/daily-outbound.js
 *
 * Autonomous lead-sourcing pipeline for the outreach CRM.
 *
 * Runs once per day (via scheduled task). For each cycle:
 *   1. Picks the least-recently-checked seed domains (rotation)
 *   2. Calls Hunter.io domain-search to find people at each domain
 *   3. Filters by target persona title keywords + email confidence
 *   4. Dedupes against existing contacts by email
 *   5. For each new qualified lead, drafts a cold outreach message in the
 *      user's voice using the writingSamples stored in data.json as style context
 *   6. Writes new contacts and draft outreach entries back to data.json
 *   7. Appends a run log entry with stats for the cycle
 *
 * Shares data.json with mcp-server.js — any contact or draft written by this
 * script is immediately queryable via the MCP tools (list_contacts, etc.).
 *
 * Usage:
 *   node scripts/daily-outbound.js              # real run
 *   node scripts/daily-outbound.js --dry-run    # no API calls, no writes
 *   node scripts/daily-outbound.js --verbose    # extra logging
 *
 * Environment (from .env at repo root):
 *   HUNTER_API_KEY     — Hunter.io API key
 *   ANTHROPIC_API_KEY  — Anthropic API key
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============ PATHS ============
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data.json');
const ENV_PATH = path.join(ROOT, '.env');

// ============ CLI FLAGS ============
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || args.includes('-v');

// ============ LOGGING ============
function log(...a) { console.log('[outbound]', ...a); }
function logv(...a) { if (VERBOSE) console.log('[outbound:v]', ...a); }
function logErr(...a) { console.error('[outbound:err]', ...a); }

// ============ .ENV LOADER (no dotenv dep) ============
function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at ${envPath}`);
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ============ DATA.JSON I/O ============
function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return (
    Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36)
  );
}

// ============ HUNTER CLIENT ============
async function hunterDomainSearch(domain, apiKey) {
  const url =
    `https://api.hunter.io/v2/domain-search` +
    `?domain=${encodeURIComponent(domain)}` +
    `&api_key=${encodeURIComponent(apiKey)}` +
    `&limit=25`;
  logv(`Hunter → ${domain}`);
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Hunter ${res.status} for ${domain}: ${body.slice(0, 200)}`
    );
  }
  const payload = await res.json();
  const orgName =
    payload.data?.organization || domain.split('.')[0];
  return (payload.data?.emails || []).map((e) => ({
    email: e.value,
    firstName: e.first_name || '',
    lastName: e.last_name || '',
    position: e.position || '',
    confidence: e.confidence || 0,
    linkedin: e.linkedin || '',
    domain,
    company: orgName,
  }));
}

// ============ PERSONA FILTER ============
function matchesPersona(title, personas) {
  if (!title) return false;
  const t = title.toLowerCase();
  return personas.some((p) => t.includes(p.toLowerCase()));
}

// ============ DEDUPE ============
function isAlreadyInCrm(lead, contacts) {
  if (!lead.email) return true; // no-email leads can't be contacted; skip
  const key = lead.email.toLowerCase();
  return contacts.some(
    (c) => c.email && c.email.toLowerCase() === key
  );
}

// ============ CLAUDE DRAFTER ============
const DRAFTER_SYSTEM_PROMPT = [
  "You are a writing assistant drafting cold outreach in the voice of Yousef Abouelnour,",
  "a 2nd year MBA at Harvard Business School exploring simulation AI, synthetic research,",
  "and enterprise AI founding opportunities. Study the writing samples carefully — match",
  "the tone, structure, greeting style, sign-off, sentence length, and level of formality",
  "exactly.",
  "",
  "Voice rules (strict):",
  "- Opens with 'Hey [Name]' — never 'Hi' or 'Dear'.",
  "- Conversational but not sloppy.",
  "- Explains Yousef's interest/thesis before the ask.",
  "- Bounded ask (15-20 minutes).",
  "- Signs off with just 'Thanks' — no 'Best regards', no 'Looking forward'.",
  "- No emojis. No 'I'd love to pick your brain'. No 'hope this finds you well'.",
  "- No fabricated specifics about the recipient's papers, products, or events.",
  "- Keep LinkedIn InMails under 180 words.",
  "",
  "Output format — respond ONLY with this structure:",
  "<subject>subject line (leave empty if not applicable)</subject>",
  "<body>message body</body>",
].join('\n');

async function draftEmail({ lead, writingSamples, apiKey }) {
  const samplesText = writingSamples
    .map((s, i) => `Sample ${i + 1} (${s.label}):\n${s.content}`)
    .join('\n\n');

  const userMessage = [
    `Writing samples in my voice:`,
    ``,
    samplesText || '(no samples — use defaults from the voice rules)',
    ``,
    `Draft a LinkedIn InMail to this person:`,
    `Name: ${lead.firstName} ${lead.lastName}`.trim(),
    `Title: ${lead.position || 'unknown'}`,
    `Company: ${lead.company}`,
    `Domain: ${lead.domain}`,
    ``,
    `Angle: I'm a 2Y MBA at HBS currently researching the synthetic research and`,
    `agent-based simulation space (Simile, Aaru, Artificial Societies, Listen Labs, etc.).`,
    `I want to learn how ${lead.company} is thinking about where this category is`,
    `heading and where they see the limits of the agentic approach.`,
    ``,
    `Constraint: I know very little about this specific person beyond their title`,
    `and company. Do NOT fabricate specific papers, products, launches, or events.`,
    `Keep it grounded in general interest in the category and the company. Reference`,
    `${lead.company} by name but nothing more specific than that.`,
    ``,
    `Ask: 15-20 minutes of their time.`,
    ``,
    `Output only the <subject></subject> and <body></body> tags.`,
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: DRAFTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  }

  const payload = await res.json();
  const text = payload.content?.[0]?.text || '';
  const subjectMatch = text.match(/<subject>([\s\S]*?)<\/subject>/i);
  const bodyMatch = text.match(/<body>([\s\S]*?)<\/body>/i);
  return {
    subject: (subjectMatch?.[1] || '').trim(),
    body: (bodyMatch?.[1] || text).trim(),
  };
}

// ============ DOMAIN ROTATION ============
function pickDomainsForRun(seedDomains, maxDomainsPerRun) {
  // Null lastCheckedAt first, then ascending by timestamp.
  const sorted = [...seedDomains].sort((a, b) => {
    if (!a.lastCheckedAt && !b.lastCheckedAt) return 0;
    if (!a.lastCheckedAt) return -1;
    if (!b.lastCheckedAt) return 1;
    return a.lastCheckedAt.localeCompare(b.lastCheckedAt);
  });
  return sorted.slice(0, maxDomainsPerRun);
}

// ============ DRY-RUN MOCK DATA ============
function mockHunterResults(dom) {
  return [
    {
      email: `jane.doe@${dom.domain}`,
      firstName: 'Jane',
      lastName: 'Doe',
      position: 'Chief of Staff',
      confidence: 85,
      linkedin: '',
      domain: dom.domain,
      company: dom.label,
    },
    {
      email: `john.smith@${dom.domain}`,
      firstName: 'John',
      lastName: 'Smith',
      position: 'Head of Growth',
      confidence: 72,
      linkedin: '',
      domain: dom.domain,
      company: dom.label,
    },
    {
      email: `carlos.rivera@${dom.domain}`,
      firstName: 'Carlos',
      lastName: 'Rivera',
      position: 'Senior Software Engineer',
      confidence: 90,
      linkedin: '',
      domain: dom.domain,
      company: dom.label,
    },
  ];
}

// ============ MAIN RUN ============
async function run() {
  const startedAt = new Date().toISOString();
  log(`run started at ${startedAt} ${DRY_RUN ? '(DRY RUN)' : ''}`);

  const env = loadEnv(ENV_PATH);
  const HUNTER_KEY = env.HUNTER_API_KEY;
  const ANTHROPIC_KEY = env.ANTHROPIC_API_KEY;
  if (!DRY_RUN && (!HUNTER_KEY || !ANTHROPIC_KEY)) {
    throw new Error(
      'Missing HUNTER_API_KEY or ANTHROPIC_API_KEY in .env'
    );
  }

  const data = readData();
  const automation = data.automation || {};
  const {
    seedDomains = [],
    targetPersonas = [],
    guardrails = {},
  } = automation;
  const {
    maxLeadsPerRun = 10,
    maxDomainsPerRun = 2,
    minEmailConfidence = 50,
    excludedDomains = [],
  } = guardrails;

  if (seedDomains.length === 0) {
    throw new Error(
      'No seed domains configured in data.automation.seedDomains'
    );
  }

  const candidateDomains = seedDomains.filter(
    (d) => !excludedDomains.includes(d.domain)
  );
  const pickedDomains = pickDomainsForRun(
    candidateDomains,
    maxDomainsPerRun
  );
  log(
    `picked domains for run: ${pickedDomains
      .map((d) => d.domain)
      .join(', ')}`
  );

  const runStats = {
    startedAt,
    dryRun: DRY_RUN,
    domainsProcessed: 0,
    hunterCallsMade: 0,
    leadsFound: 0,
    leadsQualified: 0,
    leadsDeduplicated: 0,
    draftsGenerated: 0,
    errors: [],
  };

  const newContacts = [];
  const newOutreach = [];

  for (const dom of pickedDomains) {
    try {
      let hunterResults;
      if (DRY_RUN) {
        hunterResults = mockHunterResults(dom);
      } else {
        hunterResults = await hunterDomainSearch(dom.domain, HUNTER_KEY);
        runStats.hunterCallsMade++;
      }

      runStats.domainsProcessed++;
      runStats.leadsFound += hunterResults.length;
      logv(`${dom.domain}: ${hunterResults.length} raw leads`);

      // filter: persona + confidence
      const qualified = hunterResults.filter((lead) => {
        if (!lead.position) return false;
        if (lead.confidence < minEmailConfidence) return false;
        return matchesPersona(lead.position, targetPersonas);
      });
      logv(
        `${dom.domain}: ${qualified.length} qualified (persona+confidence)`
      );

      // dedupe against CRM
      const fresh = qualified.filter(
        (lead) => !isAlreadyInCrm(lead, data.contacts)
      );
      runStats.leadsDeduplicated += qualified.length - fresh.length;
      runStats.leadsQualified += fresh.length;
      logv(`${dom.domain}: ${fresh.length} fresh after dedupe`);

      // global cap on new leads across all domains in this run
      const remaining = maxLeadsPerRun - newContacts.length;
      const toProcess = fresh.slice(0, Math.max(0, remaining));
      if (fresh.length > toProcess.length) {
        logv(
          `${dom.domain}: capped ${fresh.length - toProcess.length} leads (maxLeadsPerRun)`
        );
      }

      for (const lead of toProcess) {
        try {
          let draft;
          if (DRY_RUN) {
            draft = {
              subject: `HBS Student Research: ${lead.company}`,
              body: `Hey ${lead.firstName}. [dry-run placeholder for ${lead.firstName} ${lead.lastName} at ${lead.company}]\n\nThanks`,
            };
          } else {
            draft = await draftEmail({
              lead,
              writingSamples: data.writingSamples || [],
              apiKey: ANTHROPIC_KEY,
            });
          }

          const today = new Date().toISOString().split('T')[0];
          const contactId = cryptoRandomId();
          const contact = {
            id: contactId,
            name: `${lead.firstName} ${lead.lastName}`.trim(),
            title: lead.position,
            company: lead.company,
            email: lead.email,
            linkedinUrl: lead.linkedin || '',
            tags: [
              'auto-sourced',
              dom.lane || 'unknown-lane',
              dom.label.toLowerCase().replace(/\s+/g, '-'),
            ],
            notes:
              `Auto-sourced via Hunter on ${today} from ${dom.domain}. ` +
              `Hunter confidence: ${lead.confidence}. Review draft before sending.`,
            status: 'active',
            followUpDate: null,
            createdAt: today,
            updatedAt: today,
          };
          newContacts.push(contact);

          const outreachEntry = {
            id: cryptoRandomId(),
            contactId,
            date: today,
            channel: 'LinkedIn InMail',
            subject: draft.subject,
            messageContent: draft.body,
            status: 'draft',
            createdAt: today,
          };
          newOutreach.push(outreachEntry);

          runStats.draftsGenerated++;
          log(`  drafted → ${contact.name} (${contact.company})`);
        } catch (err) {
          logErr(`draft failed for ${lead.email}: ${err.message}`);
          runStats.errors.push({
            stage: 'draft',
            domain: dom.domain,
            email: lead.email,
            error: err.message,
          });
        }
      }

      // update lastCheckedAt on real runs so rotation works next time
      if (!DRY_RUN) {
        const domRef = data.automation.seedDomains.find(
          (d) => d.domain === dom.domain
        );
        if (domRef) domRef.lastCheckedAt = startedAt;
      }
    } catch (err) {
      logErr(`domain ${dom.domain} failed: ${err.message}`);
      runStats.errors.push({
        stage: 'hunter',
        domain: dom.domain,
        error: err.message,
      });
    }
  }

  runStats.finishedAt = new Date().toISOString();

  // persist
  if (!DRY_RUN) {
    data.contacts.push(...newContacts);
    data.outreach.push(...newOutreach);
    data.automation.runLog.push(runStats);
    if (data.automation.runLog.length > 30) {
      data.automation.runLog = data.automation.runLog.slice(-30);
    }
    writeData(data);
    log(
      `wrote ${newContacts.length} new contacts and ${newOutreach.length} draft outreach entries to data.json`
    );
  } else {
    log(
      `DRY RUN — would have written ${newContacts.length} new contacts and ${newOutreach.length} drafts. No file changes.`
    );
  }

  // summary
  log('--- summary ---');
  log(`domains processed: ${runStats.domainsProcessed}`);
  log(`hunter calls: ${runStats.hunterCallsMade}`);
  log(`raw leads: ${runStats.leadsFound}`);
  log(`deduped (already in CRM): ${runStats.leadsDeduplicated}`);
  log(`new qualified leads: ${runStats.leadsQualified}`);
  log(`drafts generated: ${runStats.draftsGenerated}`);
  if (runStats.errors.length > 0) {
    log(`errors: ${runStats.errors.length}`);
    for (const e of runStats.errors) {
      log(`  ${e.stage} (${e.domain}): ${e.error}`);
    }
  }
  log('--- done ---');
}

run().catch((err) => {
  logErr('FATAL:', err.message);
  logErr(err.stack);
  process.exit(1);
});
