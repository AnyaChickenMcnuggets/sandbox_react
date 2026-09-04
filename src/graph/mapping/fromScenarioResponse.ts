import type { Edge, Node } from "@xyflow/react";
import type { ScenarioResponse } from "../../api/types";
import { computeAutoLayout } from "../layout/autoLayout";
import { loadLayout } from "../layout/layoutStorage";
import type { StepNodeData } from "../types";
import { normalizeConfig } from "./stepConfigDefaults";

export function fromScenarioResponse(scenario: ScenarioResponse): { nodes: Node<StepNodeData>[]; edges: Edge[] } {
  const savedLayout = loadLayout(scenario.id);

  const nodes: Node<StepNodeData>[] = scenario.steps.map((step) => {
    const saved = savedLayout[String(step.id)];
    return {
      id: String(step.id),
      type: "step",
      position: saved ?? { x: 0, y: 0 },
      data: {
        localId: String(step.id),
        stepId: step.id,
        type: step.type,
        name: step.name,
        config: normalizeConfig(step.type, step.config),
      },
    };
  });

  const edges: Edge[] = scenario.steps.flatMap((step) =>
    step.nextStepIds.map((targetId) => ({
      id: `${step.id}->${targetId}`,
      source: String(step.id),
      target: String(targetId),
      type: "jelly",
    })),
  );

  // Если хотя бы одна нода без сохранённой позиции — раскладываем весь граф целиком через dagre,
  // не смешивая вручную расставленное с авто для одного и того же графа (иначе визуально рассинхронится).
  const hasUnpositioned = nodes.some((node) => savedLayout[node.id] === undefined);
  if (hasUnpositioned) {
    const positions = computeAutoLayout(nodes, edges);
    for (const node of nodes) {
      node.position = positions[node.id] ?? node.position;
    }
  }

  return { nodes, edges };
}
