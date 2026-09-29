import { apiClient } from "./client";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateEnabledRequest,
  UpdateRoleRequest,
  UserResponse,
} from "./types";

export function listUsers(): Promise<UserResponse[]> {
  return apiClient.get<UserResponse[]>("/admin/users");
}

export function createUser(request: CreateUserRequest): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/admin/users", request);
}

export function updateUserRole(id: number, request: UpdateRoleRequest): Promise<UserResponse> {
  return apiClient.put<UserResponse>(`/admin/users/${id}/role`, request);
}

export function updateUserEnabled(id: number, request: UpdateEnabledRequest): Promise<UserResponse> {
  return apiClient.put<UserResponse>(`/admin/users/${id}/enabled`, request);
}

export function resetUserPassword(id: number, request: ResetPasswordRequest): Promise<void> {
  return apiClient.put<void>(`/admin/users/${id}/password`, request);
}
