import { useFieldArray, type Control, type FieldValues, type ArrayPath, type Path, type UseFormRegister } from "react-hook-form";
import { JellyInput } from "../../../../components/jelly/JellyInput";
import { JellyButton } from "../../../../components/jelly/JellyButton";
import "./keyValueListEditor.css";

interface KeyValueListEditorProps<T extends FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
  name: ArrayPath<T>;
  keyLabel?: string;
  valueLabel?: string;
}

export function KeyValueListEditor<T extends FieldValues>({
  control,
  register,
  name,
  keyLabel = "Ключ",
  valueLabel = "Значение",
}: KeyValueListEditorProps<T>) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="kv-list">
      {fields.map((field, index) => (
        <div className="kv-list-row" key={field.id}>
          <JellyInput placeholder={keyLabel} {...register(`${name}.${index}.key` as Path<T>)} />
          <JellyInput placeholder={valueLabel} {...register(`${name}.${index}.value` as Path<T>)} />
          <button type="button" className="kv-list-remove" onClick={() => remove(index)} aria-label="Удалить">
            ×
          </button>
        </div>
      ))}
      <JellyButton type="button" variant="ghost" size="sm" onClick={() => append({ key: "", value: "" } as never)}>
        + добавить
      </JellyButton>
    </div>
  );
}
