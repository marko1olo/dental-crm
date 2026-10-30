/**
 * DirectScheduleLauncher.tsx — Прямой автономный лаунчер студии расписания и сетки кресел
 * Мандаты 8b (<100 строк), 8aq (Mounted in UI Tree), 8e (Doctor Autonomy).
 * Монтируется в AppShell / StandaloneLaunchers, слушает хэши #schedule / #appointments и события dente:open-schedule.
 */

import React, { useEffect, useState } from "react";
import { ChairScheduleStudioModal } from "./ChairScheduleStudioModal";

function checkIsScheduleActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = window.location.search || "";
  const h = window.location.hash || "";
  return (
    s.includes("standalone=schedule") ||
    s.includes("schedule=1") ||
    s.includes("schedule_studio=1") ||
    h === "#schedule" ||
    h.startsWith("#schedule?") ||
    h.startsWith("#schedule/") ||
    h === "#appointments" ||
    h.startsWith("#appointments?") ||
    h.startsWith("#appointments/") ||
    h === "#chair-schedule" ||
    h.startsWith("#chair-schedule?") ||
    h === "#schedule-studio" ||
    h.startsWith("#schedule-studio?")
  );
}

export const DirectScheduleLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => checkIsScheduleActive());

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("dente:open-schedule", handleOpen);
    window.addEventListener("dente:open-chair-schedule", handleOpen);

    const handleState = () => {
      if (checkIsScheduleActive()) {
        setIsOpen(true);
      }
    };

    window.addEventListener("hashchange", handleState);
    window.addEventListener("popstate", handleState);

    return () => {
      window.removeEventListener("dente:open-schedule", handleOpen);
      window.removeEventListener("dente:open-chair-schedule", handleOpen);
      window.removeEventListener("hashchange", handleState);
      window.removeEventListener("popstate", handleState);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      const h = window.location.hash;
      if (
        h === "#schedule" ||
        h.startsWith("#schedule?") ||
        h.startsWith("#schedule/") ||
        h === "#appointments" ||
        h.startsWith("#appointments?") ||
        h === "#chair-schedule" ||
        h === "#schedule-studio"
      ) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  };

  if (!isOpen) return null;

  return <ChairScheduleStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectScheduleLauncher;
