import { useState } from 'react';
import { Send, Copy, Save } from 'lucide-react';
import { generateDraft } from '../lib/anthropic';
import { todayISO } from '../lib/utils';

export default function Drafter({
  contacts,
  outreach = [],
  writingSamples,
  session,
  preselectedContactId,
  onSaveAsOutreach,
}) {
  const [contactId, setContactId] = useState(preselectedContactId || '');
  const [channel, setChannel] = useState('LinkedIn InMail');
  const [angle, setAngle] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const contact = contacts.find((c) => c.id === contactId);

  const contactOutreach = contactId
    ? outreach.filter((o) => o.contactId === contactId).sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];

  const outreachSummary = contactOutreach.length > 0 ? (() => {
    const last = contactOutreach[0];
    const daysSince = Math.floor((new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24));
    return { count: contactOutreach.length, lastDate: last.date, daysSince, lastChannel: last.channel, lastStatus: last.status };
  })() : null;

  const handleGenerate = async () => {
    if (!contactId || !angle) {
      setError('Select a contact and provide context.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const text = await generateDraft({
        samples: writingSamples,
        contact,
        channel,
        angle,
        priorOutreach: contactOutreach,
      });
      setOutput(text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!output || !contact) return;
    onSaveAsOutreach({
      id: crypto.randomUUID(),
      contactId: contact.id,
      date: todayISO(),
      channel,
      subject: '',
      messageContent: output,
      status: 'sent',
      createdAt: todayISO(),
    });
    setOutput('');
    setAngle('');
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Message Drafter</h1>

      <div className="bg-white rounded-lg shadow p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Select Contact
          </label>
          <select
            value={contactId}
            onChange={(e) => {
              setContactId(e.target.value);
              setOutput('');
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose a contact --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.company})
              </option>
            ))}
          </select>
        </div>

        {contact && (
          <div className="bg-slate-50 rounded p-4 text-sm text-slate-700">
            <p className="font-medium">{contact.name}</p>
            <p>{contact.title} at {contact.company}</p>
            {contact.notes && (
              <p className="mt-1 text-slate-500 line-clamp-2">{contact.notes}</p>
            )}
          </div>
        )}

        {contact && outreachSummary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded p-4 text-sm text-indigo-900">
            <p className="font-medium">Outreach History</p>
            <p className="mt-1">
              {outreachSummary.count} prior message{outreachSummary.count !== 1 ? 's' : ''} | Last sent {outreachSummary.daysSince} day{outreachSummary.daysSince !== 1 ? 's' : ''} ago via {outreachSummary.lastChannel} | Status: {outreachSummary.lastStatus}
            </p>
          </div>
        )}

        {contact && !outreachSummary && (
          <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-900">
            First-touch cold outreach — no prior messages to this contact.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">Channel</label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>LinkedIn InMail</option>
            <option>LinkedIn Message</option>
            <option>Email</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Context / Angle
          </label>
          <textarea
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
            placeholder="What do you want to discuss and why this person?"
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <Send size={18} className="mr-2" /> Generate Draft
            </>
          )}
        </button>

        {output && (
          <div className="bg-slate-50 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-slate-900">Generated Draft</h3>
            <textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              rows="10"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800 font-medium flex items-center justify-center"
              >
                <Copy size={18} className="mr-2" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
              >
                <Save size={18} className="mr-2" /> Save as Outreach
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
