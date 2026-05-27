import { apiClient } from "./apiClient";
import type {
  AlertRule,
  AlertHistory,
  CreateAlertRulePayload,
  UpdateAlertRulePayload,
  UserAlertPreference,
  CloudProviderOption,
} from "../types/alerts";

export async function getAlertRules(): Promise<AlertRule[]> {
  const res = await apiClient.get("/api/alerts/rules");
  return res.data;
}

export async function createAlertRule(
  payload: CreateAlertRulePayload,
): Promise<AlertRule> {
  const res = await apiClient.post("/api/alerts/rules", payload);
  return res.data;
}

export async function updateAlertRule(
  id: string,
  payload: UpdateAlertRulePayload,
): Promise<AlertRule> {
  const res = await apiClient.put(`/api/alerts/rules/${id}`, payload);
  return res.data;
}

export async function deleteAlertRule(id: string): Promise<void> {
  await apiClient.delete(`/api/alerts/rules/${id}`);
}

export async function getAlertHistory(limit = 50): Promise<AlertHistory[]> {
  const res = await apiClient.get(`/api/alerts/history`, { params: { limit } });
  return res.data;
}

export async function getMyAlertPreferences(): Promise<UserAlertPreference> {
  const res = await apiClient.get("/api/alerts/preferences");
  return res.data;
}

export async function updateMyAlertPreferences(
  payload: UserAlertPreference,
): Promise<void> {
  await apiClient.put("/api/alerts/preferences", payload);
}

export async function getCloudProviderOptions(): Promise<CloudProviderOption[]> {
  const res = await apiClient.get("/api/alerts/cloud-providers");
  return res.data;
}

export async function sendTestAlert(type: "auto" | "monitor" | "critical" | "major"): Promise<{ message: string; recipients: string[]; simulatedType: string }> {
  const res = await apiClient.post("/api/alerts/test-alert", { type });
  return res.data;
}
