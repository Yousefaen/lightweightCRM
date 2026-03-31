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
  const initials = contact.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium mb-6 transition-colors"
          >
            &larr; Back to Contacts
          </button>

          <div className="flex items-start gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{contact.name}</h2>
              <p className="text-base text-zinc-600">{contact.title}</p>
              <p className="text-sm text-zinc-400">{contact.company}</p>
            </div>
          </div>

          {(contact.industry || contact.seniority) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {contact.industry && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-medium ring-1 ring-inset ring-emerald-500/20">
                  <Building2 size={14} /> {contact.industry}
                </span>
              )}
              {contact.seniority && (
                <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 px-3 py-1 rounded-lg text-sm font-medium ring-1 ring-inset ring-violet-500/20">
                  <Briefcase size={14} /> {contact.seniority}
                </span>
              )}
            </div>
          )}

          {contact.email && (
            <p className="text-sm text-zinc-700 mb-2 flex items-center gap-2">
              <Mail size={16} className="text-indigo-500" />
              {contact.email}
            </p>
          )}
          {contact.linkedinUrl && (
            <p className="text-sm text-zinc-700 mb-2 flex items-center gap-2">
              <Linkedin size={16} className="text-indigo-500" />
              <a
                href={contact.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-500 hover:underline transition-colors"
              >
                LinkedIn Profile
              </a>
            </p>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {contact.notes && (
            <div className="mt-6 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900 mb-2">Notes</h3>
              <p className="text-zinc-600 text-sm leading-relaxed">{contact.notes}</p>
            </div>
          )}

          {addedBy && (
            <p className="mt-4 text-xs text-zinc-400">
              Added by {addedBy.display_name}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-semibold text-zinc-900">Outreach History</h3>
            <button
              onClick={() => setShowOutreachModal(true)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm hover:bg-indigo-500 flex items-center gap-1 font-medium transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> Log Outreach
            </button>
          </div>

          {contactOutreach.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-200" />
              <div className="space-y-4">
                {contactOutreach.map((entry) => (
                  <OutreachEntry key={entry.id} entry={entry} onCycleStatus={() => cycleStatus(entry)} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">No outreach logged yet</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6 h-fit">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Quick Actions</h3>
        <div className="divide-y divide-zinc-100">
          <div className="pb-3">
            <button
              onClick={() => onEdit(contact)}
              className="w-full bg-zinc-100 text-zinc-900 px-4 py-2.5 rounded-xl hover:bg-zinc-200 flex items-center justify-center font-medium text-sm transition-colors active:scale-[0.98]"
            >
              <Edit size={16} className="mr-2" /> Edit
            </button>
          </div>
          <div className="py-3">
            <button
              onClick={() => onDraft(contact)}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-500 flex items-center justify-center font-medium text-sm transition-all active:scale-[0.98]"
            >
              <PenTool size={16} className="mr-2" /> Draft Message
            </button>
          </div>
          {contact.followUpDate && (
            <div className="pt-3">
              <button
                onClick={() => setShowOutreachModal(true)}
                className="w-full bg-amber-50 text-amber-900 px-4 py-2.5 rounded-xl hover:bg-amber-100 flex items-center justify-center font-medium text-sm transition-colors active:scale-[0.98]"
              >
                <CheckCircle size={16} className="mr-2" /> Mark Followed Up
              </button>
            </div>
          )}
        </div>

        {contact.followUpDate && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200/60 rounded-xl">
            <p className="text-amber-800 text-sm font-medium">
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
      <Mail size={16} className="text-emerald-500" />
    ) : (
      <Linkedin size={16} className="text-blue-500" />
    );

  return (
    <div className="relative pl-10">
      <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-white border-2 border-indigo-400 z-10" />
      <div className="border border-zinc-200/60 rounded-xl p-4 hover:bg-zinc-50/50 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div>
              <p className="font-semibold text-sm text-zinc-900">
                {entry.subject || entry.channel}
              </p>
              <p className="text-xs text-zinc-400">{formatDate(entry.date)}</p>
            </div>
          </div>
          <StatusPill status={entry.status} onClick={onCycleStatus} />
        </div>
        {entry.messageContent && (
          <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-lg whitespace-pre-wrap mt-2">
            {entry.messageContent}
          </p>
        )}
      </div>
    </div>
  );
}
