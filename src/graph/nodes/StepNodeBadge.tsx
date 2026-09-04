import { motion } from "framer-motion";
import type { RunStatus } from "../../api/types";
import { RUN_STATUS_LABELS } from "../../lib/runStatus";
import "./stepNodeBadge.css";

interface StepNodeBadgeProps {
  status: RunStatus;
}

const STATUS_VARIANTS = {
  PENDING: { scale: 1, opacity: 0.7 },
  RUNNING: { scale: [1, 1.08, 1], opacity: 1 },
  SUCCEEDED: { scale: [1, 1.25, 0.95, 1.05, 1], opacity: 1 },
  FAILED: { x: [0, -6, 6, -4, 4, 0], opacity: 1 },
  STOPPED: { scale: 1, opacity: 0.8 },
};

export function StepNodeBadge({ status }: StepNodeBadgeProps) {
  return (
    <motion.span
      key={status}
      className={`step-node-badge step-node-badge-${status}`}
      animate={STATUS_VARIANTS[status]}
      transition={
        status === "RUNNING"
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { type: "spring", stiffness: 300, damping: 12 }
      }
    >
      {RUN_STATUS_LABELS[status]}
    </motion.span>
  );
}
