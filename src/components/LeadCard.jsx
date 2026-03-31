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
    <div className="bg-white rounded-lg shadow p-5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{lead.name}</h3>
          <p className="text-sm text-slate-600">{lead.title} at {lead.company}</p>
        </div>
        <div className="flex items-center gap-2">
          {alreadyInCrm && (
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Already in CRM</span>
          )}
          {!alreadyInCrm && !savedContact && (
            <button
              onClick={handleSaveContact}
              className="flex items-center gap-1 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
            >
              <UserPlus size={16} /> Save Contact
            </button>
          )}
          {savedContact && (
            <span className="flex items-center gap-1 text-sm text-green-700 bg-green-100 px-3 py-1.5 rounded-lg">
              <Check size={16} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Links */}
      <div className="flex items-center gap-4 text-sm">
        {enrichment.linkedinUrl && (
          <a
            href={enrichment.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <Linkedin size={16} /> LinkedIn <ExternalLink size={12} />
          </a>
        )}
        {enrichment.email && (
          <button
            onClick={() => copyToClipboard(enrichment.email, 'email')}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-800"
          >
            <Mail size={16} /> {enrichment.email}
            {copiedField === 'email' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
        )}
      </div>

      {/* Why relevant */}
      <p className="text-sm text-slate-700">{lead.whyRelevant}</p>

      {/* Talking points */}
      {lead.talkingPoints?.length > 0 && (
        <ul className="text-sm text-slate-600 list-disc list-inside space-y-1">
          {lead.talkingPoints.map((tp, i) => (
            <li key={i}>{tp}</li>
          ))}
        </ul>
      )}

      {lead.enrichmentError && (
        <p className="text-xs text-amber-600">Enrichment partial: {lead.enrichmentError}</p>
      )}

      {/* Drafts section */}
      {lead.drafts && Object.keys(lead.drafts).length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide' : 'Show'} Drafts ({Object.keys(lead.drafts).length})
          </button>

          {expanded && (
            <div className="mt-3 space-y-4">
              {Object.entries(lead.drafts).map(([channel, draft]) => (
                <div key={channel} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{channel}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(getDraftText(channel), `draft-${channel}`)}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700"
                      >
                        {copiedField === `draft-${channel}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        Copy
                      </button>
                      {!savedDrafts?.has(channel) && (
                        <button
                          onClick={() => onSaveDraft(lead, channel, getDraftText(channel))}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        >
                          Save as Outreach
                        </button>
                      )}
                      {savedDrafts?.has(channel) && (
                        <span className="text-xs text-green-700">Saved</span>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={getDraftText(channel)}
                    onChange={(e) => setEditedDrafts({ ...editedDrafts, [channel]: e.target.value })}
                    rows={8}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
