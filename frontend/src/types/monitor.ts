export const MonitorStatus = {
  Unknown: 0,
  Online: 1,
  Offline: 2,
} as const;

export type MonitorStatus = (typeof MonitorStatus)[keyof typeof MonitorStatus];

export type MonitorResponseDto = {
  id: string;
  name: string;
  url: string;
  intervalInSeconds: number;
  status: MonitorStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateMonitorDto = {
  name: string;
  url: string;
  intervalInSeconds: number;
};

export type UpdateMonitorDto = CreateMonitorDto;

export function monitorStatusLabel(status: MonitorStatus): string {
  switch (status) {
    case MonitorStatus.Online:
      return "Online";
    case MonitorStatus.Offline:
      return "Offline";
    case MonitorStatus.Unknown:
    default:
      return "Unknown";
  }
}
