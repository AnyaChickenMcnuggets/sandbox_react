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

// Чувствительность растяжения к скорости и потолок на само растяжение (clamp внутри useTransform
// ниже — жёсткая аварийная граница на ВИДИМЫЙ scale, а не только на входные данные).
const DRAG_STRETCH_SENSITIVITY = 5;
const MAX_STRETCH = 0.22;
const SAFE_MIN_SCALE = 0.6;
const SAFE_MAX_SCALE = 1.5;
// Сглаживание скорости (EMA) — сырая покадровая дельта позиции на медленном драге шумит на уровне
// одного пикселя (квантование), из-за чего направление "дёргалось". Сглаженная скорость гасит этот
// шум, оставаясь отзывчивой на быстрых рывках.
const VELOCITY_SMOOTHING = 0.75;

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

  // Инерция при драге — без поворотов (комбинация rotate+non-uniform-scale в двух вложенных слоях
  // и правда сломала себя раньше: после отпускания нода иногда оставалась расплющенной). Вместо
  // этого — растяжение по осям напрямую: bias ∈ [-1..1] показывает, какая ось доминирует в
  // сглаженной скорости, stretchMag — общая величина. Обе оси всегда двигаются НАВСТРЕЧУ друг
  // другу (одна растягивается настолько же, насколько другая сжимается), поэтому итоговый scale
  // никогда не уходит в ноль/отрицательные значения арифметически, а useTransform дополнительно
  // жёстко клампит видимое значение на случай любого перелёта пружины осседания.
  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const scaleX = useTransform(rawScaleX, (v) => clamp(v, SAFE_MIN_SCALE, SAFE_MAX_SCALE));
  const scaleY = useTransform(rawScaleY, (v) => clamp(v, SAFE_MIN_SCALE, SAFE_MAX_SCALE));

  const prevRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const wasDraggingRef = useRef(false);

  useEffect(() => {
    const now = performance.now();
    const prev = prevRef.current;

    if (dragging && prev) {
      const dt = Math.max(now - prev.t, 8);
      const rawVx = (positionAbsoluteX - prev.x) / dt;
      const rawVy = (positionAbsoluteY - prev.y) / dt;
      const v = velocityRef.current;
      v.vx = v.vx * VELOCITY_SMOOTHING + rawVx * (1 - VELOCITY_SMOOTHING);
      v.vy = v.vy * VELOCITY_SMOOTHING + rawVy * (1 - VELOCITY_SMOOTHING);

      const absVx = Math.abs(v.vx);
      const absVy = Math.abs(v.vy);
      const speed = Math.hypot(v.vx, v.vy);
      // Домножаем на magnitude (stretchMag), которая сама мала на медленной скорости — остаточный
      // шум в bias (неизбежный при почти нулевой скорости) гасится этим множителем, а не остаётся
      // видимым дёрганьем.
      const stretchMag = clamp(speed * DRAG_STRETCH_SENSITIVITY, 0, MAX_STRETCH);
      const bias = (absVx - absVy) / (absVx + absVy + 0.001); // -1 (вертикаль) .. 1 (горизонталь)

      rawScaleX.set(1 + stretchMag * bias);
      rawScaleY.set(1 - stretchMag * bias);
      wasDraggingRef.current = true;
    } else if (wasDraggingRef.current) {
      animate(rawScaleX, 1, { type: "spring", stiffness: 260, damping: 16, mass: 0.7 });
      animate(rawScaleY, 1, { type: "spring", stiffness: 260, damping: 16, mass: 0.7 });
      velocityRef.current = { vx: 0, vy: 0 };
      wasDraggingRef.current = false;
    }
    prevRef.current = { x: positionAbsoluteX, y: positionAbsoluteY, t: now };
  }, [dragging, positionAbsoluteX, positionAbsoluteY, rawScaleX, rawScaleY]);

  // Коллизия с соседней нодой (см. ScenarioGraph.handleNodeDrag) — короткий импульс сжатия/отскока
  // на этих же motion values, будто соседний желейный блок толкнули.
  useEffect(() => {
    return collisionBus.subscribe(id, () => {
      animate(rawScaleX, [1, 1 - MAX_STRETCH * 1.3, 1 + MAX_STRETCH * 0.6, 1], { duration: 0.45, ease: "easeOut" });
      animate(rawScaleY, [1, 1 + MAX_STRETCH * 1.3, 1 - MAX_STRETCH * 0.6, 1], { duration: 0.45, ease: "easeOut" });
    });
  }, [id, rawScaleX, rawScaleY]);

  return (
    <motion.div style={{ scaleX, scaleY }}>
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
  );
}
