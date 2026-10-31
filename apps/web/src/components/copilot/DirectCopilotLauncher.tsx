/**
 * DirectCopilotLauncher.tsx — Standalone лаунчер клинического ассистента DENTE.
 * Мандат 8aq: Монтирование под #copilot, #ai, #chairside-copilot, ?copilot=1.
 * Мандат 8b: размер файла строго в Sweet Spot 60–80 строк.
 */
import React, { useState, useEffect, useCallback } from "react";
import { CopilotStudioModal } from "./CopilotStudioModal";

function checkIsCopilotActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = window.location.search || "";
  const h = window.location.hash || "";
  const search = new URLSearchParams(s);
  return (
    search.get("copilot") === "1" || search.get("ai") === "1" ||
    search.get("copilot_standalone") === "1" || search.get("copilot_workspace") === "1" ||
    search.get("view") === "copilot_standalone" || search.get("view") === "copilot_workspace" ||
    h === "#copilot" || h === "#ai" || h === "#ai-assistant" || h === "#chairside-copilot" ||
    h === "#voice" || h === "#copilot-standalone" || h.includes("copilot") || h.includes("chairside")
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
    const handleOpenEvent = () => { setIsActive(true); setIsOpen(true); };
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isK = e.key === "k" || e.key === "K" || e.code === "KeyK";
      const isJ = e.key === "j" || e.key === "J" || e.code === "KeyJ";
      if (isCtrlOrMeta && (isK || isJ)) {
        e.preventDefault();
        setIsActive((prev) => !prev);
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("dente:open-copilot", handleOpenEvent);
    window.addEventListener("dente:open-agent-cockpit", handleOpenEvent);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("dente:open-copilot", handleOpenEvent);
      window.removeEventListener("dente:open-agent-cockpit", handleOpenEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined" && (window.location.hash.includes("copilot") || window.location.hash.includes("ai"))) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!isActive || !isOpen) return null;

  return (
    <CopilotStudioModal
      isOpen={isOpen}
      onClose={handleClose}
      activeTooth={36}
      patientId="pat-standalone-copilot"
      patientName="Иванов Иван Иванович"
      initialTab="dialog"
    />
  );
}
export default DirectCopilotLauncher;