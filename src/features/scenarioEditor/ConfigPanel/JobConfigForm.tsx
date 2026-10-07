import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { JobStepConfig } from "../../../api/types";
import { JellyField } from "../../../components/jelly/JellyField";
import { JellyInput } from "../../../components/jelly/JellyInput";
import { JellySegmented } from "../../../components/jelly/JellyToggle";
import { jobFormSchema, type JobFormValues } from "./validation/stepConfigSchemas";
import { KeyValueListEditor } from "./common/KeyValueListEditor";
import { positiveOrUndefined } from "./common/optionalNumber";

interface JobConfigFormProps {
  config: JobStepConfig;
  onChange: (config: JobStepConfig) => void;
}

function toFormValues(config: JobStepConfig): JobFormValues {
  return {
    refMode: config.rpaProjectName ? "name" : "id",
    rpaProjectId: config.rpaProjectId,
    rpaProjectName: config.rpaProjectName,
    countRobots: config.countRobots,
    arguments: Object.entries(config.arguments ?? {}).map(([key, value]) => ({ key, value })),
    timeoutSeconds: config.timeoutSeconds ?? null,
    pollIntervalSeconds: config.pollIntervalSeconds ?? null,
  };
}

function toConfig(values: JobFormValues): JobStepConfig {
  const args = values.arguments.filter((a) => a.key.trim() !== "");
  const timeoutSeconds = positiveOrUndefined(values.timeoutSeconds);
  const pollIntervalSeconds = positiveOrUndefined(values.pollIntervalSeconds);
  return {
    rpaProjectId: values.refMode === "id" ? values.rpaProjectId : null,
    rpaProjectName: values.refMode === "name" ? values.rpaProjectName : null,
    countRobots: values.countRobots,
    arguments: args.length > 0 ? Object.fromEntries(args.map((a) => [a.key, a.value])) : null,
    ...(timeoutSeconds !== undefined ? { timeoutSeconds } : {}),
    ...(pollIntervalSeconds !== undefined ? { pollIntervalSeconds } : {}),
  };
}

export function JobConfigForm({ config, onChange }: JobConfigFormProps) {
  const { register, control, watch, setValue, formState } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    mode: "onChange",
    defaultValues: toFormValues(config),
  });

  const values = watch();

  useEffect(() => {
    onChange(toConfig(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)]);

  return (
    <div>
      <JellyField label="Способ указания проекта">
        <JellySegmented
          value={values.refMode}
          onChange={(mode) => setValue("refMode", mode, { shouldValidate: true })}
          options={[
            { value: "id", label: "По id" },
            { value: "name", label: "По имени" },
          ]}
        />
      </JellyField>

      {values.refMode === "id" ? (
        <JellyField label="ID проекта в оркестраторе" error={formState.errors.rpaProjectId?.message}>
          <JellyInput
            type="number"
            hasError={!!formState.errors.rpaProjectId}
            {...register("rpaProjectId", { valueAsNumber: true, setValueAs: (v) => (v === "" ? null : Number(v)) })}
          />
        </JellyField>
      ) : (
        <JellyField label="Имя проекта в оркестраторе" error={formState.errors.rpaProjectName?.message}>
          <JellyInput hasError={!!formState.errors.rpaProjectName} {...register("rpaProjectName")} />
        </JellyField>
      )}

      <JellyField label="Количество роботов" hint="Опционально">
        <JellyInput
          type="number"
          {...register("countRobots", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
        />
      </JellyField>

      <JellyField label="Переменные проекта" hint="Опционально">
        <KeyValueListEditor control={control} register={register} name="arguments" keyLabel="Переменная" valueLabel="Значение" />
      </JellyField>

      <JellyField
        label="Таймаут (сек)"
        hint="Опционально — пусто: шаг ждёт без ограничения"
        error={formState.errors.timeoutSeconds?.message}
      >
        <JellyInput
          type="number"
          min={1}
          hasError={!!formState.errors.timeoutSeconds}
          {...register("timeoutSeconds", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
        />
      </JellyField>

      <JellyField
        label="Интервал поллинга (сек)"
        hint="Опционально — пусто: интервал по умолчанию на бэкенде"
        error={formState.errors.pollIntervalSeconds?.message}
      >
        <JellyInput
          type="number"
          min={1}
          hasError={!!formState.errors.pollIntervalSeconds}
          {...register("pollIntervalSeconds", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
        />
      </JellyField>
    </div>
  );
}
