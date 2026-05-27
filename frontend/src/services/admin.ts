import { apiClient } from "./apiClient";
import type {
  UserListItem,
  CreateUserPayload,
  UpdateUserPayload,
  TenantEmailConfig,
} from "../types/admin";

export async function getUsers(): Promise<UserListItem[]> {
  const response = await apiClient.get<UserListItem[]>("/api/admin/users");
  return response.data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserListItem> {
  const response = await apiClient.post<UserListItem>("/api/admin/users", payload);
  return response.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
  await apiClient.put(`/api/admin/users/${id}`, payload);
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/admin/users/${id}`);
}

export async function getEmailConfig(): Promise<TenantEmailConfig> {
  const response = await apiClient.get<TenantEmailConfig>("/api/admin/email-config");
  return response.data;
}

export async function updateEmailConfig(payload: TenantEmailConfig): Promise<void> {
  await apiClient.put("/api/admin/email-config", payload);
}
