import { supabase } from './supabase';

// snake_case DB <-> camelCase JS mappers
const toSnake = (obj) => {
  const map = {
    linkedinUrl: 'linkedin_url',
    followUpDate: 'follow_up_date',
    createdBy: 'created_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    contactId: 'contact_id',
    messageContent: 'message_content',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] || k] = v;
  }
  return out;
};

const toCamel = (obj) => {
  const map = {
    linkedin_url: 'linkedinUrl',
    follow_up_date: 'followUpDate',
    created_by: 'createdBy',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    contact_id: 'contactId',
    message_content: 'messageContent',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[map[k] || k] = v;
  }
  return out;
};

const mapRows = (rows) => rows.map(toCamel);

// ─── Load all data ─────────────────────────────────────────

export async function loadData() {
  const [contactsRes, outreachRes, samplesRes] = await Promise.all([
    supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    supabase.from('outreach').select('*').order('date', { ascending: false }),
    supabase.from('writing_samples').select('*').order('created_at', { ascending: false }),
  ]);

  return {
    contacts: mapRows(contactsRes.data || []),
    outreach: mapRows(outreachRes.data || []),
    writingSamples: mapRows(samplesRes.data || []),
  };
}

// ─── Contacts ──────────────────────────────────────────────

export async function saveContact(contact) {
  const row = toSnake(contact);
  const { data, error } = await supabase
    .from('contacts')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function deleteContact(id) {
  const { error } = await supabase.from('contacts').delete().eq('id', id);
  if (error) throw error;
}

// ─── Outreach ──────────────────────────────────────────────

export async function saveOutreach(entry) {
  const row = toSnake(entry);
  const { data, error } = await supabase
    .from('outreach')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function updateOutreachStatus(entryId, newStatus) {
  const { error } = await supabase
    .from('outreach')
    .update({ status: newStatus })
    .eq('id', entryId);
  if (error) throw error;
}

// ─── Writing Samples ───────────────────────────────────────

export async function saveSample(sample) {
  const row = toSnake(sample);
  const { data, error } = await supabase
    .from('writing_samples')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return toCamel(data);
}

export async function deleteSample(id) {
  const { error } = await supabase.from('writing_samples').delete().eq('id', id);
  if (error) throw error;
}

// ─── Follow-up shortcut ────────────────────────────────────

export async function setFollowUp(contactId, date) {
  const { error } = await supabase
    .from('contacts')
    .update({ follow_up_date: date })
    .eq('id', contactId);
  if (error) throw error;
}

// ─── Profiles ──────────────────────────────────────────────

export async function loadProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data || [];
}

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Automation Domains ───────────────────────────────────

export async function loadAutomationDomains() {
  const { data, error } = await supabase
    .from('automation_domains')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    domain: row.domain,
    label: row.label,
    lane: row.lane,
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
  }));
}

export async function addAutomationDomain({ domain, label, lane }) {
  const { data, error } = await supabase
    .from('automation_domains')
    .insert({ domain, label, lane })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAutomationDomain(domain) {
  const { error } = await supabase
    .from('automation_domains')
    .delete()
    .eq('domain', domain);
  if (error) throw error;
}

// ─── Automation Runs ──────────────────────────────────────

export async function loadAutomationRuns(limit = 20) {
  const { data, error } = await supabase
    .from('automation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    triggeredBy: row.triggered_by,
    domainsProcessed: row.domains_processed,
    stats: row.stats,
    errors: row.errors,
  }));
}

// ─── Automation Config ────────────────────────────────────

export async function loadAutomationConfig() {
  const { data, error } = await supabase
    .from('automation_config')
    .select('key, value');
  if (error) throw error;
  const config = {};
  for (const row of data || []) {
    config[row.key] = row.value;
  }
  return config;
}

export async function updateAutomationConfig(key, value) {
  const { error } = await supabase
    .from('automation_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

// ─── Copilot memory (kept in localStorage — per-device) ────

const COPILOT_MEMORY_KEY = 'outreach-crm-copilot-memory';

export function loadCopilotMemory() {
  try {
    const stored = localStorage.getItem(COPILOT_MEMORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveCopilotMemory(memory) {
  try {
    localStorage.setItem(COPILOT_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.error('Failed to save copilot memory:', e);
  }
}
