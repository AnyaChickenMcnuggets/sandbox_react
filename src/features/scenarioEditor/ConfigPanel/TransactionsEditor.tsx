import { useState, type KeyboardEvent } from "react";
import { useFieldArray, useFormContext, type Control } from "react-hook-form";
import { JellySegmented } from "../../../components/jelly/JellyToggle";
import { JellyTextarea } from "../../../components/jelly/JellyInput";
import { JellyButton } from "../../../components/jelly/JellyButton";
import { TransactionTemplateListEditor } from "./TransactionTemplateListEditor";
import type { QueueFormValues } from "./validation/stepConfigSchemas";
import { parseTransactionsJson, transactionsToJson } from "./transactionMapping";
import "./transactionsEditor.css";

interface TransactionsEditorProps {
  control: Control<QueueFormValues>;
}

// Список (transactions) остаётся единственным источником истины (его читает toConfig в
// QueueConfigForm) в обоих режимах — JSON-режим лишь альтернативный ввод, который на каждое
// валидное изменение синхронизируется в тот же field array через replace(). Так не нужно
// раздваивать логику сборки ScenarioRequest на "если json-режим — читай из другого места".
export function TransactionsEditor({ control }: TransactionsEditorProps) {
  const { watch, setValue, getValues } = useFormContext<QueueFormValues>();
  const { replace } = useFieldArray({ control, name: "transactions" });
  const mode = watch("transactionsMode");
  const transactionsJson = watch("transactionsJson");
  const [jsonError, setJsonError] = useState<string | undefined>();

  function handleModeChange(next: "list" | "json") {
    if (next === "json") {
      // При переключении в JSON — показываем текущие (уже сохранённые/введённые в списке) данные,
      // а не то, что было в JSON-поле в прошлый раз, если список успел измениться с тех пор.
      setValue("transactionsJson", transactionsToJson(getValues("transactions")));
      setJsonError(undefined);
    }
    setValue("transactionsMode", next);
  }

  function handleJsonChange(text: string) {
    setValue("transactionsJson", text);
    const parsed = parseTransactionsJson(text);
    if (parsed) {
      replace(parsed);
      setJsonError(undefined);
    } else {
      setJsonError("Невалидный JSON — ожидается массив вида [{ naturalKey, value, metadata }]");
    }
  }

  // Переформатировать вручную набранный/вставленный JSON тем же JSON.stringify(…, null, 2), что уже
  // применяется при переключении списка в JSON-режим — просто по требованию, не на каждый keystroke
  // (иначе курсор скакал бы при каждом нажатии клавиши). На синтаксически невалидном JSON — no-op,
  // ошибка уже показана под полем через handleJsonChange.
  function handleFormat() {
    try {
      const parsed = JSON.parse(transactionsJson);
      handleJsonChange(JSON.stringify(parsed, null, 2));
    } catch {
      // невалидный JSON — форматировать нечего, jsonError уже отображён
    }
  }

  // Обычный textarea отдаёт фокус дальше по Tab — неудобно при редактировании JSON построчно.
  // Вставляем два пробела на месте курсора и оставляем фокус в поле, как в кодовых редакторах.
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const { selectionStart, selectionEnd, value } = target;
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
    handleJsonChange(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = selectionStart + 2;
    });
  }

  return (
    <div className="transactions-editor">
      <JellySegmented
        value={mode}
        onChange={handleModeChange}
        options={[
          { value: "list", label: "Список" },
          { value: "json", label: "JSON" },
        ]}
      />

      {mode === "list" ? (
        <TransactionTemplateListEditor control={control} />
      ) : (
        <div className="transactions-json-field">
          <div className="transactions-json-toolbar">
            <span className="jelly-hint">Tab — отступ, не потеря фокуса</span>
            <JellyButton type="button" variant="ghost" size="sm" onClick={handleFormat}>
              Отформатировать
            </JellyButton>
          </div>
          <JellyTextarea
            className="transactions-json-textarea"
            value={transactionsJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'[\n  { "naturalKey": "1", "value": "...", "metadata": null }\n]'}
            spellCheck={false}
            hasError={!!jsonError}
          />
          {jsonError ? (
            <span className="jelly-error-text">{jsonError}</span>
          ) : (
            <span className="jelly-hint">
              Массив транзакций целиком — применяется сразу при валидном JSON, синхронизирован со
              списком
            </span>
          )}
        </div>
      )}
    </div>
  );
}
