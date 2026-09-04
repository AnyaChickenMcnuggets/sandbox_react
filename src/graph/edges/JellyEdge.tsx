import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import "./jellyEdge.css";

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
  const animated = Boolean((data as { animated?: boolean } | undefined)?.animated);

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} className="jelly-edge-base" />
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
