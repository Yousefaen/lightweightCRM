import { useReducer, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { runProspectingChain } from '../lib/prospector.js';
import LeadCard from './LeadCard.jsx';

const initialState = {
  status: 'idle',
  query: '',
  leadCount: 5,
  channels: ['LinkedIn InMail'],
  progressLog: [],
  leads: [],
  savedContacts: new Set(),
  savedDrafts: {},
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_QUERY':
      return { ...state, query: action.payload };
    case 'SET_LEAD_COUNT':
      return { ...state, leadCount: action.payload };
    case 'TOGGLE_CHANNEL': {
      const ch = action.payload;
      const channels = state.channels.includes(ch)
        ? state.channels.filter((c) => c !== ch)
        : [...state.channels, ch];
      return { ...state, channels };
    }
    case 'START':
      return { ...state, status: 'running', progressLog: [], leads: [], savedContacts: new Set(), savedDrafts: {}, error: null };
    case 'PROGRESS': {
      const update = action.payload;
      const log = [...state.progressLog, { stage: update.stage, message: update.message, time: Date.now() }];
      const leads = update.data?.leads || state.leads;
      const status = update.stage === 'done' ? 'done' : 'running';
      return { ...state, status, progressLog: log, leads };
    }
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'CANCEL':
      return { ...state, status: 'done' };
    case 'SAVE_CONTACT': {
      const next = new Set(state.savedContacts);
      next.add(action.payload);
      return { ...state, savedContacts: next };
    }
    case 'SAVE_DRAFT': {
      const { leadName, channel } = action.payload;
      const drafts = { ...state.savedDrafts };
      if (!drafts[leadName]) drafts[leadName] = new Set();
      else drafts[leadName] = new Set(drafts[leadName]);
      drafts[leadName].add(channel);
      return { ...state, savedDrafts: drafts };
    }
    default:
      return state;
  }
}

const CHANNEL_OPTIONS = ['LinkedIn InMail', 'Email'];

export default function Prospector({ session, contacts, outreach, writingSamples, onAddContact, onLogOutreach }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(null);

  const handleRun = async () => {
    if (!state.query.trim()) return;
    if (state.channels.length === 0) {
      dispatch({ type: 'ERROR', payload: 'Select at least one channel.' });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: 'START' });

    try {
      const generator = runProspectingChain({
        query: state.query,
        leadCount: state.leadCount,
        channels: state.channels,
        writingSamples,
        existingContacts: contacts,
        signal: controller.signal,
      });

      for await (const update of generator) {
        if (controller.signal.aborted) break;
        dispatch({ type: 'PROGRESS', payload: update });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        dispatch({ type: 'ERROR', payload: err.message });
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    dispatch({ type: 'CANCEL' });
  };

  const handleSaveContact = (contact) => {
    onAddContact(contact);
    dispatch({ type: 'SAVE_CONTACT', payload: contact.name });
  };

  const handleSaveDraft = (lead, channel, draftText) => {
    const existing = contacts.find((c) => c.name.toLowerCase() === lead.name.toLowerCase());
    const contactId = existing?.id || null;

    let subject = '';
    let messageContent = draftText;
    const subjectMatch = draftText.match(/^Subject:\s*(.+)\n/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      messageContent = draftText.slice(subjectMatch[0].length).trim();
    }

    onLogOutreach({
      id: crypto.randomUUID(),
      contactId,
      date: new Date().toISOString().split('T')[0],
      channel,
      subject,
      messageContent,
      status: 'sent',
      createdAt: new Date().toISOString().split('T')[0],
    });

    dispatch({ type: 'SAVE_DRAFT', payload: { leadName: lead.name, channel } });
  };

  const isRunning = state.status === 'running';
  const inputCls = 'w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 transition-shadow';

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-1">Prospector</h1>
      <p className="text-zinc-500 mb-6">Find leads, enrich profiles, and generate personalized outreach — all in one step.</p>

      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">What are you looking for?</label>
          <textarea
            value={state.query}
            onChange={(e) => dispatch({ type: 'SET_QUERY', payload: e.target.value })}
            placeholder='e.g., "5 people working on simulation AI at consulting firms"'
            rows={2}
            disabled={isRunning}
            className={inputCls}
          />
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Number of leads</label>
            <select
              value={state.leadCount}
              onChange={(e) => dispatch({ type: 'SET_LEAD_COUNT', payload: Number(e.target.value) })}
              disabled={isRunning}
              className="px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-shadow"
            >
              <option value={3}>3</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Channels</label>
            <div className="flex gap-3">
              {CHANNEL_OPTIONS.map((ch) => (
                <label key={ch} className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={state.channels.includes(ch)}
                    onChange={() => dispatch({ type: 'TOGGLE_CHANNEL', payload: ch })}
                    disabled={isRunning}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {!isRunning ? (
              <button
                onClick={handleRun}
                disabled={!state.query.trim() || state.channels.length === 0}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all active:scale-[0.98]"
              >
                <Search size={16} /> Run
              </button>
            ) : (
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-500 font-medium transition-all active:scale-[0.98]"
              >
                <X size={16} /> Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {state.error && (
        <div className="bg-red-50 border border-red-200/60 text-red-700 rounded-xl p-4 mb-6 text-sm">
          {state.error}
        </div>
      )}

      {state.progressLog.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-4 mb-6">
          <div className="space-y-1.5">
            {state.progressLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-zinc-600">
                {i === state.progressLog.length - 1 && isRunning ? (
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center text-emerald-500 text-xs">&#10003;</span>
                )}
                {entry.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {state.leads.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {state.status === 'done' ? `Found ${state.leads.length} leads` : 'Results so far...'}
          </h2>
          <div className="grid gap-4">
            {state.leads.map((lead, i) => (
              <LeadCard
                key={i}
                lead={lead}
                existingContacts={contacts}
                onAddContact={handleSaveContact}
                onSaveDraft={handleSaveDraft}
                savedContact={state.savedContacts.has(lead.name)}
                savedDrafts={state.savedDrafts[lead.name]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
