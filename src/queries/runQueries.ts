import { keepPreviousData, useQuery, type Query } from "@tanstack/react-query";
import { getQueueItems, getRun, listRuns } from "../api/runs";
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

const LIST_POLL_INTERVAL_MS = 5000;

// Список обновляется поллингом — строки показывают живой статус, как раньше делал useRun на строку.
// enabled=false — нет права RUN_READ, эндпоинт ответил бы 403.
export function useRuns(params: { scenarioId?: number; page: number; size: number }, enabled = true) {
  return useQuery({
    queryKey: queryKeys.runsPage(params.scenarioId, params.page, params.size),
    queryFn: () => listRuns(params),
    enabled,
    placeholderData: keepPreviousData,
    refetchInterval: LIST_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}

// Самый свежий запуск сценария (для кнопки "Последний запуск") — без поллинга, обновляется
// инвалидацией runsList при старте нового запуска (см. useStartRun).
export function useLastRun(scenarioId: number | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: queryKeys.runsPage(scenarioId, 0, 1),
    queryFn: () => listRuns({ scenarioId, page: 0, size: 1 }),
    enabled: enabled && scenarioId !== undefined,
    staleTime: 15_000,
    meta: { silent: true },
  });
  return query.data?.content[0];
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
