import type { DashboardMonitorSummaryDto } from './dashboard';
import type { MonitorLogResponseDto } from './monitorLog';

export type MonitorUpdatedEvent = Pick<
  DashboardMonitorSummaryDto,
  'id' | 'name' | 'url' | 'currentStatus' | 'lastCheckedAt' | 'lastResponseTimeMs' | 'lastDnsTimeMs' | 'lastConnectTimeMs' | 'lastTlsTimeMs' | 'lastTtfbTimeMs'
> &
  Partial<Pick<DashboardMonitorSummaryDto, 'uptimePercentage' | 'totalChecks' | 'failedChecks'>>;

export type MonitorLogCreatedEvent = MonitorLogResponseDto;
