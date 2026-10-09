import { useQuery } from "@tanstack/react-query";
import { getReportSettings } from "../api/reportSettings";
import { queryKeys } from "./queryKeys";

// Настройка сервера (включена ли почта) меняется только рестартом бэкенда — не перезапрашиваем.
export function useReportSettings() {
  return useQuery({
    queryKey: queryKeys.reportSettings,
    queryFn: getReportSettings,
    staleTime: Infinity,
    meta: { silent: true },
  });
}
