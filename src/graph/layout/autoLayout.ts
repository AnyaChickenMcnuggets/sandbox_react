import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { NodePosition } from "./layoutStorage";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

export function computeAutoLayout(nodes: Node[], edges: Edge[]): Record<string, NodePosition> {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const positions: Record<string, NodePosition> = {};
  for (const node of nodes) {
    const dagreNode = graph.node(node.id);
    positions[node.id] = {
      x: dagreNode.x - NODE_WIDTH / 2,
      y: dagreNode.y - NODE_HEIGHT / 2,
    };
  }
  return positions;
}
