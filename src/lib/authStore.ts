import { useSyncExternalStore } from "react";
import type { UserRole } from "../api/types";

export interface AuthSession {
  username: string;
  role: UserRole;
}

// "checking" — идёт первый GET /auth/me (см. App.tsx), статус ещё не известен; рендерить защищённые
// роуты в этот момент нельзя (мигнёт логин-экран или наоборот). "authenticated"/"anonymous" —
// известный результат этого запроса.
export type AuthStatus = "checking" | "authenticated" | "anonymous";

let current: AuthSession | null = null;
let status: AuthStatus = "checking";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Sprint 27: токены — в HttpOnly-куках, фронту их значение не видно и хранить нечего (см.
// api/client.ts — Authorization-заголовок больше не выставляется, браузер прикладывает куку сам).
// Единственное, что храним здесь — username/role, полученные через GET /auth/me; источник истины —
// сама кука на сервере, не localStorage (в отличие от Sprint 26-версии этого стора).
export const authStore = {
  get(): AuthSession | null {
    return current;
  },
  getStatus(): AuthStatus {
    return status;
  },
  setSession(session: AuthSession) {
    current = session;
    status = "authenticated";
    notify();
  },
  clear() {
    if (current === null && status === "anonymous") return;
    current = null;
    status = "anonymous";
    notify();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(authStore.subscribe, authStore.get);
}

export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(authStore.subscribe, authStore.getStatus);
}
