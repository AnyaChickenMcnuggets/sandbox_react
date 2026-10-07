import { apiClient } from "./client";
import type {
  PermissionResponse,
  RolePermissionsResponse,
  SetRolePermissionsRequest,
  UserRole,
} from "./types";

export function listPermissions(): Promise<PermissionResponse[]> {
  return apiClient.get<PermissionResponse[]>("/admin/permissions");
}

export function listRoles(): Promise<RolePermissionsResponse[]> {
  return apiClient.get<RolePermissionsResponse[]>("/admin/roles");
}

export function setRolePermissions(role: UserRole, request: SetRolePermissionsRequest): Promise<RolePermissionsResponse> {
  return apiClient.put<RolePermissionsResponse>(`/admin/roles/${role}/permissions`, request);
}
