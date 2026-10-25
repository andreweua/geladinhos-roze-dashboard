import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initOtaService } from "./services/otaService";

// Inicializa o Service Worker e o canal de atualizações automáticas OTA (Over-The-Air)
initOtaService();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
