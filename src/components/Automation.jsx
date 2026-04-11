import { useState, useEffect } from 'react';
import { Zap, Plus, Trash2, Loader2, CheckCircle2, XCircle, Globe, UserSearch, ShieldCheck, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  loadAutomationDomains,
  addAutomationDomain,
  deleteAutomationDomain,
  loadAutomationRuns,
  loadAutomationConfig,
  updateAutomationConfig,
} from '../lib/storage';

export default function Automation({ session, onRefreshData }) {
  const [domains, setDomains] = useState([]);
  const [runs, setRuns] = useState([]);
  const [config, setConfig] = useState({ targetPersonas: [], guardrails: {} });
  const [runStatus, setRunStatus] = useState('idle'); // idle | running | done | error
  const [runResult, setRunResult] = useState(null);
  const [newDomain, setNewDomain] = useState({ domain: '', label: '', lane: 'synthetic-research' });
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newPersona, setNewPersona] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [d, r, c] = await Promise.all([
        loadAutomationDomains(),
        loadAutomationRuns(),
        loadAutomationConfig(),
      ]);
      setDomains(d);
      setRuns(r);
      setConfig({
        targetPersonas: c.targetPersonas || [],
        guardrails: c.guardrails || {},
      });
    } catch (e) {
      setError('Failed to load automation data. Have you run migration 003?');
    }
  }

  async function handleTriggerRun() {
    setRunStatus('running');
    setRunResult(null);
    setError('');
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch('/api/trigger-outbound', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.access_token}`,
          'content-type': 'application/json',
        },
      });
      const body = await res.json();
      if (!res.ok) {
        setRunStatus('error');
        setRunResult({ error: body.error || 'Run failed' });
        return;
      }
      setRunStatus('done');
      setRunResult(body);
      // Refresh run history and main CRM data
      const newRuns = await loadAutomationRuns();
      setRuns(newRuns);
      onRefreshData?.();
    } catch (e) {
      setRunStatus('error');
      setRunResult({ error: e.message });
    }
  }

  async function handleAddDomain(e) {
    e.preventDefault();
    if (!newDomain.domain || !newDomain.label) return;
    try {
      await addAutomationDomain(newDomain);
      setNewDomain({ domain: '', label: '', lane: 'synthetic-research' });
      setShowAddDomain(false);
      const d = await loadAutomationDomains();
      setDomains(d);
    } catch (e) {
      setError(`Failed to add domain: ${e.message}`);
    }
  }

  async function handleDeleteDomain(domain) {
    if (!window.confirm(`Remove ${domain} from seed domains?`)) return;
    try {
      await deleteAutomationDomain(domain);
      setDomains((d) => d.filter((x) => x.domain !== domain));
    } catch (e) {
      setError(`Failed to delete domain: ${e.message}`);
    }
  }

  async function handleAddPersona(e) {
    e.preventDefault();
    const val = newPersona.trim().toLowerCase();
    if (!val || config.targetPersonas.includes(val)) return;
    const updated = [...config.targetPersonas, val];
    await updateAutomationConfig('targetPersonas', updated);
    setConfig((c) => ({ ...c, targetPersonas: updated }));
    setNewPersona('');
  }

  async function handleRemovePersona(persona) {
    const updated = config.targetPersonas.filter((p) => p !== persona);
    await updateAutomationConfig('targetPersonas', updated);
    setConfig((c) => ({ ...c, targetPersonas: updated }));
  }

  async function handleUpdateGuardrail(key, value) {
    const updated = { ...config.guardrails, [key]: value };
    await updateAutomationConfig('guardrails', updated);
    setConfig((c) => ({ ...c, guardrails: updated }));
  }

  function formatDate(iso) {
    if (!iso) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Zap size={24} className="text-indigo-600" />
            Automation
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your autonomous lead-sourcing pipeline</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">dismiss</button>
        </div>
      )}

      {/* Run Controls */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Pipeline Run</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleTriggerRun}
            disabled={runStatus === 'running'}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {runStatus === 'running' ? (
              <><Loader2 size={16} className="animate-spin" /> Running...</>
            ) : (
              <><Zap size={16} /> Run Now</>
            )}
          </button>
          <span className="text-xs text-zinc-400">Cron runs daily at 9:00 AM UTC</span>
        </div>

        {runResult && runStatus === 'done' && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-700 font-medium text-sm mb-2">
              <CheckCircle2 size={16} /> Pipeline completed successfully
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-zinc-900">{runResult.stats?.domainsProcessed || 0}</div>
                <div className="text-zinc-500 text-xs">Domains</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-zinc-900">{runResult.stats?.leadsFound || 0}</div>
                <div className="text-zinc-500 text-xs">Leads Found</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-zinc-900">{runResult.stats?.leadsQualified || 0}</div>
                <div className="text-zinc-500 text-xs">Qualified</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-indigo-600">{runResult.stats?.draftsGenerated || 0}</div>
                <div className="text-zinc-500 text-xs">Drafts Created</div>
              </div>
            </div>
            {runResult.domainsProcessed?.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">
                Domains: {runResult.domainsProcessed.join(', ')}
              </p>
            )}
            {runResult.errors?.length > 0 && (
              <div className="mt-2 text-xs text-amber-700">
                {runResult.errors.length} error(s): {runResult.errors.map((e) => e.error).join('; ')}
              </div>
            )}
          </div>
        )}

        {runResult && runStatus === 'error' && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700 font-medium text-sm">
              <XCircle size={16} /> Run failed: {runResult.error}
            </div>
          </div>
        )}
      </div>

      {/* Seed Domains */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
            <Globe size={18} className="text-zinc-400" /> Seed Domains
          </h2>
          <button
            onClick={() => setShowAddDomain(!showAddDomain)}
            className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus size={14} /> Add Domain
          </button>
        </div>

        {showAddDomain && (
          <form onSubmit={handleAddDomain} className="mb-4 flex items-end gap-3 bg-zinc-50 rounded-lg p-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Domain</label>
              <input
                type="text"
                placeholder="example.ai"
                value={newDomain.domain}
                onChange={(e) => setNewDomain((d) => ({ ...d, domain: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Label</label>
              <input
                type="text"
                placeholder="Company Name"
                value={newDomain.label}
                onChange={(e) => setNewDomain((d) => ({ ...d, label: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Lane</label>
              <input
                type="text"
                placeholder="synthetic-research"
                value={newDomain.lane}
                onChange={(e) => setNewDomain((d) => ({ ...d, lane: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors">
              Add
            </button>
          </form>
        )}

        {domains.length === 0 ? (
          <p className="text-sm text-zinc-400">No seed domains configured.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {domains.map((d) => (
              <div key={d.domain} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-zinc-900">{d.label}</span>
                  <span className="text-xs text-zinc-400">{d.domain}</span>
                  <span className="text-xs px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{d.lane}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Last checked: {formatDate(d.lastCheckedAt)}</span>
                  <button
                    onClick={() => handleDeleteDomain(d.domain)}
                    className="p-1 text-zinc-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target Personas */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
          <UserSearch size={18} className="text-zinc-400" /> Target Personas
        </h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.targetPersonas.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
              {p}
              <button onClick={() => handleRemovePersona(p)} className="hover:text-red-500 transition-colors">
                <XCircle size={14} />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddPersona} className="flex gap-2">
          <input
            type="text"
            placeholder="Add persona title (e.g. vp engineering)"
            value={newPersona}
            onChange={(e) => setNewPersona(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <button type="submit" className="px-4 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
            Add
          </button>
        </form>
      </div>

      {/* Guardrails */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
          <ShieldCheck size={18} className="text-zinc-400" /> Guardrails
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Max Leads Per Run</label>
            <input
              type="number"
              min={1}
              max={50}
              value={config.guardrails.maxLeadsPerRun || 10}
              onChange={(e) => handleUpdateGuardrail('maxLeadsPerRun', parseInt(e.target.value) || 10)}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Max Domains Per Run</label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.guardrails.maxDomainsPerRun || 2}
              onChange={(e) => handleUpdateGuardrail('maxDomainsPerRun', parseInt(e.target.value) || 2)}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Min Email Confidence (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={config.guardrails.minEmailConfidence || 50}
              onChange={(e) => handleUpdateGuardrail('minEmailConfidence', parseInt(e.target.value) || 50)}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>
      </div>

      {/* Run History */}
      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
          <History size={18} className="text-zinc-400" /> Run History
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-zinc-400">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 text-xs border-b border-zinc-100">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Trigger</th>
                  <th className="pb-2 font-medium">Domains</th>
                  <th className="pb-2 font-medium">Leads</th>
                  <th className="pb-2 font-medium">Drafts</th>
                  <th className="pb-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {runs.map((run) => (
                  <tr key={run.id} className="text-zinc-700">
                    <td className="py-2.5">{formatDate(run.startedAt)}</td>
                    <td className="py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        run.triggeredBy === 'manual'
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {run.triggeredBy}
                      </span>
                    </td>
                    <td className="py-2.5">{run.domainsProcessed?.join(', ') || '-'}</td>
                    <td className="py-2.5">{run.stats?.leadsFound || 0}</td>
                    <td className="py-2.5 font-medium">{run.stats?.draftsGenerated || 0}</td>
                    <td className="py-2.5">
                      {run.errors?.length > 0 ? (
                        <span className="text-red-500" title={run.errors.map((e) => e.error).join('\n')}>
                          {run.errors.length}
                        </span>
                      ) : (
                        <span className="text-emerald-500">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
