import { apiClient } from "./client";
import type { ChangePasswordRequest, LoginRequest, MeResponse, TokenResponse } from "./types";

export function login(request: LoginRequest): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/login", request);
}

// Без тела (Sprint 27) — refresh-токен сервер берёт из куки сам.
export function refresh(): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/refresh");
}

// Без тела (Sprint 27) — то же для logout.
export function logout(): Promise<void> {
  return apiClient.post<void>("/auth/logout");
}

// Новые куки браузер ставит сам, остальные сессии пользователя бэкенд разлогинивает.
export function changePassword(request: ChangePasswordRequest): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/change-password", request);
}

// Роль и права не приходят в ответе /auth/login — отдельный запрос сразу после успешного логина (и при
// восстановлении сессии на старте приложения, см. App.tsx). 401 отсюда — не ошибка, а штатный
// сигнал "не залогинен".
export function me(): Promise<MeResponse> {
  return apiClient.get<MeResponse>("/auth/me");
}
