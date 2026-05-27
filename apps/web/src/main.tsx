import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import "./styles/main.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is optional in development-like hosts.
    });
  });
}
