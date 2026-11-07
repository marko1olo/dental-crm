/**
 * ChairQuickBookingPopover.tsx — Шторка экспресс-бронирования слота в 1-2 клика
 * Мандат 8b / 8zi: эталонный Sweet Spot (110–140 строк).
 * Мандат 8e / 8n: автономия врача — форма никогда не блокируется (disabled={false}).
 * Apple HIG: на мобильных устройствах нативный Bottom Sheet с сенсорным минимумом >= 44x44px.
 */

import React from "react";
import { Sparkles, X, User, Phone, CheckCircle2 } from "lucide-react";
import {
  CHAIR_PRESETS,
  SCHEDULE_DURATION_OPTIONS,
  QUICK_APPOINTMENT_REASONS,
} from "../scheduleCatalogData";
import {
  type QuickBookingSlotState,
  type QuickBookingFormState,
} from "./chairStudioTypes";

export interface ChairQuickBookingPopoverProps {
  readonly bookingSlot: QuickBookingSlotState;
  readonly bookingForm: QuickBookingFormState;
  readonly onFormChange: (form: QuickBookingFormState) => void;
  readonly onSubmit: (e?: React.FormEvent) => void;
  readonly onClose: () => void;
}

export const ChairQuickBookingPopover: React.FC<ChairQuickBookingPopoverProps> = ({
  bookingSlot,
  bookingForm,
  onFormChange,
  onSubmit,
  onClose,
}) => {
  const chair = CHAIR_PRESETS.find((c) => c.id === bookingSlot.chairId);

  return (
    <div
      data-testid="quick-booking-popover"
      className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 bg-[var(--paper)] border-t sm:border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl p-4 sm:p-5 shadow-2xl z-50 flex flex-col gap-3 animate-in slide-in-from-bottom duration-200"
    >
      {/* APPLE HIG: ТАКТИЛЬНЫЙ ХЭНДЛ 36x5px ДЛЯ МОБИЛЬНОЙ ШТОРКИ */}
      <div className="sm:hidden flex items-center justify-center -mt-1 pb-1 cursor-grab" aria-hidden="true">
        <div className="w-[36px] h-[5px] rounded-full bg-[var(--line-strong,var(--line))]" />
      </div>
      <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--teal,#0d9488)]" />
            Экспресс-запись
          </h2>
          <div className="text-xs text-[var(--muted)]">
            {bookingSlot.startTime} · {chair?.name || "Кресло"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть экспресс-запись"
          className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-8 sm:h-8 sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
            ФИО Пациента
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-3 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Иванов Иван Иванович"
              value={bookingForm.patientName}
              onChange={(e) =>
                onFormChange({ ...bookingForm, patientName: e.target.value })
              }
              className="w-full pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[44px]"
              style={{ paddingLeft: "38px" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
            Телефон пациента
          </label>
          <div className="relative flex items-center">
            <Phone className="absolute left-3 w-4 h-4 text-[var(--muted)] pointer-events-none" />
            <input
              type="tel"
              placeholder="+7 (999) 000-00-00"
              value={bookingForm.patientPhone}
              onChange={(e) =>
                onFormChange({ ...bookingForm, patientPhone: e.target.value })
              }
              className="w-full pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[44px]"
              style={{ paddingLeft: "38px" }}
            />
          </div>
        </div>

        {/* ДЛИТЕЛЬНОСТЬ ВИЗИТА (1-КЛИК ЧИПЫ) */}
        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
            Длительность слота
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {SCHEDULE_DURATION_OPTIONS.slice(0, 4).map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() =>
                  onFormChange({ ...bookingForm, durationMinutes: opt.minutes })
                }
                className={`min-h-[44px] sm:min-h-0 py-2 sm:py-1.5 text-xs rounded-xl transition-all cursor-pointer ${
                  bookingForm.durationMinutes === opt.minutes
                    ? "bg-[var(--teal,#0d9488)] text-white font-medium shadow-xs"
                    : "bg-[var(--line)]/40 hover:bg-[var(--line)] text-[var(--ink)]"
                }`}
              >
                {opt.minutes} мин
              </button>
            ))}
          </div>
        </div>

        {/* ПРИЧИНА ПРИЁМА */}
        <div>
          <label className="block text-xs font-semibold text-[var(--ink)] mb-1">
            Причина визита
          </label>
          <select
            value={bookingForm.reason}
            onChange={(e) => onFormChange({ ...bookingForm, reason: e.target.value })}
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[44px] cursor-pointer"
          >
            {QUICK_APPOINTMENT_REASONS.map((r) => (
              <option key={r.label} value={r.reason}>
                {r.fullLabel}
              </option>
            ))}
          </select>
        </div>

        {/* ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА #0d9488 (МАНДАТЫ 8e, 8am) */}
        <button
          type="submit"
          data-testid="quick-booking-submit-btn"
          className="w-full mt-2 min-h-[48px] py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Записать на приём
        </button>
      </form>
    </div>
  );
};

export default ChairQuickBookingPopover;
