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
import { useAuthSession } from "./lib/authStore";
import { canManageUsers } from "./lib/roles";

// Сессии нет — единственный доступный маршрут /login, любой другой путь туда же редиректит
// (а сама LoginPage вне AppShell — у экрана входа нет шапки/навигации). Сессия появилась (реактивно,
// через authStore/useSyncExternalStore) — обратное: /login больше не нужен, остальные маршруты
// открываются внутри AppShell. Тот же стор, что чистит client.ts при неудачном refresh на 401 —
// разлогин на истёкшем токене сам переключает эту ветку, отдельный редирект не нужен.
function AppRoutes() {
  const session = useAuthSession();

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
