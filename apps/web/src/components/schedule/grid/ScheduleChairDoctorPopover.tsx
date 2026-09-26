import React from "react";
import {
  Building2,
  Calendar,
  CalendarRange,
  Clock,
  Moon,
  Pin,
  Sun,
  UserCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import {
  getMondayOfWeekIso,
  applyDoctorChairWeeklyTemplate,
} from ".././roster/DoctorShiftRosterModal";
import {
  safeLocalStorageGetJson,
  safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";
import { formatDoctorShortName } from ".././GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairDoctorPopoverProps {
  chair: { id: string; name: string };
  doctors: Array<any>;
  assignment: ChairDoctorShiftAssignment | undefined;
  suggestedDoctor: any | null;
  hasDoctor: boolean;
  dateKey: string;
  dashboard: Dashboard;
  onClose: () => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset:
      | "morning"
      | "morning_9"
      | "evening"
      | "evening_15"
      | "full"
      | "full_9_21"
      | "two_shifts",
    eveningDocId?: string,
  ) => void;
  handleAssignDoctorWeek: (
    chairId: string,
    docId: string,
    fullWeek?: boolean,
  ) => void;
  handleAssignDoctorMonth: (chairId: string, docId: string) => void;
  handleQuickSubstituteDoctor: (chairId: string, newDoctorId?: string) => void;
  handleBindDoctorToChair: (chairId: string, doctorId: string) => void;
  handleUnassignDoctor: (chairId: string) => void;
  openAssignModal: (chairId: string) => void;
}

export function ScheduleChairDoctorPopover({
  chair,
  doctors,
  assignment,
  suggestedDoctor,
  hasDoctor,
  dateKey,
  dashboard,
  onClose,
  handleConfirmAssignDoctor,
  handleAssignDoctorWeek,
  handleAssignDoctorMonth,
  handleQuickSubstituteDoctor,
  handleBindDoctorToChair,
  handleUnassignDoctor,
  openAssignModal,
}: ScheduleChairDoctorPopoverProps) {
  return (
    <div
      className="absolute top-full left-0 z-50 mt-1 p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col gap-2 min-w-[280px] max-w-[340px] text-xs"
      style={{
        boxShadow:
          "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        zIndex: 60,
      }}
      onClick={(e) => e.stopPropagation()}
      data-testid={`chair-doctor-quick-popover-${chair.id}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
        <span className="text-xs font-bold text-[var(--ink)]">
          Врач на кресле «{chair.name}»
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--muted)] cursor-pointer flex items-center justify-center"
          style={{ minHeight: "44px", minWidth: "44px" }}
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      </div>

      {/* Doctors list */}
      <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
          Выберите врача (1 клик):
        </span>
        {doctors.map((doc) => {
          const isCurrent = assignment?.doctorId === doc.id;
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                handleConfirmAssignDoctor(
                  chair.id,
                  doc.id,
                  assignment?.shiftPreset === "morning" ||
                    assignment?.shiftPreset === "evening"
                    ? assignment.shiftPreset
                    : "full",
                );
                onClose();
              }}
              className={`min-h-[44px] w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                isCurrent
                  ? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal)] text-[var(--teal)] shadow-xs"
                  : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
              }`}
              style={{ minHeight: "44px" }}
              data-testid={`chair-doctor-option-${chair.id}-${doc.id}`}
            >
              <span className="truncate">{doc.fullName}</span>
              {isCurrent && (
                <UserCheck
                  size={14}
                  className="text-[var(--teal)] shrink-0 ml-1"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 1-Tap Shift & Week Presets inside popover */}
      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-[var(--line)]">
        <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">
          Шаблоны смен (1 клик):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "morning");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Утро 08:00–14:00 (1 клик)"
            aria-label={`Назначить утреннюю смену 08:00–14:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-morning-${chair.id}`}
          >
            <Sun size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">Утро 08:00–14:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "morning_9");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="1 смена: 09:00–15:00 (1 клик)"
            aria-label={`Назначить 1 смену 09:00–15:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-morning-9-${chair.id}`}
          >
            <Sun size={15} className="text-amber-600 shrink-0" aria-hidden="true" />
            <span className="truncate">1 см. 09:00–15:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "evening");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Вечер 14:00–20:00 (1 клик)"
            aria-label={`Назначить вечернюю смену 14:00–20:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-evening-${chair.id}`}
          >
            <Moon size={15} className="text-indigo-400 shrink-0" aria-hidden="true" />
            <span className="truncate">Вечер 14:00–20:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "evening_15");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="2 смена: 15:00–21:00 (1 клик)"
            aria-label={`Назначить смену 15:00–21:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-evening-15-${chair.id}`}
          >
            <Moon size={15} className="text-indigo-500 shrink-0" aria-hidden="true" />
            <span className="truncate">2 см. 15:00–21:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "full");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Весь день 08:00–20:00 (1 клик)"
            aria-label={`Назначить смену на весь день 08:00–20:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-full-${chair.id}`}
          >
            <Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
            <span className="truncate">Весь день 08:00–20:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleConfirmAssignDoctor(chair.id, targetDocId, "full_9_21");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Весь день 09:00–21:00 (1 клик)"
            aria-label={`Назначить смену на весь день 09:00–21:00 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-full-9-21-${chair.id}`}
          >
            <Building2 size={15} className="text-[var(--teal)] shrink-0" aria-hidden="true" />
            <span className="truncate">Весь день 09:00–21:00</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleAssignDoctorWeek(chair.id, targetDocId);
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="На всю неделю (Пн–Пт) (1 клик)"
            aria-label={`Закрепить врача на кресле ${chair.name} на всю неделю (Пн–Пт)`}
            data-testid={`chair-popover-shift-week-${chair.id}`}
          >
            <Calendar size={15} className="text-emerald-500 shrink-0" aria-hidden="true" />
            <span className="truncate">На всю неделю (Пн–Пт)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleAssignDoctorWeek(chair.id, targetDocId, true);
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="На всю неделю (Пн–Вс, 7 дней) (1 клик)"
            aria-label={`Закрепить врача на кресле ${chair.name} на всю неделю (Пн–Вс)`}
            data-testid={`chair-popover-shift-week-full-${chair.id}`}
          >
            <Calendar size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <span className="truncate">На всю неделю (Пн–Вс)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                const mondayIso = getMondayOfWeekIso(dateKey);
                if (typeof window !== "undefined") {
                  const currentShifts = safeLocalStorageGetJson<any[]>(
                    "dente_doctor_shifts",
                    [],
                  );
                  const updatedShifts = applyDoctorChairWeeklyTemplate(
                    currentShifts,
                    {
                      weekStartDateIso: mondayIso,
                      templateId: "two_two_full",
                      doctorId: targetDocId,
                      chairId: chair.id,
                      staffList:
                        (dashboard?.clinicSettings?.staff as any) ||
                        (doctors as any),
                    },
                  );
                  safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
                }
                handleConfirmAssignDoctor(chair.id, targetDocId, "two_shifts");
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="График 2 через 2 (08:00–20:00) (1 клик)"
            aria-label={`Назначить график 2 через 2 на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-two-two-${chair.id}`}
          >
            <Clock size={15} className="text-purple-500 shrink-0" aria-hidden="true" />
            <span className="truncate">2 через 2 (08–20)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                const mondayIso = getMondayOfWeekIso(dateKey);
                if (typeof window !== "undefined") {
                  const currentShifts = safeLocalStorageGetJson<any[]>(
                    "dente_doctor_shifts",
                    [],
                  );
                  const updatedShifts = applyDoctorChairWeeklyTemplate(
                    currentShifts,
                    {
                      weekStartDateIso: mondayIso,
                      templateId: "even_odd_month",
                      doctorId: targetDocId,
                      chairId: chair.id,
                      staffList:
                        (dashboard?.clinicSettings?.staff as any) ||
                        (doctors as any),
                    },
                  );
                  safeLocalStorageSetJson("dente_doctor_shifts", updatedShifts);
                }
                const dayOfMonth =
                  Number.parseInt(
                    dateKey ? dateKey.slice(8, 10) : "1",
                    10,
                  ) || 1;
                const isEven = dayOfMonth % 2 === 0;
                handleConfirmAssignDoctor(
                  chair.id,
                  targetDocId,
                  isEven ? "morning" : "evening",
                );
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Чётные/Нечётные дни месяца (1 клик)"
            aria-label={`Назначить график чет/нечет на кресло ${chair.name}`}
            data-testid={`chair-popover-shift-even-odd-${chair.id}`}
          >
            <Zap size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">Чет / Нечет</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const targetDocId =
                assignment?.doctorId ||
                suggestedDoctor?.id ||
                (doctors[0]?.id ?? "");
              if (targetDocId) {
                handleAssignDoctorMonth(chair.id, targetDocId);
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="На весь месяц (1 клик) (StomX Parity)"
            aria-label={`Закрепить врача на кресле ${chair.name} на весь месяц`}
            data-testid={`chair-popover-shift-month-${chair.id}`}
          >
            <CalendarRange size={15} className="text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            <span className="truncate">На весь месяц (1 клик)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const currentDocId = assignment?.doctorId;
              const substituteDoc =
                doctors.find((d) => d.id !== currentDocId) || doctors[0];
              if (substituteDoc) {
                handleQuickSubstituteDoctor(chair.id, substituteDoc.id);
              }
              onClose();
            }}
            className="min-h-[44px] px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            title="Быстрая подмена дежурного врача на сегодня (StomX Parity, 1 клик)"
            aria-label={`Подменить врача на сегодня на кресле ${chair.name}`}
            data-testid={`chair-popover-substitute-${chair.id}`}
          >
            <UserCheck size={15} className="text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">Подменить врача на сегодня</span>
          </button>
        </div>
      </div>

      {/* Action Buttons: Bind Doctor, Unassign & Open Full Modal */}
      <div className="flex flex-col gap-1 pt-1 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={() => {
            const targetDocId =
              assignment?.doctorId ||
              suggestedDoctor?.id ||
              (doctors[0]?.id ?? "");
            if (targetDocId) {
              handleBindDoctorToChair(chair.id, targetDocId);
            }
            onClose();
          }}
          className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] border border-[var(--line)] flex items-center gap-1.5 cursor-pointer transition-all"
          style={{ minHeight: "44px" }}
          title={`Закрепить врача за креслом «${chair.name}» (StomX Parity)`}
          data-testid={`chair-popover-bind-doctor-${chair.id}`}
        >
          <Pin size={14} className="text-[var(--teal)] shrink-0" />
          <span>Закрепить врача за креслом</span>
        </button>
        {hasDoctor && (
          <button
            type="button"
            onClick={() => {
              handleUnassignDoctor(chair.id);
              onClose();
            }}
            className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer transition-all"
            style={{ minHeight: "44px" }}
            data-testid={`chair-popover-unassign-${chair.id}`}
          >
            <XCircle size={14} />
            <span>Снять врача с кресла</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            openAssignModal(chair.id);
            onClose();
          }}
          className="min-h-[44px] w-full px-2 py-1 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] bg-transparent hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer transition-all"
          style={{ minHeight: "44px" }}
          data-testid={`btn-chair-open-full-modal-${chair.id}`}
        >
          <Clock size={14} />
          <span>Расширенная настройка</span>
        </button>
      </div>
    </div>
  );
}
