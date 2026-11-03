/**
 * DirectChairsideHudLauncher.tsx — Прямой автономный лаунчер кресельного ИИ-копилота HUD.
 * Мандаты 8aq (Монтирование в живой UI), 8am (1 Primary CTA), 8b (Sweet Spot 60–80 строк).
 */
import React, { useState, useEffect, useCallback } from "react";
import { ChairsideCopilotHUD } from "./ChairsideCopilotHUD";

function checkIsHudActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = window.location.search || "";
  const h = window.location.hash || "";
  return h.includes("chairside-hud") || h === "#hud" || s.includes("hud=open") || s.includes("chairside-hud=1");
}

export function DirectChairsideHudLauncher(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(checkIsHudActive);

  useEffect(() => {
    const handleLocationChange = () => setIsOpen(checkIsHudActive());
    const handleOpenEvent = () => setIsOpen(true);
    const handleToggleEvent = () => setIsOpen((prev) => !prev);

    window.addEventListener("hashchange", handleLocationChange);
    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("dente:open-chairside-hud", handleOpenEvent);
    window.addEventListener("dente:toggle-chairside-hud", handleToggleEvent);

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("dente:open-chairside-hud", handleOpenEvent);
      window.removeEventListener("dente:toggle-chairside-hud", handleToggleEvent);
    };
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined" && window.location.hash.includes("hud")) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[8900] pointer-events-none flex flex-col justify-end items-end p-4 sm:p-6"
      data-testid="direct-chairside-hud-launcher"
    >
      <div className="pointer-events-auto">
        <ChairsideCopilotHUD
          initialOpen={true}
          initialCompact={false}
          patientName="Иванов И.И."
          activeTooth={16}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}

export default DirectChairsideHudLauncher;
