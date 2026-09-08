import { useCallback, useEffect, useRef } from "react";
import type { JobStepConfig, QueueCheckStepConfig, QueueStepConfig } from "../../../api/types";
import type { StepNodeData } from "../../../graph/types";
import { JellyPanel } from "../../../components/jelly/JellyPanel";
import { JellyField } from "../../../components/jelly/JellyField";
import { JellyInput } from "../../../components/jelly/JellyInput";
import { JellyButton } from "../../../components/jelly/JellyButton";
import { JellyBadge } from "../../../components/jelly/JellyBadge";
import { STEP_TYPE_LABELS } from "../../../lib/runStatus";
import { JobConfigForm } from "./JobConfigForm";
import { QueueConfigForm } from "./QueueConfigForm";
import { QueueCheckConfigForm } from "./QueueCheckConfigForm";
import "./configPanel.css";

const TONE: Record<StepNodeData["type"], "job" | "queue" | "queueCheck"> = {
  JOB: "job",
  QUEUE: "queue",
  QUEUE_CHECK: "queueCheck",
};

const MIN_WIDTH = 280;
const MAX_WIDTH = 640;

interface ConfigPanelProps {
  nodeId: string;
  data: StepNodeData;
  width: number;
  onWidthChange: (width: number) => void;
  onChangeName: (name: string) => void;
  onChangeConfig: (config: StepNodeData["config"]) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ConfigPanel({
  nodeId,
  data,
  width,
  onWidthChange,
  onChangeName,
  onChangeConfig,
  onDelete,
  onClose,
}: ConfigPanelProps) {
  // Ширина живёт у родителя (ScenarioEditorPage), не тут — key={nodeId} ниже форсирует remount
  // всего ConfigPanel при переключении между нодами, локальный useState потерял бы подобранную
  // пользователем ширину при каждом клике по новой ноде.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  // Ручка — на ЛЕВОЙ грани панели (в отличие от нативного CSS resize, который тянется только за
  // правый нижний угол): панель стоит справа от холста, тянуть логично именно ближнюю к холсту
  // грань. delta считается от начальной точки драга, а не от предыдущего кадра — так JellyPanel/
  // Blob не пересоздаётся на каждый pointermove, а просто получает новый inline-width.
  const handleResizeStart = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widthRef.current;

      function handleMove(moveEvent: PointerEvent) {
        const next = startWidth + (startX - moveEvent.clientX);
        onWidthChange(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
      }
      function handleUp() {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      }
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [onWidthChange],
  );

  return (
    // key={nodeId} — не про анимацию, а про корректность: форсирует remount при переключении на
    // другую ноду, чтобы useForm({defaultValues}) внутри *ConfigForm сбросился на конфиг НОВОЙ
    // ноды, а не сохранял значения предыдущей (React иначе переиспользовал бы тот же instance
    // компонента). Открытие панели — без анимации входа/выхода, по прямому запросу.
    <div key={nodeId} className="config-panel-wrap">
      <div
        className="config-panel-resize-handle"
        onPointerDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину панели"
      />
      <JellyPanel radius="lg" className="config-panel" style={{ width }}>
        <div className="config-panel-header">
          <JellyBadge tone={TONE[data.type]}>{STEP_TYPE_LABELS[data.type]}</JellyBadge>
          <button type="button" className="config-panel-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <JellyField label="Название шага">
          <JellyInput value={data.name} onChange={(e) => onChangeName(e.target.value)} />
        </JellyField>

        {data.type === "JOB" ? (
          <JobConfigForm config={data.config as JobStepConfig} onChange={onChangeConfig} />
        ) : data.type === "QUEUE" ? (
          <QueueConfigForm config={data.config as QueueStepConfig} onChange={onChangeConfig} />
        ) : (
          <QueueCheckConfigForm config={data.config as QueueCheckStepConfig} onChange={onChangeConfig} />
        )}

        <JellyButton variant="danger" size="sm" onClick={onDelete} className="config-panel-delete">
          Удалить шаг
        </JellyButton>
      </JellyPanel>
    </div>
  );
}
