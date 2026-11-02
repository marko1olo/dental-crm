/**
 * DirectAppointmentLauncher.tsx — Автономный лаунчер студии записи на приём (SSOT)
 * Мандаты 8b (Sweet Spot 50–90 строк), 8aq (Монтирование в UI), 8e (Автономия врача).
 */

import React, { useEffect, useState, useCallback } from "react";
import { AppointmentStudioModal, type AppointmentStudioSlotData } from "./AppointmentStudioModal";

function isAppointmentDeepLinkActive(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hash.toLowerCase();
  const s = window.location.search.toLowerCase();
  return (
    h === "#appointment" || h.startsWith("#appointment?") || h.startsWith("#appointment/") ||
    h === "#appointment-studio" || h.startsWith("#appointment-studio?") || h.startsWith("#appointment-studio/") ||
    h === "#new-appointment" || h.startsWith("#new-appointment?") || h.startsWith("#new-appointment/") ||
    h === "#quick-book" || h.startsWith("#quick-book?") || h.startsWith("#quick-book/") ||
    h === "#booking-modal" || h.startsWith("#booking-modal?") ||
    h.includes("appointment_booking") || h.includes("quick_booking") ||
    s.includes("appointment=1") || s.includes("quick-book=1") || s.includes("booking-modal=1") ||
    s.includes("standalone=appointment") || s.includes("studio=appointment")
  );
}

export const DirectAppointmentLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => isAppointmentDeepLinkActive());
  const [slotData, setSlotData] = useState<Partial<AppointmentStudioSlotData> | null>(null);

  const handleOpen = useCallback((e?: Event) => {
    const detail = (e as CustomEvent<Partial<AppointmentStudioSlotData>>)?.detail;
    if (detail) setSlotData((prev) => ({ ...prev, ...detail }));
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (typeof window !== "undefined" && isAppointmentDeepLinkActive()) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search.replace(/[?&]appointment=1/, "").replace(/[?&]studio=appointment/, ""),
      );
    }
  }, []);

  const handleSave = useCallback((saved: AppointmentStudioSlotData) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente:appointment-saved", { detail: saved }));
    }
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    window.addEventListener("dente:open-appointment", handleOpen);
    window.addEventListener("dente:open-appointment-studio", handleOpen);
    window.addEventListener("dente:open-new-appointment", handleOpen);
    window.addEventListener("dente:open-quick-booking", handleOpen);
    window.addEventListener("dente:open-appointment-booking", handleOpen);

    const checkState = () => {
      if (isAppointmentDeepLinkActive()) setIsOpen(true);
    };
    window.addEventListener("hashchange", checkState);
    window.addEventListener("popstate", checkState);

    return () => {
      window.removeEventListener("dente:open-appointment", handleOpen);
      window.removeEventListener("dente:open-appointment-studio", handleOpen);
      window.removeEventListener("dente:open-new-appointment", handleOpen);
      window.removeEventListener("dente:open-quick-booking", handleOpen);
      window.removeEventListener("dente:open-appointment-booking", handleOpen);
      window.removeEventListener("hashchange", checkState);
      window.removeEventListener("popstate", checkState);
    };
  }, [handleOpen]);

  if (!isOpen) return null;

  return (
    <AppointmentStudioModal
      isOpen={isOpen}
      onClose={handleClose}
      onSave={handleSave}
      initialData={slotData}
    />
  );
};

export const DirectAppointmentStudioLauncher = DirectAppointmentLauncher;
export default DirectAppointmentLauncher;
