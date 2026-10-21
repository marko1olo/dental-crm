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
        className="dente-segmented-bar w-full grid grid-cols-3 rounded-xl p-1 bg-[var(--paper-soft)] border border-[var(--line)] gap-1"
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
          className={`dente-segmented-item w-full min-h-[44px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            status === "planned" && appointmentType !== "emergency"
              ? "active !bg-[var(--paper)] !text-[var(--ink)] border border-[var(--line)] font-semibold shadow-xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
          }`}
          data-testid="expo26-status-planned"
        >
          <Clock size={15} className="shrink-0" />
          <span className="whitespace-nowrap font-medium">Плановый</span>
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
          className={`dente-segmented-item w-full min-h-[44px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            appointmentType === "emergency"
              ? "active !bg-rose-600 !text-white font-semibold shadow-xs"
              : "text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200"
          }`}
          data-testid="expo26-status-emergency"
        >
          <Flame
            size={15}
            className={
              appointmentType === "emergency"
                ? "text-white animate-pulse shrink-0"
                : "text-rose-600 shrink-0"
            }
          />
          <span className="whitespace-nowrap font-medium">Срочно</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setStatus("confirmed");
          }}
          className={`dente-segmented-item w-full min-h-[44px] rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer select-none ${
            status === "confirmed"
              ? "active !bg-[var(--paper)] !text-[var(--ink)] border border-[var(--line)] font-semibold shadow-xs"
              : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
          }`}
          data-testid="expo26-status-confirmed"
        >
          <CheckCircle2 size={15} className="shrink-0" />
          <span className="whitespace-nowrap font-medium">Подтверждён</span>
        </button>
      </div>
    </div>
  );
}
