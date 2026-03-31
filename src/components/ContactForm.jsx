import { useState } from 'react';
import { X } from 'lucide-react';

const INDUSTRY_OPTIONS = [
  '', 'Technology', 'Financial Services', 'Healthcare', 'Consulting',
  'Manufacturing', 'Retail', 'Energy', 'Government', 'Education', 'Other',
];

const SENIORITY_OPTIONS = [
  '', 'C-Suite', 'VP', 'Director', 'Manager', 'Senior', 'Mid-Level', 'Junior', 'Intern',
];

export default function ContactForm({ contact, onSave, onClose }) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    name: contact?.name || '',
    title: contact?.title || '',
    company: contact?.company || '',
    email: contact?.email || '',
    linkedinUrl: contact?.linkedinUrl || '',
    tags: contact?.tags?.join(', ') || '',
    notes: contact?.notes || '',
    status: contact?.status || 'active',
    industry: contact?.industry || '',
    seniority: contact?.seniority || '',
  });

  const handleSave = () => {
    if (!form.name || !form.company) {
      alert('Name and company are required');
      return;
    }
    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const today = new Date().toISOString().split('T')[0];

    if (isEdit) {
      onSave({
        ...contact,
        ...form,
        tags,
        updatedAt: today,
      });
    } else {
      onSave({
        id: crypto.randomUUID(),
        ...form,
        tags,
        followUpDate: null,
        createdAt: today,
        updatedAt: today,
      });
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 h-10 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow';

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">
        {label}
        {required && ' *'}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputCls}
      />
    </div>
  );

  const dropdown = (label, key, options) => (
    <div>
      <label className="block text-sm font-medium text-zinc-700 mb-1.5">{label}</label>
      <select
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputCls}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || `-- Select ${label.toLowerCase()} --`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-zinc-900">
            {isEdit ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          {field('Name', 'name', 'text', true)}
          {field('Title', 'title')}
          {field('Company', 'company', 'text', true)}
          {field('Email', 'email', 'email')}
          {field('LinkedIn URL', 'linkedinUrl', 'url')}

          <div className="grid grid-cols-2 gap-4">
            {dropdown('Industry', 'industry', INDUSTRY_OPTIONS)}
            {dropdown('Seniority', 'seniority', SENIORITY_OPTIONS)}
          </div>

          {field('Tags (comma-separated)', 'tags')}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows="3"
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
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-500 font-medium transition-all active:scale-[0.98]"
            >
              {isEdit ? 'Update Contact' : 'Add Contact'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-zinc-100 text-zinc-700 px-4 py-2.5 rounded-xl hover:bg-zinc-200 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
