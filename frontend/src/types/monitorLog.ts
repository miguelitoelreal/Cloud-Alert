import type { MonitorStatus } from './monitor';

export type MonitorLogResponseDto = {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
};
