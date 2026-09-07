import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { IconActivity } from "../jelly/icons";
import { ThemeToggle } from "./ThemeToggle";
import "./appShell.css";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
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
              Прогоны
            </NavLink>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
