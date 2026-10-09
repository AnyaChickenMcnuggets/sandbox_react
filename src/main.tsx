import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { themeStore } from "./lib/theme.ts";
import App from "./App.tsx";

// До первого рендера — чтобы не было вспышки "не той" темы на старте.
themeStore.init();

// Sprint 26 хранил здесь токены в localStorage; с Sprint 27 они живут только в HttpOnly-куках.
// Старая запись в браузерах, где успели залогиниться по прежней версии, содержит живые токены,
// читаемые любым JS на странице — удаляем.
try {
  localStorage.removeItem("rpa-auth-session");
} catch {
  // localStorage недоступен — нечего чистить
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
