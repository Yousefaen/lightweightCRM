import { Clock } from 'lucide-react';
import { getFollowUpStatus, formatDate } from '../lib/utils';

export default function FollowUpList({ contacts, onSelectContact }) {
  const reminders = { overdue: [], today: [], upcoming: [] };

  contacts.forEach((c) => {
    if (c.followUpDate) {
      const status = getFollowUpStatus(c.followUpDate);
      if (status && reminders[status]) {
        reminders[status].push(c);
      }
    }
  });

  const total =
    reminders.overdue.length + reminders.today.length + reminders.upcoming.length;

  if (total === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Follow-ups</h1>
        <p className="text-slate-500">No follow-ups scheduled.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6 flex items-center">
        <Clock className="mr-3 text-indigo-600" size={28} /> Follow-ups
      </h1>

      <div className="space-y-6">
        <Section
          label="Overdue"
          items={reminders.overdue}
          color="red"
          onSelect={onSelectContact}
        />
        <Section
          label="Due Today"
          items={reminders.today}
          color="amber"
          onSelect={onSelectContact}
        />
        <Section
          label="Upcoming (7 days)"
          items={reminders.upcoming}
          color="green"
          onSelect={onSelectContact}
        />
      </div>
    </div>
  );
}

function Section({ label, items, color, onSelect }) {
  if (items.length === 0) return null;
  const bg = `bg-${color}-50`;
  const border = `border-${color}-200`;
  const heading = `text-${color}-700`;
  const name = `text-${color}-900`;

  return (
    <div>
      <h2 className={`text-sm font-semibold ${heading} mb-2`}>
        {label} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className={`border ${border} ${bg} rounded p-4 flex justify-between items-center`}
          >
            <div>
              <p className={`font-semibold ${name}`}>{c.name}</p>
              <p className="text-sm text-slate-600">
                {c.company} &middot; Due {formatDate(c.followUpDate)}
              </p>
            </div>
            <button
              onClick={() => onSelect(c.id)}
              className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
