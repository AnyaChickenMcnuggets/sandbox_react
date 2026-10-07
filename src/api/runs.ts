import { apiClient } from "./client";
import type { PageResponse, QueueItemResponse, RunRequest, RunResponse, RunSummaryResponse } from "./types";

export function listRuns(params: { scenarioId?: number; page: number; size: number }): Promise<PageResponse<RunSummaryResponse>> {
  return apiClient.get<PageResponse<RunSummaryResponse>>("/runs", params);
}

export function startRun(scenarioId: number, request?: RunRequest): Promise<RunResponse> {
  return apiClient.post<RunResponse>(`/scenarios/${scenarioId}/run`, request);
}

export function getRun(runId: number): Promise<RunResponse> {
  return apiClient.get<RunResponse>(`/runs/${runId}`);
}

export function stopRun(runId: number): Promise<RunResponse> {
  return apiClient.post<RunResponse>(`/runs/${runId}/stop`);
}

export function getQueueItems(
  runId: number,
  stepId: number,
  pageNumber = 0,
  pageSize = 100,
): Promise<QueueItemResponse[]> {
  return apiClient.get<QueueItemResponse[]>(`/runs/${runId}/steps/${stepId}/queue-items`, {
    pageNumber,
    pageSize,
  });
}
