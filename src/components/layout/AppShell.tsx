import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
          RPA Scenario Tester
        </Link>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
