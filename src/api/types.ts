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
  // triggeredBy убран (Sprint 26) — бэкенд больше не принимает его от клиента, сам берёт имя из
  // токена аутентификации.
  // Запуск с произвольного шага DAG вместо корней — шаги "до" точки старта остаются PENDING до
  // конца прогона (движок их не трогает). Фронт не валидирует принадлежность/существование шага —
  // это делает бэкенд (404/400), фронт только явно предупреждает пользователя перед запуском.
  startStepId?: number | null;
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
  // true — очередь реально создана ЭТИМ прогоном (cleanup её удалит); false — переиспользована уже
  // существовавшая под тем же именем (cleanup её не тронет). Шаги QUEUE_CHECK всегда false — они
  // никогда не "владеют" очередью, даже если создали пустую для проверки.
  orchestratorQueueOwned: boolean;
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
  // Не null, если прогон запущен не с корней DAG, а с конкретного шага (см. RunRequest.startStepId).
  startStepId: number | null;
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

export interface RobotsAvailabilityResponse {
  freeRobots: number;
  totalRobots: number;
  minFreeRobots: number;
  // Вычисляется бэкендом тем же кодом, что и реальная проверка при POST /run — можно дизейблить
  // кнопку "Запустить" прямо по этому полю, не пересчитывая условие самостоятельно. Не резервирует
  // роботов — доступность между опросом и кликом может измениться (см. 409 на POST /run).
  launchAllowed: boolean;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details: string[];
}

// --- Аутентификация (Sprint 26) ---------------------------------------------------------------

export type UserRole = "VIEWER" | "OPERATOR" | "ADMIN";

export interface LoginRequest {
  username: string;
  password: string;
}

// Sprint 27: токены — в HttpOnly-куках (Set-Cookie), тело ответа их больше не содержит. Фронт
// токены не хранит и не видит вообще, см. lib/authStore.ts.
export interface TokenResponse {
  expiresInSeconds: number;
}

// Sprint 27: без тела — refresh/access-токены сервер берёт из куки сам.
export interface MeResponse {
  username: string;
  role: UserRole;
}

export interface UserResponse {
  id: number;
  username: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string; // OffsetDateTime
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateRoleRequest {
  role: UserRole;
}

export interface UpdateEnabledRequest {
  enabled: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
