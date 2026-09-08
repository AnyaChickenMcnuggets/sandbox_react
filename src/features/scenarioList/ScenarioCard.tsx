import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { ScenarioResponse } from "../../api/types";
import { Blob } from "../../components/jelly/Blob";
import { JellyButton } from "../../components/jelly/JellyButton";
import { JellyBadge } from "../../components/jelly/JellyBadge";
import { IconEdit, IconPlay, IconTrash, IconActivity } from "../../components/jelly/icons";
import { formatDateTime } from "../../lib/dates";
import { STEP_TYPE_LABELS } from "../../lib/runStatus";
import { runHistory } from "../../lib/runHistory";
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
  const lastRun = runHistory.lastForScenario(scenario.id);
  const stepTypeCounts = scenario.steps.reduce<Record<string, number>>((acc, step) => {
    acc[step.type] = (acc[step.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <motion.div layout whileHover={{ scale: 1.008, x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 11 }}>
      <Blob radius="md" glass className="scenario-row">
        <div className="scenario-row-info" onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}>
          <div className="scenario-row-title">{scenario.name}</div>
          <div className="scenario-row-description">{scenario.description || "Без описания"}</div>
        </div>

        <div className="scenario-row-badges">
          {Object.entries(stepTypeCounts).map(([type, count]) => (
            <JellyBadge key={type} tone={TYPE_TONE[type] ?? "neutral"}>
              {STEP_TYPE_LABELS[type as keyof typeof STEP_TYPE_LABELS] ?? type} × {count}
            </JellyBadge>
          ))}
        </div>

        <div className="scenario-row-meta">Обновлён: {formatDateTime(scenario.updatedAt)}</div>

        <div className="scenario-row-actions">
          {lastRun ? (
            <JellyButton
              size="sm"
              variant="ghost"
              iconOnly
              title={`Последний запуск: ${formatDateTime(lastRun.startedAt)}`}
              aria-label={`Последний запуск: ${formatDateTime(lastRun.startedAt)}`}
              onClick={() => navigate(`/runs/${lastRun.runId}`)}
            >
              <IconActivity />
            </JellyButton>
          ) : null}
          <JellyButton
            size="sm"
            variant="secondary"
            iconOnly
            title="Редактировать"
            aria-label="Редактировать"
            onClick={() => navigate(`/scenarios/${scenario.id}/edit`)}
          >
            <IconEdit />
          </JellyButton>
          <JellyButton
            size="sm"
            variant="success"
            iconOnly
            title={isStarting ? "Запуск…" : "Запустить"}
            aria-label={isStarting ? "Запуск…" : "Запустить"}
            onClick={() => onRun(scenario)}
            disabled={isStarting}
          >
            <IconPlay />
          </JellyButton>
          <JellyButton
            size="sm"
            variant="danger"
            iconOnly
            title="Удалить"
            aria-label="Удалить"
            onClick={() => onDelete(scenario)}
          >
            <IconTrash />
          </JellyButton>
        </div>
      </Blob>
    </motion.div>
  );
}
