import { useRef } from "react";
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
import "./scenarioGraph.css";

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
}: ScenarioGraphProps) {
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/rpa-step-type") as ScenarioStepType | "";
    if (!type || !onDropStepType) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onDropStepType(type, position);
  }

  const isEdit = mode === "edit";

  return (
    <div className="scenario-graph-wrapper" ref={wrapperRef} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <ReactFlow<Node<StepNodeData>>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={isEdit ? onNodesChange : undefined}
        onEdgesChange={isEdit ? onEdgesChange : undefined}
        onConnect={isEdit ? onConnect : undefined}
        nodesDraggable={isEdit}
        nodesConnectable={isEdit}
        elementsSelectable
        onNodeClick={(_, node) => onSelectNode?.(node.id, node.data)}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={26} size={2} className="scenario-graph-bg" />
        <Controls showInteractive={false} />
      </ReactFlow>
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
