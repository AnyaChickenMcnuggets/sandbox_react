import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import type { RunHistoryEntry } from "../../lib/runHistory";
import { useRun } from "../../queries/runQueries";
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
  entry: RunHistoryEntry;
}

export function RunHistoryRow({ entry }: RunHistoryRowProps) {
  const navigate = useNavigate();
  const { data: run, isLoading, error } = useRun(entry.runId);

  // Запуск недоступен (например, бэкенд его больше не знает — не 404 сам по себе показываем
  // пользователю, а просто убираем строку из журнала: локальная история в localStorage может
  // пережить сам запуск на бэкенде, показывать в списке заведомо неоткрываемую строку бессмысленно).
  if (error) return null;

  return (
    <motion.div layout whileHover={{ scale: 1.012, x: 4 }} transition={{ type: "spring", stiffness: 300, damping: 11 }}>
      <Blob radius="md" glass className="run-history-row" onClick={() => navigate(`/runs/${entry.runId}`)}>
        <div className="run-history-row-main">
          <div className="run-history-row-title">{entry.scenarioName}</div>
          {/* Запуск — не именованная сущность в бэкенде (нет поля "название"), поэтому вместо
              технического "#42" показываем время запуска — оно уникально идентифицирует строку
              для человека не хуже номера. */}
          <div className="run-history-row-meta">Запущен {formatDateTime(entry.startedAt)}</div>
        </div>
        {isLoading ? (
          <JellyBadge tone="neutral">…</JellyBadge>
        ) : run ? (
          <JellyBadge tone={STATUS_TONE[run.status]}>{RUN_STATUS_LABELS[run.status]}</JellyBadge>
        ) : null}
      </Blob>
    </motion.div>
  );
}
