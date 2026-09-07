import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { themeStore } from "./lib/theme.ts";
import App from "./App.tsx";

// До первого рендера — чтобы не было вспышки "не той" темы на старте.
themeStore.init();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
