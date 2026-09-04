import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { ScenarioResponse } from "../../api/types";
import { Blob } from "../../components/jelly/Blob";
import { JellyButton } from "../../components/jelly/JellyButton";
import { JellyBadge } from "../../components/jelly/JellyBadge";
import { formatDateTime } from "../../lib/dates";
import { STEP_TYPE_LABELS } from "../../lib/runStatus";
import "./scenarioCard.css";

interface ScenarioCardProps {
  scenario: ScenarioResponse;
  onRun: (scenario: ScenarioResponse) => void;
  onDelete: (scenario: ScenarioResponse) => void;
  isStarting: boolean;
}

const TYPE_TONE: Record<string, "job" | "queue" | "queueCheck"> = {
  JOB: "job",
  QUEUE: "queue",
  QUEUE_CHECK: "queueCheck",
};

export function ScenarioCard({ scenario, onRun, onDelete, isStarting }: ScenarioCardProps) {
  const navigate = useNavigate();
  const stepTypeCounts = scenario.steps.reduce<Record<string, number>>((acc, step) => {
    acc[step.type] = (acc[step.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ type: "spring", stiffness: 340, damping: 20 }}
    >
      <Blob radius="lg" className="scenario-card">
        <div className="scenario-card-header" onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}>
          <h3 className="scenario-card-title">{scenario.name}</h3>
          <p className="scenario-card-description">{scenario.description || "Без описания"}</p>
        </div>

        <div className="scenario-card-badges">
          {Object.entries(stepTypeCounts).map(([type, count]) => (
            <JellyBadge key={type} tone={TYPE_TONE[type] ?? "neutral"}>
              {STEP_TYPE_LABELS[type as keyof typeof STEP_TYPE_LABELS] ?? type} × {count}
            </JellyBadge>
          ))}
        </div>

        <div className="scenario-card-meta">Обновлён: {formatDateTime(scenario.updatedAt)}</div>

        <div className="scenario-card-actions">
          <JellyButton size="sm" variant="secondary" onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}>
            Редактировать
          </JellyButton>
          <JellyButton size="sm" variant="primary" onClick={() => onRun(scenario)} disabled={isStarting}>
            {isStarting ? "Запуск…" : "Запустить"}
          </JellyButton>
          <JellyButton size="sm" variant="ghost" onClick={() => onDelete(scenario)}>
            Удалить
          </JellyButton>
        </div>
      </Blob>
    </motion.div>
  );
}
