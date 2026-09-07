import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";
import "./blob.css";

export type BlobRadius = "sm" | "md" | "lg" | "pill";

export interface BlobProps extends HTMLAttributes<HTMLDivElement> {
  radius?: BlobRadius;
  tint?: string;
  flat?: boolean;
  /** Liquid Glass — полупрозрачная подложка с backdrop-blur вместо сплошного --surface.
   *  Для "хромовых" поверхностей (панели, строки списков), не для цветных нод/кнопок. */
  glass?: boolean;
}

export const Blob = forwardRef<HTMLDivElement, BlobProps>(function Blob(
  { radius = "md", tint, flat = false, glass = false, className, style, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        "jelly-blob",
        `jelly-radius-${radius}`,
        flat && "jelly-blob-flat",
        glass && "jelly-blob-glass",
        className,
      )}
      style={{ ...(tint ? { background: tint } : undefined), ...style }}
      {...rest}
    >
      <span className="jelly-blob-highlight" aria-hidden="true" />
      <span className="jelly-blob-content">{children}</span>
    </div>
  );
});
