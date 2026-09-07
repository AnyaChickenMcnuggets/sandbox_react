import type { Edge, Node } from "@xyflow/react";
import type { RunResponse } from "../../api/types";
import type { StepNodeData } from "../types";

// RunResponse.steps приходит по stepId, а не по nodeId холста — nodeId статичного графа
// сценария (fromScenarioResponse) уже равен String(stepId), так что сопоставление прямое.
export function applyRunOverlay(
  scenarioNodes: Node<StepNodeData>[],
  scenarioEdges: Edge[],
  run: RunResponse,
): { nodes: Node<StepNodeData>[]; edges: Edge[] } {
  const byStepId = new Map(run.steps.map((s) => [s.stepId, s]));

  const nodes: Node<StepNodeData>[] = scenarioNodes.map((node) => {
    const stepRun = node.data.stepId !== undefined ? byStepId.get(node.data.stepId) : undefined;
    if (!stepRun) return node;
    return {
      ...node,
      data: {
        ...node.data,
        runtime: {
          status: stepRun.status,
          detail: stepRun.detail,
          errorMessage: stepRun.errorMessage,
          orchestratorQueueId: stepRun.orchestratorQueueId,
          orchestratorQueueOwned: stepRun.orchestratorQueueOwned,
          orchestratorAssignmentId: stepRun.orchestratorAssignmentId,
          startedAt: stepRun.startedAt,
          finishedAt: stepRun.finishedAt,
        },
      },
    };
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const edges: Edge[] = scenarioEdges.map((edge) => {
    const sourceStatus = nodeById.get(edge.source)?.data.runtime?.status;
    return { ...edge, data: { ...edge.data, animated: sourceStatus === "RUNNING" } };
  });

  return { nodes, edges };
}
