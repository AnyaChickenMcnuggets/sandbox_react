import { apiClient } from "./client";
import type { LoginRequest, LogoutRequest, RefreshRequest, TokenResponse } from "./types";

export function login(request: LoginRequest): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/login", request);
}

export function refresh(request: RefreshRequest): Promise<TokenResponse> {
  return apiClient.post<TokenResponse>("/auth/refresh", request);
}

export function logout(request: LogoutRequest): Promise<void> {
  return apiClient.post<void>("/auth/logout", request);
}
