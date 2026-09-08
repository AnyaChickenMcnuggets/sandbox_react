import { useState } from "react";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyInput, JellyTextarea } from "../../components/jelly/JellyInput";
import { JellyButton } from "../../components/jelly/JellyButton";
import { IconEdit, IconPlay, IconSave } from "../../components/jelly/icons";
import "./editorHeader.css";

interface EditorHeaderProps {
  name: string;
  description: string;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  onSave: () => void;
  isSaving: boolean;
  nameError?: string;
  // Запуск возможен только у уже сохранённого сценария (нужен scenarioId) — см. ScenarioEditorPage.
  onRun?: () => void;
  isStarting: boolean;
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
}: EditorHeaderProps) {
  // Название/описание редактируются раз в синюю луну (в отличие от конфига шагов) — два больших
  // поля были всегда развёрнуты и отъедали высоту у холста без пользы большую часть времени.
  // По умолчанию свёрнуто в одну строку-заголовок; клик — разворачивает обратно в форму. Новый,
  // ещё безымянный сценарий сразу открыт (свернуть в заголовок нечего показывать). Ошибка валидации
  // принудительно держит форму развёрнутой, даже если пользователь до этого её свернул.
  const [isEditing, setIsEditing] = useState(!name);
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
            <IconEdit className="editor-header-summary-icon" width={15} height={15} />
            <span className="editor-header-summary-text">
              <span className="editor-header-summary-name">{name}</span>
              <span className="editor-header-summary-desc">
                {description || <span className="editor-header-summary-desc-empty">Добавить описание</span>}
              </span>
            </span>
          </button>
        )}

        <div className="editor-header-actions">
          <JellyButton
            iconOnly
            title={isSaving ? "Сохранение…" : "Сохранить"}
            aria-label={isSaving ? "Сохранение…" : "Сохранить"}
            onClick={onSave}
            disabled={isSaving}
          >
            <IconSave />
          </JellyButton>
          {onRun ? (
            <JellyButton
              iconOnly
              variant="success"
              title={isStarting ? "Запуск…" : "Запустить"}
              aria-label={isStarting ? "Запуск…" : "Запустить"}
              onClick={onRun}
              disabled={isStarting}
            >
              <IconPlay />
            </JellyButton>
          ) : null}
        </div>
      </div>

      <div className="editor-header-hint">
        Расположение блоков сохраняется локально в этом браузере · клик по связи + Backspace/Delete —
        удалить · выбрать ноду + Ctrl/Cmd+C, Ctrl/Cmd+V — скопировать
      </div>
    </JellyPanel>
  );
}
