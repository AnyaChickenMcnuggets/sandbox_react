import { motion } from "framer-motion";
import type { RunResponse } from "../../api/types";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyBadge } from "../../components/jelly/JellyBadge";
import { RUN_STATUS_LABELS } from "../../lib/runStatus";
import { formatDuration, formatTime } from "../../lib/dates";
import "./runHeader.css";

const STATUS_TONE: Record<RunResponse["status"], "neutral" | "warning" | "success" | "danger"> = {
  PENDING: "neutral",
  RUNNING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  STOPPED: "neutral",
};

interface RunHeaderProps {
  // Уже разрешённая строка (имя сценария/"Загрузка…"/"Сценарий недоступен") — резолвится в
  // RunMonitorPage, у которого есть доступ к состоянию отдельного запроса сценария (см. там же).
  scenarioName: string;
  run: RunResponse;
}

export function RunHeader({ scenarioName, run }: RunHeaderProps) {
  // startStepId — запуск не с корней DAG, а с конкретного шага ("Запустить отсюда" в редакторе);
  // шаги до него остаются PENDING весь прогон, это не баг. Имя шага берём из steps[] по stepId — тот
  // же массив, что и статусы, отдельного поля stepName на самом RunResponse нет.
  const startStep = run.startStepId != null ? run.steps.find((s) => s.stepId === run.startStepId) : undefined;

  return (
    <JellyPanel radius="lg" className="run-header">
      <div className="run-header-top">
        <div>
          <div className="run-header-title">{scenarioName}</div>
          {/* Запуск — не именованная сущность (нет поля "название" на RunResponse), поэтому вместо
              технического "Прогон #N" — либо повод старта с конкретного шага, либо ничего лишнего:
              время старта и так есть в таймлайне ниже. */}
          <div className="run-header-subtitle">
            {run.startStepId != null ? `Запущено с шага «${startStep?.stepName ?? "неизвестного"}»` : "Запуск сценария"}
          </div>
        </div>
        <motion.div key={run.status} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 16 }}>
          <JellyBadge tone={STATUS_TONE[run.status]} className="run-header-status">
            {RUN_STATUS_LABELS[run.status]}
          </JellyBadge>
        </motion.div>
      </div>
      <div className="run-header-timeline">
        <span>Старт: {formatTime(run.startedAt)}</span>
        <span>Финиш: {formatTime(run.finishedAt)}</span>
        <span>Длительность: {formatDuration(run.startedAt, run.finishedAt)}</span>
      </div>
    </JellyPanel>
  );
}
