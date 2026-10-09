import { useState, type FormEvent } from "react";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyField } from "../../components/jelly/JellyField";
import { JellyInput } from "../../components/jelly/JellyInput";
import { JellySelect } from "../../components/jelly/JellySelect";
import { JellyButton } from "../../components/jelly/JellyButton";
import type { UserRole } from "../../api/types";
import { useCreateUser } from "../../queries/adminUsersMutations";
import { toastStore } from "../../components/feedback/toastStore";
import "./createUserForm.css";

export function CreateUserForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("OPERATOR");
  const createUser = useCreateUser();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createUser.mutate(
      { username: username.trim(), password, role },
      {
        onSuccess: (user) => {
          toastStore.pushSuccess(`Пользователь «${user.username}» создан`);
          setUsername("");
          setPassword("");
          setRole("OPERATOR");
        },
      },
    );
  }

  return (
    <JellyPanel radius="lg" className="create-user-form">
      <div className="create-user-form-title">Новый пользователь</div>
      <form onSubmit={handleSubmit} className="create-user-form-fields">
        <JellyField label="Логин">
          <JellyInput value={username} onChange={(e) => setUsername(e.target.value)} required />
        </JellyField>
        <JellyField label="Пароль">
          <JellyInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 8 символов"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </JellyField>
        <JellyField label="Роль">
          <JellySelect value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="VIEWER">VIEWER</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="ADMIN">ADMIN</option>
          </JellySelect>
        </JellyField>
        <JellyButton type="submit" className="create-user-form-submit" disabled={createUser.isPending}>
          {createUser.isPending ? "Создаём…" : "Создать"}
        </JellyButton>
      </form>
    </JellyPanel>
  );
}
