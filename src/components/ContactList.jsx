import { Plus, Search, Edit, Trash2, Mail, ChevronRight } from 'lucide-react';
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
        <button
          onClick={onAdd}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center"
        >
          <Plus size={20} className="mr-2" /> Add Contact
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, company, or tag..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All industries</option>
          {INDUSTRY_OPTIONS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select
          value={seniorityFilter}
          onChange={(e) => setSeniorityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All seniority</option>
          {SENIORITY_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((contact) => (
          <div
            key={contact.id}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSelect(contact.id)}
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {contact.name}
                </h3>
                <p className="text-slate-600">{contact.title}</p>
                <p className="text-slate-500 text-sm">{contact.company}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(contact)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => onDelete(contact.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {contact.tags?.map((tag) => (
                <span
                  key={tag}
                  className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {contact.industry && (
                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-medium">
                  {contact.industry}
                </span>
              )}
              {contact.seniority && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
                  {contact.seniority}
                </span>
              )}
            </div>
            {contact.email && (
              <p className="text-sm text-slate-600">
                <Mail size={14} className="inline mr-1" /> {contact.email}
              </p>
            )}
            {outreachCount(contact.id) > 0 && (
              <p className="text-sm text-slate-500 mt-2">
                {outreachCount(contact.id)} outreach attempt
                {outreachCount(contact.id) !== 1 ? 's' : ''}
              </p>
            )}
            <button
              onClick={() => onSelect(contact.id)}
              className="mt-3 text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
            >
              View Details <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-slate-500 text-center py-8">No contacts found.</p>
        )}
      </div>
    </div>
  );
}
