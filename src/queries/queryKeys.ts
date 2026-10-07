export const queryKeys = {
  scenarios: ["scenarios"] as const,
  scenario: (id: number) => ["scenarios", id] as const,
  run: (runId: number) => ["runs", runId] as const,
  runsList: ["runs", "list"] as const,
  runsPage: (scenarioId: number | undefined, page: number, size: number) =>
    ["runs", "list", scenarioId ?? "all", page, size] as const,
  queueItems: (runId: number, stepId: number, pageNumber: number) =>
    ["runs", runId, "steps", stepId, "queue-items", pageNumber] as const,
  robotsAvailability: ["orchestrator", "robots-availability"] as const,
  users: ["admin", "users"] as const,
  permissions: ["admin", "permissions"] as const,
  roles: ["admin", "roles"] as const,
};
