import { Clock, AlertCircle, Sun, CalendarDays } from 'lucide-react';
import { getFollowUpStatus, formatDate } from '../lib/utils';

const SECTION_CONFIG = {
  overdue: {
    bg: 'bg-red-50',
    border: 'border-red-200/60',
    borderLeft: 'border-l-red-500',
    heading: 'text-red-700',
    name: 'text-red-900',
    icon: <AlertCircle size={16} className="text-red-500" />,
  },
  today: {
    bg: 'bg-amber-50',
    border: 'border-amber-200/60',
    borderLeft: 'border-l-amber-500',
    heading: 'text-amber-700',
    name: 'text-amber-900',
    icon: <Sun size={16} className="text-amber-500" />,
  },
  upcoming: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/60',
    borderLeft: 'border-l-emerald-500',
    heading: 'text-emerald-700',
    name: 'text-emerald-900',
    icon: <CalendarDays size={16} className="text-emerald-500" />,
  },
};

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
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-4">Follow-ups</h1>
        <div className="text-center py-16">
          <Clock size={40} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-zinc-500 font-medium">No follow-ups scheduled</p>
          <p className="text-sm text-zinc-400">Follow-ups will appear here when you set them on contacts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-6 flex items-center gap-3">
        <Clock className="text-indigo-500" size={28} /> Follow-ups
      </h1>

      <div className="space-y-6">
        <Section
          label="Overdue"
          items={reminders.overdue}
          type="overdue"
          onSelect={onSelectContact}
        />
        <Section
          label="Due Today"
          items={reminders.today}
          type="today"
          onSelect={onSelectContact}
        />
        <Section
          label="Upcoming (7 days)"
          items={reminders.upcoming}
          type="upcoming"
          onSelect={onSelectContact}
        />
      </div>
    </div>
  );
}

function Section({ label, items, type, onSelect }) {
  if (items.length === 0) return null;
  const cfg = SECTION_CONFIG[type];

  return (
    <div>
      <h2 className={`text-sm font-semibold ${cfg.heading} mb-2 flex items-center gap-2`}>
        {cfg.icon} {label}
        <span className={`${cfg.bg} px-2 py-0.5 rounded-md text-xs font-medium`}>{items.length}</span>
      </h2>
      <div className="space-y-2">
        {items.map((c) => (
          <div
            key={c.id}
            className={`border ${cfg.border} ${cfg.bg} border-l-4 ${cfg.borderLeft} rounded-xl px-4 py-3 flex justify-between items-center`}
          >
            <div>
              <p className={`font-semibold text-sm ${cfg.name}`}>{c.name}</p>
              <p className="text-xs text-zinc-500">
                {c.company} &middot; Due {formatDate(c.followUpDate)}
              </p>
            </div>
            <button
              onClick={() => onSelect(c.id)}
              className="text-indigo-600 hover:text-indigo-500 font-medium text-sm transition-colors"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
