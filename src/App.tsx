import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { queryClient } from "./app/queryClient";
import { AppShell } from "./components/layout/AppShell";
import { ToastViewport } from "./components/feedback/ToastProvider";
import { ScenarioListPage } from "./routes/ScenarioListPage";
import { ScenarioEditorPage } from "./routes/ScenarioEditorPage";
import { RunMonitorPage } from "./routes/RunMonitorPage";
import { RunsListPage } from "./routes/RunsListPage";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<ScenarioListPage />} />
            <Route path="/scenarios/new" element={<ScenarioEditorPage />} />
            <Route path="/scenarios/:scenarioId/edit" element={<ScenarioEditorPage />} />
            <Route path="/runs" element={<RunsListPage />} />
            <Route path="/runs/:runId" element={<RunMonitorPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      <ToastViewport />
    </QueryClientProvider>
  );
}

export default App;
