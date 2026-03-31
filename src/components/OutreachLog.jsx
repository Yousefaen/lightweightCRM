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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Log Outreach — {contact.name}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Channel</label>
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option>LinkedIn InMail</option>
              <option>LinkedIn Message</option>
              <option>Email</option>
            </select>
          </div>

          {showSubject && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Message Content
            </label>
            <textarea
              value={form.messageContent}
              onChange={(e) => setForm({ ...form, messageContent: e.target.value })}
              rows="5"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sent">Sent</option>
              <option value="replied">Replied</option>
              <option value="follow-up-needed">Follow-up Needed</option>
              <option value="no-response">No Response</option>
            </select>
          </div>

          {showFollowUpSuggestion && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
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
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            Log Outreach
          </button>
        </div>
      </div>
    </div>
  );
}
