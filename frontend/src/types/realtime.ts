import type { DashboardMonitorSummaryDto } from './dashboard';
import type { MonitorLogResponseDto } from './monitorLog';

export type MonitorUpdatedEvent = Pick<
  DashboardMonitorSummaryDto,
  'id' | 'name' | 'url' | 'currentStatus' | 'lastCheckedAt' | 'lastResponseTimeMs'
> &
  Partial<Pick<DashboardMonitorSummaryDto, 'uptimePercentage' | 'totalChecks' | 'failedChecks'>>;

export type MonitorLogCreatedEvent = MonitorLogResponseDto;
