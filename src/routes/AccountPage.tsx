import { useState, type FormEvent } from "react";
import { JellyPanel } from "../components/jelly/JellyPanel";
import { JellyField } from "../components/jelly/JellyField";
import { JellyInput } from "../components/jelly/JellyInput";
import { JellyButton } from "../components/jelly/JellyButton";
import { toastStore } from "../components/feedback/toastStore";
import { ApiError } from "../api/client";
import { useAuthSession } from "../lib/authStore";
import { useChangePassword } from "../queries/authMutations";
import "./accountPage.css";

const MIN_PASSWORD_LENGTH = 8;

export function AccountPage() {
  const session = useAuthSession();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toastStore.pushSuccess("Пароль изменён. Остальные ваши сессии завершены");
          setCurrentPassword("");
          setNewPassword("");
        },
      },
    );
  }

  // INVALID_REQUEST: текст ("Текущий пароль указан неверно" / "Новый пароль должен отличаться от
  // текущего") приходит от сервера в message — показываем как есть. VALIDATION_FAILED — короткий
  // новый пароль. 401 обрабатывает useChangePassword (разлогин), здесь сообщение уже не увидят.
  const error = changePassword.error;
  let currentPasswordError: string | undefined;
  let newPasswordError: string | undefined;
  if (error instanceof ApiError) {
    if (error.code === "VALIDATION_FAILED") {
      newPasswordError = `Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`;
    } else if (error.code === "INVALID_REQUEST") {
      currentPasswordError = error.message;
    } else if (error.status !== 401) {
      currentPasswordError = error.message;
    }
  } else if (error) {
    currentPasswordError = "Не удалось изменить пароль";
  }

  return (
    <div className="account-page">
      <div className="account-toolbar">
        <h1>Аккаунт</h1>
        <p className="account-subtitle">
          {session?.username} · {session?.role}
        </p>
      </div>

      <JellyPanel radius="lg" className="account-panel">
        <div className="account-panel-title">Сменить пароль</div>
        <form onSubmit={handleSubmit} className="account-form">
          <JellyField label="Текущий пароль" error={currentPasswordError}>
            <JellyInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              hasError={!!currentPasswordError}
              required
            />
          </JellyField>
          <JellyField label="Новый пароль" hint={`Минимум ${MIN_PASSWORD_LENGTH} символов`} error={newPasswordError}>
            <JellyInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              hasError={!!newPasswordError}
              required
            />
          </JellyField>
          <JellyButton type="submit" className="account-submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? "Сохраняем…" : "Сменить пароль"}
          </JellyButton>
        </form>
      </JellyPanel>
    </div>
  );
}
