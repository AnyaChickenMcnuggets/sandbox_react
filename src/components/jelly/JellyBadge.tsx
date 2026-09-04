import type { ReactNode } from "react";
import clsx from "clsx";
import "./jellyBadge.css";

interface JellyBadgeProps {
  tone?: "neutral" | "job" | "queue" | "queueCheck" | "danger" | "success" | "warning";
  children: ReactNode;
  className?: string;
}

export function JellyBadge({ tone = "neutral", children, className }: JellyBadgeProps) {
  return <span className={clsx("jelly-badge", `jelly-badge-${tone}`, className)}>{children}</span>;
}
