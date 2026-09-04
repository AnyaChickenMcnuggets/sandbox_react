import { ApiError } from "../../api/client";

export type ToastKind = "error" | "success" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  message: string;
  details: string[];
}

type Listener = () => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function nextId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const toastStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Toast[] {
    return toasts;
  },
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
  push(toast: Omit<Toast, "id">) {
    const withId: Toast = { ...toast, id: nextId() };
    toasts = [...toasts, withId];
    emit();
    return withId.id;
  },
  pushSuccess(message: string, title = "Готово") {
    return toastStore.push({ kind: "success", title, message, details: [] });
  },
  pushInfo(message: string, title = "") {
    return toastStore.push({ kind: "info", title, message, details: [] });
  },
  pushError(error: unknown, fallbackTitle = "Ошибка") {
    if (error instanceof ApiError) {
      return toastStore.push({
        kind: "error",
        title: `${fallbackTitle} · ${error.code}`,
        message: error.message,
        details: error.details,
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    return toastStore.push({ kind: "error", title: fallbackTitle, message, details: [] });
  },
};
