import { apiClient } from "./client";
import type { ScenarioRequest, ScenarioResponse } from "./types";

export function listScenarios(): Promise<ScenarioResponse[]> {
  return apiClient.get<ScenarioResponse[]>("/scenarios");
}

export function getScenario(id: number): Promise<ScenarioResponse> {
  return apiClient.get<ScenarioResponse>(`/scenarios/${id}`);
}

export function createScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
  return apiClient.post<ScenarioResponse>("/scenarios", request);
}

export function updateScenario(id: number, request: ScenarioRequest): Promise<ScenarioResponse> {
  return apiClient.put<ScenarioResponse>(`/scenarios/${id}`, request);
}

export function deleteScenario(id: number): Promise<void> {
  return apiClient.delete<void>(`/scenarios/${id}`);
}
