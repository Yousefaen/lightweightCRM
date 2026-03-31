import { useState } from 'react';
import { UserPlus, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Mail, Linkedin } from 'lucide-react';

export default function LeadCard({ lead, existingContacts, onAddContact, onSaveDraft, savedContact, savedDrafts }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [editedDrafts, setEditedDrafts] = useState({});

  const enrichment = lead.enrichment || {};
  const alreadyInCrm = existingContacts.some(
    (c) => c.name.toLowerCase() === lead.name.toLowerCase()
  );

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getDraftText = (channel) => {
    if (editedDrafts[channel] !== undefined) return editedDrafts[channel];
    return lead.drafts?.[channel] || '';
  };

  const handleSaveContact = () => {
    onAddContact({
      id: crypto.randomUUID(),
      name: lead.name,
      title: lead.title,
      company: lead.company,
      email: enrichment.email || '',
      linkedinUrl: enrichment.linkedinUrl || '',
      tags: [],
      notes: [lead.whyRelevant, ...(lead.talkingPoints || []).map((tp) => `- ${tp}`)].join('\n'),
      status: 'active',
      followUpDate: null,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{lead.name}</h3>
          <p className="text-sm text-zinc-500">{lead.title} at {lead.company}</p>
        </div>
        <div className="flex items-center gap-2">
          {alreadyInCrm && (
            <span className="text-xs bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-md font-medium">Already in CRM</span>
          )}
          {!alreadyInCrm && !savedContact && (
            <button
              onClick={handleSaveContact}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-500 font-medium transition-all active:scale-[0.98]"
            >
              <UserPlus size={14} /> Save Contact
            </button>
          )}
          {savedContact && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl font-medium">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {enrichment.linkedinUrl && (
          <a
            href={enrichment.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-500 transition-colors"
          >
            <Linkedin size={14} /> LinkedIn <ExternalLink size={11} />
          </a>
        )}
        {enrichment.email && (
          <button
            onClick={() => copyToClipboard(enrichment.email, 'email')}
            className="flex items-center gap-1 text-zinc-600 hover:text-zinc-800 transition-colors"
          >
            <Mail size={14} /> {enrichment.email}
            {copiedField === 'email' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        )}
      </div>

      <p className="text-sm text-zinc-600">{lead.whyRelevant}</p>

      {lead.talkingPoints?.length > 0 && (
        <ul className="text-sm text-zinc-500 list-disc list-inside space-y-1">
          {lead.talkingPoints.map((tp, i) => (
            <li key={i}>{tp}</li>
          ))}
        </ul>
      )}

      {lead.enrichmentError && (
        <p className="text-xs text-amber-600">Enrichment partial: {lead.enrichmentError}</p>
      )}

      {lead.drafts && Object.keys(lead.drafts).length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide' : 'Show'} Drafts ({Object.keys(lead.drafts).length})
          </button>

          {expanded && (
            <div className="mt-3 space-y-4">
              {Object.entries(lead.drafts).map(([channel, draft]) => (
                <div key={channel} className="border border-zinc-200/60 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-700">{channel}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(getDraftText(channel), `draft-${channel}`)}
                        className="text-xs flex items-center gap-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {copiedField === `draft-${channel}` ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        Copy
                      </button>
                      {!savedDrafts?.has(channel) && (
                        <button
                          onClick={() => onSaveDraft(lead, channel, getDraftText(channel))}
                          className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-500 font-medium transition-all active:scale-[0.98]"
                        >
                          Save as Outreach
                        </button>
                      )}
                      {savedDrafts?.has(channel) && (
                        <span className="text-xs text-emerald-700 font-medium">Saved</span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={getDraftText(channel)}
                    onChange={(e) => setEditedDrafts({ ...editedDrafts, [channel]: e.target.value })}
                    rows={8}
                    className="w-full text-sm px-3.5 py-2.5 border border-zinc-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
