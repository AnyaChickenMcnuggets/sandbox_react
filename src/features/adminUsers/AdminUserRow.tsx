import { useState, type FormEvent } from "react";
import { Blob } from "../../components/jelly/Blob";
import { JellySelect } from "../../components/jelly/JellySelect";
import { JellyToggle } from "../../components/jelly/JellyToggle";
import { JellyButton } from "../../components/jelly/JellyButton";
import { JellyInput } from "../../components/jelly/JellyInput";
import type { UserResponse, UserRole } from "../../api/types";
import { formatDateTime } from "../../lib/dates";
import { useResetUserPassword, useUpdateUserEnabled, useUpdateUserRole } from "../../queries/adminUsersMutations";
import { toastStore } from "../../components/feedback/toastStore";
import "./adminUserRow.css";

interface AdminUserRowProps {
  user: UserResponse;
}

export function AdminUserRow({ user }: AdminUserRowProps) {
  const updateRole = useUpdateUserRole();
  const updateEnabled = useUpdateUserEnabled();
  const resetPassword = useResetUserPassword();
  const [resettingPassword, setResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function handleRoleChange(role: UserRole) {
    updateRole.mutate({ id: user.id, request: { role } });
  }

  function handleEnabledChange(enabled: boolean) {
    updateEnabled.mutate({ id: user.id, request: { enabled } });
  }

  function handleResetSubmit(event: FormEvent) {
    event.preventDefault();
    resetPassword.mutate(
      { id: user.id, request: { newPassword } },
      {
        onSuccess: () => {
          toastStore.pushSuccess(`Пароль пользователя «${user.username}» сброшен`);
          setResettingPassword(false);
          setNewPassword("");
        },
      },
    );
  }

  return (
    <Blob radius="md" glass className="admin-user-row">
      <div className="admin-user-row-main">
        <div className="admin-user-row-name">{user.username}</div>
        <div className="admin-user-row-meta">Создан: {formatDateTime(user.createdAt)}</div>
      </div>

      <JellySelect
        className="admin-user-row-role"
        value={user.role}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        disabled={updateRole.isPending}
        aria-label={`Роль пользователя ${user.username}`}
      >
        <option value="VIEWER">VIEWER</option>
        <option value="OPERATOR">OPERATOR</option>
        <option value="ADMIN">ADMIN</option>
      </JellySelect>

      <JellyToggle
        checked={user.enabled}
        onChange={handleEnabledChange}
        disabled={updateEnabled.isPending}
        label={user.enabled ? "Включён" : "Отключён"}
      />

      {resettingPassword ? (
        <form onSubmit={handleResetSubmit} className="admin-user-row-reset-form">
          <JellyInput
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Новый пароль"
            minLength={8}
            autoFocus
            required
          />
          <JellyButton type="submit" size="sm" disabled={resetPassword.isPending}>
            {resetPassword.isPending ? "…" : "Ок"}
          </JellyButton>
          <JellyButton
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setResettingPassword(false);
              setNewPassword("");
            }}
          >
            Отмена
          </JellyButton>
        </form>
      ) : (
        <JellyButton size="sm" variant="secondary" onClick={() => setResettingPassword(true)}>
          Сбросить пароль
        </JellyButton>
      )}
    </Blob>
  );
}
