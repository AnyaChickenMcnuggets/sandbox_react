import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import clsx from "clsx";
import "./jellyEdge.css";

interface JellyEdgeData {
  animated?: boolean;
  nodeDragging?: boolean;
}

// Вынесены в константы модуля (не инлайн-литералы в JSX) намеренно — тот же урок, что уже
// зафиксирован для StepNode (см. его комментарий про whileHover/whileTap): у framer-motion
// декларативный animate-проп с keyframes-массивом перезапускает анимацию с нуля, если на очередной
// ре-рендер ему приходит НОВЫЙ (пусть даже поэлементно идентичный) объект/массив — а edges у
// ScenarioGraph пересобираются целиком на каждый ре-рендер (см. edgesWithState), то есть на КАЖДЫЙ
// тик поллинга монитора. Итог был ровно тем, на что жаловался пользователь: "бегущий" пунктир на
// ребре и пульс дышащей ноды дёргались/перезапускались каждые ~2.5с, а не текли непрерывно.
// Стабильная ссылка на один и тот же объект/массив между рендерами устраняет перезапуск полностью.
const FLOW_ANIMATE = { strokeDashoffset: [0, -36] };
const FLOW_TRANSITION = { duration: 0.9, repeat: Infinity, ease: "linear" as const };

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
          animate={FLOW_ANIMATE}
          transition={FLOW_TRANSITION}
        />
      ) : null}
    </>
  );
}
