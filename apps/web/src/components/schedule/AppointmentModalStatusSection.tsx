import {
  type Appointment,
  STOMX_REFUSE_REASONS_CATALOG,
} from "@dental/shared";
import {
  AlertTriangle,
  CalendarCheck,
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
  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <CalendarCheck size={13} className="text-[var(--teal)]" />
          <span>Статус визита (1 клик):</span>
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
          onClick={() => setStatus("planned")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "planned"
              ? "bg-[var(--teal)] text-white font-bold border-[var(--teal)]"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-planned"
        >
          <Clock size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Ожидает</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("confirmed")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "confirmed"
              ? "bg-emerald-600 text-white font-bold border-emerald-600"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-confirmed"
        >
          <UserCheck size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Подтвержден</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("arrived")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "arrived"
              ? "bg-emerald-600 text-white font-bold border-emerald-600"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-arrived"
        >
          <UserCheck size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Пришел</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("in_treatment")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "in_treatment"
              ? "bg-cyan-600 text-white font-bold border-cyan-600"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-in_treatment"
        >
          <CalendarCheck size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">В кресле</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("completed")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "completed"
              ? "bg-slate-700 text-white font-bold border-slate-700"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-completed"
        >
          <CheckCircle2 size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Завершен</span>
        </button>
        <button
          type="button"
          onClick={() => setStatus("no_show")}
          className={`h-7 sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-95 ${
            status === "no_show"
              ? "bg-rose-600 text-white font-bold border-rose-600"
              : "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:border-[var(--teal,var(--brand-primary))] hover:text-[var(--teal,var(--brand-primary))]"
          }`}
          data-testid="modal-status-btn-no_show"
        >
          <UserX size={12} className="shrink-0" />
          <span className="whitespace-nowrap leading-none">Неявка</span>
        </button>
      </div>

      <select
        value={status}
        onChange={(e) => {
          const nextStatus = e.target.value as Appointment["status"];
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
        }}
        className="w-full px-2.5 h-8 sm:h-9 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] mt-1"
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
                Причина отмены / неявки (StomX 1 клик):
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

          {/* StomX 1-Click Waitlist Auto-Fill Banner */}
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
