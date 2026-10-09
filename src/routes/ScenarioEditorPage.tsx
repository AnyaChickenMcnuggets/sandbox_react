import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { nanoid } from "nanoid";
import {
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useScenario } from "../queries/scenarioQueries";
import { useCreateScenario, useUpdateScenario } from "../queries/scenarioMutations";
import { useStartRun } from "../queries/runMutations";
import { useLastRun } from "../queries/runQueries";
import type { ScenarioStepType } from "../api/types";
import type { StepNodeData } from "../graph/types";
import { ScenarioGraph } from "../graph/ScenarioGraph";
import { findFreeDropPosition } from "../graph/layout/collision";
import { fromScenarioResponse } from "../graph/mapping/fromScenarioResponse";
import { toScenarioRequest, zipStepIdsWithPositions } from "../graph/mapping/toScenarioRequest";
import { defaultConfigForType, DEFAULT_STEP_NAME } from "../graph/mapping/stepConfigDefaults";
import { replaceLayout } from "../graph/layout/layoutStorage";
import { EditorHeader } from "../features/scenarioEditor/EditorHeader";
import { applyScenarioReference, countReferenceImpact } from "../features/scenarioEditor/applyReference";
import { StepPalette } from "../features/scenarioEditor/StepPalette";
import { ConfigPanel } from "../features/scenarioEditor/ConfigPanel/ConfigPanel";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import { ConfirmDialog } from "../components/feedback/ConfirmDialog";
import { toastStore } from "../components/feedback/toastStore";
import { usePermission } from "../lib/authStore";
import { countStepsWithoutTimeout, formatNoTimeoutWarning } from "../lib/scenarioTimeouts";
import "./scenarioEditorPage.css";

const DROP_OVERLAP_MARGIN = 16;

export function ScenarioEditorPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = params.scenarioId ? Number(params.scenarioId) : undefined;
  const navigate = useNavigate();

  const scenarioQuery = useScenario(scenarioId);
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario(scenarioId ?? -1);
  const startRun = useStartRun();
  // Без SCENARIO_WRITE этот же экран остаётся режимом просмотра топологии (единственный способ
  // увидеть DAG): холст в mode="view", как в RunMonitorPage, палитра и Сохранить скрыты целиком, а
  // не задизейблены. Запуск гейтится отдельным правом RUN_START — права редактируются админом.
  const canEdit = usePermission("SCENARIO_WRITE");
  const canRun = usePermission("RUN_START");
  const canReadRuns = usePermission("RUN_READ");

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sendReportByMail, setSendReportByMail] = useState(false);
  const [configPanelWidth, setConfigPanelWidth] = useState(340);
  const [nameError, setNameError] = useState<string | undefined>();
  const [loadedScenarioId, setLoadedScenarioId] = useState<number | undefined>(undefined);

  // Загружаем топологию/поля один раз при получении данных сценария (или при переходе на другой id) —
  // дальше состояние живёт локально в холсте, не перетирается повторными рефетчами.
  useEffect(() => {
    if (scenarioQuery.data && scenarioQuery.data.id !== loadedScenarioId) {
      const { nodes: loadedNodes, edges: loadedEdges } = fromScenarioResponse(scenarioQuery.data);
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setName(scenarioQuery.data.name);
      setDescription(scenarioQuery.data.description ?? "");
      setLoadedScenarioId(scenarioQuery.data.id);
    }
  }, [scenarioQuery.data, loadedScenarioId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, type: "jelly" }, eds)),
    [setEdges],
  );

  const handleDropStepType = useCallback(
    (type: ScenarioStepType, position: { x: number; y: number }) => {
      const localId = nanoid();
      setNodes((nds) => {
        const newNode: Node<StepNodeData> = {
          id: localId,
          type: "step",
          position: findFreeDropPosition(position, nds, DROP_OVERLAP_MARGIN),
          data: {
            localId,
            type,
            name: DEFAULT_STEP_NAME[type],
            config: defaultConfigForType(type),
          },
        };
        return [...nds, newNode];
      });
      setSelectedNodeId(localId);
    },
    [setNodes],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Копировать/вставить шаг — Ctrl/Cmd+C и Ctrl/Cmd+V на выбранной ноде. Буфер — обычный ref (не
  // модульный стор): нужен только этой странице, не переживает переход на другой сценарий, и это
  // осознанно, не хочется, чтобы скопированное в одном сценарии внезапно вставлялось в другом.
  const clipboardRef = useRef<{ data: StepNodeData; position: { x: number; y: number } } | null>(null);
  const pasteCountRef = useRef(0);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (isTypingTarget(event.target)) return; // не мешаем обычному копипасту текста в полях формы

      const key = event.key.toLowerCase();
      if (key === "c") {
        if (!selectedNodeId) return;
        const node = nodesRef.current.find((n) => n.id === selectedNodeId);
        if (!node) return;
        clipboardRef.current = { data: structuredClone(node.data), position: { ...node.position } };
        pasteCountRef.current = 0;
        toastStore.pushInfo(`Шаг «${node.data.name}» скопирован`);
      } else if (key === "v") {
        if (!canEdit || !clipboardRef.current) return;
        event.preventDefault();
        pasteCountRef.current += 1;
        const offset = pasteCountRef.current * 32;
        const localId = nanoid();
        const copied = structuredClone(clipboardRef.current.data);
        const newNode: Node<StepNodeData> = {
          id: localId,
          type: "step",
          position: {
            x: clipboardRef.current.position.x + offset,
            y: clipboardRef.current.position.y + offset,
          },
          // stepId копировать нельзя — это ссылка на конкретный сохранённый шаг на бэкенде,
          // вставленная нода становится новым шагом только со следующим save.
          data: { ...copied, localId, stepId: undefined },
        };
        setNodes((nds) => [...nds, newNode]);
        setSelectedNodeId(localId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, setNodes, canEdit]);

  function updateSelectedNodeData(patch: Partial<StepNodeData>) {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function handleDeleteSelectedNode() {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  }

  function handleSave() {
    if (!name.trim()) {
      setNameError("Название обязательно");
      return;
    }
    setNameError(undefined);

    const request = toScenarioRequest(nodes, edges, name.trim(), description.trim() || null);
    const mutation = scenarioId ? updateScenario : createScenario;

    mutation.mutate(request, {
      onSuccess: (response) => {
        const positions = zipStepIdsWithPositions(nodes, response.steps.map((s) => s.id));
        replaceLayout(response.id, positions);
        setLoadedScenarioId(response.id);
        toastStore.pushSuccess(`Сценарий «${response.name}» сохранён`);
        if (!scenarioId) {
          navigate(`/scenarios/${response.id}/edit`, { replace: true });
        }
        // Обновляем локальные id нод на реальные stepId, чтобы дальнейшие правки/повторный save
        // сразу опирались на актуальную топологию из ответа.
        const { nodes: freshNodes, edges: freshEdges } = fromScenarioResponse(response);
        setNodes(freshNodes);
        setEdges(freshEdges);
      },
    });
  }

  function handleRun(startStepId?: number) {
    if (!scenarioId) return;
    const request = {
      ...(startStepId !== undefined ? { startStepId } : {}),
      ...(sendReportByMail ? { sendReportByMail: true } : {}),
    };
    startRun.mutate(
      { scenarioId, request: Object.keys(request).length > 0 ? request : undefined },
      {
        onSuccess: (run) => navigate(`/runs/${run.id}`),
      },
    );
  }

  // "Запустить отсюда" (кнопка на ноде, см. StepNode/RunFromNodeContext) — шаги до выбранной точки
  // старта останутся PENDING до конца прогона, их предпосылки (например, уже созданные очереди)
  // должны быть выполнены заранее. Бэкенд это не валидирует на фронте — только явно предупреждаем
  // перед запуском через тот же ConfirmDialog, что и удаление сценария.
  // Тот же диалог предупреждает и о шагах JOB/QUEUE_CHECK без таймаута (Sprint 29): считаем по
  // сохранённой версии сценария — именно её запустит бэкенд, а не локальные несохранённые правки.
  const [pendingRun, setPendingRun] = useState<{
    startStep?: { stepId: number; stepName: string };
    missingTimeouts: number;
  } | null>(null);

  function requestRun(startStep?: { stepId: number; stepName: string }) {
    const missingTimeouts = scenarioQuery.data ? countStepsWithoutTimeout(scenarioQuery.data.steps) : 0;
    if (!startStep && missingTimeouts === 0) {
      handleRun();
      return;
    }
    setPendingRun({ startStep, missingTimeouts });
  }

  function handleConfirmRun() {
    if (!pendingRun) return;
    handleRun(pendingRun.startStep?.stepId);
    setPendingRun(null);
  }

  const pendingRunMessage = pendingRun
    ? [
        pendingRun.startStep
          ? `Запуск начнётся сразу с шага «${pendingRun.startStep.stepName}» — все шаги до него останутся в статусе PENDING (движок их не тронет). Убедитесь, что их предпосылки уже выполнены — например, нужные очереди созданы или заполнены — прежде чем продолжить.`
          : null,
        pendingRun.missingTimeouts > 0 ? formatNoTimeoutWarning(pendingRun.missingTimeouts) : null,
      ]
        .filter(Boolean)
        .join("\n\n")
    : "";

  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const referenceImpact = countReferenceImpact(nodes);

  function handleConfirmReference() {
    if (!pendingReference) return;
    setNodes((nds) => applyScenarioReference(nds, pendingReference));
    // Открытая форма конфига держит собственную копию значений (источник истины, пока панель
    // открыта) — закрываем панель, иначе её следующее изменение перезатрёт подставленный референс.
    setSelectedNodeId(null);
    toastStore.pushSuccess(`Референс «${pendingReference}» подставлен — сохраните сценарий`);
    setPendingReference(null);
  }

  const isSaving = createScenario.isPending || updateScenario.isPending;
  // Последний запуск ЭТОГО сценария (чей угодно, любой статус) — тот же useLastRun, что и на
  // ScenarioCard в списке сценариев.
  const lastRun = useLastRun(scenarioId, canReadRuns);

  return (
    <div className="editor-page">
      <EditorHeader
        name={name}
        description={description}
        onChangeName={setName}
        onChangeDescription={setDescription}
        onSave={canEdit ? handleSave : undefined}
        isSaving={isSaving}
        nameError={nameError}
        onRun={canRun && scenarioId ? () => requestRun() : undefined}
        isStarting={startRun.isPending}
        sendReportByMail={sendReportByMail}
        onChangeSendReportByMail={setSendReportByMail}
        onOpenLastRun={lastRun ? () => navigate(`/runs/${lastRun.id}`) : undefined}
        onApplyReference={canEdit ? setPendingReference : undefined}
      />

      {scenarioId && scenarioQuery.error ? <ErrorBanner error={scenarioQuery.error} title="Не удалось загрузить сценарий" /> : null}

      <div className="editor-body">
        {canEdit ? <StepPalette /> : null}

        <div className="editor-canvas">
          <ScenarioGraph
            mode={canEdit ? "edit" : "view"}
            nodes={nodes}
            edges={edges}
            onNodesChange={canEdit ? onNodesChange : undefined}
            onEdgesChange={canEdit ? onEdgesChange : undefined}
            onConnect={canEdit ? onConnect : undefined}
            onSelectNode={(id) => setSelectedNodeId(id)}
            onDropStepType={canEdit ? handleDropStepType : undefined}
            onRunFromNode={canRun ? (stepId, stepName) => requestRun({ stepId, stepName }) : undefined}
          />
        </div>

        {selectedNode ? (
          <ConfigPanel
            nodeId={selectedNode.id}
            data={selectedNode.data}
            width={configPanelWidth}
            onWidthChange={setConfigPanelWidth}
            onChangeName={(newName) => updateSelectedNodeData({ name: newName })}
            onChangeConfig={(config) => updateSelectedNodeData({ config })}
            onDelete={handleDeleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={pendingReference !== null}
        title="Подставить референс?"
        message={
          pendingReference
            ? referenceImpact.transactions === 0 && referenceImpact.checks === 0
              ? "В сценарии нет шагов QUEUE с транзакциями и шагов QUEUE_CHECK — подставлять некуда."
              : `Транзакции QUEUE (${referenceImpact.transactions}) получат naturalKey «${pendingReference}-1», «${pendingReference}-2»… (нумерация внутри шага). Проверки QUEUE_CHECK (${referenceImpact.checks}) будут искать по префиксу «${pendingReference}». Прежние naturalKey этих шагов будут перезаписаны.`
            : ""
        }
        confirmLabel="Подставить"
        danger={false}
        onConfirm={handleConfirmReference}
        onCancel={() => setPendingReference(null)}
      />

      <ConfirmDialog
        open={pendingRun !== null}
        title={pendingRun?.startStep ? "Запустить с этого шага?" : "Запустить без таймаута?"}
        message={pendingRunMessage}
        confirmLabel="Запустить"
        danger={false}
        onConfirm={handleConfirmRun}
        onCancel={() => setPendingRun(null)}
      />
    </div>
  );
}
