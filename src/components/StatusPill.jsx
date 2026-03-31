const colors = {
  sent: 'bg-blue-100 text-blue-800',
  replied: 'bg-green-100 text-green-800',
  'follow-up-needed': 'bg-amber-100 text-amber-800',
  'no-response': 'bg-gray-100 text-gray-800',
};

export default function StatusPill({ status, onClick }) {
  const cls = colors[status] || colors.sent;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
    >
      {status}
    </Tag>
  );
}
