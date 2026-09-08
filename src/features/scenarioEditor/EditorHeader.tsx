import { useState } from "react";
import { JellyInput, JellyTextarea } from "../../components/jelly/JellyInput";
import { JellyButton } from "../../components/jelly/JellyButton";
import { IconEdit, IconSave } from "../../components/jelly/icons";
import "./editorHeader.css";

interface EditorHeaderProps {
  name: string;
  description: string;
  onChangeName: (name: string) => void;
  onChangeDescription: (description: string) => void;
  onSave: () => void;
  isSaving: boolean;
  nameError?: string;
}

export function EditorHeader({
  name,
  description,
  onChangeName,
  onChangeDescription,
  onSave,
  isSaving,
  nameError,
}: EditorHeaderProps) {
  // Название/описание редактируются раз в синюю луну (в отличие от конфига шагов) — два больших
  // поля были всегда развёрнуты и отъедали высоту у холста без пользы большую часть времени.
  // По умолчанию свёрнуто в одну строку-заголовок; клик — разворачивает обратно в форму. Новый,
  // ещё безымянный сценарий сразу открыт (свернуть в заголовок нечего показывать). Ошибка валидации
  // принудительно держит форму развёрнутой, даже если пользователь до этого её свернул.
  const [isEditing, setIsEditing] = useState(!name);
  const editing = isEditing || !!nameError;

  return (
    <div className="editor-header">
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
      <JellyButton
        iconOnly
        title={isSaving ? "Сохранение…" : "Сохранить"}
        aria-label={isSaving ? "Сохранение…" : "Сохранить"}
        onClick={onSave}
        disabled={isSaving}
      >
        <IconSave />
      </JellyButton>
    </div>
  );
}
