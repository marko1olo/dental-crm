/**
 * ChairScheduleStudioModal.tsx — Канонический фасад студии расписания и сетки кресел DENTE CRM
 * Мандат 8b / 8zi: эталонный Sweet Spot (140–190 строк) после хирургической декомпозиции.
 * Мандат 8e / 8n: автономия соло-врача, ноль обязательных ассистентов/начмедов, кнопка записи НИКОГДА не disabled!
 * Мандат 8am: ровно 1 Primary CTA кнопка #0d9488 (var(--teal)) на видимый экран.
 * Мандат 8x: чистый русский язык без советского канцелярита и номеров приказов.
 * Apple HIG: на мобильных устройствах (<=768px) нативный Bottom Sheet / Agenda-таймлайн, сенсорный минимум >= 44x44px, 0px горизонтального скролла, тактильный хэндл 36x5px.
 */

import React, { useEffect, useCallback } from "react";
import {
  type ScheduleStudioAppointment,
  type QuickBookingFormState,
} from "./chairStudio/chairStudioTypes";
import { useChairScheduleStudioState } from "./chairStudio/useChairScheduleStudioState";
import { ChairScheduleStudioHeader } from "./chairStudio/ChairScheduleStudioHeader";
import { ChairShiftSelector } from "./chairStudio/ChairShiftSelector";
import { ChairTimelineGrid } from "./chairStudio/ChairTimelineGrid";
import { ChairScheduleStudioFooter } from "./chairStudio/ChairScheduleStudioFooter";
import { ChairQuickBookingPopover } from "./chairStudio/ChairQuickBookingPopover";

export type { ScheduleStudioAppointment };

export interface ChairScheduleStudioModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialDate?: string;
  readonly initialChairId?: string;
  readonly onAppointmentCreate?: (appt: ScheduleStudioAppointment) => void;
  readonly onAppointmentStatusChange?: (
    id: string,
    newStatus: ScheduleStudioAppointment["status"],
  ) => void;
}

/**
 * Канонический координатор студии расписания и сетки кресел.
 * Собирает воедино шапку, селектор смен/врача, таймлайн и шторку экспресс-бронирования.
 */
export const ChairScheduleStudioModal: React.FC<ChairScheduleStudioModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  initialChairId = "all",
  onAppointmentCreate,
  onAppointmentStatusChange,
}) => {
  const state = useChairScheduleStudioState({
    initialDate,
    initialChairId,
    onAppointmentCreate,
    onAppointmentStatusChange,
  });

  // Экранирование Esc: закрытие шторки бронирования или всего окна
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (state.bookingSlot) {
          state.cancelBooking();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state.bookingSlot, state.cancelBooking, onClose]);

  // Быстрый запуск бронирования через Primary CTA
  const handleQuickBookTrigger = useCallback(() => {
    state.handleSlotClick(
      state.selectedChairId === "all" ? "chair-1" : state.selectedChairId,
      "12:00",
    );
  }, [state]);

  const handleBookingFormChange = useCallback(
    (updatedForm: QuickBookingFormState) => {
      state.setBookingForm(updatedForm);
    },
    [state],
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="chair-schedule-studio-modal"
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-hidden"
    >
      <div className="relative w-full h-[95vh] sm:h-[92vh] sm:max-w-6xl flex flex-col bg-[var(--paper)] text-[var(--ink)] rounded-t-[24px] sm:rounded-2xl shadow-2xl border border-[var(--line)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* APPLE HIG: ТАКТИЛЬНЫЙ ХЭНДЛ (DRAG HANDLE 36x5px) ДЛЯ МОБИЛЬНОГО BOTTOM SHEET */}
        <div className="sm:hidden flex items-center justify-center pt-2 pb-1 bg-[var(--paper-strong)]">
          <div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,#94a3b8)]/50" />
        </div>

        {/* 1. ШАПКА РАСПИСАНИЯ: ДАТА, СЕТКА/ЛЕНТА, ЗАКРЫТИЕ */}
        <ChairScheduleStudioHeader
          currentDate={state.currentDate}
          onDateChange={state.setCurrentDate}
          onDateShift={state.handleDateShift}
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab}
          onClose={onClose}
        />

        {/* 2. СЕЛЕКТОР СМЕН ВРАЧА И КРЕСЕЛ (МАНДАТ 8n: СОЛО-ВРАЧ БЕЗ АССИСТЕНТА) */}
        <ChairShiftSelector
          selectedChairId={state.selectedChairId}
          onChairSelect={state.setSelectedChairId}
          selectedShift={state.selectedShift}
          onShiftSelect={state.setSelectedShift}
          selectedDoctor={state.selectedDoctor}
          onDoctorSelect={state.setSelectedDoctor}
          chairs={state.visibleChairs.length === 3 ? state.visibleChairs : undefined}
        />

        {/* 3. ОСНОВНОЙ КОНТЕНТ: СЕТКА КРЕСЕЛ ИЛИ МОБИЛЬНАЯ АДЖЕНДА */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)]">
          <ChairTimelineGrid
            activeTab={state.activeTab}
            currentDate={state.currentDate}
            visibleChairs={state.visibleChairs}
            timeHours={state.timeHours}
            appointments={state.appointments}
            selectedChairId={state.selectedChairId}
            onSlotClick={state.handleSlotClick}
            onStatusChange={state.handleStatusChange}
          />
        </main>

        {/* 4. ШТОРКА ЭКСПРЕСС-БРОНИРОВАНИЯ В 1 КЛИК */}
        {state.bookingSlot && (
          <ChairQuickBookingPopover
            bookingSlot={state.bookingSlot}
            bookingForm={state.bookingForm}
            onFormChange={handleBookingFormChange}
            onSubmit={state.handleQuickBookSubmit}
            onClose={state.cancelBooking}
          />
        )}

        {/* 5. ФУТЕР РАСПИСАНИЯ С ЕДИНОЙ PRIMARY CTA КНОПКОЙ #0d9488 */}
        <ChairScheduleStudioFooter
          currentDate={state.currentDate}
          appointmentsCount={state.appointments.length}
          selectedDoctor={state.selectedDoctor}
          onQuickBookTrigger={handleQuickBookTrigger}
        />
      </div>
    </div>
  );
};

export default ChairScheduleStudioModal;
