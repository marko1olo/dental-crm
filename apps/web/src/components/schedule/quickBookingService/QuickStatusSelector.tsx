import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";
import React from "react";
import type { QuickPresetChipsBarProps } from "./types";

export function QuickStatusSelector({
  status,
  setStatus,
}: Pick<QuickPresetChipsBarProps, "status" | "setStatus">) {
  return (
    <div className="space-y-1.5 pt-1" data-testid="quick-booking-status-selector">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
        <CalendarCheck size={14} className="text-[var(--teal)]" />
        <span>Статус записи</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatus("planned")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "planned"
              ? "bg-amber-500 text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-planned"
        >
          <Clock size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("confirmed")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "confirmed"
              ? "bg-emerald-600 text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-confirmed"
        >
          <UserCheck size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Подтвержден</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("arrived")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "arrived"
              ? "bg-amber-600 text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-arrived"
        >
          <UserCheck size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Пациент пришел</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("in_treatment")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "in_treatment"
              ? "bg-[var(--teal,#0d9488)] text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-in_treatment"
        >
          <CalendarCheck size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("completed")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "completed"
              ? "bg-slate-700 text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-completed"
        >
          <CheckCircle2 size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Прием завершен</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("no_show")}
          className={`h-8 min-h-[32px] max-h-[32px] px-2.5 rounded-xl text-xs transition-all inline-flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "no_show"
              ? "bg-rose-600 text-white border-transparent font-semibold shadow-xs"
              : "border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 font-medium"
          }`}
          data-testid="quick-status-btn-no_show"
        >
          <UserX size={13} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Неявка</span>
        </button>
      </div>
    </div>
  );
}
