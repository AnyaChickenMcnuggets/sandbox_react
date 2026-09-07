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
import type { ScenarioStepType } from "../api/types";
import type { StepNodeData } from "../graph/types";
import { ScenarioGraph } from "../graph/ScenarioGraph";
import { fromScenarioResponse } from "../graph/mapping/fromScenarioResponse";
import { toScenarioRequest, zipStepIdsWithPositions } from "../graph/mapping/toScenarioRequest";
import { defaultConfigForType, DEFAULT_STEP_NAME } from "../graph/mapping/stepConfigDefaults";
import { replaceLayout } from "../graph/layout/layoutStorage";
import { EditorHeader } from "../features/scenarioEditor/EditorHeader";
import { StepPalette } from "../features/scenarioEditor/StepPalette";
import { ConfigPanel } from "../features/scenarioEditor/ConfigPanel/ConfigPanel";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import { JellyButton } from "../components/jelly/JellyButton";
import { toastStore } from "../components/feedback/toastStore";
import { runHistory } from "../lib/runHistory";
import "./scenarioEditorPage.css";

export function ScenarioEditorPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = params.scenarioId ? Number(params.scenarioId) : undefined;
  const navigate = useNavigate();

  const scenarioQuery = useScenario(scenarioId);
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario(scenarioId ?? -1);
  const startRun = useStartRun();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StepNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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
      const newNode: Node<StepNodeData> = {
        id: localId,
        type: "step",
        position,
        data: {
          localId,
          type,
          name: DEFAULT_STEP_NAME[type],
          config: defaultConfigForType(type),
        },
      };
      setNodes((nds) => [...nds, newNode]);
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
        if (!clipboardRef.current) return;
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
  }, [selectedNodeId, setNodes]);

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

  function handleRun() {
    if (!scenarioId) return;
    startRun.mutate(
      { scenarioId },
      {
        onSuccess: (run) => {
          runHistory.record({
            runId: run.id,
            scenarioId,
            scenarioName: name.trim() || `Сценарий #${scenarioId}`,
            startedAt: new Date().toISOString(),
          });
          navigate(`/runs/${run.id}`);
        },
      },
    );
  }

  const isSaving = createScenario.isPending || updateScenario.isPending;

  return (
    <div className="editor-page">
      <EditorHeader
        name={name}
        description={description}
        onChangeName={setName}
        onChangeDescription={setDescription}
        onSave={handleSave}
        isSaving={isSaving}
        nameError={nameError}
      />

      {scenarioId && scenarioQuery.error ? <ErrorBanner error={scenarioQuery.error} title="Не удалось загрузить сценарий" /> : null}

      <div className="editor-toolbar-row">
        <span className="editor-layout-hint">
          Расположение блоков сохраняется локально в этом браузере · клик по связи + Backspace/Delete —
          удалить · выбрать ноду + Ctrl/Cmd+C, Ctrl/Cmd+V — скопировать
        </span>
        {scenarioId ? (
          <JellyButton size="sm" variant="secondary" onClick={handleRun} disabled={startRun.isPending}>
            {startRun.isPending ? "Запуск…" : "Запустить"}
          </JellyButton>
        ) : null}
      </div>

      <div className="editor-body">
        <StepPalette />

        <div className="editor-canvas">
          <ScenarioGraph
            mode="edit"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectNode={(id) => setSelectedNodeId(id)}
            onDropStepType={handleDropStepType}
          />
        </div>

        {selectedNode ? (
          <ConfigPanel
            nodeId={selectedNode.id}
            data={selectedNode.data}
            onChangeName={(newName) => updateSelectedNodeData({ name: newName })}
            onChangeConfig={(config) => updateSelectedNodeData({ config })}
            onDelete={handleDeleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
