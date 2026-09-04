import { useId } from "react";
import { motion } from "framer-motion";
import "./jellyToggle.css";

interface JellyToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function JellyToggle({ checked, onChange, label, disabled }: JellyToggleProps) {
  return (
    <label className="jelly-toggle-row">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`jelly-toggle-track ${checked ? "jelly-toggle-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <motion.span
          className="jelly-toggle-knob"
          layout
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        />
      </button>
      {label ? <span className="jelly-toggle-label">{label}</span> : null}
    </label>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface JellySegmentedProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function JellySegmented<T extends string>({ value, options, onChange }: JellySegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div className="jelly-segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="jelly-segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.value === value ? (
            <motion.span
              layoutId={`jelly-segmented-active-${layoutId}`}
              className="jelly-segmented-active"
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
            />
          ) : null}
          <span className="jelly-segmented-label">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
