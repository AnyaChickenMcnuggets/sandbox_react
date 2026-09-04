import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { QueueCheckStepConfig } from "../../../api/types";
import { JellyField } from "../../../components/jelly/JellyField";
import { JellyInput } from "../../../components/jelly/JellyInput";
import { JellyButton } from "../../../components/jelly/JellyButton";
import { JellyToggle } from "../../../components/jelly/JellyToggle";
import { queueCheckFormSchema, type QueueCheckFormValues } from "./validation/stepConfigSchemas";
import "./queueCheckConfigForm.css";

interface QueueCheckConfigFormProps {
  config: QueueCheckStepConfig;
  onChange: (config: QueueCheckStepConfig) => void;
}

function toFormValues(config: QueueCheckStepConfig): QueueCheckFormValues {
  const counts = config.expectedStatusCounts ?? {};
  return {
    queueName: config.queueName,
    naturalKeys: (config.naturalKeys ?? []).map((value) => ({ value })),
    naturalKeyPrefixMatch: config.naturalKeyPrefixMatch ?? false,
    expectedSuccess: counts.SUCCESS ?? null,
    expectedError: counts.ERROR ?? null,
    expectedBusinessError: counts.BUSINESS_ERROR ?? null,
    expectedNew: counts.NEW ?? null,
    expectedInProgress: counts.IN_PROGRESS ?? null,
    minTotalCount: config.minTotalCount,
    timeoutSeconds: config.timeoutSeconds,
    pollIntervalSeconds: config.pollIntervalSeconds,
  };
}

function toConfig(values: QueueCheckFormValues): QueueCheckStepConfig {
  const counts: Partial<Record<string, number>> = {};
  if (values.expectedSuccess != null) counts.SUCCESS = values.expectedSuccess;
  if (values.expectedError != null) counts.ERROR = values.expectedError;
  if (values.expectedBusinessError != null) counts.BUSINESS_ERROR = values.expectedBusinessError;
  if (values.expectedNew != null) counts.NEW = values.expectedNew;
  if (values.expectedInProgress != null) counts.IN_PROGRESS = values.expectedInProgress;

  const naturalKeys = values.naturalKeys.map((k) => k.value).filter((v) => v.trim() !== "");

  return {
    queueName: values.queueName,
    naturalKeys: naturalKeys.length > 0 ? naturalKeys : null,
    naturalKeyPrefixMatch: values.naturalKeyPrefixMatch,
    expectedStatusCounts: Object.keys(counts).length > 0 ? (counts as QueueCheckStepConfig["expectedStatusCounts"]) : null,
    minTotalCount: values.minTotalCount,
    timeoutSeconds: values.timeoutSeconds,
    pollIntervalSeconds: values.pollIntervalSeconds,
  };
}

export function QueueCheckConfigForm({ config, onChange }: QueueCheckConfigFormProps) {
  const { register, control, watch, setValue, formState } = useForm<QueueCheckFormValues>({
    resolver: zodResolver(queueCheckFormSchema),
    mode: "onChange",
    defaultValues: toFormValues(config),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "naturalKeys" });
  const values = watch();

  useEffect(() => {
    onChange(toConfig(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  const numField = (name: keyof QueueCheckFormValues) =>
    register(name, { setValueAs: (v) => (v === "" ? null : Number(v)) });

  return (
    <div>
      <JellyField label="Имя очереди" error={formState.errors.queueName?.message}>
        <JellyInput hasError={!!formState.errors.queueName} {...register("queueName")} />
      </JellyField>

      <JellyField label="Совпадение по префиксу" hint="Для выходных очередей — вкл; точное совпадение — выкл">
        <JellyToggle
          checked={values.naturalKeyPrefixMatch}
          onChange={(checked) => setValue("naturalKeyPrefixMatch", checked)}
        />
      </JellyField>

      <JellyField label="Natural keys" hint="Опционально — фильтр транзакций">
        <div className="qc-key-list">
          {fields.map((field, index) => (
            <div className="qc-key-row" key={field.id}>
              <JellyInput {...register(`naturalKeys.${index}.value`)} />
              <button type="button" className="qc-key-remove" onClick={() => remove(index)}>
                ×
              </button>
            </div>
          ))}
          <JellyButton type="button" variant="ghost" size="sm" onClick={() => append({ value: "" })}>
            + добавить ключ
          </JellyButton>
        </div>
      </JellyField>

      <div className="qc-expected-grid">
        <JellyField label="SUCCESS">
          <JellyInput type="number" {...numField("expectedSuccess")} />
        </JellyField>
        <JellyField label="ERROR">
          <JellyInput type="number" {...numField("expectedError")} />
        </JellyField>
        <JellyField label="BUSINESS_ERROR">
          <JellyInput type="number" {...numField("expectedBusinessError")} />
        </JellyField>
        <JellyField label="NEW">
          <JellyInput type="number" {...numField("expectedNew")} />
        </JellyField>
        <JellyField label="IN_PROGRESS">
          <JellyInput type="number" {...numField("expectedInProgress")} />
        </JellyField>
      </div>

      <JellyField label="Минимум транзакций всего" hint="Опционально">
        <JellyInput type="number" {...numField("minTotalCount")} />
      </JellyField>
      <JellyField label="Таймаут (сек)" hint="Опционально, по умолчанию на бэкенде">
        <JellyInput type="number" {...numField("timeoutSeconds")} />
      </JellyField>
      <JellyField label="Интервал поллинга (сек)" hint="Опционально, по умолчанию на бэкенде">
        <JellyInput type="number" {...numField("pollIntervalSeconds")} />
      </JellyField>
    </div>
  );
}
