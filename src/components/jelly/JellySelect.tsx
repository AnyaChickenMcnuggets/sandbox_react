import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "clsx";
import "./jellyPanel.css";

interface JellySelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const JellySelect = forwardRef<HTMLSelectElement, JellySelectProps>(function JellySelect(
  { className, hasError, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={clsx("jelly-select", hasError && "jelly-input-error", className)} {...rest}>
      {children}
    </select>
  );
});
