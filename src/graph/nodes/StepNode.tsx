import { useEffect, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion, useAnimationControls } from "framer-motion";
import clsx from "clsx";
import type { StepNodeData } from "../types";
import { STEP_TYPE_LABELS } from "../../lib/runStatus";
import { StepNodeBadge } from "./StepNodeBadge";
import { collisionBus } from "../collisionBus";
import { useRunFromNode } from "../RunFromNodeContext";
import "./stepNode.css";

type AnimationControls = ReturnType<typeof useAnimationControls>;

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

interface RestingParams {
  dragging: boolean;
  pressed: boolean;
  hovered: boolean;
  runtimeStatus: string | undefined;
}

// Единственный источник анимации ноды — приоритет состояний сверху вниз. Раньше hover/tap были
// декларативными пропами framer-motion (whileHover/whileTap) — своя, отдельная от этой, жестовая
// система. framer сам слушает pointerdown/enter/leave НЕЗАВИСИМО от d3-drag (на котором построен
// драг в xyflow), и на границе dragging=false→true (первые пиксели движения, пока d3-drag ещё не
// объявил жест драгом) framer успевал запустить whileTap; когда dragging после этого становился
// true и whileTap-проп исчезал, framer не всегда корректно "отпускал" уже запущенную tap-анимацию
// — нода залипала в её промежуточном значении (scaleX:1.1/scaleY:0.88 — ровно как у whileTap)
// навсегда. Фикс — hover/press теперь просто React state (onMouseEnter/Leave,
// onPointerDown/Up/Cancel), а единственный, кто вообще трогает transform, — этот controls-эффект.
function restingAnimation({ dragging, pressed, hovered, runtimeStatus }: RestingParams) {
  if (dragging) {
    return {
      target: { scale: [1, 1.07, 0.95, 1.04, 0.98, 1], rotate: [0, -2.5, 2.5, -1.5, 1, 0], y: 0 },
      transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" as const },
    };
  }
  if (pressed) {
    return {
      target: { scaleX: 1.1, scaleY: 0.88, scale: 1, rotate: 0, y: 1 },
      transition: { type: "spring" as const, stiffness: 500, damping: 22 },
    };
  }
  if (runtimeStatus === "RUNNING") {
    return {
      target: { scale: [1, 1.02, 1], scaleX: 1, scaleY: 1, rotate: 0, y: 0 },
      transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
    };
  }
  if (hovered) {
    return {
      target: { scale: 1.06, scaleX: 1, scaleY: 1, rotate: 0, y: -4 },
      transition: { type: "spring" as const, stiffness: 300, damping: 15 },
    };
  }
  return {
    target: { scale: 1, scaleX: 1, scaleY: 1, rotate: 0, y: 0 },
    transition: { type: "spring" as const, stiffness: 260, damping: 14, mass: 0.8 },
  };
}

function playResting(controls: AnimationControls, params: RestingParams) {
  const { target, transition } = restingAnimation(params);
  controls.start({ ...target, transition });
}

export function StepNode({ id, data, selected, dragging }: NodeProps<Node<StepNodeData>>) {
  const { type, name, runtime, stepId } = data;
  const isViewMode = runtime !== undefined;
  const hasQueueAudit = runtime?.orchestratorQueueId != null;
  const controls = useAnimationControls();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Есть только когда ScenarioGraph получил onRunFromNode (сейчас — только редактор) и шаг уже
  // сохранён на бэкенде (stepId появляется после save, см. graph/types.ts) — до первого сохранения
  // "запустить отсюда" не может ссылаться на реальный StepResponse.id.
  const runFromNode = useRunFromNode();
  const canRunFromHere = !isViewMode && runFromNode !== null && stepId !== undefined;

  function handleRunFromHere(event: React.MouseEvent) {
    event.stopPropagation();
    if (stepId === undefined) return;
    runFromNode?.(stepId, name);
  }

  // Единственный источник "покоящейся" анимации — эффект зависит только от простых булевых/строковых
  // значений, не от позиции/скорости — гарантированно детерминирован.
  useEffect(() => {
    playResting(controls, { dragging, pressed, hovered, runtimeStatus: runtime?.status });
  }, [controls, dragging, pressed, hovered, runtime?.status]);

  // Отпускание мыши/пальца ГДЕ УГОДНО на странице (не только над нодой) обязано снимать pressed —
  // иначе жест, начавшийся на ноде и завершившийся за её пределами, оставит "нажатое" состояние.
  useEffect(() => {
    if (!pressed) return;
    const clear = () => setPressed(false);
    window.addEventListener("pointerup", clear);
    window.addEventListener("pointercancel", clear);
    return () => {
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, [pressed]);

  // Коллизия с соседней нодой (см. ScenarioGraph.handleNodeDrag) — короткий одноразовый импульс
  // поверх текущей "покоящейся" анимации, после которого явно возвращаемся к ней же (а не оставляем
  // повисшим one-off состоянием).
  useEffect(() => {
    return collisionBus.subscribe(id, () => {
      controls
        .start({ scale: [1, 0.85, 1.12, 0.96, 1], transition: { duration: 0.45, ease: "easeOut" } })
        .then(() => playResting(controls, { dragging, pressed, hovered, runtimeStatus: runtime?.status }));
    });
  }, [id, controls, dragging, pressed, hovered, runtime?.status]);

  return (
    <motion.div
      className={clsx(
        "step-node",
        TYPE_CLASS[type],
        runtime && RUNTIME_CLASS[runtime.status],
        selected && "step-node-selected",
        hasQueueAudit && "step-node-clickable",
      )}
      animate={controls}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={() => setPressed(true)}
    >
      <Handle type="target" position={Position.Left} />
      <div className="step-node-header">
        <span className="step-node-type-label">{STEP_TYPE_LABELS[type]}</span>
        {runtime ? <StepNodeBadge status={runtime.status} /> : null}
        {canRunFromHere ? (
          <button
            type="button"
            className="nodrag step-node-run-from"
            onClick={handleRunFromHere}
            title="Запустить сценарий с этого шага — шаги до него останутся PENDING"
          >
            ▶ Отсюда
          </button>
        ) : null}
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
      {hasQueueAudit ? (
        <div
          className={clsx(
            "step-node-queue-owned",
            runtime.orchestratorQueueOwned ? "step-node-queue-owned-yes" : "step-node-queue-owned-no",
          )}
          title={
            runtime.orchestratorQueueOwned
              ? "Очередь создана этим прогоном — будет удалена по Cleanup"
              : "Очередь переиспользована из уже существующей — Cleanup её не тронет"
          }
        >
          {runtime.orchestratorQueueOwned ? "Очередь: создана" : "Очередь: переиспользована"}
        </div>
      ) : null}
      {hasQueueAudit ? <div className="step-node-queue-hint">Клик — транзакции очереди</div> : null}
      <Handle type="source" position={Position.Right} />
    </motion.div>
  );
}
