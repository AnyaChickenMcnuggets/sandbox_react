import { useQuery } from "@tanstack/react-query";
import { listUsers } from "../api/adminUsers";
import { queryKeys } from "./queryKeys";

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: listUsers,
  });
}
