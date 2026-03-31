export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateStr));
}

export function getFollowUpStatus(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followUp = new Date(date);
  followUp.setHours(0, 0, 0, 0);
  const diff = followUp.getTime() - today.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 7) return 'upcoming';
  return null;
}

export function searchContacts(contacts, query) {
  if (!query) return contacts;
  const q = query.toLowerCase();
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function filterByStatus(contacts, status) {
  if (!status || status === 'all') return contacts;
  return contacts.filter((c) => c.status === status);
}

export function filterByTag(contacts, tag) {
  if (!tag) return contacts;
  return contacts.filter((c) => c.tags.includes(tag));
}

export function getAllTags(contacts) {
  const tags = new Set();
  contacts.forEach((c) => c.tags.forEach((t) => tags.add(t)));
  return [...tags].sort();
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function suggestFollowUpDate(daysOut = 6) {
  const d = new Date();
  d.setDate(d.getDate() + daysOut);
  return d.toISOString().split('T')[0];
}
