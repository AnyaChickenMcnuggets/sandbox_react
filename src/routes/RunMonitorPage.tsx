import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRun } from "../queries/runQueries";
import { useScenario } from "../queries/scenarioQueries";
import { useCleanupScenario, useStopRun } from "../queries/runMutations";
import { ScenarioGraph } from "../graph/ScenarioGraph";
import { fromScenarioResponse } from "../graph/mapping/fromScenarioResponse";
import { applyRunOverlay } from "../graph/mapping/toRunOverlay";
import type { StepNodeData } from "../graph/types";
import { RunHeader } from "../features/runMonitor/RunHeader";
import { RunControls } from "../features/runMonitor/RunControls";
import { QueueItemsDrawer } from "../features/runMonitor/QueueItemsDrawer";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import { toastStore } from "../components/feedback/toastStore";
import "./runMonitorPage.css";

export function RunMonitorPage() {
  const params = useParams<{ runId: string }>();
  const runId = Number(params.runId);

  const runQuery = useRun(runId);
  const scenarioId = runQuery.data?.scenarioId;
  const scenarioQuery = useScenario(scenarioId);

  const stopRun = useStopRun();
  const cleanupScenario = useCleanupScenario();

  const [selectedQueueStep, setSelectedQueueStep] = useState<{ stepId: number; stepName: string } | null>(null);

  const { nodes, edges } = useMemo(() => {
    if (!scenarioQuery.data || !runQuery.data) return { nodes: [], edges: [] };
    const base = fromScenarioResponse(scenarioQuery.data);
    return applyRunOverlay(base.nodes, base.edges, runQuery.data);
  }, [scenarioQuery.data, runQuery.data]);

  function handleSelectNode(_nodeId: string, data: StepNodeData) {
    if (data.runtime?.orchestratorQueueId && data.stepId !== undefined) {
      setSelectedQueueStep({ stepId: data.stepId, stepName: data.name });
    }
  }

  function handleStop() {
    stopRun.mutate(runId, {
      onSuccess: () => toastStore.pushInfo("Прогон остановлен"),
    });
  }

  function handleCleanup() {
    if (!scenarioId) return;
    cleanupScenario.mutate(scenarioId, {
      onSuccess: (result) => {
        if (result.success) {
          toastStore.pushSuccess("Ресурсы оркестратора очищены");
        } else {
          toastStore.push({
            kind: "error",
            title: "Cleanup выполнен частично",
            message: "Не все ресурсы удалось очистить",
            details: result.failures,
          });
        }
      },
    });
  }

  if (runQuery.error) {
    return (
      <div className="run-monitor-page">
        <ErrorBanner error={runQuery.error} title="Не удалось загрузить прогон" />
      </div>
    );
  }

  if (!runQuery.data) {
    return <div className="run-monitor-page">Загрузка…</div>;
  }

  return (
    <div className="run-monitor-page">
      <RunHeader scenarioName={scenarioQuery.data?.name} run={runQuery.data} />
      <RunControls
        status={runQuery.data.status}
        onStop={handleStop}
        onCleanup={handleCleanup}
        isStopping={stopRun.isPending}
        isCleaningUp={cleanupScenario.isPending}
      />

      <div className="run-monitor-body">
        <div className="run-monitor-canvas">
          <ScenarioGraph mode="view" nodes={nodes} edges={edges} onSelectNode={handleSelectNode} />
        </div>

        {selectedQueueStep ? (
          <QueueItemsDrawer
            runId={runId}
            stepId={selectedQueueStep.stepId}
            stepName={selectedQueueStep.stepName}
            onClose={() => setSelectedQueueStep(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
