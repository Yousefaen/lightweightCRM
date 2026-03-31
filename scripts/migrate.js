/**
 * One-time migration: seed existing data.json into Supabase.
 *
 * Usage:
 *   VITE_SUPABASE_URL=https://xxx.supabase.co \
 *   VITE_SUPABASE_ANON_KEY=eyJ... \
 *   MIGRATION_USER_ID=<your-supabase-user-uuid> \
 *   node scripts/migrate.js
 *
 * The MIGRATION_USER_ID is the UUID of the Supabase auth user
 * who should own the migrated data (e.g. Yousef's user ID).
 * You can find it in Supabase Dashboard > Authentication > Users.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const userId = process.env.MIGRATION_USER_ID;

if (!supabaseUrl || !supabaseKey) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

if (!userId) {
  console.error('Set MIGRATION_USER_ID to the Supabase auth user UUID who should own migrated data');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dataPath = resolve(__dirname, '..', 'data.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));

const contacts = raw.contacts || [];
const outreach = raw.outreach || [];
const writingSamples = raw.writingSamples || [];

async function migrate() {
  console.log(`Migrating ${contacts.length} contacts, ${outreach.length} outreach entries, ${writingSamples.length} writing samples...`);

  // Migrate contacts
  if (contacts.length > 0) {
    const rows = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title || null,
      company: c.company,
      email: c.email || null,
      linkedin_url: c.linkedinUrl || null,
      tags: c.tags || [],
      notes: c.notes || null,
      status: c.status || 'active',
      industry: c.industry || null,
      seniority: c.seniority || null,
      follow_up_date: c.followUpDate || null,
      created_by: userId,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabase.from('contacts').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Contacts migration failed:', error);
    } else {
      console.log(`  Contacts: ${rows.length} inserted`);
    }
  }

  // Migrate outreach
  if (outreach.length > 0) {
    const rows = outreach.map((o) => ({
      id: o.id,
      contact_id: o.contactId,
      date: o.date,
      channel: o.channel,
      subject: o.subject || null,
      message_content: o.messageContent || null,
      status: o.status || 'sent',
      created_by: userId,
      created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabase.from('outreach').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Outreach migration failed:', error);
    } else {
      console.log(`  Outreach: ${rows.length} inserted`);
    }
  }

  // Migrate writing samples
  if (writingSamples.length > 0) {
    const rows = writingSamples.map((s) => ({
      id: s.id,
      label: s.label,
      content: s.content,
      created_by: userId,
      created_at: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabase.from('writing_samples').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Writing samples migration failed:', error);
    } else {
      console.log(`  Writing samples: ${rows.length} inserted`);
    }
  }

  console.log('Migration complete!');
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
