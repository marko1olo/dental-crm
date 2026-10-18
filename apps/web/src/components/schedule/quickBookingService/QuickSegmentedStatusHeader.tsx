import { CheckCircle2, Clock, Flame, Zap } from "lucide-react";
import React from "react";
import type { QuickPresetChipsBarProps } from "./types";

export function QuickSegmentedStatusHeader({
  appointmentType,
  handleSelectAppointmentType,
  status,
  setStatus,
  reason,
  setReason,
}: Pick<
  QuickPresetChipsBarProps,
  | "appointmentType"
  | "handleSelectAppointmentType"
  | "status"
  | "setStatus"
  | "reason"
  | "setReason"
>) {
  return (
    <div className="space-y-1.5" data-testid="expo26-segmented-status-container">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-[var(--teal)]" />
          <span>Статус записи</span>
        </span>
        {appointmentType === "emergency" && (
          <span
            className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse inline-flex items-center gap-1"
            data-testid="cito-slot-priority-badge"
          >
            <Zap size={11} className="shrink-0" aria-hidden="true" />
            <span>СРОЧНО</span>
          </span>
        )}
      </div>
      <div
        className="dente-segmented-bar w-full grid grid-cols-3 rounded-xl p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 gap-1"
        data-testid="expo26-segmented-status"
      >
        <button
          type="button"
          onClick={() => {
            setStatus("planned");
            if (appointmentType === "emergency") {
              handleSelectAppointmentType("secondary");
            }
          }}
          className={`dente-segmented-item w-full h-8 min-h-[32px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            status === "planned" && appointmentType !== "emergency"
              ? "active !bg-white dark:!bg-slate-700 !text-slate-900 dark:!text-white font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
          data-testid="expo26-status-planned"
        >
          <Clock size={13} className="shrink-0" />
          <span className="truncate">Плановый</span>
        </button>
        <button
          type="button"
          onClick={() => {
            handleSelectAppointmentType("emergency");
            if (!reason.includes("Срочно")) {
              setReason(
                reason
                  ? `Срочно! Острая боль, ${reason}`
                  : "Срочно! Острая боль",
              );
            }
          }}
          className={`dente-segmented-item w-full h-8 min-h-[32px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            appointmentType === "emergency"
              ? "active !bg-rose-600 !text-white font-semibold shadow-xs"
              : "text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200"
          }`}
          data-testid="expo26-status-emergency"
        >
          <Flame
            size={13}
            className={
              appointmentType === "emergency"
                ? "text-white animate-pulse shrink-0"
                : "text-rose-600 shrink-0"
            }
          />
          <span className="truncate">Внеплановый (срочно)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("confirmed");
          }}
          className={`dente-segmented-item w-full h-8 min-h-[32px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            status === "confirmed"
              ? "active !bg-white dark:!bg-slate-700 !text-slate-900 dark:!text-white font-semibold shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
          data-testid="expo26-status-confirmed"
        >
          <CheckCircle2 size={13} className="shrink-0" />
          <span className="truncate">Утверждённый</span>
        </button>
      </div>
    </div>
  );
}
