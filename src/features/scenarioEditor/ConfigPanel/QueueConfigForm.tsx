import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { QueueStepConfig } from "../../../api/types";
import { JellyField } from "../../../components/jelly/JellyField";
import { JellyInput, JellyTextarea } from "../../../components/jelly/JellyInput";
import { queueFormSchema, type QueueFormValues } from "./validation/stepConfigSchemas";
import { TransactionTemplateListEditor } from "./TransactionTemplateListEditor";

interface QueueConfigFormProps {
  config: QueueStepConfig;
  onChange: (config: QueueStepConfig) => void;
}

function toFormValues(config: QueueStepConfig): QueueFormValues {
  return {
    name: config.name,
    description: config.description,
    ttl: config.ttl,
    maxRetray: config.maxRetray,
    transactions: (config.transactions ?? []).map((t) => ({
      naturalKey: t.naturalKey,
      valueText: typeof t.value === "string" ? t.value : JSON.stringify(t.value ?? null),
      metadata: Object.entries(t.metadata ?? {}).map(([key, value]) => ({ key, value })),
    })),
  };
}

function parseValue(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed; // не валидный JSON — трактуем как обычную строку
  }
}

function toConfig(values: QueueFormValues): QueueStepConfig {
  return {
    name: values.name,
    description: values.description?.trim() ? values.description : null,
    ttl: values.ttl,
    maxRetray: values.maxRetray,
    transactions:
      values.transactions.length > 0
        ? values.transactions.map((t) => {
            const metadata = t.metadata.filter((m) => m.key.trim() !== "");
            return {
              naturalKey: t.naturalKey,
              value: parseValue(t.valueText),
              metadata: metadata.length > 0 ? Object.fromEntries(metadata.map((m) => [m.key, m.value])) : null,
            };
          })
        : null,
  };
}

export function QueueConfigForm({ config, onChange }: QueueConfigFormProps) {
  const methods = useForm<QueueFormValues>({
    resolver: zodResolver(queueFormSchema),
    mode: "onChange",
    defaultValues: toFormValues(config),
  });
  const { register, control, watch, formState } = methods;
  const values = watch();

  useEffect(() => {
    onChange(toConfig(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  return (
    <FormProvider {...methods}>
      <div>
        <JellyField label="Имя очереди" error={formState.errors.name?.message}>
          <JellyInput hasError={!!formState.errors.name} {...register("name")} />
        </JellyField>

        <JellyField label="Описание" hint="Опционально">
          <JellyTextarea {...register("description")} />
        </JellyField>

        <JellyField label="TTL" hint="Опционально, в секундах">
          <JellyInput type="number" {...register("ttl", { setValueAs: (v) => (v === "" ? null : Number(v)) })} />
        </JellyField>

        <JellyField label="Max retries" hint="Поле бэкенда называется maxRetray">
          <JellyInput
            type="number"
            {...register("maxRetray", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
          />
        </JellyField>

        <JellyField label="Тестовые транзакции" hint="Опционально — наполнить очередь при запуске">
          <TransactionTemplateListEditor control={control} />
        </JellyField>
      </div>
    </FormProvider>
  );
}
