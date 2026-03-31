import { useState } from 'react';
import { Mail, Linkedin, Plus, Edit, PenTool, CheckCircle, Building2, Briefcase } from 'lucide-react';
import { formatDate } from '../lib/utils';
import StatusPill from './StatusPill';
import OutreachLog from './OutreachLog';

export default function ContactDetail({
  contact,
  outreach,
  profiles = [],
  onBack,
  onEdit,
  onDraft,
  onLogOutreach,
  onUpdateOutreachStatus,
  onSetFollowUp,
}) {
  const [showOutreachModal, setShowOutreachModal] = useState(false);

  const contactOutreach = outreach
    .filter((o) => o.contactId === contact.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleLogSave = ({ entry, followUpDate }) => {
    onLogOutreach(entry);
    if (followUpDate) {
      onSetFollowUp(contact.id, followUpDate);
    }
    setShowOutreachModal(false);
  };

  const statusCycle = ['sent', 'replied', 'follow-up-needed', 'no-response'];

  const cycleStatus = (entry) => {
    const idx = statusCycle.indexOf(entry.status);
    const next = statusCycle[(idx + 1) % statusCycle.length];
    onUpdateOutreachStatus(entry.id, next);
  };

  const addedBy = profiles.find((p) => p.id === contact.createdBy);

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4"
          >
            &larr; Back to Contacts
          </button>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{contact.name}</h2>
          <p className="text-lg text-slate-600 mb-1">{contact.title}</p>
          <p className="text-slate-500 mb-4">{contact.company}</p>

          {(contact.industry || contact.seniority) && (
            <div className="flex flex-wrap gap-3 mb-4">
              {contact.industry && (
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded text-sm font-medium">
                  <Building2 size={14} /> {contact.industry}
                </span>
              )}
              {contact.seniority && (
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm font-medium">
                  <Briefcase size={14} /> {contact.seniority}
                </span>
              )}
            </div>
          )}

          {contact.email && (
            <p className="text-slate-700 mb-3 flex items-center">
              <Mail size={18} className="mr-2 text-indigo-600" />
              {contact.email}
            </p>
          )}
          {contact.linkedinUrl && (
            <p className="text-slate-700 mb-3 flex items-center">
              <Linkedin size={18} className="mr-2 text-indigo-600" />
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                LinkedIn Profile
              </a>
            </p>
          )}

          <div className="mt-6">
            <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {contact.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {contact.notes && (
            <div className="mt-6 p-4 bg-slate-50 rounded">
              <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-slate-700 text-sm leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {addedBy && (
            <p className="mt-4 text-xs text-slate-400">
              Added by {addedBy.display_name}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">Outreach History</h3>
            <button
              onClick={() => setShowOutreachModal(true)}
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 flex items-center"
            >
              <Plus size={16} className="mr-1" /> Log Outreach
            </button>
          </div>

          {contactOutreach.length > 0 ? (
            <div className="space-y-4">
              {contactOutreach.map((entry) => (
                <OutreachEntry key={entry.id} entry={entry} onCycleStatus={() => cycleStatus(entry)} />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No outreach logged yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 h-fit">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => onEdit(contact)}
            className="w-full bg-slate-100 text-slate-900 px-4 py-2 rounded hover:bg-slate-200 flex items-center justify-center"
          >
            <Edit size={16} className="mr-2" /> Edit
          </button>
          <button
            onClick={() => onDraft(contact)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center justify-center"
          >
            <PenTool size={16} className="mr-2" /> Draft Message
          </button>
          {contact.followUpDate && (
            <button
              onClick={() => setShowOutreachModal(true)}
              className="w-full bg-amber-100 text-amber-900 px-4 py-2 rounded hover:bg-amber-200 flex items-center justify-center"
            >
              <CheckCircle size={16} className="mr-2" /> Mark Followed Up
            </button>
          )}
        </div>

        {contact.followUpDate && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded">
            <p className="text-amber-900 text-sm font-medium">
              Follow-up due: {formatDate(contact.followUpDate)}
            </p>
          </div>
        )}
      </div>

      {showOutreachModal && (
        <OutreachLog
          contact={contact}
          onSave={handleLogSave}
          onClose={() => setShowOutreachModal(false)}
        />
      )}
    </div>
  );
}

function OutreachEntry({ entry, onCycleStatus }) {
  const icon =
    entry.channel === 'Email' ? (
      <Mail size={16} />
    ) : (
      <Linkedin size={16} />
    );

  return (
    <div className="border border-slate-200 rounded p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start space-x-3">
          <div className="mt-1">{icon}</div>
          <div>
            <p className="font-semibold text-slate-900">
              {entry.subject || entry.channel}
            </p>
            <p className="text-sm text-slate-600">{formatDate(entry.date)}</p>
          </div>
        </div>
        <StatusPill status={entry.status} onClick={onCycleStatus} />
      </div>
      {entry.messageContent && (
        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded whitespace-pre-wrap">
          {entry.messageContent}
        </p>
      )}
    </div>
  );
}
