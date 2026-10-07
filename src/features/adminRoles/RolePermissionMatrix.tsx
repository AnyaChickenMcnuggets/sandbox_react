import { useState } from "react";
import type { Permission, PermissionResponse, RolePermissionsResponse, UserRole } from "../../api/types";
import { JellyPanel } from "../../components/jelly/JellyPanel";
import { JellyButton } from "../../components/jelly/JellyButton";
import { toastStore } from "../../components/feedback/toastStore";
import { useSetRolePermissions } from "../../queries/adminRolesMutations";
import "./rolePermissionMatrix.css";

interface RolePermissionMatrixProps {
  permissions: PermissionResponse[];
  roles: RolePermissionsResponse[];
}

export function RolePermissionMatrix({ permissions, roles }: RolePermissionMatrixProps) {
  const setRolePermissions = useSetRolePermissions();
  // Черновик правок по ролям — пока не сохранено, чекбоксы показывают его, а не ответ сервера.
  const [drafts, setDrafts] = useState<Partial<Record<UserRole, Permission[]>>>({});

  function effective(role: RolePermissionsResponse): Permission[] {
    return drafts[role.role] ?? role.permissions;
  }

  function isDirty(role: RolePermissionsResponse): boolean {
    const draft = drafts[role.role];
    if (!draft) return false;
    return draft.length !== role.permissions.length || draft.some((p) => !role.permissions.includes(p));
  }

  function toggle(role: RolePermissionsResponse, code: Permission, checked: boolean) {
    const current = effective(role);
    const next = checked ? [...current, code] : current.filter((p) => p !== code);
    setDrafts((prev) => ({ ...prev, [role.role]: next }));
  }

  function save(role: RolePermissionsResponse) {
    // PUT заменяет набор целиком — шлём все выбранные права, а не дельту.
    setRolePermissions.mutate(
      { role: role.role, request: { permissions: effective(role) } },
      {
        onSuccess: () => {
          toastStore.pushSuccess(`Права роли ${role.role} сохранены`);
          setDrafts((prev) => {
            const { [role.role]: _saved, ...rest } = prev;
            return rest;
          });
        },
      },
    );
  }

  function reset(role: RolePermissionsResponse) {
    setDrafts((prev) => {
      const { [role.role]: _discarded, ...rest } = prev;
      return rest;
    });
  }

  const savingRole = setRolePermissions.isPending ? setRolePermissions.variables?.role : undefined;

  return (
    <JellyPanel radius="lg" className="role-matrix">
      <div className="role-matrix-row role-matrix-head">
        <div className="role-matrix-permission">Право</div>
        {roles.map((role) => (
          <div key={role.role} className="role-matrix-cell">
            <div className="role-matrix-role">{role.role}</div>
            {!role.editable ? <div className="role-matrix-readonly">только просмотр</div> : null}
          </div>
        ))}
      </div>

      {permissions.map((permission) => (
        <div key={permission.code} className="role-matrix-row">
          <div className="role-matrix-permission">
            <div className="role-matrix-code">{permission.code}</div>
            <div className="role-matrix-description">{permission.description}</div>
          </div>
          {roles.map((role) => (
            <div key={role.role} className="role-matrix-cell">
              <input
                type="checkbox"
                className="role-matrix-checkbox"
                checked={effective(role).includes(permission.code)}
                disabled={!role.editable || savingRole === role.role}
                onChange={(e) => toggle(role, permission.code, e.target.checked)}
                aria-label={`${role.role}: ${permission.code}`}
              />
            </div>
          ))}
        </div>
      ))}

      <div className="role-matrix-row role-matrix-foot">
        <div className="role-matrix-permission" />
        {roles.map((role) => (
          <div key={role.role} className="role-matrix-cell role-matrix-actions">
            {role.editable && isDirty(role) ? (
              <>
                <JellyButton size="sm" onClick={() => save(role)} disabled={savingRole === role.role}>
                  {savingRole === role.role ? "…" : "Сохранить"}
                </JellyButton>
                <JellyButton size="sm" variant="ghost" onClick={() => reset(role)} disabled={savingRole === role.role}>
                  Отмена
                </JellyButton>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </JellyPanel>
  );
}
