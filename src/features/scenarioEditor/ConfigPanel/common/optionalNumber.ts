// Необязательные числовые поля (timeoutSeconds/pollIntervalSeconds): пустое поле = "нет значения",
// ключ вообще не уходит в config (Sprint 29 — бэкенд трактует отсутствие как "без таймаута"), 0 и
// отрицательные тоже не отправляем.
export function positiveOrUndefined(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
