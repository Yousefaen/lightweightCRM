import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data.json');

function readData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const server = new McpServer({
  name: 'outreach-crm',
  version: '1.0.0',
});

// --- list_contacts ---
server.tool(
  'list_contacts',
  'List all contacts. Optionally filter by status, tag, or search term (searches name/company/tags).',
  {
    status: z.enum(['active', 'archived']).optional().describe('Filter by status'),
    tag: z.string().optional().describe('Filter by tag (exact match)'),
    search: z.string().optional().describe('Search name, company, or tags'),
  },
  async ({ status, tag, search }) => {
    const data = readData();
    let contacts = data.contacts || [];
    if (status) contacts = contacts.filter((c) => c.status === status);
    if (tag) contacts = contacts.filter((c) => c.tags?.some((t) => t.toLowerCase() === tag.toLowerCase()));
    if (search) {
      const q = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return {
      content: [
        {
          type: 'text',
          text: contacts.length
            ? JSON.stringify(contacts, null, 2)
            : 'No contacts found matching the given filters.',
        },
      ],
    };
  }
);

// --- get_contact ---
server.tool(
  'get_contact',
  'Get a single contact by name (case-insensitive partial match) or by ID. Returns the contact and their outreach history.',
  {
    name: z.string().optional().describe('Contact name to search for (partial match)'),
    id: z.string().optional().describe('Exact contact ID'),
  },
  async ({ name, id }) => {
    const data = readData();
    let contact;
    if (id) {
      contact = data.contacts.find((c) => c.id === id);
    } else if (name) {
      const q = name.toLowerCase();
      contact = data.contacts.find((c) => c.name.toLowerCase().includes(q));
    }
    if (!contact) {
      return { content: [{ type: 'text', text: 'Contact not found.' }] };
    }
    const outreach = (data.outreach || []).filter((o) => o.contactId === contact.id);
    return {
      content: [{ type: 'text', text: JSON.stringify({ contact, outreach }, null, 2) }],
    };
  }
);

// --- add_contact ---
server.tool(
  'add_contact',
  'Add a new contact to the CRM.',
  {
    name: z.string().describe('Full name'),
    title: z.string().optional().describe('Job title'),
    company: z.string().optional().describe('Company name'),
    email: z.string().optional().describe('Email address'),
    linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
    tags: z.array(z.string()).optional().describe('Tags array'),
    notes: z.string().optional().describe('Notes about this contact'),
    followUpDate: z.string().optional().describe('Follow-up date (YYYY-MM-DD)'),
  },
  async (params) => {
    const data = readData();
    const today = new Date().toISOString().split('T')[0];
    const contact = {
      id: crypto.randomUUID(),
      name: params.name,
      title: params.title || '',
      company: params.company || '',
      email: params.email || '',
      linkedinUrl: params.linkedinUrl || '',
      tags: params.tags || [],
      notes: params.notes || '',
      status: 'active',
      followUpDate: params.followUpDate || null,
      createdAt: today,
      updatedAt: today,
    };
    data.contacts.push(contact);
    writeData(data);
    return {
      content: [{ type: 'text', text: `Contact added: ${contact.name} (ID: ${contact.id})` }],
    };
  }
);

// --- update_contact ---
server.tool(
  'update_contact',
  'Update fields on an existing contact. Pass only the fields you want to change.',
  {
    id: z.string().optional().describe('Contact ID'),
    name_search: z.string().optional().describe('Find contact by name (partial match) instead of ID'),
    name: z.string().optional().describe('New name'),
    title: z.string().optional().describe('New title'),
    company: z.string().optional().describe('New company'),
    email: z.string().optional().describe('New email'),
    linkedinUrl: z.string().optional().describe('New LinkedIn URL'),
    tags: z.array(z.string()).optional().describe('New tags (replaces existing)'),
    notes: z.string().optional().describe('New notes'),
    status: z.enum(['active', 'archived']).optional().describe('New status'),
    followUpDate: z.string().nullable().optional().describe('New follow-up date (YYYY-MM-DD) or null to clear'),
  },
  async (params) => {
    const data = readData();
    let contact;
    if (params.id) {
      contact = data.contacts.find((c) => c.id === params.id);
    } else if (params.name_search) {
      const q = params.name_search.toLowerCase();
      contact = data.contacts.find((c) => c.name.toLowerCase().includes(q));
    }
    if (!contact) {
      return { content: [{ type: 'text', text: 'Contact not found.' }] };
    }
    const fields = ['name', 'title', 'company', 'email', 'linkedinUrl', 'tags', 'notes', 'status', 'followUpDate'];
    for (const f of fields) {
      if (params[f] !== undefined) contact[f] = params[f];
    }
    contact.updatedAt = new Date().toISOString().split('T')[0];
    writeData(data);
    return {
      content: [{ type: 'text', text: `Updated contact: ${contact.name}\n${JSON.stringify(contact, null, 2)}` }],
    };
  }
);

// --- delete_contact ---
server.tool(
  'delete_contact',
  'Delete a contact and all their outreach entries.',
  {
    id: z.string().optional().describe('Contact ID'),
    name_search: z.string().optional().describe('Find contact by name (partial match) instead of ID'),
  },
  async (params) => {
    const data = readData();
    let contact;
    if (params.id) {
      contact = data.contacts.find((c) => c.id === params.id);
    } else if (params.name_search) {
      const q = params.name_search.toLowerCase();
      contact = data.contacts.find((c) => c.name.toLowerCase().includes(q));
    }
    if (!contact) {
      return { content: [{ type: 'text', text: 'Contact not found.' }] };
    }
    data.contacts = data.contacts.filter((c) => c.id !== contact.id);
    data.outreach = (data.outreach || []).filter((o) => o.contactId !== contact.id);
    writeData(data);
    return {
      content: [{ type: 'text', text: `Deleted contact: ${contact.name} and their outreach entries.` }],
    };
  }
);

// --- list_outreach ---
server.tool(
  'list_outreach',
  'List outreach entries. Optionally filter by contact name or outreach status.',
  {
    contact_name: z.string().optional().describe('Filter by contact name (partial match)'),
    status: z.enum(['sent', 'replied', 'follow-up-needed', 'no-response']).optional().describe('Filter by status'),
  },
  async ({ contact_name, status }) => {
    const data = readData();
    let entries = data.outreach || [];
    if (contact_name) {
      const q = contact_name.toLowerCase();
      const matchingIds = data.contacts
        .filter((c) => c.name.toLowerCase().includes(q))
        .map((c) => c.id);
      entries = entries.filter((o) => matchingIds.includes(o.contactId));
    }
    if (status) entries = entries.filter((o) => o.status === status);
    // Enrich with contact name
    const enriched = entries.map((o) => {
      const contact = data.contacts.find((c) => c.id === o.contactId);
      return { ...o, contactName: contact?.name || 'Unknown' };
    });
    enriched.sort((a, b) => b.date.localeCompare(a.date));
    return {
      content: [
        {
          type: 'text',
          text: enriched.length
            ? JSON.stringify(enriched, null, 2)
            : 'No outreach entries found.',
        },
      ],
    };
  }
);

// --- log_outreach ---
server.tool(
  'log_outreach',
  'Log a new outreach entry for a contact.',
  {
    contact_name: z.string().optional().describe('Contact name (partial match)'),
    contact_id: z.string().optional().describe('Contact ID'),
    channel: z.enum(['LinkedIn InMail', 'LinkedIn Message', 'Email']).describe('Outreach channel'),
    subject: z.string().optional().describe('Subject line (for InMail/Email)'),
    messageContent: z.string().describe('Message content'),
    status: z.enum(['sent', 'replied', 'follow-up-needed', 'no-response']).optional().describe('Status (default: sent)'),
  },
  async (params) => {
    const data = readData();
    let contact;
    if (params.contact_id) {
      contact = data.contacts.find((c) => c.id === params.contact_id);
    } else if (params.contact_name) {
      const q = params.contact_name.toLowerCase();
      contact = data.contacts.find((c) => c.name.toLowerCase().includes(q));
    }
    if (!contact) {
      return { content: [{ type: 'text', text: 'Contact not found.' }] };
    }
    const today = new Date().toISOString().split('T')[0];
    const entry = {
      id: crypto.randomUUID(),
      contactId: contact.id,
      date: today,
      channel: params.channel,
      subject: params.subject || '',
      messageContent: params.messageContent,
      status: params.status || 'sent',
      createdAt: today,
    };
    if (!data.outreach) data.outreach = [];
    data.outreach.push(entry);
    writeData(data);
    return {
      content: [
        {
          type: 'text',
          text: `Outreach logged for ${contact.name} via ${params.channel} (ID: ${entry.id})`,
        },
      ],
    };
  }
);

// --- update_outreach_status ---
server.tool(
  'update_outreach_status',
  'Change the status of an outreach entry.',
  {
    outreach_id: z.string().describe('Outreach entry ID'),
    status: z.enum(['sent', 'replied', 'follow-up-needed', 'no-response']).describe('New status'),
  },
  async ({ outreach_id, status }) => {
    const data = readData();
    const entry = (data.outreach || []).find((o) => o.id === outreach_id);
    if (!entry) {
      return { content: [{ type: 'text', text: 'Outreach entry not found.' }] };
    }
    entry.status = status;
    writeData(data);
    return {
      content: [{ type: 'text', text: `Outreach ${outreach_id} status updated to "${status}".` }],
    };
  }
);

// --- get_follow_ups ---
server.tool(
  'get_follow_ups',
  'Get follow-up reminders: overdue, due today, and upcoming (next 7 days).',
  {},
  async () => {
    const data = readData();
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const withFollowUp = (data.contacts || []).filter((c) => c.followUpDate && c.status === 'active');
    const overdue = withFollowUp.filter((c) => c.followUpDate < today);
    const dueToday = withFollowUp.filter((c) => c.followUpDate === today);
    const upcoming = withFollowUp.filter((c) => c.followUpDate > today && c.followUpDate <= weekFromNow);

    const format = (list) =>
      list.map((c) => ({ name: c.name, company: c.company, followUpDate: c.followUpDate, id: c.id }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              overdue: format(overdue),
              dueToday: format(dueToday),
              upcoming: format(upcoming),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// --- list_writing_samples ---
server.tool(
  'list_writing_samples',
  'List all writing samples stored in the CRM.',
  {},
  async () => {
    const data = readData();
    const samples = data.writingSamples || [];
    return {
      content: [
        {
          type: 'text',
          text: samples.length
            ? JSON.stringify(samples, null, 2)
            : 'No writing samples found.',
        },
      ],
    };
  }
);

// --- Start server ---
const transport = new StdioServerTransport();
await server.connect(transport);
