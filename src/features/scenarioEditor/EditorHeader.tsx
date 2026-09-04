import { JellyInput, JellyTextarea } from "../../components/jelly/JellyInput";
import { JellyButton } from "../../components/jelly/JellyButton";
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
  return (
    <div className="editor-header">
      <div className="editor-header-fields">
        <JellyInput
          className="editor-header-name"
          placeholder="Название сценария"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          hasError={!!nameError}
        />
        <JellyTextarea
          className="editor-header-description"
          placeholder="Описание (опционально)"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          rows={1}
        />
        {nameError ? <span className="editor-header-error">{nameError}</span> : null}
      </div>
      <JellyButton onClick={onSave} disabled={isSaving}>
        {isSaving ? "Сохранение…" : "Сохранить"}
      </JellyButton>
    </div>
  );
}
