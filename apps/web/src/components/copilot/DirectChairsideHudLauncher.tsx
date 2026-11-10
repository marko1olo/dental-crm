/**
 * DirectChairsideHudLauncher.tsx
 * DENTE Dental CRM — Sovereign Standalone Chairside Copilot HUD Launcher (Mandates 8e, 8n, 8aq, 8al)
 * Mounted in AppShell to provide 0-dependency, resilient direct deep-link access
 * to Chairside Copilot HUD (#chairside-hud, #copilot, ?hud=open, #copilot-hud).
 */

import React, { useEffect, useState } from "react";
import { ChairsideCopilotHUD } from "./ChairsideCopilotHUD";
import { hasUrlToken, clearUrlTokens } from "../appLayout/modalsContainerModules/standalone/deepLinkUrl";
import { useVisitStore } from "../../store/visitStore";
import { usePatientStore } from "../../store/patientStore";

const HUD_URL_TOKENS = [
  "chairside-hud",
  "chairside_hud",
  "copilot-hud",
  "copilot_hud",
  "hud=open",
  "hud",
  "copilot",
  "standalone=hud",
];

export const DirectChairsideHudLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasUrlToken(HUD_URL_TOKENS);
  });

  useEffect(() => {
    const handleUrlChange = () => {
      setIsOpen(hasUrlToken(HUD_URL_TOKENS));
    };
    window.addEventListener("hashchange", handleUrlChange);
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("hashchange", handleUrlChange);
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  if (!isOpen) return null;

  const visitState = useVisitStore.getState();
  const patientState = usePatientStore.getState();

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const toothFromQuery = searchParams?.get("tooth") ? Number(searchParams.get("tooth")) : undefined;
  const effectiveTooth = toothFromQuery ?? visitState.activeToothNumber ?? null;

  const patientNameFromQuery = searchParams?.get("patient");
  const effectivePatientName =
    patientNameFromQuery ||
    patientState.patientCoreDraft?.fullName?.trim() ||
    (patientState.selectedPatientId ? `Пациент #${patientState.selectedPatientId.slice(0, 8)}` : "Пациент не выбран");

  return (
    <div
      className="direct-chairside-hud-standalone fixed inset-0 z-[9999] flex flex-col items-center justify-end p-3 sm:p-6 bg-[var(--paper)]/85 backdrop-blur-md pointer-events-auto overflow-y-auto"
      data-testid="direct-chairside-hud-standalone"
    >
      <div className="w-full max-w-3xl my-auto">
        <ChairsideCopilotHUD
          initialOpen={true}
          initialDocked={true}
          activeTooth={effectiveTooth}
          patientName={effectivePatientName}
          onClose={() => {
            clearUrlTokens(HUD_URL_TOKENS);
            setIsOpen(false);
          }}
        />
      </div>
    </div>
  );
};
