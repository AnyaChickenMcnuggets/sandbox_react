import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import clsx from "clsx";
import "./jellyEdge.css";

interface JellyEdgeData {
  animated?: boolean;
  nodeDragging?: boolean;
}

export function JellyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const edgeData = data as JellyEdgeData | undefined;
  const animated = Boolean(edgeData?.animated);
  const tense = Boolean(edgeData?.nodeDragging);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={clsx("jelly-edge-base", tense && "jelly-edge-tense")}
      />
      {animated ? (
        <motion.path
          d={path}
          className="jelly-edge-flow"
          fill="none"
          strokeDasharray="10 8"
          animate={{ strokeDashoffset: [0, -36] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
      ) : null}
    </>
  );
}
