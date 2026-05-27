import { apiClient } from "./apiClient";
import type {
  CloudIncidentTranslationDto,
  CloudIncidentTranslationRequestDto,
  CloudStatusOverviewDto,
} from "../types/cloudStatus";

type CloudStatusOverviewParams = {
  provider?: string;
  severity?: number;
  activeOnly?: boolean;
  take?: number;
};

type TranslationCacheEntry = {
  expiresAt: number;
  value: CloudIncidentTranslationDto;
};

const TRANSLATION_CACHE_TTL_MS = 5 * 60_000;
const translationCache = new Map<string, TranslationCacheEntry>();
const inFlightTranslations = new Map<
  string,
  Promise<CloudIncidentTranslationDto>
>();

function buildTranslationKey(
  payload: CloudIncidentTranslationRequestDto,
): string {
  const incidentId =
    payload.incidentId?.trim().toLowerCase() || "no-incident-id";
  return `${incidentId}:${payload.title}\n${payload.description}`;
}

function getCachedTranslation(key: string): CloudIncidentTranslationDto | null {
  const cached = translationCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    translationCache.delete(key);
    return null;
  }

  return cached.value;
}

function storeCachedTranslation(
  key: string,
  value: CloudIncidentTranslationDto,
): CloudIncidentTranslationDto {
  translationCache.set(key, {
    value,
    expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS,
  });

  return value;
}

export async function getCloudStatusOverview(
  params: CloudStatusOverviewParams = {},
): Promise<CloudStatusOverviewDto> {
  const res = await apiClient.get<CloudStatusOverviewDto>(
    "/api/cloud-status/overview",
    {
      params,
    },
  );

  return res.data;
}

export async function refreshCloudStatus(): Promise<void> {
  await apiClient.post("/api/cloud-status/refresh");
}

export async function translateCloudIncident(
  payload: CloudIncidentTranslationRequestDto,
): Promise<CloudIncidentTranslationDto> {
  const key = buildTranslationKey(payload);
  const cached = getCachedTranslation(key);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightTranslations.get(key);
  if (inFlight) {
    return inFlight;
  }

  const request = apiClient
    .post<CloudIncidentTranslationDto>("/api/cloud-status/translate", payload)
    .then((res) => storeCachedTranslation(key, res.data))
    .finally(() => {
      inFlightTranslations.delete(key);
    });

  inFlightTranslations.set(key, request);
  return request;
}
