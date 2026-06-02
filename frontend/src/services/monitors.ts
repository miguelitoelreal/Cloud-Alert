import { apiClient } from './apiClient';
import type { CreateMonitorDto, MonitorResponseDto, UpdateMonitorDto } from '../types/monitor';

export async function getMonitors(): Promise<MonitorResponseDto[]> {
  const response = await apiClient.get<MonitorResponseDto[]>('/api/monitors');
  return response.data;
}

export async function getMonitorById(id: string): Promise<MonitorResponseDto> {
  const response = await apiClient.get<MonitorResponseDto>(`/api/monitors/${id}`);
  return response.data;
}

export async function createMonitor(dto: CreateMonitorDto): Promise<MonitorResponseDto> {
  const response = await apiClient.post<MonitorResponseDto>('/api/monitors', dto);
  return response.data;
}

export async function updateMonitor(id: string, dto: UpdateMonitorDto): Promise<MonitorResponseDto> {
  const response = await apiClient.put<MonitorResponseDto>(`/api/monitors/${id}`, dto);
  return response.data;
}

export async function deleteMonitor(id: string): Promise<void> {
  await apiClient.delete(`/api/monitors/${id}`);
}
