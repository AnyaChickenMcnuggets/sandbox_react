import type { RunStatus } from "../../api/types";
import { JellyButton } from "../../components/jelly/JellyButton";
import { isTerminalStatus } from "../../lib/runStatus";
import "./runControls.css";

interface RunControlsProps {
  status: RunStatus;
  onStop: () => void;
  onCleanup: () => void;
  isStopping: boolean;
  isCleaningUp: boolean;
}

export function RunControls({ status, onStop, onCleanup, isStopping, isCleaningUp }: RunControlsProps) {
  const terminal = isTerminalStatus(status);

  return (
    <div className="run-controls">
      {!terminal ? (
        <JellyButton variant="danger" onClick={onStop} disabled={isStopping}>
          {isStopping ? "Останавливаем…" : "Остановить прогон"}
        </JellyButton>
      ) : (
        <JellyButton variant="secondary" onClick={onCleanup} disabled={isCleaningUp}>
          {isCleaningUp ? "Очищаем…" : "Cleanup"}
        </JellyButton>
      )}
    </div>
  );
}
