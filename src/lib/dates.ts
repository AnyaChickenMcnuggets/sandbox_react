// Бэкенд непоследователен в датах: большинство DTO используют OffsetDateTime (со смещением/Z),
// но QueueItemResponse.createdAt — LocalDateTime (без смещения). Разные парсеры — сознательно,
// чтобы не потерять точность/таймзону молча, смешивая их через один универсальный new Date(x).

export function parseOffsetDateTime(value: string): Date {
  return new Date(value);
}

export function parseLocalDateTime(value: string): Date {
  // LocalDateTime от Jackson обычно без 'Z'/смещения: "2026-09-05T12:34:56.789".
  // new Date() трактует такую строку как локальное время браузера, что и требуется —
  // сервер и браузер в этом проекте предполагаются в одной таймзоне (внутренний инструмент).
  return new Date(value);
}

const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return dateTimeFormatter.format(parseOffsetDateTime(value));
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  return timeFormatter.format(parseOffsetDateTime(value));
}

export function formatDuration(start: string | null, finish: string | null): string {
  if (!start) return "—";
  const startMs = parseOffsetDateTime(start).getTime();
  const endMs = finish ? parseOffsetDateTime(finish).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.round((endMs - startMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}м ${seconds}с` : `${seconds}с`;
}
