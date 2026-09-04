import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cleanupScenario } from "../api/cleanup";
import { startRun, stopRun } from "../api/runs";
import type { RunRequest } from "../api/types";
import { queryKeys } from "./queryKeys";

export function useStartRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { scenarioId: number; request?: RunRequest }) => startRun(vars.scenarioId, vars.request),
    onSuccess: (run) => {
      queryClient.setQueryData(queryKeys.run(run.id), run);
    },
  });
}

export function useStopRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: number) => stopRun(runId),
    onSuccess: (run) => {
      queryClient.setQueryData(queryKeys.run(run.id), run);
    },
  });
}

export function useCleanupScenario() {
  return useMutation({
    mutationFn: (scenarioId: number) => cleanupScenario(scenarioId),
  });
}
