import type { ReactNode } from "react";
import "./jellyPanel.css";

interface JellyFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function JellyField({ label, hint, error, children }: JellyFieldProps) {
  return (
    <div className="jelly-field">
      <label className="jelly-label">{label}</label>
      {children}
      {error ? <span className="jelly-error-text">{error}</span> : hint ? <span className="jelly-hint">{hint}</span> : null}
    </div>
  );
}
