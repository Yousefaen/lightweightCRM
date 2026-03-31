import { supabase } from './supabase';

const SYSTEM_PROMPT = `You are a writing assistant. Your job is to draft outreach messages in the user's voice. Study the writing samples provided carefully — match the tone, structure, greeting style, sign-off, sentence length, and level of formality exactly. Do not add emojis. Do not be overly formal or sycophantic.

Voice Profile:
- Opens with "Hey [Name]" — never "Hi" or "Dear"
- Conversational but not sloppy
- Name-drops companies and frameworks directly
- Explains interest/thesis before making the ask
- Specific references to the recipient's work (shows research)
- Bounded asks ("20 mins would be great", "happy to work around your schedule")
- Signs off with just "Thanks" — no "Best regards" or "Looking forward"
- Uses "2nd year MBA at HBS" not "second-year MBA student at Harvard Business School"

SDR Best Practices:
- AIDA framework: Attention (hook with their work), Interest (your thesis), Desire (what they gain), Action (bounded ask)
- Personalization > volume: reference specific work, publications, mutual connections
- Channel-specific limits: LinkedIn InMail/Message under 300 words, Email under 400 words
- Follow-up cadence: 5-7 days for LinkedIn, 3-5 days for email
- Multi-channel: if prior outreach on one channel got no response, consider suggesting another
- Each follow-up should add new value or a new angle — never just "bumping this up"
- For follow-ups: acknowledge the prior message briefly, then pivot to new context or urgency`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'content-type': 'application/json',
  };
}

export async function callAnthropicProxy(body) {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/anthropic', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error || 'API request failed');
  }

  return response.json();
}

export async function generateDraft({ samples, contact, channel, angle, priorOutreach = [] }) {
  const samplesText = samples
    .map((s, i) => `--- Sample ${i + 1}: ${s.label} ---\n${s.content}`)
    .join('\n\n');

  const needsSubject = channel === 'LinkedIn InMail' || channel === 'Email';

  let outreachContext = '';
  if (priorOutreach.length > 0) {
    const sorted = [...priorOutreach].sort((a, b) => new Date(b.date) - new Date(a.date));
    const history = sorted.map((o, i) => {
      const content = o.messageContent
        ? o.messageContent.slice(0, 200) + (o.messageContent.length > 200 ? '...' : '')
        : '(no content recorded)';
      return `  ${i + 1}. ${o.date} | ${o.channel} | Status: ${o.status}${o.subject ? ` | Subject: ${o.subject}` : ''}\n     ${content}`;
    }).join('\n');

    outreachContext = `
Prior Outreach History (${priorOutreach.length} messages, most recent first):
${history}

This is a FOLLOW-UP message (touch #${priorOutreach.length + 1}). Reference or acknowledge the prior outreach naturally. Add new value or a new angle — do not just "bump" the thread.`;
  } else {
    outreachContext = `
This is a FIRST-TOUCH cold outreach. There is no prior contact. Focus on a strong hook referencing their specific work, explain your interest, and make a clear bounded ask.`;
  }

  const userMessage = `
Writing Samples:
${samplesText}

Contact Information:
Name: ${contact.name}
Title: ${contact.title}
Company: ${contact.company}
Background/Notes: ${contact.notes}

Channel: ${channel}
Context/Angle: ${angle}
${outreachContext}

Please draft an outreach message matching the style of the samples above, tailored to this specific contact and context.${needsSubject ? '\nAlso generate a subject line prefixed with "HBS Student Research:"' : ''}
`;

  const data = await callAnthropicProxy({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  return data.content[0].text;
}
