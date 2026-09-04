import type { Edge, Node } from "@xyflow/react";
import type { ScenarioRequest } from "../../api/types";
import type { StepNodeData } from "../types";

export function toScenarioRequest(
  nodes: Node<StepNodeData>[],
  edges: Edge[],
  name: string,
  description: string | null,
): ScenarioRequest {
  return {
    name,
    description,
    steps: nodes.map((node) => ({
      localId: node.data.localId,
      type: node.data.type,
      name: node.data.name,
      config: node.data.config as unknown as Record<string, unknown>,
      nextLocalIds: edges
        .filter((edge) => edge.source === node.id)
        .map((edge) => {
          const targetNode = nodes.find((n) => n.id === edge.target);
          return targetNode?.data.localId;
        })
        .filter((id): id is string => id !== undefined),
    })),
  };
}

// После успешного create/update — zip позиций нод (в том же порядке, в котором собирался
// request.steps) с id шагов из ответа, чтобы перезаписать layoutStorage свежими id.
export function zipStepIdsWithPositions(
  nodes: Node<StepNodeData>[],
  responseStepIds: number[],
): Record<number, { x: number; y: number }> {
  const positions: Record<number, { x: number; y: number }> = {};
  nodes.forEach((node, index) => {
    const stepId = responseStepIds[index];
    if (stepId !== undefined) {
      positions[stepId] = { x: node.position.x, y: node.position.y };
    }
  });
  return positions;
}
