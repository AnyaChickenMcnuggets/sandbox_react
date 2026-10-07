import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { RunSummaryResponse } from "../../api/types";
import { Blob } from "../../components/jelly/Blob";
import { JellyBadge } from "../../components/jelly/JellyBadge";
import { RUN_STATUS_LABELS } from "../../lib/runStatus";
import { formatDateTime } from "../../lib/dates";
import "./runHistoryRow.css";

const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  RUNNING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  STOPPED: "neutral",
};

interface RunHistoryRowProps {
  run: RunSummaryResponse;
}

export function RunHistoryRow({ run }: RunHistoryRowProps) {
  const navigate = useNavigate();

  return (
    <motion.div layout whileHover={{ scale: 1.012, x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 11 }}>
      <Blob radius="md" glass className="run-history-row" onClick={() => navigate(`/runs/${run.id}`)}>
        <div className="run-history-row-main">
          <div className="run-history-row-title">{run.scenarioName}</div>
          {/* Запуск — не именованная сущность в бэкенде (нет поля "название"), поэтому вместо
              технического "#42" показываем время запуска и автора. startedAt null — PENDING, ещё не
              стартовал. */}
          <div className="run-history-row-meta">
            {run.startedAt ? `Запущен ${formatDateTime(run.startedAt)}` : "Ожидает старта"} · {run.triggeredBy}
          </div>
        </div>
        <JellyBadge tone={STATUS_TONE[run.status]}>{RUN_STATUS_LABELS[run.status]}</JellyBadge>
      </Blob>
    </motion.div>
  );
}
