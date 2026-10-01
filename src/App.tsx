import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { queryClient } from "./app/queryClient";
import { AppShell } from "./components/layout/AppShell";
import { ToastViewport } from "./components/feedback/ToastProvider";
import { LoginPage } from "./routes/LoginPage";
import { ScenarioListPage } from "./routes/ScenarioListPage";
import { ScenarioEditorPage } from "./routes/ScenarioEditorPage";
import { RunMonitorPage } from "./routes/RunMonitorPage";
import { RunsListPage } from "./routes/RunsListPage";
import { AdminUsersPage } from "./routes/AdminUsersPage";
import { me } from "./api/auth";
import { authStore, useAuthSession, useAuthStatus } from "./lib/authStore";
import { canManageUsers } from "./lib/roles";

// Токены — в HttpOnly-куках (Sprint 27), фронт не может прочитать "есть ли сессия" синхронно, как
// раньше при localStorage. Единственный способ узнать — спросить сервер: один GET /auth/me на
// старте приложения. Пока ответ не пришёл — status "checking", рендерить ни защищённые роуты, ни
// /login нельзя (оба варианта могут мигнуть не тем экраном).
function AppRoutes() {
  const session = useAuthSession();
  const status = useAuthStatus();

  useEffect(() => {
    me()
      .then((result) => authStore.setSession(result))
      .catch(() => authStore.clear());
  }, []);

  if (status === "checking") {
    return <div className="app-loading">Загрузка…</div>;
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ScenarioListPage />} />
        <Route path="/scenarios/new" element={<ScenarioEditorPage />} />
        <Route path="/scenarios/:scenarioId/edit" element={<ScenarioEditorPage />} />
        <Route path="/runs" element={<RunsListPage />} />
        <Route path="/runs/:runId" element={<RunMonitorPage />} />
        {canManageUsers(session.role) ? <Route path="/admin/users" element={<AdminUsersPage />} /> : null}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <ToastViewport />
    </QueryClientProvider>
  );
}

export default App;
