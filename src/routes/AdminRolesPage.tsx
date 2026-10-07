import { usePermissionsCatalog, useRoles } from "../queries/adminRolesQueries";
import { RolePermissionMatrix } from "../features/adminRoles/RolePermissionMatrix";
import { ErrorBanner } from "../components/feedback/ErrorBanner";
import "./adminRolesPage.css";

export function AdminRolesPage() {
  const permissionsQuery = usePermissionsCatalog();
  const rolesQuery = useRoles();
  const error = permissionsQuery.error ?? rolesQuery.error;

  return (
    <div className="admin-roles-page">
      <div className="admin-roles-toolbar">
        <h1>Роли и права</h1>
        <p className="admin-roles-subtitle">
          Изменения действуют сразу, перелогиниваться пользователям не нужно. ADMIN всегда имеет все права.
        </p>
      </div>

      {error ? <ErrorBanner error={error} title="Не удалось загрузить роли и права" /> : null}

      {permissionsQuery.isLoading || rolesQuery.isLoading ? <div className="admin-roles-loading">Загрузка…</div> : null}

      {permissionsQuery.data && rolesQuery.data ? (
        <RolePermissionMatrix permissions={permissionsQuery.data} roles={rolesQuery.data} />
      ) : null}
    </div>
  );
}
