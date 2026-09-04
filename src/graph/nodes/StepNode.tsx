import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { StepNodeData } from "../types";
import { STEP_TYPE_LABELS } from "../../lib/runStatus";
import { StepNodeBadge } from "./StepNodeBadge";
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

export function StepNode({ data, selected }: NodeProps<Node<StepNodeData>>) {
  const { type, name, runtime } = data;
  const isViewMode = runtime !== undefined;
  const hasQueueAudit = runtime?.orchestratorQueueId != null;

  return (
    <motion.div
      className={clsx(
        "step-node",
        TYPE_CLASS[type],
        runtime && RUNTIME_CLASS[runtime.status],
        selected && "step-node-selected",
        hasQueueAudit && "step-node-clickable",
      )}
      whileHover={{ scale: 1.035, y: -3 }}
      whileTap={{ scale: 0.97 }}
      animate={
        runtime?.status === "RUNNING"
          ? { scale: [1, 1.015, 1] }
          : { scale: 1 }
      }
      transition={
        runtime?.status === "RUNNING"
          ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 380, damping: 22 }
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
  );
}
