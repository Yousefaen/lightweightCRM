const config = {
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', ring: 'ring-blue-500/20' },
  replied: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', ring: 'ring-green-500/20' },
  'follow-up-needed': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-500/20' },
  'no-response': { bg: 'bg-zinc-100', text: 'text-zinc-600', dot: 'bg-zinc-400', ring: 'ring-zinc-400/20' },
};

export default function StatusPill({ status, onClick }) {
  const c = config[status] || config.sent;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${c.bg} ${c.text} ${c.ring} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </Tag>
  );
}
