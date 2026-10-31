/**
 * ChairScheduleStudioFooter.tsx — Футер студии расписания и единая Primary CTA кнопка
 * Мандат 8b / 8zi: эталонный Sweet Spot (60–90 строк).
 * Мандат 8e / 8n: автономия врача — ровно 1 Primary CTA кнопка #0d9488, НИКОГДА не блокируется (disabled={false})!
 * Мандат 8am: чистая гармоничная геометрия с единым фокусом внимания.
 * Apple HIG: сенсорный минимум touch target >= 44x44px.
 */

import React from "react";
import { CheckCircle2, ShieldCheck, Sparkles, Clock } from "lucide-react";

export interface ChairScheduleStudioFooterProps {
  readonly currentDate: string;
  readonly appointmentsCount: number;
  readonly selectedDoctor: string;
  readonly onQuickBookTrigger: () => void;
}

/**
 * Нижняя контрольная панель студии расписания кресел.
 * Отображает статус врача, текущую нагрузку и неблокируемую кнопку бронирования слота.
 */
export const ChairScheduleStudioFooter: React.FC<ChairScheduleStudioFooterProps> = ({
  currentDate,
  appointmentsCount,
  selectedDoctor,
  onQuickBookTrigger,
}) => {
  return (
    <footer className="flex-none flex flex-col sm:flex-row items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--line)] bg-[var(--paper-strong)]">
      {/* ЛЕВАЯ ЧАСТЬ: ИНФО-СТРОКА (МАНДАТ 8e: СТАТУС ВРАЧА И ПРИЁМОВ) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[var(--muted)]">
        <div className="flex items-center gap-1.5 font-medium text-[var(--ink)]">
          <ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
          <span>{selectedDoctor}</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span>Приёмов на дату:</span>
          <strong className="text-[var(--ink)] font-semibold">{appointmentsCount}</strong>
        </div>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline text-[var(--teal,#0d9488)] font-medium">
          Автосохранение активно
        </span>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ЕДИНСТВЕННАЯ PRIMARY CTA КНОПКА (МАНДАТ 8am / 8e) */}
      <div className="w-full sm:w-auto flex items-center justify-end">
        <button
          type="button"
          onClick={onQuickBookTrigger}
          data-testid="chair-schedule-confirm-slot-btn"
          aria-label="Забронировать свободный слот"
          className="w-full sm:w-auto min-h-[44px] sm:min-h-0 py-2 sm:py-2 px-4 rounded-xl font-medium text-xs sm:text-sm text-white bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>✓ Забронировать слот</span>
        </button>
      </div>
    </footer>
  );
};

export default ChairScheduleStudioFooter;
