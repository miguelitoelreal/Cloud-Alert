import { apiClient } from './apiClient';
import type { Customer, CreateCustomerPayload, UpdateCustomerPayload } from '../types/customer';

export async function getCustomers(): Promise<Customer[]> {
  const response = await apiClient.get<Customer[]>('/api/customers');
  return response.data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await apiClient.get<Customer>(`/api/customers/${id}`);
  return response.data;
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const response = await apiClient.post<Customer>('/api/customers', payload);
  return response.data;
}

export async function updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<Customer> {
  const response = await apiClient.put<Customer>(`/api/customers/${id}`, payload);
  return response.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiClient.delete(`/api/customers/${id}`);
}
