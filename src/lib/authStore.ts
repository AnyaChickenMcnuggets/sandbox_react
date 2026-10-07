import { useSyncExternalStore } from "react";
import type { Permission, UserRole } from "../api/types";

export interface AuthSession {
  username: string;
  role: UserRole;
  permissions: Permission[];
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

function sameSession(a: AuthSession, b: AuthSession): boolean {
  return (
    a.username === b.username &&
    a.role === b.role &&
    a.permissions.length === b.permissions.length &&
    a.permissions.every((p, i) => p === b.permissions[i])
  );
}

// Sprint 27: токены — в HttpOnly-куках, фронту их значение не видно и хранить нечего. Здесь только
// username/role/permissions из GET /auth/me; источник истины — сервер, не localStorage.
export const authStore = {
  get(): AuthSession | null {
    return current;
  },
  getStatus(): AuthStatus {
    return status;
  },
  setSession(session: AuthSession) {
    // Повторный /me (после 403) почти всегда возвращает то же самое — не дёргаем подписчиков зря.
    if (current && status === "authenticated" && sameSession(current, session)) return;
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

export function hasPermission(session: AuthSession | null, permission: Permission): boolean {
  return session !== null && session.permissions.includes(permission);
}

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(authStore.subscribe, authStore.get);
}

export function useAuthStatus(): AuthStatus {
  return useSyncExternalStore(authStore.subscribe, authStore.getStatus);
}

// Единая точка UI-гейтинга: права редактируются админом (Sprint 29), сравнивать role больше нельзя.
export function usePermission(permission: Permission): boolean {
  return hasPermission(useAuthSession(), permission);
}
