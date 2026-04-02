/**
 * One-time migration: seed existing data.json into Supabase.
 *
 * Usage (PowerShell):
 *   $env:MIGRATION_USER_ID="<your-supabase-user-uuid>"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
 *   node scripts/migrate.js
 *
 * MIGRATION_USER_ID: UUID of the Supabase auth user who should own the data.
 *   Find it at: Supabase Dashboard > Authentication > Users.
 *
 * SUPABASE_SERVICE_ROLE_KEY: bypasses RLS for admin operations.
 *   Find it at: Supabase Dashboard > Settings > API > service_role (secret).
 *
 * VITE_SUPABASE_URL is read from .env automatically.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env file manually (no dotenv dependency)
const envPath = resolve(__dirname, '..', '.env');
const envLines = readFileSync(envPath, 'utf-8').split('\n');
const envVars = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
  }
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.MIGRATION_USER_ID;

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL not found in .env');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var (bypasses RLS for migration).');
  console.error('Find it at: Supabase Dashboard > Settings > API > service_role (secret)');
  console.error('');
  console.error('PowerShell:  $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
  process.exit(1);
}

if (!userId) {
  console.error('Set MIGRATION_USER_ID env var to your Supabase auth user UUID.');
  console.error('Find it at: Supabase Dashboard > Authentication > Users');
  console.error('');
  console.error('PowerShell:  $env:MIGRATION_USER_ID="your-uuid-here"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const dataPath = resolve(__dirname, '..', 'data.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));

const contacts = raw.contacts || [];
const outreach = raw.outreach || [];
const writingSamples = raw.writingSamples || [];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(s) {
  return UUID_RE.test(s);
}

async function migrate() {
  // Build a mapping from old non-UUID ids to new UUIDs
  const idMap = {};
  for (const c of contacts) {
    if (!isValidUuid(c.id)) {
      idMap[c.id] = randomUUID();
    }
  }
  for (const o of outreach) {
    if (!isValidUuid(o.id)) {
      idMap[o.id] = randomUUID();
    }
  }
  for (const s of writingSamples) {
    if (!isValidUuid(s.id)) {
      idMap[s.id] = randomUUID();
    }
  }

  const remapped = Object.keys(idMap).length;
  if (remapped > 0) {
    console.log(`Remapping ${remapped} non-UUID IDs to proper UUIDs...`);
  }

  const mapId = (id) => idMap[id] || id;

  console.log(`Migrating ${contacts.length} contacts, ${outreach.length} outreach entries, ${writingSamples.length} writing samples...`);

  // Migrate contacts
  if (contacts.length > 0) {
    const rows = contacts.map((c) => ({
      id: mapId(c.id),
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

  // Migrate outreach (remap both entry ID and contact_id)
  if (outreach.length > 0) {
    const rows = outreach.map((o) => ({
      id: mapId(o.id),
      contact_id: mapId(o.contactId),
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
      id: mapId(s.id),
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
