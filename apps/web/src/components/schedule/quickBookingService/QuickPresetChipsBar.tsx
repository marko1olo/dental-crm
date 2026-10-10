import {
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Sparkles,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";
import React from "react";
import {
  APPOINTMENT_TYPE_PRESETS,
  appendReasonPreset,
  COMMON_REASONS,
} from "./quickServicePresets";
import type {
  QuickBookingAppointmentType,
  QuickPresetChipsBarProps,
} from "./types";

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
          <span className="truncate hidden sm:inline">
            Внеплановый (срочно)
          </span>
          <span className="truncate sm:hidden">Срочный</span>
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
          <span className="truncate hidden sm:inline">Утверждённый</span>
          <span className="truncate sm:hidden">Подтверждён</span>
        </button>
      </div>
    </div>
  );
}

export function QuickAppointmentTypeSelector({
  appointmentType,
  handleSelectAppointmentType,
}: {
  appointmentType: QuickBookingAppointmentType;
  handleSelectAppointmentType: (type: QuickBookingAppointmentType) => void;
}) {
  return (
    <div className="space-y-1.5" data-testid="quick-booking-type-selector">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Sparkles size={14} className="text-[var(--teal)]" />
          <span>Тип приема *</span>
        </span>
        {appointmentType === "emergency" && (
          <span
            className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse"
            data-testid="cito-slot-priority-badge-secondary"
          >
            Приоритетный слот
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {APPOINTMENT_TYPE_PRESETS.map((preset) => {
          const isSelected = appointmentType === preset.type;
          const isEm = preset.isEmergency;
          return (
            <button
              key={preset.type}
              type="button"
              onClick={() => handleSelectAppointmentType(preset.type)}
              className={`min-h-[50px] p-2.5 rounded-xl text-left flex flex-col justify-center transition-all cursor-pointer select-none active:scale-[0.99] ${
                isSelected
                  ? isEm
                    ? "danger-button active !border-rose-600 ring-2 ring-rose-500/40 shadow-sm"
                    : "primary-button shadow-sm"
                  : isEm
                    ? "danger-button"
                    : "secondary-button"
              }`}
              data-testid={`quick-booking-type-${preset.type}`}
              title={preset.description}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                {isEm ? (
                  <Flame
                    size={15}
                    className={
                      isSelected
                        ? "text-white animate-pulse"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  />
                ) : isSelected ? (
                  <Check size={14} className="stroke-[2.5]" />
                ) : null}
                <span>{preset.label}</span>
              </div>
              <span
                className={`text-[10px] truncate block mt-0.5 ${
                  isSelected
                    ? isEm
                      ? "text-rose-100 font-medium"
                      : "text-teal-100 font-medium"
                    : "text-[var(--muted)]"
                }`}
              >
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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

export function QuickPresetChipsBar({
  reason,
  setReason,
  comment,
  setComment,
}: Pick<
  QuickPresetChipsBarProps,
  "reason" | "setReason" | "comment" | "setComment"
>) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
          Повод обращения / Услуга
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: Осмотр, Кариес, Консультация"
          className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
        <div className="dente-filter-chips gap-1.5 mt-2">
          {COMMON_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(appendReasonPreset(reason, r))}
              className="dente-filter-chip"
            >
              + {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
          Комментарий для врача / регистратуры
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Дополнительные пожелания или примечания…"
          rows={2}
          className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
      </div>
    </div>
  );
}
