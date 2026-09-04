import type { RunStatus, ScenarioStepType, StepConfig } from "../api/types";

export interface StepRuntimeOverlay {
  status: RunStatus;
  detail: string | null;
  errorMessage: string | null;
  orchestratorQueueId: string | null;
  orchestratorAssignmentId: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

// Единая форма данных ноды, общая для редактора (mode='edit') и монитора (mode='view').
// stepId появляется только после сохранения сценария на бэкенде; runtime — только в мониторе.
export interface StepNodeData extends Record<string, unknown> {
  localId: string;
  stepId?: number;
  type: ScenarioStepType;
  name: string;
  config: StepConfig;
  runtime?: StepRuntimeOverlay;
}
