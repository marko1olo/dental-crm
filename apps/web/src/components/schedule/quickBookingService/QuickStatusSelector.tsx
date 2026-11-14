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
      <label className="text-xs font-bold text-[var(--muted)] flex items-center gap-1.5">
        <CalendarCheck size={14} className="text-[var(--teal)]" />
        <span>Статус записи</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatus("planned")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "planned"
              ? "bg-amber-600 text-white border-amber-600 font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-planned"
        >
          <Clock size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("confirmed")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "confirmed"
              ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-confirmed"
        >
          <UserCheck size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Подтверждён</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("arrived")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "arrived"
              ? "bg-amber-600 text-white border-amber-600 font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-arrived"
        >
          <UserCheck size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Пациент пришёл</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("in_treatment")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "in_treatment"
              ? "bg-[var(--teal-dark)] text-white border-[var(--teal-dark)] font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-in_treatment"
        >
          <CalendarCheck size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("completed")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "completed"
              ? "bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-completed"
        >
          <CheckCircle2 size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Приём завершён</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("no_show")}
          className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm transition-all inline-flex items-center gap-2 cursor-pointer select-none active:scale-95 border ${
            status === "no_show"
              ? "bg-rose-600 text-white border-rose-600 font-semibold shadow-sm"
              : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium"
          }`}
          data-testid="quick-status-btn-no_show"
        >
          <UserX size={15} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Неявка</span>
        </button>
      </div>
      <div className="pt-1.5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          data-testid="select-appointment-status"
          className="w-full px-3 py-2 h-11 min-h-[44px] leading-normal rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
          aria-label="Выбрать статус записи"
        >
          <option value="planned">Запланирован</option>
          <option value="confirmed">Подтверждён</option>
          <option value="arrived">Прибыл</option>
          <option value="in_treatment">В кресле</option>
          <option value="completed">Завершён</option>
          <option value="cancelled">Отменён</option>
          <option value="no_show">Не явился</option>
        </select>
      </div>
    </div>
  );
}
