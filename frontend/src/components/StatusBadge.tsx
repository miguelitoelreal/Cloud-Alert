import { MonitorStatus, monitorStatusLabel, type MonitorStatus as MonitorStatusType } from '../types/monitor';

type StatusBadgeProps = {
  status: MonitorStatusType;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = monitorStatusLabel(status);

  const classes =
    status === MonitorStatus.Online
      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-400/30'
      : status === MonitorStatus.Offline
        ? 'bg-rose-500/10 text-rose-400 ring-rose-400/30'
        : 'bg-slate-700/60 text-slate-300 ring-slate-500/30';

  return (
    <span className={[
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      classes,
    ].join(' ')}>
      {label}
    </span>
  );
}
