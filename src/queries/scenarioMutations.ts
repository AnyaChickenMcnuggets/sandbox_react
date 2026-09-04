import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createScenario, deleteScenario, updateScenario } from "../api/scenarios";
import type { ScenarioRequest } from "../api/types";
import { queryKeys } from "./queryKeys";

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ScenarioRequest) => createScenario(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
    },
  });
}

export function useUpdateScenario(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ScenarioRequest) => updateScenario(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
      queryClient.invalidateQueries({ queryKey: queryKeys.scenario(id) });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteScenario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scenarios });
    },
  });
}
