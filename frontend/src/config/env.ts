const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (rawApiBaseUrl ?? "").trim().replace(/\/$/, "");

export function buildApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getMonitoringHubUrl(): string {
  return buildApiUrl("/hubs/monitoring");
}

export function assertEnv(): void {
  if (!API_BASE_URL) {
    console.warn(
      "Cloud Alert Hub: Missing VITE_API_BASE_URL. Create frontend/.env.local with VITE_API_BASE_URL=http://localhost:5242",
    );
  }
}
