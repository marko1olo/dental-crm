import React from "react";
import { CalendarCheck, Clock, Copy, Eye, EyeOff } from "lucide-react";
import { countLabel } from "../../../lib/russianPlural";

export interface ScheduleGridFooterProps {
  dailyTally: any;
  effectiveChairs: Array<any>;
  handleCopyWeekShiftsToNextWeek: () => void;
  showRevenue: boolean;
  handleToggleShowRevenue: () => void;
}

export function ScheduleGridFooter({
  dailyTally,
  effectiveChairs,
  handleCopyWeekShiftsToNextWeek,
  showRevenue,
  handleToggleShowRevenue,
}: ScheduleGridFooterProps) {
  return (
    <div className="px-3 py-1 bg-[var(--paper-soft)] border-t border-[var(--line)] flex flex-nowrap items-center justify-between gap-2 text-xs text-[var(--muted)] overflow-hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        {dailyTally.totalAppointmentsCount > 0 ? (
          <>
            <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5 whitespace-nowrap">
              <CalendarCheck
                size={14}
                className="text-[var(--teal,var(--brand-primary))] shrink-0"
              />
              Загрузка клиники:{" "}
              {countLabel(
                dailyTally.totalAppointmentsCount,
                "визит",
                "визита",
                "визитов",
              )}{" "}
              ({dailyTally.clinicOccupancyPercent}%)
            </span>
            <span className="text-[var(--muted)] hidden 2xl:inline">·</span>
            <span className="text-[var(--muted)] whitespace-nowrap hidden 2xl:inline">
              Общее время приема:{" "}
              {Math.floor(dailyTally.totalDurationMinutes / 60)} ч{" "}
              {dailyTally.totalDurationMinutes % 60} мин
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Clock size={13} className="text-[var(--teal)] shrink-0" />
            <span>
              {effectiveChairs.length}{" "}
              {countLabel(
                effectiveChairs.length,
                "кресло",
                "кресла",
                "кресел",
              )}{" "}
              · 08:00–20:00
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleCopyWeekShiftsToNextWeek}
          className="h-6 px-2 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all shadow-2xs hover:border-[var(--teal)]"
          title="Скопировать график смен кресел на следующую неделю (+7 дней) в 1 клик"
          aria-label="Скопировать график на следующую неделю"
          data-testid="btn-grid-copy-next-week"
        >
          <Copy size={12} className="shrink-0 text-[var(--teal)]" />
          <span className="hidden sm:inline">На след. неделю</span>
          <span className="sm:hidden">+7 дн.</span>
        </button>
        {dailyTally.totalRevenueRub > 0 && (
          <button
            type="button"
            onClick={handleToggleShowRevenue}
            className="font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
            title={
              showRevenue
                ? "Скрыть сумму выручки дня от пациентов (Режим приватности)"
                : "Показать выручку дня"
            }
            data-testid="btn-grid-toggle-revenue-privacy"
            aria-label="Переключить приватность выручки дня"
          >
            {showRevenue ? (
              <EyeOff
                size={12}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <Eye
                size={12}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
              />
            )}
            <span>
              {showRevenue
                ? `${dailyTally.totalRevenueRub.toLocaleString("ru-RU")} ₽`
                : "•••••• ₽"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
