import { generateDraft, callAnthropicProxy } from './anthropic.js';
import { supabase } from './supabase.js';

const MODELS = {
  primary: 'claude-opus-4-20250514',
  fallback: 'claude-sonnet-4-20250514',
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry({ system, userMessage, tools, signal, preferOpus = true }) {
  const model = preferOpus ? MODELS.primary : MODELS.fallback;
  const body = {
    model,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: userMessage }],
  };
  if (tools?.length > 0) body.tools = tools;

  try {
    return await callAnthropicProxy(body);
  } catch (err) {
    if (err.message?.includes('overloaded') || err.message?.includes('529')) {
      await wait(3000);
      try {
        return await callAnthropicProxy(body);
      } catch {
        if (preferOpus) {
          return await callAnthropicProxy({ ...body, model: MODELS.fallback });
        }
        throw new Error('API overloaded — please try again later');
      }
    }
    throw err;
  }
}

function extractTextFromContent(content) {
  if (typeof content === 'string') return content;
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function parseJsonFromResponse(text) {
  const tagMatch = text.match(/<json>([\s\S]*?)<\/json>/);
  if (tagMatch) return JSON.parse(tagMatch[1].trim());
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) return JSON.parse(arrayMatch[0]);
  throw new Error('Could not parse JSON from response');
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return { 'Authorization': `Bearer ${session.access_token}` };
}

async function researchLeads({ query, leadCount, existingContacts, signal }) {
  const existingNames = existingContacts.map((c) => c.name.toLowerCase());

  const system = `You are a lead research assistant. Your job is to find real people matching the user's query using web search. Return structured JSON with the leads you find.

IMPORTANT: Return your results as a JSON array inside <json> tags. Each lead should have:
- name: full name
- title: their job title
- company: their company
- whyRelevant: 1-2 sentences on why they match the query
- talkingPoints: array of 2-3 specific things to reference (publications, talks, projects)

Only return real people you find via search. Do not fabricate leads.`;

  const userMessage = `Find ${leadCount} people matching this query: "${query}"

Existing contacts to skip (already in CRM): ${existingNames.length > 0 ? existingNames.join(', ') : 'none'}

Search the web, find real people, and return structured JSON in <json> tags.`;

  const data = await callWithRetry({
    system,
    userMessage,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
    signal,
    preferOpus: true,
  });

  const text = extractTextFromContent(data.content);
  const leads = parseJsonFromResponse(text);
  return leads.filter((lead) => !existingNames.includes(lead.name.toLowerCase()));
}

async function enrichLead({ lead, signal }) {
  const system = `You are a lead enrichment assistant. Given a person's name, title, and company, find their LinkedIn URL, email (if publicly available), and recent work/publications using web search. Return structured JSON in <json> tags:
{
  "linkedinUrl": "url or null",
  "email": "email or null",
  "recentWork": ["description of recent work/publication 1", "..."],
  "enrichmentNotes": "any additional useful context"
}`;

  const userMessage = `Enrich this lead:
Name: ${lead.name}
Title: ${lead.title}
Company: ${lead.company}
Why relevant: ${lead.whyRelevant}

Search for their LinkedIn profile, email, and recent work.`;

  const data = await callWithRetry({
    system,
    userMessage,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    signal,
    preferOpus: false,
  });

  const text = extractTextFromContent(data.content);
  let enrichment;
  try {
    enrichment = parseJsonFromResponse(text);
  } catch {
    enrichment = { linkedinUrl: null, email: null, recentWork: [], enrichmentNotes: text.slice(0, 500) };
  }

  // Try Hunter.io for verified email if no email found
  if (!enrichment.email) {
    try {
      const names = lead.name.split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ');
      const domain = lead.company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      const headers = await getAuthHeaders();
      const hunterUrl = `/api/hunter?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`;
      const hunterRes = await fetch(hunterUrl, { headers, signal });
      if (hunterRes.ok) {
        const hunterData = await hunterRes.json();
        if (hunterData.data?.email) {
          enrichment.email = hunterData.data.email;
        }
      }
    } catch {
      // Hunter.io failure is non-fatal
    }
  }

  return enrichment;
}

async function draftForLead({ lead, enrichment, channel, writingSamples }) {
  const contact = {
    name: lead.name,
    title: lead.title,
    company: lead.company,
    notes: [
      lead.whyRelevant,
      ...(lead.talkingPoints || []).map((tp) => `- ${tp}`),
      ...(enrichment.recentWork || []).map((rw) => `- Recent: ${rw}`),
      enrichment.enrichmentNotes || '',
    ].filter(Boolean).join('\n'),
  };

  const angle = `Cold outreach based on research. ${lead.whyRelevant}. Key talking points: ${(lead.talkingPoints || []).join('; ')}`;

  return generateDraft({
    samples: writingSamples,
    contact,
    channel,
    angle,
  });
}

async function runWithConcurrency(tasks, concurrency) {
  const results = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function* runProspectingChain({
  query,
  leadCount,
  channels,
  writingSamples,
  existingContacts,
  signal,
}) {
  yield { stage: 'researching', message: `Searching for ${leadCount} leads: "${query}"...` };

  let leads;
  try {
    leads = await researchLeads({ query, leadCount, existingContacts, signal });
  } catch (err) {
    yield { stage: 'done', message: `Research failed: ${err.message}`, data: { leads: [] } };
    return;
  }

  yield { stage: 'research-complete', message: `Found ${leads.length} leads`, data: { leads } };

  if (leads.length === 0) {
    yield { stage: 'done', message: 'No new leads found matching your query.', data: { leads: [] } };
    return;
  }

  yield { stage: 'enriching', message: `Enriching ${leads.length} leads...` };

  const enrichmentTasks = leads.map((lead, i) => async () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const enrichment = await enrichLead({ lead, signal });
      leads[i] = { ...lead, enrichment };
      return { success: true };
    } catch (err) {
      leads[i] = { ...lead, enrichment: { linkedinUrl: null, email: null, recentWork: [], enrichmentNotes: '' }, enrichmentError: err.message };
      return { success: false, error: err.message };
    }
  });

  await runWithConcurrency(enrichmentTasks, 2);

  yield {
    stage: 'enrichment-complete',
    message: `Enrichment complete for ${leads.length} leads`,
    data: { leads },
  };

  yield { stage: 'drafting', message: `Drafting messages for ${leads.length} leads across ${channels.length} channel(s)...` };

  for (let i = 0; i < leads.length; i++) {
    if (signal?.aborted) break;

    const lead = leads[i];
    const enrichment = lead.enrichment || {};
    lead.drafts = {};

    const draftPromises = channels.map(async (channel) => {
      if (signal?.aborted) return;
      try {
        const draft = await draftForLead({ lead, enrichment, channel, writingSamples, signal });
        lead.drafts[channel] = draft;
      } catch (err) {
        lead.drafts[channel] = `[Draft failed: ${err.message}]`;
      }
    });

    await Promise.all(draftPromises);

    yield {
      stage: 'drafting',
      message: `Drafted messages for ${i + 1}/${leads.length}: ${lead.name}`,
      data: { leads },
    };
  }

  yield { stage: 'draft-complete', message: 'All drafts generated', data: { leads } };
  yield { stage: 'done', message: 'Prospecting complete!', data: { leads } };
}
