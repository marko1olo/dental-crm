/**
 * useScheduleAppointmentDragDrop.ts
 *
 * Layer 2: Логика сценического бронирования, быстрого добавления в слот,
 * интеграции с листом ожидания (Waitlist) и обработки перетаскиваний без утечек слушателей.
 */

import { useCallback, useEffect, useState } from "react";
import type { QuickBookingSlotInfo } from "../../QuickBookingDrawer";
import type { TargetSlotInfo } from "../../WaitlistDrawer";
import type {
  ScheduleAppointmentDragDropOptions,
  ScheduleAppointmentDragDropResult,
} from "./scheduleViewControllerTypes";

import { useUiSurfaceStore } from "../../../../store/uiSurfaceStore";

export function useScheduleAppointmentDragDrop({
  pendingStageBooking,
  setPendingStageBooking,
}: ScheduleAppointmentDragDropOptions): ScheduleAppointmentDragDropResult {
  const [quickBookingOpen, setQuickBookingOpen] = useState(false);
  const [quickBookingSlot, setQuickBookingSlot] = useState<QuickBookingSlotInfo | null>(null);

  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistQuickFillSlot, setWaitlistQuickFillSlot] = useState<TargetSlotInfo | null>(null);

  // DentalPRO Parity: Обработка входящего бронирования этапа из плана лечения
  useEffect(() => {
    if (pendingStageBooking) {
      setQuickBookingSlot(pendingStageBooking);
      setQuickBookingOpen(true);
      setPendingStageBooking(null);
    }
  }, [pendingStageBooking, setPendingStageBooking]);

  // Слушатель событий бронирования этапа в активном расписании
  useEffect(() => {
    const handleBookStageEvent = (e: Event) => {
      const customEvent = e as CustomEvent<QuickBookingSlotInfo>;
      if (customEvent.detail) {
        setQuickBookingSlot(customEvent.detail);
        setQuickBookingOpen(true);
      }
    };
    window.addEventListener("dente-book-stage-appointment", handleBookStageEvent);
    window.addEventListener("dente:book-stage-appointment", handleBookStageEvent);
    return () => {
      window.removeEventListener("dente-book-stage-appointment", handleBookStageEvent);
      window.removeEventListener("dente:book-stage-appointment", handleBookStageEvent);
    };
  }, []);

  // Слушатель событий открытия листа ожидания под освободившийся слот (десктоп и мобильный)
  useEffect(() => {
    const handleOpenWaitlist = (e: Event) => {
      const customEvent = e as CustomEvent<{ slotInfo?: TargetSlotInfo } | TargetSlotInfo>;
      const slot = (customEvent.detail as any)?.slotInfo || customEvent.detail;
      if (slot && typeof slot === "object" && ("appointmentId" in slot || "startsAt" in slot)) {
        setWaitlistQuickFillSlot(slot);
      }
      setWaitlistOpen(true);
      useUiSurfaceStore.getState().openDrawer("waitlist");
    };
    window.addEventListener("dente:open-waitlist-for-slot", handleOpenWaitlist);
    window.addEventListener("dente-open-waitlist-for-slot", handleOpenWaitlist);
    return () => {
      window.removeEventListener("dente:open-waitlist-for-slot", handleOpenWaitlist);
      window.removeEventListener("dente-open-waitlist-for-slot", handleOpenWaitlist);
    };
  }, []);

  const handleOpenWaitlistForSlot = useCallback((slot: TargetSlotInfo) => {
    setWaitlistQuickFillSlot(slot);
    setWaitlistOpen(true);
    useUiSurfaceStore.getState().openDrawer("waitlist");
  }, []);

  return {
    quickBookingOpen,
    setQuickBookingOpen,
    quickBookingSlot,
    setQuickBookingSlot,
    waitlistOpen,
    setWaitlistOpen,
    waitlistQuickFillSlot,
    setWaitlistQuickFillSlot,
    handleOpenWaitlistForSlot,
  };
}
