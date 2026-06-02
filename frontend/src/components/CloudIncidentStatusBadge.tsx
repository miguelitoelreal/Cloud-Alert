import {
  CloudIncidentStatus,
  cloudIncidentStatusLabel,
  type CloudIncidentStatus as CloudIncidentStatusType,
} from '../types/cloudStatus';

type CloudIncidentStatusBadgeProps = {
  status: CloudIncidentStatusType;
};

export function CloudIncidentStatusBadge({ status }: CloudIncidentStatusBadgeProps) {
  const classes =
    status === CloudIncidentStatus.Resolved
      ? 'bg-green-50 text-green-700 ring-green-600/20'
      : status === CloudIncidentStatus.Monitoring
        ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
        : status === CloudIncidentStatus.Identified
          ? 'bg-orange-50 text-orange-700 ring-orange-600/20'
          : status === CloudIncidentStatus.Maintenance ||
              status === CloudIncidentStatus.Scheduled
            ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
            : 'bg-red-50 text-red-700 ring-red-600/20';

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        classes,
      ].join(' ')}
    >
      {cloudIncidentStatusLabel(status)}
    </span>
  );
}
