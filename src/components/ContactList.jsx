import { Plus, Search, Edit, Trash2, Mail, ChevronRight, Users } from 'lucide-react';
import { searchContacts, filterByStatus, filterByTag, getAllTags } from '../lib/utils';
import { useState } from 'react';

const INDUSTRY_OPTIONS = [
  'Technology', 'Financial Services', 'Healthcare', 'Consulting',
  'Manufacturing', 'Retail', 'Energy', 'Government', 'Education', 'Other',
];

const SENIORITY_OPTIONS = [
  'C-Suite', 'VP', 'Director', 'Manager', 'Senior', 'Mid-Level', 'Junior', 'Intern',
];

export default function ContactList({
  contacts,
  outreach,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [seniorityFilter, setSeniorityFilter] = useState('');

  const allTags = getAllTags(contacts);
  let filtered = searchContacts(contacts, query);
  filtered = filterByStatus(filtered, statusFilter);
  filtered = filterByTag(filtered, tagFilter);
  if (industryFilter) filtered = filtered.filter((c) => c.industry === industryFilter);
  if (seniorityFilter) filtered = filtered.filter((c) => c.seniority === seniorityFilter);

  function outreachCount(contactId) {
    return outreach.filter((o) => o.contactId === contactId).length;
  }

  const selectCls = 'px-3 py-2 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-shadow';

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Contacts</h1>
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-500 flex items-center font-medium transition-all active:scale-[0.98]"
        >
          <Plus size={20} className="mr-2" /> Add Contact
        </button>
      </div>

      <div className="sticky top-0 z-10 bg-zinc-50/80 backdrop-blur-sm -mx-8 px-8 py-3 mb-6 border-b border-zinc-200/60">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, company, or tag..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={selectCls}>
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select value={industryFilter} onChange={(e) => setIndustryFilter(e.target.value)} className={selectCls}>
            <option value="">All industries</option>
            {INDUSTRY_OPTIONS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <select value={seniorityFilter} onChange={(e) => setSeniorityFilter(e.target.value)} className={selectCls}>
            <option value="">All seniority</option>
            {SENIORITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((contact) => (
          <div
            key={contact.id}
            className={`bg-white rounded-xl border border-zinc-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 p-5 border-l-4 ${
              contact.status === 'active' ? 'border-l-emerald-400' : 'border-l-zinc-300'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSelect(contact.id)}
              >
                <h3 className="text-base font-semibold text-zinc-900">
                  {contact.name}
                </h3>
                <p className="text-sm text-zinc-600">{contact.title}</p>
                <p className="text-sm text-zinc-400">{contact.company}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(contact)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(contact.id)}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {contact.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
              {contact.industry && (
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                  {contact.industry}
                </span>
              )}
              {contact.seniority && (
                <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                  {contact.seniority}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail size={13} /> {contact.email}
                  </span>
                )}
                {outreachCount(contact.id) > 0 && (
                  <span>{outreachCount(contact.id)} outreach</span>
                )}
              </div>
              <button
                onClick={() => onSelect(contact.id)}
                className="text-indigo-600 hover:text-indigo-500 text-sm font-medium flex items-center gap-0.5 transition-colors"
              >
                View <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-zinc-500 font-medium mb-1">No contacts found</p>
            <p className="text-sm text-zinc-400 mb-4">Try adjusting your filters or add a new contact</p>
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-all active:scale-[0.98]"
            >
              <Plus size={16} /> Add Contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
