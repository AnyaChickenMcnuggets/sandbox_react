import type { TransactionTemplate } from "../../../api/types";

// Форма одной транзакции в состоянии формы (react-hook-form) — value хранится как сырой текст
// (JellyTextarea), не как unknown, чтобы пользователь мог печатать JSON посимвольно без
// промежуточных парс-ошибок на каждый keystroke.
export interface TransactionFormItem {
  naturalKey: string;
  valueText: string;
  metadata: { key: string; value: string }[];
}

// Общая для списочного и JSON-режима логика "как достаём TransactionTemplate.value из текста" —
// пусто → пустая строка, валидный JSON → распарсенное значение, иначе как есть строкой.
export function parseTransactionValue(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function transactionFormItemToApi(item: TransactionFormItem): TransactionTemplate {
  const metadata = item.metadata.filter((m) => m.key.trim() !== "");
  return {
    naturalKey: item.naturalKey,
    value: parseTransactionValue(item.valueText),
    metadata: metadata.length > 0 ? Object.fromEntries(metadata.map((m) => [m.key, m.value])) : null,
  };
}

export function transactionApiToFormItem(t: TransactionTemplate): TransactionFormItem {
  return {
    naturalKey: t.naturalKey,
    valueText: typeof t.value === "string" ? t.value : JSON.stringify(t.value ?? null),
    metadata: Object.entries(t.metadata ?? {}).map(([key, value]) => ({ key, value })),
  };
}

// Разбор одного элемента "сырого" JSON, введённого пользователем в JSON-режиме — терпимее, чем
// TransactionTemplate (metadata может прийти с нестроковыми значениями — приводим к строке, а не
// отбрасываем весь ввод).
function normalizeRawTransaction(raw: unknown): TransactionTemplate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.naturalKey !== "string" || obj.naturalKey.trim() === "") return null;

  let metadata: Record<string, string> | null = null;
  if (obj.metadata && typeof obj.metadata === "object" && !Array.isArray(obj.metadata)) {
    const entries = Object.entries(obj.metadata as Record<string, unknown>).map(
      ([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)] as const,
    );
    metadata = entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  return { naturalKey: obj.naturalKey, value: obj.value ?? null, metadata };
}

// Парсит большой JSON-блок (массив транзакций целиком) в список для формы. null — невалидный JSON
// или не массив объектов ожидаемой формы (caller должен показать ошибку и не применять результат).
export function parseTransactionsJson(json: string): TransactionFormItem[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const normalized: TransactionTemplate[] = [];
  for (const raw of parsed) {
    const item = normalizeRawTransaction(raw);
    if (!item) return null;
    normalized.push(item);
  }
  return normalized.map(transactionApiToFormItem);
}

export function transactionsToJson(items: TransactionFormItem[]): string {
  return JSON.stringify(items.map(transactionFormItemToApi), null, 2);
}

export function apiTransactionsToJson(transactions: TransactionTemplate[] | null): string {
  return JSON.stringify(transactions ?? [], null, 2);
}
