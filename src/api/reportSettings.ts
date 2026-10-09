import { apiClient } from "./client";
import type { ReportSettingsResponse } from "./types";

export function getReportSettings(): Promise<ReportSettingsResponse> {
  return apiClient.get<ReportSettingsResponse>("/report/settings");
}
