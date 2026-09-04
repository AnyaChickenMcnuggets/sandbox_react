import { apiClient } from "./client";
import type { CleanupResponse } from "./types";

export function cleanupScenario(scenarioId: number): Promise<CleanupResponse> {
  return apiClient.post<CleanupResponse>(`/scenarios/${scenarioId}/cleanup`);
}
