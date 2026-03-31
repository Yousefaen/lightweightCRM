import { callAnthropicProxy } from './anthropic.js';

const COPILOT_SYSTEM_PROMPT = `You are an autonomous AI copilot for a team outreach CRM. You are a strategic thinking partner — not just a tool. You proactively analyze the CRM, suggest actions, research leads, and draft messages. Think like an elite SDR + chief of staff.

IDENTITY:
- You work for a team of MBA students at HBS researching supply chain and simulation AI for a startup
- You see ALL CRM data: contacts, outreach history, response rates, follow-up dates, writing samples
- You have persistent memory — research findings and strategic notes survive across sessions

SDR BEST PRACTICES:
- Prioritize follow-ups over cold outreach (higher ROI)
- Optimal cadence: 5-7 days for LinkedIn, 3-5 days for email
- Multi-channel: if one channel gets no response after 2 touches, switch channels
- Personalization > volume: reference specific work, publications, mutual connections
- AIDA: Attention (hook with their work), Interest (your thesis), Desire (what they gain), Action (bounded ask)
- Bounded asks ("20 mins", "happy to work around your schedule")
- Each follow-up should add new value — never just "bumping this up"
- Track what angles/channels get replies and double down on what works

VOICE (use when drafting):
- Opens with "Hey [Name]" — never "Hi" or "Dear"
- Conversational but not sloppy
- Name-drops companies and frameworks directly (e.g., "the Similes and Aarus of the world")
- Explains interest/thesis before making the ask
- Specific references to the recipient's work (shows research)
- Bounded asks ("20 mins would be great", "happy to work around your schedule")
- Signs off with just "Thanks" — no "Best regards" or "Looking forward"
- Uses "2nd year MBA at HBS" not "second-year MBA student at Harvard Business School"
- No emojis. No sycophancy.

LEAD RESEARCH PROTOCOL:
When asked to find leads, research people, or scout contacts:
1. Use web search to find relevant people (search for role + company, or topic + expert)
2. For each lead found, provide a structured profile:
   --- LEAD: [Full Name] ---
   Title: [their title]
   Company: [their company]
   LinkedIn: [URL if found]
   Email: [if publicly available, otherwise note "not publicly listed"]
   Why relevant: [1-2 sentences on why they're a good fit]
   Key talking points: [specific work, publications, talks, or projects to reference]
   Suggested channels: [which channels to try, in priority order]
   Draft outreach: [a ready-to-send message for the top channel]
3. After researching, save key findings to memory so you don't have to re-search
4. If a lead looks like they could be added to the CRM, say so explicitly with "[SAVE_CONTACT]" followed by their structured info

MEMORY SYSTEM:
You have a persistent memory that survives across sessions. It contains:
- Research findings about leads, companies, and industries
- Strategic notes (what angles work, what channels perform best)
- User preferences learned over time
When you learn something worth remembering, include a "[MEMORY]" block at the end of your response:
[MEMORY]
key: short_descriptive_key
content: the information to remember
[/MEMORY]
You can include multiple memory blocks. Keep entries concise and actionable.

PROACTIVE BEHAVIORS:
- If you notice overdue follow-ups, mention them unprompted
- If outreach data shows a channel performing poorly, suggest switching
- If a contact has had 3+ touches with no response, suggest archiving or a breakup message
- Track response rates by channel/tag and surface patterns`;

export function buildCrmContext({ contacts, outreach, writingSamples, copilotMemory = {} }) {
  const contactRows = contacts.map((c) => {
    const contactOutreach = outreach.filter((o) => o.contactId === c.id);
    const sorted = [...contactOutreach].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastEntry = sorted[0];
    const lastOutreach = lastEntry ? `${lastEntry.date} (${lastEntry.channel}, ${lastEntry.status})` : 'None';
    const touchCount = contactOutreach.length;
    return `| ${c.name} | ${c.company} | ${c.title} | ${(c.tags || []).join(', ')} | ${c.status} | ${touchCount} | ${lastOutreach} | ${c.followUpDate || '-'} |`;
  });

  const contactsTable = contacts.length > 0
    ? `| Name | Company | Title | Tags | Status | Touches | Last Outreach | Follow-up Date |\n|---|---|---|---|---|---|---|---|\n${contactRows.join('\n')}`
    : '(No contacts)';

  const totalContacts = contacts.length;
  const totalOutreach = outreach.length;
  const replies = outreach.filter((o) => o.status === 'replied').length;
  const responseRate = totalOutreach > 0 ? Math.round((replies / totalOutreach) * 100) : 0;
  const overdue = contacts.filter((c) => c.followUpDate && new Date(c.followUpDate) < new Date());
  const overdueNames = overdue.map((c) => `${c.name} (due ${c.followUpDate})`).join(', ');

  const byChannel = {};
  const repliesByChannel = {};
  outreach.forEach((o) => {
    byChannel[o.channel] = (byChannel[o.channel] || 0) + 1;
    if (o.status === 'replied') repliesByChannel[o.channel] = (repliesByChannel[o.channel] || 0) + 1;
  });
  const channelStats = Object.entries(byChannel).map(([ch, n]) => {
    const r = repliesByChannel[ch] || 0;
    return `${ch}: ${n} sent, ${r} replied (${Math.round((r / n) * 100)}%)`;
  }).join('\n  ');

  const recent = [...outreach]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 15)
    .map((o) => {
      const contact = contacts.find((c) => c.id === o.contactId);
      const name = contact ? contact.name : 'Unknown';
      const content = o.messageContent ? o.messageContent.slice(0, 100) + (o.messageContent.length > 100 ? '...' : '') : '';
      return `- ${o.date} | ${name} | ${o.channel} | ${o.status}${o.subject ? ` | ${o.subject}` : ''}${content ? `\n  ${content}` : ''}`;
    }).join('\n');

  const samplesText = writingSamples.length > 0
    ? writingSamples.map((s) => `--- ${s.label} ---\n${s.content}`).join('\n\n')
    : '(No writing samples)';

  const memoryEntries = Object.entries(copilotMemory);
  const memoryText = memoryEntries.length > 0
    ? memoryEntries.map(([key, val]) => `[${key}]: ${val}`).join('\n')
    : '(No saved memory yet)';

  const today = new Date().toISOString().split('T')[0];

  return `Current date: ${today}

CONTACTS (${totalContacts}):
${contactsTable}

STATS:
- Total contacts: ${totalContacts}
- Total outreach: ${totalOutreach}
- Channel performance:
  ${channelStats || 'none'}
- Overall response rate: ${responseRate}%
- Overdue follow-ups (${overdue.length}): ${overdueNames || 'none'}

RECENT OUTREACH:
${recent || '(None)'}

WRITING SAMPLES:
${samplesText}

COPILOT MEMORY:
${memoryText}`;
}

const MODELS = {
  primary: 'claude-opus-4-20250514',
  fallback: 'claude-sonnet-4-20250514',
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendCopilotMessage({ messages, crmContext, onModelChange }) {
  const systemPrompt = `${COPILOT_SYSTEM_PROMPT}\n\nCRM DATA:\n${crmContext}`;

  const makeBody = (model) => ({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }],
  });

  let data;
  try {
    data = await callAnthropicProxy(makeBody(MODELS.primary));
  } catch (err) {
    if (err.message?.includes('overloaded') || err.message?.includes('529')) {
      await wait(2000);
      try {
        data = await callAnthropicProxy(makeBody(MODELS.primary));
      } catch {
        if (onModelChange) onModelChange(MODELS.fallback);
        data = await callAnthropicProxy(makeBody(MODELS.fallback));
      }
    } else {
      throw err;
    }
  }

  data._model = data.model || MODELS.primary;
  return data;
}

export function parseMemoryBlocks(content) {
  const blocks = Array.isArray(content) ? content : [{ type: 'text', text: content }];
  const memories = {};

  blocks.forEach((block) => {
    if (block.type !== 'text') return;
    const regex = /\[MEMORY\]\s*\nkey:\s*(.+)\ncontent:\s*([\s\S]*?)\n\[\/MEMORY\]/g;
    let match;
    while ((match = regex.exec(block.text)) !== null) {
      memories[match[1].trim()] = match[2].trim();
    }
  });

  return memories;
}

export function parseSaveContactBlocks(content) {
  const blocks = Array.isArray(content) ? content : [{ type: 'text', text: content }];
  const contacts = [];

  blocks.forEach((block) => {
    if (block.type !== 'text') return;
    const parts = block.text.split('[SAVE_CONTACT]');
    for (let i = 1; i < parts.length; i++) {
      const section = parts[i].split(/\n\n/)[0] + '\n';
      const name = section.match(/(?:^|\n)\s*(?:Name:\s*|--- LEAD:\s*)(.+?)(?:\s*---)?$/m)?.[1]?.trim();
      const title = section.match(/Title:\s*(.+)/)?.[1]?.trim();
      const company = section.match(/Company:\s*(.+)/)?.[1]?.trim();
      const email = section.match(/Email:\s*(.+)/)?.[1]?.trim();
      const linkedin = section.match(/LinkedIn:\s*(.+)/)?.[1]?.trim();

      if (name) {
        contacts.push({
          name,
          title: title || '',
          company: company || '',
          email: email && !email.includes('not publicly') ? email : '',
          linkedinUrl: linkedin && linkedin.startsWith('http') ? linkedin : '',
        });
      }
    }
  });

  return contacts;
}
