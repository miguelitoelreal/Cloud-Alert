import { apiClient } from "./apiClient";
import type { NetworkInfoResponseDto } from "../types/networkInfo";

export async function getNetworkInfo(url: string): Promise<NetworkInfoResponseDto> {
  const response = await apiClient.get<NetworkInfoResponseDto>("/api/networkinfo/lookup", {
    params: { url },
  });
  return response.data;
}
