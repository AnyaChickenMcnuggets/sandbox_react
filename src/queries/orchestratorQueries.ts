import { useQuery } from "@tanstack/react-query";
import { getRobotsAvailability } from "../api/orchestrator";
import type { RobotsAvailabilityResponse } from "../api/types";
import { usePermission } from "../lib/authStore";
import { queryKeys } from "./queryKeys";

const POLL_INTERVAL_MS = 7000;

// Дешёвый, без побочных эффектов эндпоинт — опрашивается везде, где показана кнопка "Запустить"
// (список сценариев, редактор). React Query дедуплицирует несколько одновременных вызовов хука с
// одним и тем же queryKey в один реальный HTTP-запрос (тот же паттерн, что useRun в
// RunHistoryRow — каждая карточка/строка сама вызывает хук, отдельный "поднятый наверх" стор не
// понадобился). Поллинг сам останавливается, когда последний наблюдатель (компонент) размонтирован
// — специально ничего останавливать на unmount не нужно, это поведение React Query по умолчанию.
export function useRobotsAvailability() {
  // Без права ORCHESTRATOR_READ эндпоинт отвечает 403 — не поллим вовсе; data остаётся undefined,
  // индикатор не рисуется, кнопка запуска не блокируется по роботам (это решает бэкенд на POST /run).
  const allowed = usePermission("ORCHESTRATOR_READ");
  return useQuery({
    queryKey: queryKeys.robotsAvailability,
    queryFn: getRobotsAvailability,
    enabled: allowed,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    meta: { silent: true }, // недоступность этого эндпоинта не должна спамить тостами каждые 7с
  });
}

export function formatRobotsAvailability(data: RobotsAvailabilityResponse): string {
  return `Недостаточно свободных роботов: ${data.freeRobots} из ${data.totalRobots} (нужно минимум ${data.minFreeRobots})`;
}
