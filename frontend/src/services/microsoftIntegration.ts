import { apiClient } from './apiClient';

export interface MicrosoftIntegrationDto {
  id: string;
  microsoftTenantId: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface MicrosoftIntegrationResponse {
  configured: boolean;
  microsoftTenantId?: string;
}

export interface SaveMicrosoftIntegrationRequest {
  microsoftTenantId: string;
  clientId: string;
  clientSecret: string;
}

export async function getMicrosoftIntegration(): Promise<MicrosoftIntegrationResponse> {
  const response = await apiClient.get<MicrosoftIntegrationResponse>('/api/microsoft-integration');
  return response.data;
}

export async function saveMicrosoftIntegration(request: SaveMicrosoftIntegrationRequest): Promise<void> {
  await apiClient.post('/api/microsoft-integration', request);
}

export async function deleteMicrosoftIntegration(): Promise<void> {
  await apiClient.delete('/api/microsoft-integration');
}

export async function testMicrosoftConnection(): Promise<{ connected: boolean; message: string }> {
  const response = await apiClient.post<{ connected: boolean; message: string }>('/api/microsoft-integration/test-connection');
  return response.data;
}

export interface MicrosoftGraphIncident {
  id: string;
  title: string;
  description: string;
  severity: number;
  status: number;
  region?: string;
  affectedServices: string[];
  officialUrl: string;
  isActive: boolean;
  occurredAt: string;
  lastUpdatedAt: string;
  resolvedAt?: string;
}

export async function getMicrosoftGraphIncidents(): Promise<MicrosoftGraphIncident[]> {
  const response = await apiClient.get<MicrosoftGraphIncident[]>('/api/microsoft-integration/incidents');
  return response.data;
}
