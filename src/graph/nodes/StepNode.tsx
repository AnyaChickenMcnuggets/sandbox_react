import { useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
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

// Чувствительность растяжения к скорости перетаскивания и жёсткий потолок — clamp внутри
// useTransform ниже гарантирует, что при любом (даже перелетевшем через 0) значении motion value
// видимый scale никогда не уйдёт в инверсию ("вывернутая" нода) и не "раздуется" сверх меры.
const DRAG_STRETCH_SENSITIVITY = 6;
const MAX_STRETCH = 0.3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

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

  // Инерция при драге: растяжение вдоль направления реального движения мыши (не по осям X/Y
  // независимо — раньше это давало "странную" диагональную деформацию, не совпадающую с
  // визуальным направлением жеста). Технически — поворот на угол движения, растяжение вдоль
  // локальной оси X, обратный поворот, чтобы контент остался читаемым. `stretch` всегда клампится
  // и на входе, и внутри useTransform (двойная защита от "вывернутой" ноды при перелёте пружины).
  const stretch = useMotionValue(0);
  const angle = useMotionValue(0);
  const scaleX = useTransform(stretch, (s) => 1 + clamp(s, 0, MAX_STRETCH));
  const scaleY = useTransform(stretch, (s) => 1 - clamp(s, 0, MAX_STRETCH) * 0.5);
  const counterAngle = useTransform(angle, (a) => -a);

  const prevRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    const now = performance.now();
    const prev = prevRef.current;

    if (dragging && prev) {
      const dt = Math.max(now - prev.t, 8);
      const vx = (positionAbsoluteX - prev.x) / dt;
      const vy = (positionAbsoluteY - prev.y) / dt;
      const speed = Math.hypot(vx, vy);
      if (speed > 0.01) {
        angle.set((Math.atan2(vy, vx) * 180) / Math.PI);
      }
      stretch.set(clamp(speed * DRAG_STRETCH_SENSITIVITY, 0, MAX_STRETCH));
      wasDraggingRef.current = true;
    } else if (wasDraggingRef.current) {
      // Умеренный damping — пружина оседает с лёгким перелётом, но clamp в useTransform не даёт
      // даже кратковременному отрицательному перелёту превратиться в визуальную инверсию.
      animate(stretch, 0, { type: "spring", stiffness: 220, damping: 13, mass: 0.8 });
      wasDraggingRef.current = false;
    }
    prevRef.current = { x: positionAbsoluteX, y: positionAbsoluteY, t: now };
  }, [dragging, positionAbsoluteX, positionAbsoluteY, angle, stretch]);

  // Коллизия с соседней нодой (см. ScenarioGraph.handleNodeDrag) — направленный импульс: соседа
  // "толкает" в ту сторону, откуда пришла перетаскиваемая нода.
  useEffect(() => {
    return collisionBus.subscribe(id, (pushAngle) => {
      if (pushAngle !== undefined) angle.set(pushAngle);
      animate(stretch, [0, MAX_STRETCH * 1.15, 0], { duration: 0.45, ease: "easeOut" });
    });
  }, [id, angle, stretch]);

  return (
    <motion.div style={{ rotate: angle }}>
      <motion.div style={{ scaleX, scaleY, rotate: counterAngle }}>
        <motion.div
          className={clsx(
            "step-node",
            TYPE_CLASS[type],
            runtime && RUNTIME_CLASS[runtime.status],
            selected && "step-node-selected",
            hasQueueAudit && "step-node-clickable",
          )}
          // whileHover/whileTap иначе остаются "прилипшими" на всю длительность драга (framer
          // ловит pointerdown/hover независимо от собственной drag-системы xyflow) и накладываются
          // поверх stretch/scaleX/scaleY выше — это и было источником "странной" тряски при
          // перетаскивании. Отключаем их, пока xyflow реально тащит ноду.
          whileHover={dragging ? undefined : { scale: 1.06, y: -4 }}
          whileTap={dragging ? undefined : { scaleX: 1.1, scaleY: 0.88, y: 1 }}
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
    </motion.div>
  );
}
