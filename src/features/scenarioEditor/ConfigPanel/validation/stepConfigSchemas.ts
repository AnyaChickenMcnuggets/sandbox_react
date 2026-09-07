import { z } from "zod";

const nullableNumber = z.union([z.number(), z.null()]);
const nullableString = z.union([z.string(), z.null()]);

export const jobFormSchema = z
  .object({
    refMode: z.enum(["id", "name"]),
    rpaProjectId: nullableNumber,
    rpaProjectName: nullableString,
    countRobots: nullableNumber,
    arguments: z.array(z.object({ key: z.string(), value: z.string() })),
  })
  .superRefine((val, ctx) => {
    const hasId = val.rpaProjectId != null;
    const hasName = !!val.rpaProjectName?.trim();
    if (val.refMode === "id" && !hasId) {
      ctx.addIssue({ code: "custom", message: "Укажите id проекта", path: ["rpaProjectId"] });
    }
    if (val.refMode === "name" && !hasName) {
      ctx.addIssue({ code: "custom", message: "Укажите имя проекта", path: ["rpaProjectName"] });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;

export const queueFormSchema = z.object({
  name: z.string().min(1, "Обязательное поле"),
  description: nullableString,
  ttl: nullableNumber,
  maxRetray: nullableNumber,
  transactions: z.array(
    z.object({
      naturalKey: z.string().min(1, "Обязательное поле"),
      valueText: z.string(),
      metadata: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  ),
  // UI-only — не уходит в ScenarioRequest (см. toConfig в QueueConfigForm), transactions выше
  // остаётся единственным источником истины независимо от режима редактирования.
  transactionsMode: z.enum(["list", "json"]),
  transactionsJson: z.string(),
});

export type QueueFormValues = z.infer<typeof queueFormSchema>;

export const queueCheckFormSchema = z.object({
  queueName: z.string().min(1, "Обязательное поле"),
  naturalKeys: z.array(z.object({ value: z.string() })),
  naturalKeyPrefixMatch: z.boolean(),
  expectedSuccess: nullableNumber,
  expectedError: nullableNumber,
  expectedBusinessError: nullableNumber,
  expectedNew: nullableNumber,
  expectedInProgress: nullableNumber,
  minTotalCount: nullableNumber,
  timeoutSeconds: nullableNumber,
  pollIntervalSeconds: nullableNumber,
});

export type QueueCheckFormValues = z.infer<typeof queueCheckFormSchema>;
