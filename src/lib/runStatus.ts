import type { RunStatus, ScenarioStepType } from "../api/types";

export function isTerminalStatus(status: RunStatus): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "STOPPED";
}

export const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  PENDING: "Ожидание",
  RUNNING: "Выполняется",
  SUCCEEDED: "Успешно",
  FAILED: "Ошибка",
  STOPPED: "Остановлено",
};

export const STEP_TYPE_LABELS: Record<ScenarioStepType, string> = {
  JOB: "Задание",
  QUEUE: "Настроить очередь",
  QUEUE_CHECK: "Проверить очередь",
};

export const STEP_TYPE_DESCRIPTIONS: Record<ScenarioStepType, string> = {
  JOB: "Запускает проект-робота и дожидается его завершения",
  QUEUE: "Находит или создаёт очередь транзакций, опционально наполняет её",
  QUEUE_CHECK: "Поллит очередь и сравнивает фактические счётчики с ожиданиями",
};
