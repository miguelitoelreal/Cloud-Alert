type CloudDisplayStatusBadgeProps = {
  label: string;
};

export function CloudDisplayStatusBadge({ label }: CloudDisplayStatusBadgeProps) {
  const normalized = label.toLowerCase();
  const classes = normalized.includes('crítica')
    ? 'bg-red-600 text-white'
    : normalized.includes('parcial')
      ? 'bg-orange-100 text-orange-800'
      : normalized.includes('degradado')
        ? 'bg-amber-100 text-amber-800'
        : normalized.includes('mantenimiento')
          ? 'bg-violet-100 text-violet-800'
          : 'bg-green-100 text-green-800';

  return (
    <span className={['inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', classes].join(' ')}>
      {label}
    </span>
  );
}
