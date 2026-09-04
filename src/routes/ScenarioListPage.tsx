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
import { ConfirmDialog } from "../components/feedback/ConfirmDialog";
import { toastStore } from "../components/feedback/toastStore";
import "./scenarioListPage.css";

export function ScenarioListPage() {
  const navigate = useNavigate();
  const { data: scenarios, isLoading, error } = useScenarios();
  const deleteScenario = useDeleteScenario();
  const startRun = useStartRun();
  const [pendingDelete, setPendingDelete] = useState<ScenarioResponse | null>(null);

  function handleRun(scenario: ScenarioResponse) {
    startRun.mutate(
      { scenarioId: scenario.id },
      {
        onSuccess: (run) => navigate(`/runs/${run.id}`),
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
        <JellyButton onClick={() => navigate("/scenarios/new")}>+ Новый сценарий</JellyButton>
      </div>

      {error ? <ErrorBanner error={error} title="Не удалось загрузить список сценариев" /> : null}

      {isLoading ? <div className="scenario-list-loading">Загрузка…</div> : null}

      {scenarios && scenarios.length === 0 ? (
        <div className="scenario-list-empty">
          Сценариев пока нет — создайте первый, чтобы начать собирать DAG из шагов JOB/QUEUE/QUEUE_CHECK.
        </div>
      ) : null}

      {scenarios && scenarios.length > 0 ? (
        <motion.div layout className="scenario-list-grid">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onRun={handleRun}
              onDelete={setPendingDelete}
              isStarting={startRun.isPending && startRun.variables?.scenarioId === scenario.id}
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
    </div>
  );
}
