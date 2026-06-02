import { apiClient } from "./apiClient";

export interface MonitorAlert {
  id: string;
  name: string;
}

export interface CloudIncidentAlert {
  id: string;
  title: string;
  providerName: string;
  severity: number;
}

export interface AlertsSummary {
  offlineMonitors: MonitorAlert[];
  activeCloudIncidents: CloudIncidentAlert[];
  slaBreaches: number;
  total: number;
}

export async function getAlertsSummary(): Promise<AlertsSummary> {
  const res = await apiClient.get<AlertsSummary>("/api/dashboard/alerts-summary");
  return res.data;
}
