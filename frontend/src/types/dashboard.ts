import type { MonitorStatus } from './monitor';

export type DashboardMonitorSummaryDto = {
  id: string;
  name: string;
  url: string;
  currentStatus: MonitorStatus;
  lastCheckedAt: string | null;
  lastResponseTimeMs: number | null;
  lastDnsTimeMs: number | null;
  lastConnectTimeMs: number | null;
  lastTlsTimeMs: number | null;
  lastTtfbTimeMs: number | null;
  uptimePercentage: number | null;
  totalChecks: number;
  failedChecks: number;
};
