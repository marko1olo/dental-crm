/**
 * DirectCopilotLauncher.tsx — Standalone лаунчер клинического ассистента DENTE.
 * Мандат 8aq: Монтирование под #copilot, #ai, #assistant, #chairside-copilot, ?copilot=1.
 * Мандат 8b: размер файла строго в Sweet Spot 60–80 строк.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { CopilotStudioModal } from "./CopilotStudioModal";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";

interface LaunchDetail { tooth?: number | null; activeTooth?: number | null; patientId?: string | null; patientName?: string | null; initialTab?: "dialog" | "actions" | "memory"; }

function checkIsCopilotActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = window.location.search || "", h = window.location.hash || "";
  if (h.includes("hud") || s.includes("hud")) return false;
  const search = new URLSearchParams(s);
  return (
    search.get("copilot") === "1" || search.get("ai") === "1" || search.get("assistant") === "1" ||
    search.get("copilot_standalone") === "1" || search.get("view") === "copilot_standalone" ||
    ["#copilot", "#ai", "#assistant", "#chairside-copilot", "#voice"].includes(h) || (h.includes("copilot") && !h.includes("hud"))
  );
}

export function DirectCopilotLauncher(): React.ReactElement | null {
  const [isActive, setIsActive] = useState(checkIsCopilotActive);
  const [isOpen, setIsOpen] = useState(true);
  const [ctx, setCtx] = useState<LaunchDetail | null>(null);

  const appTooth = useAppStore((s) => s.activeTooth), visitTooth = useVisitStore((s) => s.activeToothNumber);
  const activeTooth = ctx?.activeTooth ?? ctx?.tooth ?? visitTooth ?? appTooth ?? null;

  const appPatId = useAppStore((s) => s.activePatientId), visitPatId = useVisitStore((s) => s.activeVisit?.patientId);
  const patientId = ctx?.patientId ?? visitPatId ?? appPatId ?? null;

  const dashboard = useAppStore((s) => s.dashboard);
  const patientName = useMemo(() => {
    if (ctx?.patientName) return ctx.patientName;
    if (!patientId) return null;
    return (dashboard?.patients as Array<{ id: string; fullName?: string }> | undefined)?.find((p) => p.id === patientId)?.fullName ?? null;
  }, [ctx?.patientName, patientId, dashboard?.patients]);

  useEffect(() => {
    const handleLoc = () => { const a = checkIsCopilotActive(); setIsActive(a); if (a) setIsOpen(true); };
    const handleOpen = (e: Event) => {
      const d = (e as CustomEvent<LaunchDetail>)?.detail; if (d) setCtx(d);
      setIsActive(true); setIsOpen(true);
    };
    const handleToggle = () => { setIsActive((p) => !p); setIsOpen((p) => !p); };
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["k", "K", "j", "J"].includes(e.key)) {
        e.preventDefault(); setIsActive((p) => !p); setIsOpen((p) => !p);
      }
    };
    window.addEventListener("hashchange", handleLoc); window.addEventListener("popstate", handleLoc);
    window.addEventListener("dente:open-copilot", handleOpen); window.addEventListener("dente:toggle-copilot", handleToggle);
    window.addEventListener("dente:open-agent-cockpit", handleOpen); window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("hashchange", handleLoc); window.removeEventListener("popstate", handleLoc);
      window.removeEventListener("dente:open-copilot", handleOpen); window.removeEventListener("dente:toggle-copilot", handleToggle);
      window.removeEventListener("dente:open-agent-cockpit", handleOpen); window.removeEventListener("keydown", handleKey);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined" && ["copilot", "ai", "assistant"].some((k) => window.location.hash.includes(k))) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!isActive || !isOpen) return null;
  return <CopilotStudioModal isOpen={isOpen} onClose={handleClose} activeTooth={activeTooth} patientId={patientId} patientName={patientName} initialTab={ctx?.initialTab || "dialog"} />;
}
export default DirectCopilotLauncher;
