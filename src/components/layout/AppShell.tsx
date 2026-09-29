import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { IconActivity, IconLogout, IconUsers } from "../jelly/icons";
import { JellyButton } from "../jelly/JellyButton";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthSession } from "../../lib/authStore";
import { useLogout } from "../../queries/authMutations";
import { canManageUsers } from "../../lib/roles";
import "./appShell.css";

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
            <NavLink to="/" end className={({ isActive }) => `app-nav-link${isActive ? " app-nav-link-active" : ""}`}>
              Сценарии
            </NavLink>
            <NavLink to="/runs" className={({ isActive }) => `app-nav-link${isActive ? " app-nav-link-active" : ""}`}>
              <IconActivity width={16} height={16} />
              Запуски
            </NavLink>
            {session && canManageUsers(session.role) ? (
              <NavLink to="/admin/users" className={({ isActive }) => `app-nav-link${isActive ? " app-nav-link-active" : ""}`}>
                <IconUsers width={16} height={16} />
                Пользователи
              </NavLink>
            ) : null}
          </nav>
          {session ? (
            <div className="app-user">
              <span className="app-user-name">{session.username}</span>
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
