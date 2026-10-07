import {
  type Appointment,
  STOMX_REFUSE_REASONS_CATALOG,
} from "@dental/shared";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Zap,
} from "lucide-react";
import React from "react";
import { showToast } from "../GlobalToast";

export interface AppointmentModalStatusSectionProps {
  status: Appointment["status"];
  setStatus: (status: Appointment["status"]) => void;
  appointmentLabels: Record<Appointment["status"], string>;
  activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
  hasOpenVisit: boolean;
  comment: string;
  handleApplyRefusalReason: (nameRu: string) => void;
  handleOpenWaitlistForThisSlot: () => void;
}

export function AppointmentModalStatusSection({
  status,
  setStatus,
  appointmentLabels,
  activeVisitLockedAppointmentStatuses,
  hasOpenVisit,
  comment,
  handleApplyRefusalReason,
  handleOpenWaitlistForThisSlot,
}: AppointmentModalStatusSectionProps) {
  const handleSelectStatus = (nextStatus: Appointment["status"]) => {
    setStatus(nextStatus);
    if (
      hasOpenVisit &&
      activeVisitLockedAppointmentStatuses.has(nextStatus)
    ) {
      showToast(
        "Внимание: по этой записи открыт активный визит в кресле. Изменение статуса разрешено лечащему врачу.",
        "warning",
        4000,
      );
    }
  };

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={13} className="text-[var(--teal)]" />
          <span>Статус визита:</span>
        </label>
        {status && (
          <span className="text-[11px] font-semibold text-[var(--muted)]">
            Текущий:{" "}
            <strong className="text-[var(--ink)]">
              {appointmentLabels[status] || status}
            </strong>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5 mb-1.5">
        <button
          type="button"
          onClick={() => handleSelectStatus("planned")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--planned ${status === "planned" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "planned"
              ? "!bg-amber-500 !text-white font-extrabold !border-amber-500 shadow-sm ring-2 ring-amber-500/30"
              : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50"
          }`}
          data-testid="modal-status-btn-planned"
        >
          {status === "planned" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <Clock size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectStatus("confirmed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--confirmed ${status === "confirmed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "confirmed"
              ? "!bg-emerald-600 !text-white font-extrabold !border-emerald-600 shadow-sm ring-2 ring-emerald-600/30"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20 hover:border-emerald-500/50"
          }`}
          data-testid="modal-status-btn-confirmed"
        >
          {status === "confirmed" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <UserCheck size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="whitespace-nowrap leading-none">Подтвержден</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectStatus("arrived")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--arrived ${status === "arrived" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "arrived"
              ? "!bg-amber-600 !text-white font-extrabold !border-amber-600 shadow-sm ring-2 ring-amber-600/30"
              : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 hover:border-amber-500/50"
          }`}
          data-testid="modal-status-btn-arrived"
        >
          {status === "arrived" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <UserCheck size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="whitespace-nowrap leading-none">В холле</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectStatus("in_treatment")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--in_treatment ${status === "in_treatment" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "in_treatment"
              ? "!bg-[var(--teal)] !text-white font-extrabold !border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal)]/30"
              : "border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/20 hover:border-teal-500/50"
          }`}
          data-testid="modal-status-btn-in_treatment"
        >
          {status === "in_treatment" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <CalendarCheck size={12} className="shrink-0 text-teal-600 dark:text-teal-400" />
          )}
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectStatus("completed")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--completed ${status === "completed" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "completed"
              ? "!bg-slate-700 !text-white font-extrabold !border-slate-700 shadow-sm ring-2 ring-slate-700/30"
              : "border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-200 hover:bg-slate-500/20 hover:border-slate-500/50"
          }`}
          data-testid="modal-status-btn-completed"
        >
          {status === "completed" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <CheckCircle2 size={12} className="shrink-0 text-slate-600 dark:text-slate-400" />
          )}
          <span className="whitespace-nowrap leading-none">Завершен</span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectStatus("no_show")}
          className={`appointment-modal-status-chip appointment-modal-status-chip--no_show ${status === "no_show" ? "active" : ""} min-h-[44px] sm:min-h-[34px] sm:h-8.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 shadow-2xs ${
            status === "no_show"
              ? "!bg-rose-600 !text-white font-extrabold !border-rose-600 shadow-sm ring-2 ring-rose-600/30"
              : "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 hover:border-rose-500/50"
          }`}
          data-testid="modal-status-btn-no_show"
        >
          {status === "no_show" ? (
            <Check size={12} className="stroke-[3] shrink-0" />
          ) : (
            <UserX size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span className="whitespace-nowrap leading-none">Неявка</span>
        </button>
      </div>

      {/* Hidden select kept for screen readers, programmatic access, and test backward compatibility */}
      <select
        value={status}
        onChange={(e) => {
          handleSelectStatus(e.target.value as Appointment["status"]);
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="select-appointment-status"
      >
        {(
          Object.keys(appointmentLabels) as Appointment["status"][]
        ).map((st) => (
          <option key={st} value={st}>
            {appointmentLabels[st]}
          </option>
        ))}
      </select>
      {hasOpenVisit && (
        <div
          className="mt-1 p-1.5 rounded-lg text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20 flex items-center gap-1.5"
          data-testid="status-open-visit-warning"
        >
          <AlertTriangle
            size={12}
            className="shrink-0 text-amber-600 dark:text-amber-400"
          />
          <span>
            По этой записи открыт активный визит. Смена статуса
            разрешена лечащему врачу.
          </span>
        </div>
      )}

      {(status === "cancelled" || status === "no_show") && (
        <>
          <div
            className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5 mt-1.5"
            data-testid="appointment-refusal-reasons-block"
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200">
              <span className="flex items-center gap-1.5">
                <UserX
                  size={13}
                  className="text-rose-600 dark:text-rose-400"
                />
                Причина отмены / неявки:
              </span>
              <span className="text-[10px] text-[var(--muted)] font-normal">
                Фиксируется в комментарии и таймлайне
              </span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {STOMX_REFUSE_REASONS_CATALOG.map((refuse) => {
                const isSelected = comment.includes(
                  `[Отмена: ${refuse.nameRu}]`,
                );
                return (
                  <button
                    key={refuse.id}
                    type="button"
                    onClick={() =>
                      handleApplyRefusalReason(refuse.nameRu)
                    }
                    className={`h-7 px-2 py-0.5 rounded-md text-xs font-semibold border transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                        : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-rose-400 dark:hover:border-rose-500"
                    }`}
                    title={`${refuse.nameRu} (${refuse.responsibility === "clinic" ? "Клиника" : refuse.responsibility === "patient" ? "Пациент" : "Система"})`}
                  >
                    {refuse.nameRu}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Панель быстрого заполнения окна из листа ожидания */}
          <div
            className="mt-2 pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2"
            data-testid="cancellation-waitlist-banner"
          >
            <div className="text-xs">
              <span className="font-bold text-rose-800 dark:text-rose-200">
                Окно освобождается.
              </span>{" "}
              <span className="text-[var(--muted)]">
                Подобрать замену из листа ожидания?
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenWaitlistForThisSlot}
              className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] hover:brightness-110 active:brightness-95 text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
              data-testid="appointment-open-waitlist-btn"
            >
              <Zap size={14} className="fill-current text-amber-300" />
              <span>Подобрать из листа ожидания</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
