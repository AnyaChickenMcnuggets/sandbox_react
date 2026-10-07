import { useQuery } from "@tanstack/react-query";
import { listPermissions, listRoles } from "../api/adminRoles";
import { queryKeys } from "./queryKeys";

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: queryKeys.permissions,
    queryFn: listPermissions,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles,
    queryFn: listRoles,
  });
}
