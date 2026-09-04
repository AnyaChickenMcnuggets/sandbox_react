import { AnimatePresence, motion } from "framer-motion";
import type { JobStepConfig, QueueCheckStepConfig, QueueStepConfig } from "../../../api/types";
import type { StepNodeData } from "../../../graph/types";
import { JellyPanel } from "../../../components/jelly/JellyPanel";
import { JellyField } from "../../../components/jelly/JellyField";
import { JellyInput } from "../../../components/jelly/JellyInput";
import { JellyButton } from "../../../components/jelly/JellyButton";
import { JellyBadge } from "../../../components/jelly/JellyBadge";
import { STEP_TYPE_LABELS } from "../../../lib/runStatus";
import { JobConfigForm } from "./JobConfigForm";
import { QueueConfigForm } from "./QueueConfigForm";
import { QueueCheckConfigForm } from "./QueueCheckConfigForm";
import "./configPanel.css";

const TONE: Record<StepNodeData["type"], "job" | "queue" | "queueCheck"> = {
  JOB: "job",
  QUEUE: "queue",
  QUEUE_CHECK: "queueCheck",
};

interface ConfigPanelProps {
  nodeId: string;
  data: StepNodeData;
  onChangeName: (name: string) => void;
  onChangeConfig: (config: StepNodeData["config"]) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ConfigPanel({ nodeId, data, onChangeName, onChangeConfig, onDelete, onClose }: ConfigPanelProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nodeId}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <JellyPanel radius="lg" className="config-panel">
          <div className="config-panel-header">
            <JellyBadge tone={TONE[data.type]}>{STEP_TYPE_LABELS[data.type]}</JellyBadge>
            <button type="button" className="config-panel-close" onClick={onClose} aria-label="Закрыть">
              ×
            </button>
          </div>

          <JellyField label="Название шага">
            <JellyInput value={data.name} onChange={(e) => onChangeName(e.target.value)} />
          </JellyField>

          {data.type === "JOB" ? (
            <JobConfigForm config={data.config as JobStepConfig} onChange={onChangeConfig} />
          ) : data.type === "QUEUE" ? (
            <QueueConfigForm config={data.config as QueueStepConfig} onChange={onChangeConfig} />
          ) : (
            <QueueCheckConfigForm config={data.config as QueueCheckStepConfig} onChange={onChangeConfig} />
          )}

          <JellyButton variant="danger" size="sm" onClick={onDelete} className="config-panel-delete">
            Удалить шаг
          </JellyButton>
        </JellyPanel>
      </motion.div>
    </AnimatePresence>
  );
}
