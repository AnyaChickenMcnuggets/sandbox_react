import type { Node } from "@xyflow/react";
import type { QueueCheckStepConfig, QueueStepConfig } from "../../api/types";
import type { StepNodeData } from "../../graph/types";

export interface ReferenceImpact {
  // Транзакции шагов QUEUE, чей naturalKey будет перезаписан
  transactions: number;
  // Шаги QUEUE_CHECK, у которых naturalKeys будут перезаписаны
  checks: number;
}

export function countReferenceImpact(nodes: Node<StepNodeData>[]): ReferenceImpact {
  let transactions = 0;
  let checks = 0;
  for (const node of nodes) {
    if (node.data.type === "QUEUE") {
      transactions += (node.data.config as QueueStepConfig).transactions?.length ?? 0;
    } else if (node.data.type === "QUEUE_CHECK") {
      checks += 1;
    }
  }
  return { transactions, checks };
}

// Референс подставляется как есть: naturalKey каждой транзакции QUEUE и naturalKeys каждого
// QUEUE_CHECK. Бэкенд не хранит референс отдельным полем — это разовая массовая подстановка в config.
export function applyScenarioReference(nodes: Node<StepNodeData>[], reference: string): Node<StepNodeData>[] {
  return nodes.map((node) => {
    if (node.data.type === "QUEUE") {
      const config = node.data.config as QueueStepConfig;
      if (!config.transactions || config.transactions.length === 0) return node;
      const transactions = config.transactions.map((t) => ({ ...t, naturalKey: reference }));
      return { ...node, data: { ...node.data, config: { ...config, transactions } } };
    }
    if (node.data.type === "QUEUE_CHECK") {
      const config = node.data.config as QueueCheckStepConfig;
      return { ...node, data: { ...node.data, config: { ...config, naturalKeys: [reference] } } };
    }
    return node;
  });
}
