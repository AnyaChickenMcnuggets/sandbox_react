import { useMutation } from "@tanstack/react-query";
import { login, logout } from "../api/auth";
import { authStore } from "../lib/authStore";
import type { LoginRequest } from "../api/types";

export function useLogin() {
  return useMutation({
    mutationFn: async (request: LoginRequest) => {
      const tokens = await login(request);
      authStore.setSession(tokens, request.username);
      return tokens;
    },
    // Ошибку логина (INVALID_CREDENTIALS и т.п.) показывает сама LoginPage инлайн под полем пароля
    // — общий тост здесь был бы избыточен рядом с формой, которая и так под рукой.
    meta: { silent: true },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const session = authStore.get();
      if (!session) return;
      // Локальную сессию чистим в любом случае — если сеть недоступна, пользователь не должен
      // застрять "залогиненным на вид"; серверный refresh-токен тогда просто доживёт свои
      // максимум до истечения сам.
      try {
        await logout({ refreshToken: session.refreshToken });
      } finally {
        authStore.clear();
      }
    },
  });
}
