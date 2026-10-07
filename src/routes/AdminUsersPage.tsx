import { motion } from "framer-motion";
import { useUsers } from "../queries/adminUsersQueries";
import { CreateUserForm } from "../features/adminUsers/CreateUserForm";
import { AdminUserRow } from "../features/adminUsers/AdminUserRow";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import "./adminUsersPage.css";

export function AdminUsersPage() {
  const { data: users, isLoading, error } = useUsers();

  return (
    <div className="admin-users-page">
      <div className="admin-users-toolbar">
        <h1>Пользователи</h1>
        <p className="admin-users-subtitle">Создание, роли, блокировка и сброс паролей</p>
      </div>

      <CreateUserForm />

      {error ? <ErrorBanner error={error} title="Не удалось загрузить список пользователей" /> : null}

      {isLoading ? <div className="admin-users-loading">Загрузка…</div> : null}

      {users && users.length > 0 ? (
        <motion.div layout className="admin-users-stack">
          {users.map((user) => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </motion.div>
      ) : null}
    </div>
  );
}
