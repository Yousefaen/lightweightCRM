import { useState } from 'react';
import { X } from 'lucide-react';
import { todayISO, suggestFollowUpDate } from '../lib/utils';

export default function OutreachLog({ contact, onSave, onClose }) {
  const [form, setForm] = useState({
    date: todayISO(),
    channel: 'LinkedIn InMail',
    subject: '',
    messageContent: '',
    status: 'sent',
  });
  const [setFollowUp, setSetFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(suggestFollowUpDate());

  const handleSubmit = () => {
    if (!form.messageContent) {
      alert('Message content is required');
      return;
    }
    onSave({
      entry: {
        id: crypto.randomUUID(),
        contactId: contact.id,
        ...form,
        createdAt: todayISO(),
      },
      followUpDate: setFollowUp ? followUpDate : null,
    });
  };

  const showSubject = form.channel === 'LinkedIn InMail' || form.channel === 'Email';
  const showFollowUpSuggestion =
    form.status === 'sent' || form.status === 'follow-up-needed';

  const inputCls = 'w-full px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            Log Outreach — {contact.name}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Channel</label>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className={inputCls}
            >
              <option>LinkedIn InMail</option>
              <option>LinkedIn Message</option>
              <option>Email</option>
            </select>
          </div>

          {showSubject && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Message Content
            </label>
            <textarea
              value={form.messageContent}
              onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
              rows="5"
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputCls}
            >
              <option value="sent">Sent</option>
              <option value="replied">Replied</option>
              <option value="follow-up-needed">Follow-up Needed</option>
              <option value="no-response">No Response</option>
            </select>
          </div>

          {showFollowUpSuggestion && (
            <div className="bg-indigo-50 border border-indigo-200/60 rounded-xl p-3">
              <label className="flex items-center text-sm text-indigo-900">
                <input
                  type="checkbox"
                  checked={setFollowUp}
                  onChange={(e) => setSetFollowUp(e.target.checked)}
                  className="mr-2 rounded"
                />
                Set follow-up reminder
              </label>
              {setFollowUp && (
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                />
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-500 font-medium transition-all active:scale-[0.98]"
          >
            Log Outreach
          </button>
        </div>
      </div>
    </div>
  );
}
