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
      className="absolute inset-x-0 bottom-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-96 bg-[var(--paper)] border-t sm:border border-[var(--line)] sm:rounded-2xl p-4 sm:p-5 shadow-2xl z-50 flex flex-col gap-3"
    >
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
          className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 p-2 sm:p-1 flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-[var(--ink)] mb-1">
            ФИО Пациента
          </label>
          <div className="relative">
            <User className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              autoFocus
              placeholder="Иванов Иван Иванович"
              value={bookingForm.patientName}
              onChange={(e) =>
                onFormChange({ ...bookingForm, patientName: e.target.value })
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[38px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--ink)] mb-1">
            Телефон пациента
          </label>
          <div className="relative">
            <Phone className="absolute left-2.5 top-2.5 w-4 h-4 text-[var(--muted)]" />
            <input
              type="tel"
              placeholder="+7 (999) 000-00-00"
              value={bookingForm.patientPhone}
              onChange={(e) =>
                onFormChange({ ...bookingForm, patientPhone: e.target.value })
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[38px]"
            />
          </div>
        </div>

        {/* ДЛИТЕЛЬНОСТЬ ВИЗИТА (1-КЛИК ЧИПЫ) */}
        <div>
          <label className="block text-xs font-medium text-[var(--ink)] mb-1">
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
                className={`py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                  bookingForm.durationMinutes === opt.minutes
                    ? "bg-[var(--teal,#0d9488)] text-white font-medium"
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
          <label className="block text-xs font-medium text-[var(--ink)] mb-1">
            Причина визита
          </label>
          <select
            value={bookingForm.reason}
            onChange={(e) => onFormChange({ ...bookingForm, reason: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--teal,#0d9488)] min-h-[38px] cursor-pointer"
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
          className="w-full mt-2 min-h-[44px] py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm text-white bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          Записать на приём
        </button>
      </form>
    </div>
  );
};

export default ChairQuickBookingPopover;
