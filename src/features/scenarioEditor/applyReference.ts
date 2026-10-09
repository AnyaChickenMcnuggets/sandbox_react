import type { Node } from "@xyflow/react";
import type { QueueCheckStepConfig, QueueStepConfig } from "../../api/types";
import type { StepNodeData } from "../../graph/types";

export interface ReferenceImpact {
  // Транзакции шагов QUEUE, чей naturalKey будет перезаписан
  transactions: number;
  // Шаги QUEUE_CHECK, у которых naturalKeys/prefixMatch будут перезаписаны
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

// Общий референс сценария = префикс naturalKey: транзакции шагов QUEUE получают "<ref>-1", "<ref>-2"…
// (нумерация внутри шага), а каждый QUEUE_CHECK ищет их по префиксу (naturalKeys=[ref] +
// naturalKeyPrefixMatch=true) — так один прогон сценария не пересекается с другими. Бэкенд не хранит
// референс сценария отдельным полем, это разовая массовая подстановка в config шагов.
export function applyScenarioReference(nodes: Node<StepNodeData>[], reference: string): Node<StepNodeData>[] {
  return nodes.map((node) => {
    if (node.data.type === "QUEUE") {
      const config = node.data.config as QueueStepConfig;
      if (!config.transactions || config.transactions.length === 0) return node;
      const transactions = config.transactions.map((t, i) => ({ ...t, naturalKey: `${reference}-${i + 1}` }));
      return { ...node, data: { ...node.data, config: { ...config, transactions } } };
    }
    if (node.data.type === "QUEUE_CHECK") {
      const config = node.data.config as QueueCheckStepConfig;
      return {
        ...node,
        data: { ...node.data, config: { ...config, naturalKeys: [reference], naturalKeyPrefixMatch: true } },
      };
    }
    return node;
  });
}
