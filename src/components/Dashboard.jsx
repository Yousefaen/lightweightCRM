import { Clock, Mail, Linkedin, TrendingUp, Users, Send, MessageCircle } from 'lucide-react';
import { getFollowUpStatus, formatDate } from '../lib/utils';
import StatusPill from './StatusPill';

const STAT_ACCENTS = [
  { border: 'border-t-indigo-500', icon: <Users size={20} className="text-indigo-500" /> },
  { border: 'border-t-emerald-500', icon: <Send size={20} className="text-emerald-500" /> },
  { border: 'border-t-violet-500', icon: <MessageCircle size={20} className="text-violet-500" /> },
  { border: 'border-t-amber-500', icon: <TrendingUp size={20} className="text-amber-500" /> },
];

export default function Dashboard({ contacts, outreach, profiles = [], displayName, onSelectContact, onNavigate }) {
  const stats = getStats(contacts, outreach);
  const reminders = getReminders(contacts);
  const activity = getRecentActivity(contacts, outreach);
  const industryBreakdown = getBreakdown(contacts, 'industry');
  const seniorityBreakdown = getBreakdown(contacts, 'seniority');
  const maxIndustry = industryBreakdown.length > 0 ? industryBreakdown[0].count : 1;
  const maxSeniority = seniorityBreakdown.length > 0 ? seniorityBreakdown[0].count : 1;

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-1">Dashboard</h1>
        <p className="text-zinc-500">Welcome back, {displayName}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Contacts', value: stats.totalContacts },
          { label: 'Outreach This Week', value: stats.outreachThisWeek },
          { label: 'Replies Received', value: stats.replies },
          { label: 'Response Rate', value: `${stats.responseRate}%` },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`bg-white rounded-xl border border-zinc-200/60 border-t-2 ${STAT_ACCENTS[i].border} shadow-sm p-6 hover:shadow-md transition-shadow duration-200`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              {STAT_ACCENTS[i].icon}
            </div>
            <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {(industryBreakdown.length > 0 || seniorityBreakdown.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {industryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-4">By Industry</h2>
              <div className="space-y-3">
                {industryBreakdown.map(({ label, count }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-700">{label}</span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxIndustry) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {seniorityBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
              <h2 className="text-base font-semibold text-zinc-900 mb-4">By Seniority</h2>
              <div className="space-y-3">
                {seniorityBreakdown.map(({ label, count }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-700">{label}</span>
                      <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxSeniority) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(reminders.overdue.length > 0 || reminders.today.length > 0) && (
        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Clock className="text-indigo-500" size={20} /> Follow-up Reminders
            </h2>
            <button
              onClick={() => onNavigate('followups')}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
            >
              View all &rarr;
            </button>
          </div>
          <div className="space-y-2">
            {reminders.overdue.map((c) => (
              <ReminderRow key={c.id} contact={c} type="overdue" onSelect={onSelectContact} />
            ))}
            {reminders.today.map((c) => (
              <ReminderRow key={c.id} contact={c} type="today" onSelect={onSelectContact} />
            ))}
          </div>
        </div>
      )}

      {activity.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200/60 shadow-sm p-6">
          <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Mail className="text-indigo-500" size={20} /> Recent Activity
          </h2>
          <div className="space-y-2">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReminderRow({ contact, type, onSelect }) {
  const styles = {
    overdue: 'bg-red-50 border-l-red-500 text-red-900',
    today: 'bg-amber-50 border-l-amber-500 text-amber-900',
  };
  const cls = styles[type] || styles.today;

  return (
    <div className={`border-l-4 rounded-xl px-4 py-3 flex justify-between items-center ${cls}`}>
      <div>
        <p className="font-semibold text-sm">{contact.name}</p>
        <p className="text-xs text-zinc-500">{contact.company}</p>
      </div>
      <button
        onClick={() => onSelect(contact.id)}
        className="text-indigo-600 hover:text-indigo-500 font-medium text-sm transition-colors"
      >
        View
      </button>
    </div>
  );
}

const CHANNEL_BORDER = {
  Email: 'border-l-emerald-400',
  'LinkedIn InMail': 'border-l-blue-400',
  'LinkedIn Message': 'border-l-sky-400',
};

function ActivityRow({ item }) {
  const icon =
    item.channel === 'Email' ? (
      <Mail size={16} className="text-emerald-500" />
    ) : (
      <Linkedin size={16} className="text-blue-500" />
    );

  const borderCls = CHANNEL_BORDER[item.channel] || 'border-l-zinc-300';

  return (
    <div className={`border border-zinc-100 border-l-4 ${borderCls} rounded-xl px-4 py-3 text-sm hover:bg-zinc-50/50 transition-colors`}>
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <p className="font-semibold text-zinc-900">{item.contactName}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{item.channel} &middot; {formatDate(item.date)}</p>
          </div>
        </div>
        <StatusPill status={item.status} />
      </div>
    </div>
  );
}

function getStats(contacts, outreach) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let outreachThisWeek = 0;
  let replies = 0;
  const totalOutreach = outreach.length;

  outreach.forEach((o) => {
    const d = new Date(o.date);
    d.setHours(0, 0, 0, 0);
    if (d >= weekAgo && d <= today) outreachThisWeek++;
    if (o.status === 'replied') replies++;
  });

  const responseRate =
    totalOutreach > 0 ? ((replies / totalOutreach) * 100).toFixed(1) : '0';

  return {
    totalContacts: contacts.length,
    outreachThisWeek,
    replies,
    responseRate,
  };
}

function getReminders(contacts) {
  const reminders = { overdue: [], today: [] };
  contacts.forEach((c) => {
    if (c.followUpDate) {
      const status = getFollowUpStatus(c.followUpDate);
      if (status === 'overdue') reminders.overdue.push(c);
      if (status === 'today') reminders.today.push(c);
    }
  });
  return reminders;
}

function getRecentActivity(contacts, outreach) {
  const contactMap = {};
  contacts.forEach((c) => (contactMap[c.id] = c.name));

  return outreach
    .map((o) => ({ ...o, contactName: contactMap[o.contactId] || 'Unknown' }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

function getBreakdown(contacts, field) {
  const counts = {};
  contacts.forEach((c) => {
    const val = c[field];
    if (val) counts[val] = (counts[val] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}
