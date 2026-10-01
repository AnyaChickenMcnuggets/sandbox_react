import { useMutation } from "@tanstack/react-query";
import { login, logout, me } from "../api/auth";
import { authStore } from "../lib/authStore";
import type { LoginRequest } from "../api/types";

export function useLogin() {
  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      // /auth/login ставит куки, но не возвращает роль в теле (Sprint 27) — сразу после успеха
      // зовём /auth/me за username/role.
      await login(request);
      const session = await me();
      authStore.setSession(session);
      return session;
    },
    // Ошибку логина (INVALID_CREDENTIALS и т.п.) показывает сама LoginPage инлайн под полем пароля
    // — общий тост здесь был бы избыточен рядом с формой, которая и так под рукой.
    meta: { silent: true },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // Локальную сессию чистим в любом случае — если сеть недоступна, пользователь не должен
      // застрять "залогиненным на вид"; серверный refresh-токен тогда просто доживёт свой
      // максимум до истечения сам.
      try {
        await logout();
      } finally {
        authStore.clear();
      }
    },
  });
}
