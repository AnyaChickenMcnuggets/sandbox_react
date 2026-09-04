import type {
  JobStepConfig,
  QueueCheckStepConfig,
  QueueStepConfig,
  ScenarioStepType,
  StepConfig,
} from "../../api/types";

export function defaultJobConfig(): JobStepConfig {
  return { rpaProjectId: null, rpaProjectName: null, countRobots: null, arguments: null };
}

export function defaultQueueConfig(): QueueStepConfig {
  return { name: "", description: null, ttl: null, maxRetray: null, transactions: null };
}

export function defaultQueueCheckConfig(): QueueCheckStepConfig {
  return {
    queueName: "",
    naturalKeys: null,
    naturalKeyPrefixMatch: false,
    expectedStatusCounts: null,
    minTotalCount: null,
    timeoutSeconds: null,
    pollIntervalSeconds: null,
  };
}

export function defaultConfigForType(type: ScenarioStepType): StepConfig {
  switch (type) {
    case "JOB":
      return defaultJobConfig();
    case "QUEUE":
      return defaultQueueConfig();
    case "QUEUE_CHECK":
      return defaultQueueCheckConfig();
  }
}

// Бэкенд отдаёт config как Map<String,Object> — гарантированно только те поля, что реально были
// сохранены. Мержим с дефолтами по типу, чтобы формы редактора всегда получали полный объект.
export function normalizeConfig(type: ScenarioStepType, raw: Record<string, unknown>): StepConfig {
  return { ...defaultConfigForType(type), ...raw } as StepConfig;
}

export const DEFAULT_STEP_NAME: Record<ScenarioStepType, string> = {
  JOB: "Новый JOB-шаг",
  QUEUE: "Новый QUEUE-шаг",
  QUEUE_CHECK: "Новый QUEUE_CHECK-шаг",
};
