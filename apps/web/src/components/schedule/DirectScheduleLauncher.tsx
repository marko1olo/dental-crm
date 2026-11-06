/**
 * DirectScheduleLauncher.tsx — Прямой автономный лаунчер студии расписания и сетки кресел
 * Мандаты 8b (<100 строк), 8aq (Mounted in UI Tree), 8e (Doctor Autonomy).
 * Монтируется в AppShell / StandaloneLaunchers, слушает хэши #schedule / #appointments и события dente:open-schedule.
 */

import React, { useEffect, useState } from "react";
import { ChairScheduleStudioModal } from "./ChairScheduleStudioModal";

function checkIsScheduleActive(): boolean {
  if (typeof window === "undefined") return false;
  const s = (window.location.search || "").toLowerCase();
  const h = (window.location.hash || "").toLowerCase();
  return (
    s.includes("standalone=schedule") ||
    s.includes("schedule=1") ||
    s.includes("schedule_studio=1") ||
    s.includes("appointment=1") ||
    s.includes("quick-book=1") ||
    s.includes("booking-modal=1") ||
    s.includes("waitlist-matches") ||
    s.includes("waitlist_matches") ||
    h === "#schedule" ||
    h.startsWith("#schedule?") ||
    h.startsWith("#schedule/") ||
    h === "#appointments" ||
    h.startsWith("#appointments?") ||
    h.startsWith("#appointments/") ||
    h === "#chair-schedule" ||
    h.startsWith("#chair-schedule?") ||
    h === "#schedule-studio" ||
    h.startsWith("#schedule-studio?") ||
    h === "#appointment" ||
    h.startsWith("#appointment?") ||
    h.startsWith("#appointment/") ||
    h === "#appointment-studio" ||
    h.startsWith("#appointment-studio?") ||
    h.startsWith("#appointment-studio/") ||
    h === "#new-appointment" ||
    h.startsWith("#new-appointment?") ||
    h.startsWith("#new-appointment/") ||
    h === "#quick-book" ||
    h.startsWith("#quick-book?") ||
    h === "#booking-modal" ||
    h.includes("appointment_booking") ||
    h.includes("quick_booking") ||
    h.includes("waitlist-matches") ||
    h.includes("waitlist_matches")
  );
}

export const DirectScheduleLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => checkIsScheduleActive());

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };

    const scheduleEvents = [
      "dente:open-schedule",
      "dente:open-chair-schedule",
      "dente:open-appointment",
      "dente:open-appointment-studio",
      "dente:open-new-appointment",
      "dente:open-quick-booking",
      "dente:open-appointment-booking",
      "dente:open-waitlist-for-slot",
    ];

    for (const evt of scheduleEvents) {
      window.addEventListener(evt, handleOpen);
    }

    const handleState = () => {
      if (checkIsScheduleActive()) {
        setIsOpen(true);
      }
    };

    window.addEventListener("hashchange", handleState);
    window.addEventListener("popstate", handleState);

    return () => {
      for (const evt of scheduleEvents) {
        window.removeEventListener(evt, handleOpen);
      }
      window.removeEventListener("hashchange", handleState);
      window.removeEventListener("popstate", handleState);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      const h = (window.location.hash || "").toLowerCase();
      if (
        h.includes("schedule") ||
        h.includes("appointment") ||
        h.includes("quick-book") ||
        h.includes("booking-modal") ||
        h.includes("waitlist")
      ) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  };

  if (!isOpen) return null;

  return <ChairScheduleStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectScheduleLauncher;
