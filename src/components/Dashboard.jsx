import { Clock, Mail, Linkedin } from 'lucide-react';
import { getFollowUpStatus, formatDate } from '../lib/utils';
import StatusPill from './StatusPill';

export default function Dashboard({ contacts, outreach, profiles = [], displayName, onSelectContact, onNavigate }) {
  const stats = getStats(contacts, outreach);
  const reminders = getReminders(contacts);
  const activity = getRecentActivity(contacts, outreach);
  const industryBreakdown = getBreakdown(contacts, 'industry');
  const seniorityBreakdown = getBreakdown(contacts, 'seniority');

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-600">Welcome back, {displayName}</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard label="Total Contacts" value={stats.totalContacts} />
        <StatCard label="Outreach This Week" value={stats.outreachThisWeek} />
        <StatCard label="Replies Received" value={stats.replies} />
        <StatCard label="Response Rate" value={`${stats.responseRate}%`} />
      </div>

      {/* Industry & Seniority breakdowns */}
      {(industryBreakdown.length > 0 || seniorityBreakdown.length > 0) && (
        <div className="grid grid-cols-2 gap-6">
          {industryBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">By Industry</h2>
              <div className="space-y-2">
                {industryBreakdown.map(({ label, count }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">{label}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-medium">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {seniorityBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">By Seniority</h2>
              <div className="space-y-2">
                {seniorityBreakdown.map(({ label, count }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-slate-700">{label}</span>
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-medium">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(reminders.overdue.length > 0 || reminders.today.length > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <Clock className="mr-2 text-indigo-600" size={22} /> Follow-up Reminders
            </h2>
            <button
              onClick={() => onNavigate('followups')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
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
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
            <Mail className="mr-2 text-indigo-600" size={22} /> Recent Activity
          </h2>
          <div className="space-y-3">
            {activity.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-slate-600 text-sm font-medium">{label}</p>
      <p className="text-4xl font-bold text-slate-900 mt-2">{value}</p>
    </div>
  );
}

function ReminderRow({ contact, type, onSelect }) {
  const styles = {
    overdue: 'bg-red-50 border-red-200 text-red-900',
    today: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  const cls = styles[type] || styles.today;

  return (
    <div className={`border rounded p-4 flex justify-between items-center ${cls}`}>
      <div>
        <p className="font-semibold">{contact.name}</p>
        <p className="text-sm text-slate-600">{contact.company}</p>
      </div>
      <button
        onClick={() => onSelect(contact.id)}
        className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
      >
        View
      </button>
    </div>
  );
}

function ActivityRow({ item }) {
  const icon =
    item.channel === 'Email' ? (
      <Mail size={16} />
    ) : (
      <Linkedin size={16} />
    );

  return (
    <div className="border border-slate-200 rounded p-3 text-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-slate-900">{item.contactName}</p>
          <p className="text-slate-600 flex items-center mt-1">
            {icon} <span className="ml-2">{item.channel}</span>
          </p>
        </div>
        <StatusPill status={item.status} />
      </div>
      <p className="text-slate-600">{formatDate(item.date)}</p>
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
