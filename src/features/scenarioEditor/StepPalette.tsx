import { motion } from "framer-motion";
import type { ScenarioStepType } from "../../api/types";
import { STEP_TYPE_DESCRIPTIONS, STEP_TYPE_LABELS } from "../../lib/runStatus";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import "./stepPalette.css";

const TYPES: ScenarioStepType[] = ["JOB", "QUEUE", "QUEUE_CHECK"];

const TYPE_CLASS: Record<ScenarioStepType, string> = {
  JOB: "step-palette-item-job",
  QUEUE: "step-palette-item-queue",
  QUEUE_CHECK: "step-palette-item-queue-check",
};

export function StepPalette() {
  function handleDragStart(event: React.DragEvent, type: ScenarioStepType) {
    event.dataTransfer.setData("application/rpa-step-type", type);
    event.dataTransfer.effectAllowed = "copy";
  }

  return (
    <JellyPanel radius="lg" className="step-palette">
      <div className="step-palette-title">Шаги</div>
      <div className="step-palette-hint">Перетащите на холст</div>
      <div className="step-palette-items">
        {TYPES.map((type) => (
          // Внешний элемент — обычный div: нативный HTML5 drag-and-drop (draggable+onDragStart)
          // несовместим по типам с жестовой системой framer-motion на motion.div (onDragStart
          // там означает pan-жест, а не DOM DragEvent). Анимация hover/tap — на вложенном motion.div.
          <div key={type} draggable onDragStart={(e) => handleDragStart(e, type)} className="step-palette-item-native">
            <motion.div
              className={`step-palette-item ${TYPE_CLASS[type]}`}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <div className="step-palette-item-label">{STEP_TYPE_LABELS[type]}</div>
              <div className="step-palette-item-desc">{STEP_TYPE_DESCRIPTIONS[type]}</div>
            </motion.div>
          </div>
        ))}
      </div>
    </JellyPanel>
  );
}
