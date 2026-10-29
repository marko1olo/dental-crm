/**
 * DirectCopilotLauncher.tsx — Standalone лаунчер клинического ассистента DENTE.
 * Мандат 8aq: Монтирование в живой UI (#copilot, #ai, ?copilot=1, ?copilot_standalone=1).
 * Мандат 8b: размер 60-80 строк (Sweet Spot).
 */

import React, { useState, useEffect, useCallback } from "react";
import { CopilotWorkspaceHost } from "./CopilotWorkspaceHost";

function checkIsCopilotActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = window.location.search || "";
  const h = window.location.hash || "";
  const search = new URLSearchParams(s);

  return (
    search.get("copilot_standalone") === "1" ||
    search.get("copilot_workspace") === "1" ||
    search.get("copilot") === "workspace" ||
    search.get("view") === "copilot_standalone" ||
    search.get("view") === "copilot_workspace" ||
    h === "#copilot-standalone" ||
    h === "#copilot-workspace" ||
    h === "#ai-standalone" ||
    h.includes("copilot-standalone") ||
    h.includes("copilot-workspace")
  );
}

export function DirectCopilotLauncher(): React.ReactElement | null {
  const [isActive, setIsActive] = useState(checkIsCopilotActive);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleLocationChange = () => {
      const active = checkIsCopilotActive();
      setIsActive(active);
      if (active) setIsOpen(true);
    };

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined" && (window.location.hash === "#copilot" || window.location.hash === "#ai")) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!isActive || !isOpen) return null;

  return (
    <CopilotWorkspaceHost
      isOpen={isOpen}
      onClose={handleClose}
      activeTooth={36}
      patientId="pat-standalone-copilot"
      patientName="Иванов Иван Иванович"
      initialTab="dialog"
    />
  );
}
