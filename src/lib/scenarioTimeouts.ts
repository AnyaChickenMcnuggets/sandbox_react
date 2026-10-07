import type { StepResponse } from "../api/types";

// Глобальных таймаутов на бэкенде больше нет (Sprint 29): JOB и QUEUE_CHECK без timeoutSeconds ждут
// бесконечно, пока их не остановят вручную (RUN_STOP). QUEUE таймаута не имеет вовсе.
export function countStepsWithoutTimeout(steps: StepResponse[]): number {
  return steps.filter((step) => {
    if (step.type !== "JOB" && step.type !== "QUEUE_CHECK") return false;
    const timeout = step.config.timeoutSeconds;
    return typeof timeout !== "number" || timeout <= 0;
  }).length;
}

export function formatNoTimeoutWarning(count: number): string {
  return `В сценарии шагов без таймаута (JOB/QUEUE_CHECK): ${count}. Такой прогон может идти бесконечно — остановить его можно вручную (право «Остановка прогонов»).`;
}
