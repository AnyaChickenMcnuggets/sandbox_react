import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { IconActivity, IconLogout, IconShield, IconUsers } from "../jelly/icons";
import { JellyButton } from "../jelly/JellyButton";
import { ThemeToggle } from "./ThemeToggle";
import { hasPermission, useAuthSession } from "../../lib/authStore";
import { useLogout } from "../../queries/authMutations";
import "./appShell.css";

const navLinkClass = ({ isActive }: { isActive: boolean }) => `app-nav-link${isActive ? " app-nav-link-active" : ""}`;

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const session = useAuthSession();
  const navigate = useNavigate();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, { onSuccess: () => navigate("/login", { replace: true }) });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-logo">
          <span className="app-logo-blob" aria-hidden="true">
            🍬
          </span>
          <span className="app-logo-text">RPA Scenario Tester</span>
        </Link>
        <div className="app-header-right">
          <nav className="app-nav">
            {hasPermission(session, "SCENARIO_READ") ? (
              <NavLink to="/" end className={navLinkClass}>
                Сценарии
              </NavLink>
            ) : null}
            {hasPermission(session, "RUN_READ") ? (
              <NavLink to="/runs" className={navLinkClass}>
                <IconActivity width={16} height={16} />
                Запуски
              </NavLink>
            ) : null}
            {hasPermission(session, "USER_MANAGE") ? (
              <NavLink to="/admin/users" className={navLinkClass}>
                <IconUsers width={16} height={16} />
                Пользователи
              </NavLink>
            ) : null}
            {hasPermission(session, "ROLE_MANAGE") ? (
              <NavLink to="/admin/roles" className={navLinkClass}>
                <IconShield width={16} height={16} />
                Роли и права
              </NavLink>
            ) : null}
          </nav>
          {session ? (
            <div className="app-user">
              <NavLink to="/account" className="app-user-name" title="Аккаунт и смена пароля">
                {session.username}
              </NavLink>
              <JellyButton
                iconOnly
                size="sm"
                variant="ghost"
                title="Выйти"
                aria-label="Выйти"
                onClick={handleLogout}
                disabled={logout.isPending}
              >
                <IconLogout />
              </JellyButton>
            </div>
          ) : null}
          <ThemeToggle />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
