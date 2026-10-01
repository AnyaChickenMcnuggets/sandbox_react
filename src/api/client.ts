import type { ErrorResponse } from "./types";
import { authStore } from "../lib/authStore";

const API_BASE = "/api/v1";
// /auth/* не участвует в 401→refresh→retry ниже — /auth/login 401-ит на неверный пароль (не
// "токен просрочен", ретраить не нужно), /auth/refresh сам обслуживает эту логику (ретраить его же
// на его собственный 401 зациклило бы), /auth/me — сознательный "пробник" статуса сессии при
// старте приложения (см. App.tsx), его 401 — ожидаемый ответ "не залогинен", а не повод для retry.
const PUBLIC_PATH_PREFIX = "/auth/";

export class ApiError extends Error implements ErrorResponse {
  readonly code: string;
  readonly details: string[];
  readonly status: number;

  constructor(status: number, body: ErrorResponse) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
    this.status = status;
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as Record<string, unknown>).code === "string" &&
    typeof (value as Record<string, unknown>).message === "string"
  );
}

async function parseErrorBody(res: Response): Promise<ErrorResponse> {
  try {
    const body: unknown = await res.json();
    if (isErrorResponse(body)) {
      return { code: body.code, message: body.message, details: body.details ?? [] };
    }
  } catch {
    // тело не JSON или отсутствует — используем fallback ниже
  }
  return { code: "UNKNOWN", message: res.statusText || `HTTP ${res.status}`, details: [] };
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// Без авто-refresh-на-401 — request() (ниже) оборачивает это retry-логикой; сам rawRequest
// переиспользуется и для вызова /auth/refresh, которому только предстоит эту логику включать в
// себя, а не участвовать в ней (иначе просроченный refresh-токен ретраил бы сам себя бесконечно).
// credentials: "include" — обязателен на КАЖДЫЙ запрос (Sprint 27): без него браузер не прикладывает
// access_token/refresh_token куки на same-origin запрос и не сохраняет Set-Cookie из ответа логина.
async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await parseErrorBody(res);
    throw new ApiError(res.status, errorBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// Параллельные 401 (например несколько поллингов сразу) не должны бить /auth/refresh N раз —
// все ждут один и тот же полёт, результат которого разделяют.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<{ expiresInSeconds: number }>("/auth/refresh", { method: "POST" })
      .then(() => true)
      .catch(() => {
        // Просроченный/отсутствующий/уже использованный refresh-токен — штатный разлогин, не
        // зацикливать. Новые куки (если успех) или их отсутствие (если нет) сервер уже обработал —
        // фронту здесь нечего хранить, только локальный статус сессии.
        authStore.clear();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Рекомендованная бэкендом логика: на 401 (кроме /auth/*) — один раз попробовать /auth/refresh,
// при успехе повторить исходный запрос (кука уже новая — браузер приложит её сам); при неудаче —
// ошибка всплывает как обычно (authStore уже очищен внутри refreshSession, AppRoutes сама
// переключит на /login).
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options);
  } catch (err) {
    const isPublic = path.startsWith(PUBLIC_PATH_PREFIX);
    if (err instanceof ApiError && err.status === 401 && !isPublic) {
      const refreshed = await refreshSession();
      if (refreshed) return rawRequest<T>(path, options);
    }
    throw err;
  }
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
