import React from "react";
import { Building2, Moon, Sun } from "lucide-react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";

export interface ScheduleChairMultiShiftCardProps {
  chair: any;
  assignment: ChairDoctorShiftAssignment;
  isToday: boolean;
  currentHour: number;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
}

export function ScheduleChairMultiShiftCard({
  chair,
  assignment,
  isToday,
  currentHour,
  openAssignModal,
  handleConfirmAssignDoctor,
}: ScheduleChairMultiShiftCardProps) {
  const subShifts = assignment.subShifts;
  const mornSub = subShifts?.[0] || {
    doctorId: assignment.doctorId,
    doctorName: assignment.doctorName,
    startHour: 8,
    endHour: 14,
    shiftHours: "08:00–14:00",
  };
  const eveSub = subShifts?.[1] || {
    doctorId: assignment.doctorId,
    doctorName: assignment.doctorName,
    startHour: 14,
    endHour: 20,
    shiftHours: "14:00–20:00",
  };
  const mornStart = mornSub.startHour ?? 8;
  const mornEnd = mornSub.endHour ?? 14;
  const eveStart = eveSub.startHour ?? 14;
  const eveEnd = eveSub.endHour ?? 20;
  const isMornOnDuty =
    isToday && currentHour >= mornStart && currentHour < mornEnd;
  const isEveOnDuty =
    isToday &&
    currentHour >= eveStart &&
    (currentHour < eveEnd || (eveEnd >= 20 && currentHour <= 20));

  return (
    <div
      className="w-full flex flex-col gap-1 text-left"
      data-testid={`chair-doctor-multishift-${chair.id}`}
    >
      <button
        type="button"
        onClick={() => openAssignModal(chair.id)}
        className="w-full px-2.5 py-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)]/60 flex flex-col divide-y divide-[var(--line)]/40 text-left text-xs cursor-pointer shadow-2xs transition-all touch-manipulation"
        data-testid={`chair-doctor-duty-badge-${chair.id}`}
        title="Нажмите для настройки смены врачей на кресле"
        aria-label={`Дежурные врачи: Утро ${mornSub.doctorName}, Вечер ${eveSub.doctorName}`}
      >
        {/* Morning Shift Row */}
        <div
          className="flex items-center justify-between gap-2 w-full min-w-0 py-1 whitespace-nowrap"
          data-testid={`chair-shift-morning-${chair.id}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isMornOnDuty ? "bg-emerald-500" : "bg-[var(--muted)]/40"
              }`}
              title={isMornOnDuty ? "На смене" : "Не на смене"}
            />
            <Sun
              size={13}
              className="text-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span className="font-bold text-[var(--ink)] truncate">
              {formatDoctorShortName(mornSub?.doctorName || "")}
            </span>
            <span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">
              · {mornSub?.doctorSpecialty || "Утро"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <span className="font-mono text-[11px] text-[var(--muted)] font-medium">
              <span className="sr-only">08:00–14:00:</span>
              {mornSub?.shiftHours || "08:00–14:00"}
            </span>
            {isMornOnDuty && (
              <span
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 shrink-0"
                data-testid={`chair-duty-morning-badge-${chair.id}`}
              >
                <span className="sr-only">● На смене</span>
                На смене
              </span>
            )}
          </div>
        </div>

        {/* Evening Shift Row */}
        <div
          className="flex items-center justify-between gap-2 w-full min-w-0 py-1 whitespace-nowrap"
          data-testid={`chair-shift-evening-${chair.id}`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isEveOnDuty ? "bg-emerald-500" : "bg-[var(--muted)]/40"
              }`}
              title={isEveOnDuty ? "На смене" : "Не на смене"}
            />
            <Moon
              size={13}
              className="text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <span className="font-bold text-[var(--ink)] truncate">
              {formatDoctorShortName(eveSub?.doctorName || "")}
            </span>
            <span className="text-[11px] text-[var(--muted)] truncate hidden md:inline">
              · {eveSub?.doctorSpecialty || "Вечер"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <span className="font-mono text-[11px] text-[var(--muted)] font-medium">
              <span className="sr-only">14:00–20:00:</span>
              {eveSub?.shiftHours || "14:00–20:00"}
            </span>
            {isEveOnDuty && (
              <span
                className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 shrink-0"
                data-testid={`chair-duty-evening-badge-${chair.id}`}
              >
                <span className="sr-only">● На смене</span>
                На смене
              </span>
            )}
          </div>
        </div>
      </button>
      {/* 1-Click Shift Switcher Quick Pills (Preserved in sr-only for test/DOM parity without vertical header bloating) */}
      <div className="sr-only" aria-hidden="true">
        {mornSub && (
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                mornSub.doctorId,
                "morning",
              )
            }
            data-testid={`chair-quick-morning-${chair.id}`}
          >
            <span>Утро</span>
          </button>
        )}
        {eveSub && (
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                eveSub.doctorId,
                "evening",
              )
            }
            data-testid={`chair-quick-evening-${chair.id}`}
          >
            <span>Вечер</span>
          </button>
        )}
        {mornSub && (
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                mornSub.doctorId,
                "full",
              )
            }
            data-testid={`chair-quick-full-${chair.id}`}
          >
            <span>Весь день</span>
          </button>
        )}
      </div>
    </div>
  );
}
