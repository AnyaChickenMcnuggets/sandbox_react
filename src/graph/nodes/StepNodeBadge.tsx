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

// Вынесены в константы модуля — как и FLOW_ANIMATE/FLOW_TRANSITION в JellyEdge.tsx, чтобы на
// каждый ре-рендер (нода в мониторе перерисовывается на каждый тик поллинга) в animate/transition
// не попадал новый литерал объекта: у framer-motion это перезапускает keyframes-анимацию с нуля,
// что и читалось как "рваный" пульс бейджа RUNNING вместо непрерывного дыхания.
const RUNNING_TRANSITION = { duration: 1.4, repeat: Infinity, ease: "easeInOut" as const };
const SETTLE_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 12 };

export function StepNodeBadge({ status }: StepNodeBadgeProps) {
  return (
    <motion.span
      key={status}
      className={`step-node-badge step-node-badge-${status}`}
      animate={STATUS_VARIANTS[status]}
      transition={status === "RUNNING" ? RUNNING_TRANSITION : SETTLE_TRANSITION}
    >
      {RUN_STATUS_LABELS[status]}
    </motion.span>
  );
}
