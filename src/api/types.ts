// DTO-типы, 1:1 сверены с Java record'ами бэкенда (F:\sandbox\src\main\java\com\rpatest).

export type ScenarioStepType = "JOB" | "QUEUE" | "QUEUE_CHECK";

// Один и тот же enum используется бэкендом и для Run, и для StepRun — отдельного StepRunStatus нет.
export type RunStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "STOPPED";

export type QueueItemDerivedStatus =
  | "SUCCESS"
  | "ERROR"
  | "BUSINESS_ERROR"
  | "NEW"
  | "IN_PROGRESS";

export interface JobStepConfig {
  rpaProjectId: number | null;
  rpaProjectName: string | null;
  countRobots: number | null;
  arguments: Record<string, string> | null;
}

export interface TransactionTemplate {
  naturalKey: string;
  value: unknown;
  metadata: Record<string, string> | null;
}

export interface QueueStepConfig {
  name: string;
  description: string | null;
  ttl: number | null;
  // "maxRetray" — опечатка в самом бэкенде (не maxRetry). Сохраняем как есть, это часть контракта.
  maxRetray: number | null;
  transactions: TransactionTemplate[] | null;
}

export interface QueueCheckStepConfig {
  queueName: string;
  naturalKeys: string[] | null;
  naturalKeyPrefixMatch: boolean | null;
  expectedStatusCounts: Partial<Record<QueueItemDerivedStatus, number>> | null;
  minTotalCount: number | null;
  timeoutSeconds: number | null;
  pollIntervalSeconds: number | null;
}

export type StepConfig = JobStepConfig | QueueStepConfig | QueueCheckStepConfig;

export interface StepRequest {
  localId: string;
  type: ScenarioStepType;
  name: string;
  config: Record<string, unknown>;
  nextLocalIds: string[] | null;
}

export interface ScenarioRequest {
  name: string;
  description: string | null;
  steps: StepRequest[];
}

export interface StepResponse {
  id: number;
  type: ScenarioStepType;
  name: string;
  config: Record<string, unknown>;
  nextStepIds: number[];
}

export interface ScenarioResponse {
  id: number;
  name: string;
  description: string | null;
  createdAt: string; // OffsetDateTime
  updatedAt: string; // OffsetDateTime
  steps: StepResponse[];
}

export interface RunRequest {
  triggeredBy: string | null;
}

export interface StepRunResponse {
  stepId: number;
  stepName: string;
  stepType: ScenarioStepType;
  status: RunStatus;
  detail: string | null;
  detailUpdatedAt: string | null; // OffsetDateTime
  orchestratorAssignmentId: number | null;
  orchestratorQueueId: string | null; // UUID
  startedAt: string | null; // OffsetDateTime
  finishedAt: string | null; // OffsetDateTime
  errorMessage: string | null;
}

export interface RunResponse {
  id: number;
  scenarioId: number;
  status: RunStatus;
  startedAt: string | null; // OffsetDateTime
  finishedAt: string | null; // OffsetDateTime
  steps: StepRunResponse[];
}

export interface CleanupResponse {
  success: boolean;
  failures: string[];
}

export interface QueueItemResponse {
  id: string; // UUID
  naturalKey: string;
  value: string;
  createdAt: string; // ВНИМАНИЕ: LocalDateTime БЕЗ offset — не OffsetDateTime, парсить отдельно (см. lib/dates.ts)
  lastEventType: string | null;
  lastEventText: string | null;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details: string[];
}
