import { useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, useMotionValue, animate } from "framer-motion";
import clsx from "clsx";
import type { StepNodeData } from "../types";
import { STEP_TYPE_LABELS } from "../../lib/runStatus";
import { StepNodeBadge } from "./StepNodeBadge";
import { collisionBus } from "../collisionBus";
import "./stepNode.css";

const TYPE_CLASS: Record<StepNodeData["type"], string> = {
  JOB: "step-node-job",
  QUEUE: "step-node-queue",
  QUEUE_CHECK: "step-node-queue-check",
};

const RUNTIME_CLASS: Record<string, string> = {
  PENDING: "step-node-runtime-pending",
  RUNNING: "step-node-runtime-running",
  SUCCEEDED: "step-node-runtime-succeeded",
  FAILED: "step-node-runtime-failed",
  STOPPED: "step-node-runtime-stopped",
};

// Чувствительность "резинового" растяжения к скорости перетаскивания и предел, чтобы нода не
// расплющивалась в блин на резком рывке мыши.
const DRAG_STRETCH_SENSITIVITY = 7;
const MAX_STRETCH = 0.34;

export function StepNode({
  id,
  data,
  selected,
  dragging,
  positionAbsoluteX,
  positionAbsoluteY,
}: NodeProps<Node<StepNodeData>>) {
  const { type, name, runtime } = data;
  const isViewMode = runtime !== undefined;
  const hasQueueAudit = runtime?.orchestratorQueueId != null;

  // Инерция при драге: сквош/стретч по осям пропорционально скорости движения ноды, с пружинным
  // "отскоком" (перелётом) при отпускании — это отдельный слой трансформаций поверх основной
  // ноды, чтобы не конфликтовать с её собственными whileHover/whileTap/RUNNING-анимациями.
  const dragScaleX = useMotionValue(1);
  const dragScaleY = useMotionValue(1);
  // null вместо performance.now() в инициализаторе — useRef(initialValue) вычисляет initialValue
  // на каждый рендер (даже если использует его только при первом), нельзя звать impure-функцию там.
  const prevRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    const now = performance.now();
    const prev = prevRef.current;

    if (dragging && prev) {
      const dt = Math.max(now - prev.t, 8);
      const speedX = (positionAbsoluteX - prev.x) / dt;
      const speedY = (positionAbsoluteY - prev.y) / dt;
      const stretchX = Math.max(-MAX_STRETCH, Math.min(MAX_STRETCH, speedX * DRAG_STRETCH_SENSITIVITY));
      const stretchY = Math.max(-MAX_STRETCH, Math.min(MAX_STRETCH, speedY * DRAG_STRETCH_SENSITIVITY));
      dragScaleX.set(1 + stretchX - stretchY * 0.35);
      dragScaleY.set(1 + stretchY - stretchX * 0.35);
      wasDraggingRef.current = true;
    } else if (wasDraggingRef.current) {
      animate(dragScaleX, 1, { type: "spring", stiffness: 300, damping: 7, mass: 0.9 });
      animate(dragScaleY, 1, { type: "spring", stiffness: 300, damping: 7, mass: 0.9 });
      wasDraggingRef.current = false;
    }
    prevRef.current = { x: positionAbsoluteX, y: positionAbsoluteY, t: now };
  }, [dragging, positionAbsoluteX, positionAbsoluteY, dragScaleX, dragScaleY]);

  // Коллизия с соседней нодой (см. ScenarioGraph.handleNodeDrag) — короткий импульс сжатия/отскока
  // на этих же motion values, будто соседний желейный блок толкнули.
  useEffect(() => {
    return collisionBus.subscribe(id, () => {
      animate(dragScaleX, [1, 0.83, 1.08, 0.96, 1], { duration: 0.5, ease: "easeOut" });
      animate(dragScaleY, [1, 1.14, 0.9, 1.04, 1], { duration: 0.5, ease: "easeOut" });
    });
  }, [id, dragScaleX, dragScaleY]);

  return (
    <motion.div style={{ scaleX: dragScaleX, scaleY: dragScaleY }}>
      <motion.div
        className={clsx(
          "step-node",
          TYPE_CLASS[type],
          runtime && RUNTIME_CLASS[runtime.status],
          selected && "step-node-selected",
          hasQueueAudit && "step-node-clickable",
        )}
        whileHover={{ scale: 1.06, y: -4, rotate: [0, -1.2, 1.2, 0] }}
        whileTap={{ scaleX: 1.1, scaleY: 0.88, y: 1 }}
        animate={
          runtime?.status === "RUNNING"
            ? { scale: [1, 1.02, 1] }
            : { scale: 1 }
        }
        transition={
          runtime?.status === "RUNNING"
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { type: "spring", stiffness: 260, damping: 10, mass: 0.8 }
        }
      >
        <Handle type="target" position={Position.Left} />
        <div className="step-node-header">
          <span className="step-node-type-label">{STEP_TYPE_LABELS[type]}</span>
          {runtime ? <StepNodeBadge status={runtime.status} /> : null}
        </div>
        <div className="step-node-name">{name}</div>
        {isViewMode ? (
          <div className="step-node-detail">
            {runtime.errorMessage ? (
              <span className="step-node-error">{runtime.errorMessage}</span>
            ) : runtime.detail ? (
              <span>{runtime.detail}</span>
            ) : (
              <span className="step-node-detail-empty">—</span>
            )}
          </div>
        ) : null}
        {hasQueueAudit ? <div className="step-node-queue-hint">Клик — транзакции очереди</div> : null}
        <Handle type="source" position={Position.Right} />
      </motion.div>
    </motion.div>
  );
}
