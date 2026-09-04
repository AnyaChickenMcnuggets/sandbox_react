import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import "./jellyPanel.css";

interface JellyInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const JellyInput = forwardRef<HTMLInputElement, JellyInputProps>(function JellyInput(
  { className, hasError, ...rest },
  ref,
) {
  return <input ref={ref} className={clsx("jelly-input", hasError && "jelly-input-error", className)} {...rest} />;
});

interface JellyTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const JellyTextarea = forwardRef<HTMLTextAreaElement, JellyTextareaProps>(function JellyTextarea(
  { className, hasError, ...rest },
  ref,
) {
  return <textarea ref={ref} className={clsx("jelly-textarea", hasError && "jelly-input-error", className)} {...rest} />;
});
