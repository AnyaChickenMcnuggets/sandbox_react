import type { Node } from "@xyflow/react";
import type { StepNodeData } from "../types";

// Приблизительные габариты ноды (см. stepNode.css: width: 240px; высота — авто по контенту, 110 —
// грубая оценка типичной ноды). Общий дом для двух мест, которым нужно "перекрываются ли два узла
// графа": драг-коллизия в ScenarioGraph (толкает соседей) и поиск свободного места при дропе из
// палитры в ScenarioEditorPage (не даёт новой ноде лечь на существующую, пряча под собой рёбра —
// xyflow рисует edges слоем под nodes).
export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 110;

export function boxesOverlap(a: { x: number; y: number }, b: { x: number; y: number }, margin: number): boolean {
  return Math.abs(a.x - b.x) < NODE_WIDTH + margin && Math.abs(a.y - b.y) < NODE_HEIGHT + margin;
}

const DROP_NUDGE_STEP = 36;
const DROP_NUDGE_MAX_ATTEMPTS = 24;

// Дроп из палитры — точка курсора в момент отпускания, без всякой защиты от попадания прямо на уже
// существующую ноду. Перекрывшая нода не просто выглядит неряшливо — xyflow рисует edges слоем ПОД
// nodes, поэтому любое ребро, проходящее в этом месте, прячется под новой нодой целиком или частично.
// Со стороны пользователя это читалось как "связь не появилась", хотя onConnect отработал корректно
// — связь просто пряталась под соседним блоком, и становилась видна только после save→reload, когда
// раскладка пересчитывалась заново. Ищем ближайшую точку по диагонали от желаемой, где новая нода не
// перекроет ни одну существующую.
export function findFreeDropPosition(
  desired: { x: number; y: number },
  nodes: Node<StepNodeData>[],
  margin: number,
): { x: number; y: number } {
  let position = desired;
  for (let attempt = 0; attempt < DROP_NUDGE_MAX_ATTEMPTS; attempt++) {
    const overlapping = nodes.some((n) => boxesOverlap(position, n.position, margin));
    if (!overlapping) return position;
    position = { x: position.x + DROP_NUDGE_STEP, y: position.y + DROP_NUDGE_STEP };
  }
  return position;
}
