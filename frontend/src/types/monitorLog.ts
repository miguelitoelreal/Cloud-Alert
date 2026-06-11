import type { MonitorStatus } from './monitor';

export type MonitorLogResponseDto = {
  id: string;
  monitorId: string;
  status: MonitorStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  dnsTimeMs: number | null;
  connectTimeMs: number | null;
  tlsTimeMs: number | null;
  ttfbTimeMs: number | null;
  checkedAt: string;
  errorMessage: string | null;
};
