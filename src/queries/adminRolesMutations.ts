import { useMutation, useQueryClient } from "@tanstack/react-query";
import { me } from "../api/auth";
import { setRolePermissions } from "../api/adminRoles";
import type { RolePermissionsResponse, SetRolePermissionsRequest, UserRole } from "../api/types";
import { authStore } from "../lib/authStore";
import { queryKeys } from "./queryKeys";

export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { role: UserRole; request: SetRolePermissionsRequest }) =>
      setRolePermissions(vars.role, vars.request),
    onSuccess: async (updated) => {
      queryClient.setQueryData<RolePermissionsResponse[]>(queryKeys.roles, (roles) =>
        roles?.map((r) => (r.role === updated.role ? updated : r)),
      );
      // Админ мог поправить права СВОЕЙ роли — его собственный UI должен отразить это сразу.
      const session = authStore.get();
      if (session && session.role === updated.role) {
        authStore.setSession(await me());
      }
    },
  });
}
