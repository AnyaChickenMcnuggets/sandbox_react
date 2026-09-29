import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser, resetUserPassword, updateUserEnabled, updateUserRole } from "../api/adminUsers";
import type { CreateUserRequest, ResetPasswordRequest, UpdateEnabledRequest, UpdateRoleRequest } from "../api/types";
import { queryKeys } from "./queryKeys";

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => createUser(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; request: UpdateRoleRequest }) => updateUserRole(vars.id, vars.request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useUpdateUserEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; request: UpdateEnabledRequest }) => updateUserEnabled(vars.id, vars.request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (vars: { id: number; request: ResetPasswordRequest }) => resetUserPassword(vars.id, vars.request),
  });
}
