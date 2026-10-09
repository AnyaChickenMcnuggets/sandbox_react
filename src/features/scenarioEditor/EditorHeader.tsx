import { useState } from "react";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyInput, JellyTextarea } from "../../components/jelly/JellyInput";
import { JellyButton } from "../../components/jelly/JellyButton";
import { IconActivity, IconSave } from "../../components/jelly/icons";
import { RobotsAvailabilityIndicator } from "../../components/feedback/RobotsAvailabilityIndicator";
import { RunLaunchButton } from "../../components/feedback/RunLaunchButton";
import { MailReportToggle } from "../../components/feedback/MailReportToggle";
import "./editorHeader.css";

interface EditorHeaderProps {
  name: string;
  description: string;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  // undefined — VIEWER (см. ScenarioEditorPage.canEdit): сохранение скрыто целиком, не задизейблено.
  onSave?: () => void;
  isSaving: boolean;
  nameError?: string;
  // Запуск возможен только у уже сохранённого сценария (нужен scenarioId) — см. ScenarioEditorPage.
  onRun?: () => void;
  isStarting: boolean;
  sendReportByMail: boolean;
  onChangeSendReportByMail: (value: boolean) => void;
  // Переход к последнему запуску ЭТОГО сценария (успешному или ещё выполняющемуся — без разницы) —
  // есть, только если такой запуск уже когда-то был зафиксирован в локальном журнале (runHistory).
  onOpenLastRun?: () => void;
  // Массовая подстановка референса в QUEUE/QUEUE_CHECK — только при праве редактирования.
  onApplyReference?: (reference: string) => void;
}

export function EditorHeader({
  name,
  description,
  onChangeName,
  onChangeDescription,
  onSave,
  isSaving,
  nameError,
  onRun,
  isStarting,
  sendReportByMail,
  onChangeSendReportByMail,
  onOpenLastRun,
  onApplyReference,
}: EditorHeaderProps) {
  const [reference, setReference] = useState("");
  // Название/описание редактируются раз в синюю луну (в отличие от конфига шагов) — два больших
  // поля были всегда развёрнуты и отъедали высоту у холста без пользы большую часть времени.
  // Всегда свёрнуто по умолчанию, даже для нового безымянного сценария — клик по заголовку
  // разворачивает обратно в форму. Ошибка валидации принудительно держит форму развёрнутой, даже
  // если пользователь до этого её свернул.
  const [isEditing, setIsEditing] = useState(false);
  const editing = isEditing || !!nameError;

  return (
    // Сохранить/Запустить и подсказка по холсту раньше жили в отдельном .editor-toolbar-row под
    // этим блоком — с двумя строками с собственными отступами и кнопкой "Запустить", подвешенной
    // отдельно от всего остального, выглядело разрозненно и съедало лишнюю высоту. Теперь один
    // JellyPanel: название/описание + обе кнопки в шапке, подсказка — тонкой строкой снизу.
    <JellyPanel radius="lg" className="editor-header">
      <div className="editor-header-top">
        {editing ? (
          <div className="editor-header-fields">
            <JellyInput
              className="editor-header-name"
              placeholder="Название сценария"
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              hasError={!!nameError}
              autoFocus
            />
            <JellyTextarea
              className="editor-header-description"
              placeholder="Описание (опционально)"
              value={description}
              onChange={(e) => onChangeDescription(e.target.value)}
              rows={2}
            />
            {nameError ? (
              <span className="editor-header-error">{nameError}</span>
            ) : (
              <button type="button" className="editor-header-done" onClick={() => setIsEditing(false)}>
                Свернуть
              </button>
            )}
          </div>
        ) : (
          <button type="button" className="editor-header-summary" onClick={() => setIsEditing(true)}>
            <span className="editor-header-summary-text">
              <span className="editor-header-summary-name">
                {name || <span className="editor-header-summary-name-empty">Название сценария</span>}
              </span>
              <span className="editor-header-summary-desc">
                {description || <span className="editor-header-summary-desc-empty">Добавить описание</span>}
              </span>
            </span>
          </button>
        )}

        <div className="editor-header-actions">
          {onOpenLastRun ? (
            <JellyButton
              iconOnly
              variant="secondary"
              title="Последний запуск"
              aria-label="Последний запуск"
              onClick={onOpenLastRun}
            >
              <IconActivity />
            </JellyButton>
          ) : null}
          {onSave ? (
            <JellyButton
              iconOnly
              title={isSaving ? "Сохранение…" : "Сохранить"}
              aria-label={isSaving ? "Сохранение…" : "Сохранить"}
              onClick={onSave}
              disabled={isSaving}
            >
              <IconSave />
            </JellyButton>
          ) : null}
          {onRun ? (
            <>
              <MailReportToggle checked={sendReportByMail} onChange={onChangeSendReportByMail} />
              <RobotsAvailabilityIndicator />
              <RunLaunchButton isStarting={isStarting} onClick={onRun} />
            </>
          ) : null}
        </div>
      </div>

      {onApplyReference ? (
        <form
          className="editor-header-reference"
          onSubmit={(e) => {
            e.preventDefault();
            if (reference.trim()) onApplyReference(reference.trim());
          }}
        >
          <JellyInput
            className="editor-header-reference-input"
            placeholder="Общий референс сценария"
            aria-label="Общий референс сценария"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <JellyButton type="submit" size="sm" variant="secondary" disabled={!reference.trim()}>
            Подставить во все шаги
          </JellyButton>
        </form>
      ) : null}

      <div className="editor-header-hint">
        Расположение блоков сохраняется локально в этом браузере · клик по связи + Backspace/Delete —
        удалить · выбрать ноду + Ctrl/Cmd+C, Ctrl/Cmd+V — скопировать
      </div>
    </JellyPanel>
  );
}
