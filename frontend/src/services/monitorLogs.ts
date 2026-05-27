import { apiClient } from './apiClient';
import type { MonitorLogResponseDto } from '../types/monitorLog';

export async function getMonitorLogs(monitorId: string, take = 100): Promise<MonitorLogResponseDto[]> {
  const response = await apiClient.get<MonitorLogResponseDto[]>(`/api/monitors/${monitorId}/logs`, {
    params: { take },
  });
  return response.data;
}
