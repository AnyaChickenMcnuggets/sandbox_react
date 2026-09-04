import { useFieldArray, useFormContext, type Control } from "react-hook-form";
import { JellyInput, JellyTextarea } from "../../../components/jelly/JellyInput";
import { JellyButton } from "../../../components/jelly/JellyButton";
import { JellyPanel } from "../../../components/jelly/JellyPanel";
import { KeyValueListEditor } from "./common/KeyValueListEditor";
import type { QueueFormValues } from "./validation/stepConfigSchemas";
import "./transactionTemplateListEditor.css";

interface TransactionTemplateListEditorProps {
  control: Control<QueueFormValues>;
}

export function TransactionTemplateListEditor({ control }: TransactionTemplateListEditorProps) {
  const { register } = useFormContext<QueueFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "transactions" });

  return (
    <div className="transaction-list">
      {fields.map((field, index) => (
        <JellyPanel key={field.id} radius="md" className="transaction-row" flat>
          <div className="transaction-row-header">
            <span>Транзакция #{index + 1}</span>
            <button type="button" className="transaction-row-remove" onClick={() => remove(index)}>
              Удалить
            </button>
          </div>
          <JellyInput placeholder="naturalKey" {...register(`transactions.${index}.naturalKey`)} />
          <JellyTextarea
            placeholder="value (JSON или строка)"
            {...register(`transactions.${index}.valueText`)}
          />
          <div className="transaction-row-metadata-label">metadata</div>
          <KeyValueListEditor
            control={control}
            register={register}
            name={`transactions.${index}.metadata`}
          />
        </JellyPanel>
      ))}
      <JellyButton
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => append({ naturalKey: "", valueText: "", metadata: [] })}
      >
        + добавить транзакцию
      </JellyButton>
    </div>
  );
}
