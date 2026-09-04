export const queryKeys = {
  scenarios: ["scenarios"] as const,
  scenario: (id: number) => ["scenarios", id] as const,
  run: (runId: number) => ["runs", runId] as const,
  queueItems: (runId: number, stepId: number, pageNumber: number) =>
    ["runs", runId, "steps", stepId, "queue-items", pageNumber] as const,
};
