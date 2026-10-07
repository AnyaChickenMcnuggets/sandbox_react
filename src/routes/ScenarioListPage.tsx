import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useScenarios } from "../queries/scenarioQueries";
import { useDeleteScenario } from "../queries/scenarioMutations";
import { useStartRun } from "../queries/runMutations";
import type { ScenarioResponse } from "../api/types";
import { ScenarioCard } from "../features/scenarioList/ScenarioCard";
import { JellyButton } from "../components/jelly/JellyButton";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import { RobotsAvailabilityIndicator } from "../components/feedback/RobotsAvailabilityIndicator";
import { ConfirmDialog } from "../components/feedback/ConfirmDialog";
import { toastStore } from "../components/feedback/toastStore";
import { runHistory } from "../lib/runHistory";
import { usePermission } from "../lib/authStore";
import { countStepsWithoutTimeout, formatNoTimeoutWarning } from "../lib/scenarioTimeouts";
import "./scenarioListPage.css";

export function ScenarioListPage() {
  const navigate = useNavigate();
  const { data: scenarios, isLoading, error } = useScenarios();
  const deleteScenario = useDeleteScenario();
  const startRun = useStartRun();
  const [pendingDelete, setPendingDelete] = useState<ScenarioResponse | null>(null);
  const [pendingRun, setPendingRun] = useState<{ scenario: ScenarioResponse; missingTimeouts: number } | null>(null);
  const canEdit = usePermission("SCENARIO_WRITE");
  const canRun = usePermission("RUN_START");
  const canDelete = usePermission("SCENARIO_DELETE");

  // Шаги JOB/QUEUE_CHECK без таймаута могут идти бесконечно (Sprint 29) — перед запуском один раз
  // явно подтверждаем это, а не запускаем молча.
  function requestRun(scenario: ScenarioResponse) {
    const missingTimeouts = countStepsWithoutTimeout(scenario.steps);
    if (missingTimeouts > 0) {
      setPendingRun({ scenario, missingTimeouts });
      return;
    }
    handleRun(scenario);
  }

  function handleConfirmRun() {
    if (!pendingRun) return;
    handleRun(pendingRun.scenario);
    setPendingRun(null);
  }

  function handleRun(scenario: ScenarioResponse) {
    startRun.mutate(
      { scenarioId: scenario.id },
      {
        onSuccess: (run) => {
          runHistory.record({
            runId: run.id,
            scenarioId: scenario.id,
            scenarioName: scenario.name,
            startedAt: new Date().toISOString(),
          });
          navigate(`/runs/${run.id}`);
        },
      },
    );
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const scenario = pendingDelete;
    deleteScenario.mutate(scenario.id, {
      onSuccess: () => toastStore.pushSuccess(`Сценарий «${scenario.name}» удалён`),
    });
    setPendingDelete(null);
  }

  return (
    <div className="scenario-list-page">
      <div className="scenario-list-toolbar">
        <div>
          <h1>Сценарии</h1>
          <p className="scenario-list-subtitle">DAG-сценарии тестирования RPA-процессов</p>
        </div>
        <div className="scenario-list-toolbar-actions">
          <RobotsAvailabilityIndicator />
          {canEdit ? <JellyButton onClick={() => navigate("/scenarios/new")}>+ Новый сценарий</JellyButton> : null}
        </div>
      </div>

      {error ? <ErrorBanner error={error} title="Не удалось загрузить список сценариев" /> : null}

      {isLoading ? <div className="scenario-list-loading">Загрузка…</div> : null}

      {scenarios && scenarios.length === 0 ? (
        <div className="scenario-list-empty">
          Сценариев пока нет — создайте первый, чтобы начать собирать DAG из шагов JOB/QUEUE/QUEUE_CHECK.
        </div>
      ) : null}

      {scenarios && scenarios.length > 0 ? (
        <motion.div layout className="scenario-list-stack">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onRun={requestRun}
              onDelete={setPendingDelete}
              isStarting={startRun.isPending && startRun.variables?.scenarioId === scenario.id}
              canEdit={canEdit}
              canRun={canRun}
              canDelete={canDelete}
            />
          ))}
        </motion.div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Удалить сценарий?"
        message={pendingDelete ? `«${pendingDelete.name}» будет удалён без возможности восстановления.` : ""}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={pendingRun !== null}
        title="Запустить без таймаута?"
        message={pendingRun ? formatNoTimeoutWarning(pendingRun.missingTimeouts) : ""}
        confirmLabel="Запустить"
        danger={false}
        onConfirm={handleConfirmRun}
        onCancel={() => setPendingRun(null)}
      />
    </div>
  );
}
