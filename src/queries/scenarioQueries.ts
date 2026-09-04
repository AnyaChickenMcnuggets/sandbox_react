import { useQuery } from "@tanstack/react-query";
import { getScenario, listScenarios } from "../api/scenarios";
import { queryKeys } from "./queryKeys";

export function useScenarios() {
  return useQuery({
    queryKey: queryKeys.scenarios,
    queryFn: listScenarios,
  });
}

export function useScenario(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.scenario(id ?? -1),
    queryFn: () => getScenario(id as number),
    enabled: id !== undefined,
  });
}
