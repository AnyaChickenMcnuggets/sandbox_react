import { useQuery, type Query } from "@tanstack/react-query";
import { getQueueItems, getRun } from "../api/runs";
import type { RunResponse } from "../api/types";
import { isTerminalStatus } from "../lib/runStatus";
import { queryKeys } from "./queryKeys";

const POLL_INTERVAL_MS = 2500;

export function useRun(runId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.run(runId ?? -1),
    queryFn: () => getRun(runId as number),
    enabled: runId !== undefined,
    refetchInterval: (query: Query<RunResponse, Error>) => {
      const status = query.state.data?.status;
      if (status && isTerminalStatus(status)) return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
    meta: { silent: true }, // ошибки полинга обрабатываются через ErrorBanner на странице, не тостами на каждый тик
  });
}

export function useQueueItems(
  runId: number | undefined,
  stepId: number | undefined,
  pageNumber: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.queueItems(runId ?? -1, stepId ?? -1, pageNumber),
    queryFn: () => getQueueItems(runId as number, stepId as number, pageNumber),
    enabled: enabled && runId !== undefined && stepId !== undefined,
  });
}
