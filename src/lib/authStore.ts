import { useSyncExternalStore } from "react";
import type { UserRole } from "../api/types";
import { decodeJwtRole } from "./jwt";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: UserRole;
}

const STORAGE_KEY = "rpa-auth-session";

function readStored(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

let current: AuthSession | null = readStored();
const listeners = new Set<() => void>();

function persist() {
  try {
    if (current) localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage недоступен — сессия просто не переживёт reload, тот же компромисс, что у
    // theme.ts/runHistory.ts/layoutStorage.ts.
  }
  listeners.forEach((listener) => listener());
}

// Модульный стор (не React Context) по тому же паттерну, что theme.ts/toastStore.ts/runHistory.ts:
// читается из api/client.ts вне React-дерева (заголовок Authorization, retry на 401) — обычный
// useState там не сработал бы.
export const authStore = {
  get(): AuthSession | null {
    return current;
  },
  // username — только что введённый логин (TokenResponse его не возвращает), role — декодируется
  // из claim'а access-токена (см. jwt.ts), сервер не отдаёт её отдельным полем.
  setSession(tokens: { accessToken: string; refreshToken: string }, username: string) {
    const role = decodeJwtRole(tokens.accessToken);
    if (!role) {
      throw new Error("В access-токене нет распознаваемого поля role");
    }
    current = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, username, role };
    persist();
  },
  // Refresh меняет оба токена (refresh — одноразовый) — username/role не трогаем, смена роли
  // пользователю требует перелогина, а не тихого обновления на лету.
  updateTokens(tokens: { accessToken: string; refreshToken: string }) {
    if (!current) return;
    current = { ...current, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    persist();
  },
  clear() {
    if (!current) return;
    current = null;
    persist();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(authStore.subscribe, authStore.get);
}
