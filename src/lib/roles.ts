import type { UserRole } from "../api/types";

// Матрица прав (Sprint 26, см. инструкцию бэкенда) — единая точка, не разбросанные по компонентам
// сравнения с ролью. Реальная защита — на бэкенде (403); здесь только решаем, что показывать/
// скрывать в UI.
export function canEditScenarios(role: UserRole): boolean {
  return role === "OPERATOR" || role === "ADMIN";
}

export function canDeleteScenarios(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}
