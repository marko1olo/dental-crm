import React from "react";
import { AlertCircle, Clock } from "lucide-react";
import type { PatientShiftQueueResult } from "@dental/shared";

export function TodayQueueHeader({ summary }: { summary: PatientShiftQueueResult["summary"] }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]">
          <Clock size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--ink)]">
            Очередь смены дня
          </h2>
          <p className="text-[11px] text-[var(--muted)]">
            {summary.totalToday} записей · Ожидают в холле: {summary.waitingCount} · В кресле: {summary.inChairCount} · На кассе: {summary.checkoutCount}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        {summary.waitingOvertimeCount > 0 && (
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
            title={`Пациенты ждут вызова дольше 15 мин: ${summary.waitingOvertimeCount}`}
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>Задержка в холле: {summary.waitingOvertimeCount}</span>
          </div>
        )}
        {summary.inChairOvertimeCount > 0 && (
          <div
            className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300"
            title={`Прием в кресле превысил план: ${summary.inChairOvertimeCount}`}
          >
            <AlertCircle size={13} className="shrink-0" />
            <span>Превышение времени приема: {summary.inChairOvertimeCount}</span>
          </div>
        )}
        {summary.averageWaitMinutes > 0 && (
          <span className="text-[11px] text-[var(--muted)]">
            Ср. ожидание: {summary.averageWaitMinutes} мин
          </span>
        )}
      </div>
    </header>
  );
}
