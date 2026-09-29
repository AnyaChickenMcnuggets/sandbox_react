import type { UserRole } from "../api/types";

const ROLES: UserRole[] = ["VIEWER", "OPERATOR", "ADMIN"];

// Backend не отдаёт роль пользователя отдельным полем ответа (/auth/login, /auth/refresh) — только
// внутри claim'а `role` самого access-токена. Подпись JWT секретна, payload — нет (обычный
// base64url JSON), декодировать на фронте безопасно и достаточно: реальную проверку прав всё
// равно делает бэкенд на каждый запрос (403), это только для UI (что показывать/скрывать).
export function decodeJwtRole(accessToken: string): UserRole | null {
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    const claims: unknown = JSON.parse(json);
    const role = (claims as { role?: unknown }).role;
    return typeof role === "string" && (ROLES as string[]).includes(role) ? (role as UserRole) : null;
  } catch {
    return null;
  }
}
