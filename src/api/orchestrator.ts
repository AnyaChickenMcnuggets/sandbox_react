import { apiClient } from "./client";
import type { RobotsAvailabilityResponse } from "./types";

export function getRobotsAvailability(): Promise<RobotsAvailabilityResponse> {
  return apiClient.get<RobotsAvailabilityResponse>("/orchestrator/robots-availability");
}
