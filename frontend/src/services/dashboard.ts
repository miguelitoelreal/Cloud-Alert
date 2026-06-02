import { apiClient } from './apiClient';
import type { DashboardMonitorSummaryDto } from '../types/dashboard';

export async function getDashboardMonitors(): Promise<DashboardMonitorSummaryDto[]> {
  const res = await apiClient.get<DashboardMonitorSummaryDto[]>('/api/dashboard/monitors');
  return res.data;
}
