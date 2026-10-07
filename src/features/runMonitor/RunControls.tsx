import type { RunStatus } from "../../api/types";
import { JellyButton } from "../../components/jelly/JellyButton";
import { isTerminalStatus } from "../../lib/runStatus";
import "./runControls.css";

interface RunControlsProps {
  status: RunStatus;
  // undefined — нет права (RUN_STOP / CLEANUP): кнопка скрыта целиком, не задизейблена.
  onStop?: () => void;
  onCleanup?: () => void;
  isStopping: boolean;
  isCleaningUp: boolean;
}

export function RunControls({ status, onStop, onCleanup, isStopping, isCleaningUp }: RunControlsProps) {
  const terminal = isTerminalStatus(status);
  const stopButton =
    !terminal && onStop ? (
      <JellyButton variant="danger" onClick={onStop} disabled={isStopping}>
        {isStopping ? "Останавливаем…" : "Остановить запуск"}
      </JellyButton>
    ) : null;
  const cleanupButton =
    terminal && onCleanup ? (
      <JellyButton variant="secondary" onClick={onCleanup} disabled={isCleaningUp}>
        {isCleaningUp ? "Очищаем…" : "Cleanup"}
      </JellyButton>
    ) : null;

  if (!stopButton && !cleanupButton) return null;

  return (
    <div className="run-controls">
      {stopButton}
      {cleanupButton}
    </div>
  );
}
