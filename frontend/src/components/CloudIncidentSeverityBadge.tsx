import {
  CloudIncidentSeverity,
  cloudIncidentSeverityLabel,
  type CloudIncidentSeverity as CloudIncidentSeverityType,
} from '../types/cloudStatus';

type CloudIncidentSeverityBadgeProps = {
  severity: CloudIncidentSeverityType;
};

export function CloudIncidentSeverityBadge({ severity }: CloudIncidentSeverityBadgeProps) {
  const classes =
    severity === CloudIncidentSeverity.Critical
      ? 'bg-red-50 text-red-700 ring-red-600/20'
      : severity === CloudIncidentSeverity.Major
        ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
        : severity === CloudIncidentSeverity.Minor
          ? 'bg-amber-50 text-amber-700 ring-amber-600/20'
          : 'bg-slate-100 text-slate-700 ring-slate-600/20';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        classes,
      ].join(' ')}
    >
      {cloudIncidentSeverityLabel(severity)}
    </span>
  );
}
