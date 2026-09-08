import { useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeTypes } from "./nodeTypes";
import { edgeTypes } from "./edgeTypes";
import type { StepNodeData } from "./types";
import type { ScenarioStepType } from "../api/types";
import { collisionBus } from "./collisionBus";
import { RunFromNodeContext } from "./RunFromNodeContext";
import "./scenarioGraph.css";

// Приблизительные габариты ноды (см. stepNode.css) — используются только для детекции сближения
// при драге, не для лейаута, точность до пикселя тут не нужна.
const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;
const COLLISION_MARGIN = 24;
const BUMP_COOLDOWN_MS = 450;

export interface ScenarioGraphProps {
  mode: "edit" | "view";
  nodes: Node<StepNodeData>[];
  edges: Edge[];
  onNodesChange?: (changes: NodeChange<Node<StepNodeData>>[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string, data: StepNodeData) => void;
  onDropStepType?: (type: ScenarioStepType, position: { x: number; y: number }) => void;
  /** Показывает кнопку "Запустить отсюда" на нодах с сохранённым stepId (см. RunFromNodeContext). */
  onRunFromNode?: (stepId: number, stepName: string) => void;
}

function ScenarioGraphInner({
  mode,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectNode,
  onDropStepType,
  onRunFromNode,
}: ScenarioGraphProps) {
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastBumpRef = useRef<Map<string, number>>(new Map());
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/rpa-step-type") as ScenarioStepType | "";
    if (!type || !onDropStepType) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onDropStepType(type, position);
  }

  // "Коллизия" желейных нод: пока одна тащится, соседние в зоне сближения получают короткий
  // направленный импульс сжатия/отскока через collisionBus (см. StepNode) — с кулдауном на ноду,
  // чтобы не дёргать анимацию на каждый кадр драга, пока ноды перекрываются.
  function handleNodeDrag(_event: unknown, draggedNode: Node<StepNodeData>) {
    const now = performance.now();
    const draggedCenterX = draggedNode.position.x + NODE_WIDTH / 2;
    const draggedCenterY = draggedNode.position.y + NODE_HEIGHT / 2;

    for (const other of nodes) {
      if (other.id === draggedNode.id) continue;
      const otherCenterX = other.position.x + NODE_WIDTH / 2;
      const otherCenterY = other.position.y + NODE_HEIGHT / 2;
      const overlapping =
        Math.abs(draggedCenterX - otherCenterX) < NODE_WIDTH + COLLISION_MARGIN &&
        Math.abs(draggedCenterY - otherCenterY) < NODE_HEIGHT + COLLISION_MARGIN;
      if (!overlapping) continue;

      const lastBump = lastBumpRef.current.get(other.id) ?? 0;
      if (now - lastBump < BUMP_COOLDOWN_MS) continue;
      lastBumpRef.current.set(other.id, now);
      collisionBus.bump(other.id);
    }
  }

  const isEdit = mode === "edit";

  // Рёбра, инцидентные перетаскиваемой ноде, получают data.nodeDragging — JellyEdge реагирует
  // на это как на натянутую резинку (см. jellyEdge.css), а не просто рисует статичную линию.
  const edgesWithState = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      nodeDragging: isEdit && draggingNodeId !== null && (edge.source === draggingNodeId || edge.target === draggingNodeId),
    },
  }));

  return (
    <div className="scenario-graph-wrapper" ref={wrapperRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <RunFromNodeContext.Provider value={onRunFromNode ?? null}>
        <ReactFlow<Node<StepNodeData>>
          nodes={nodes}
          edges={edgesWithState}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={isEdit ? onNodesChange : undefined}
          onEdgesChange={isEdit ? onEdgesChange : undefined}
          onConnect={isEdit ? onConnect : undefined}
          onNodeDragStart={isEdit ? (_, node) => setDraggingNodeId(node.id) : undefined}
          onNodeDrag={isEdit ? handleNodeDrag : undefined}
          onNodeDragStop={isEdit ? () => setDraggingNodeId(null) : undefined}
          nodesDraggable={isEdit}
          nodesConnectable={isEdit}
          elementsSelectable
          deleteKeyCode={isEdit ? ["Backspace", "Delete"] : null}
          onNodeClick={(_, node) => onSelectNode?.(node.id, node.data)}
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={2} className="scenario-graph-bg" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </RunFromNodeContext.Provider>
    </div>
  );
}

export function ScenarioGraph(props: ScenarioGraphProps) {
  return (
    <ReactFlowProvider>
      <ScenarioGraphInner {...props} />
    </ReactFlowProvider>
  );
}
