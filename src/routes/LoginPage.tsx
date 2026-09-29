import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { JellyPanel } from "../components/jelly/JellyPanel";
import { JellyField } from "../components/jelly/JellyField";
import { JellyInput } from "../components/jelly/JellyInput";
import { JellyButton } from "../components/jelly/JellyButton";
import { ApiError } from "../api/client";
import { useLogin } from "../queries/authMutations";
import "./loginPage.css";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate(
      { username: username.trim(), password },
      { onSuccess: () => navigate("/", { replace: true }) },
    );
  }

  // Сообщение сервера намеренно не различает "нет такого пользователя" и "неверный пароль"
  // (см. инструкцию бэкенда) — показываем его как есть, не уточняем.
  const passwordError = login.error instanceof ApiError ? login.error.message : login.error ? "Не удалось войти" : undefined;

  return (
    <div className="login-page">
      <JellyPanel radius="lg" glass className="login-panel">
        <div className="login-logo" aria-hidden="true">
          🍬
        </div>
        <div className="login-title">RPA Scenario Tester</div>
        <form onSubmit={handleSubmit} className="login-form">
          <JellyField label="Логин">
            <JellyInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
          </JellyField>
          <JellyField label="Пароль" error={passwordError}>
            <JellyInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              hasError={!!passwordError}
              required
            />
          </JellyField>
          <JellyButton type="submit" className="login-submit" disabled={login.isPending}>
            {login.isPending ? "Входим…" : "Войти"}
          </JellyButton>
        </form>
      </JellyPanel>
    </div>
  );
}
