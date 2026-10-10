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
        className="min-h-[44px] w-full p-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex flex-col gap-0.5 text-left text-xs cursor-pointer shadow-2xs hover:border-[var(--teal)] transition-all"
        style={{ minHeight: "44px" }}
        data-testid={`chair-doctor-duty-badge-${chair.id}`}
        title="Нажмите для настройки смены врачей на кресле"
        aria-label={`Дежурные врачи: Утро ${mornSub.doctorName}, Вечер ${eveSub.doctorName}`}
      >
        <div
          className={`flex items-center justify-between gap-1 w-full min-w-0 px-1 py-0.5 rounded-lg ${
            isMornOnDuty
              ? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 font-bold text-emerald-950 dark:text-emerald-100"
              : ""
          }`}
          data-testid={`chair-shift-morning-${chair.id}`}
        >
          <span className="flex items-center gap-1 font-semibold truncate min-w-0">
            <Sun
              size={13}
              className="text-amber-500 shrink-0"
              aria-hidden="true"
            />
            <span className="text-amber-600 dark:text-amber-400 font-normal shrink-0">
              08:00–14:00:
            </span>
            <span className="truncate">
              {formatDoctorShortName(mornSub?.doctorName || "")}
            </span>
          </span>
          {isMornOnDuty && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1"
              data-testid={`chair-duty-morning-badge-${chair.id}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>● На смене</span>
            </span>
          )}
        </div>
        <div
          className={`flex items-center justify-between gap-1 w-full min-w-0 px-1 py-0.5 rounded-lg ${
            isEveOnDuty
              ? "bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30 font-bold text-emerald-950 dark:text-emerald-100"
              : ""
          }`}
          data-testid={`chair-shift-evening-${chair.id}`}
        >
          <span className="flex items-center gap-1 font-semibold truncate min-w-0">
            <Moon
              size={13}
              className="text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <span className="text-indigo-500 dark:text-indigo-300 font-normal shrink-0">
              14:00–20:00:
            </span>
            <span className="truncate">
              {formatDoctorShortName(eveSub?.doctorName || "")}
            </span>
          </span>
          {isEveOnDuty && (
            <span
              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 ml-1"
              data-testid={`chair-duty-evening-badge-${chair.id}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>● На смене</span>
            </span>
          )}
        </div>
      </button>
      {/* 1-Click Shift Switcher Quick Pills */}
      <div className="flex items-center justify-between gap-1 w-full px-0.5">
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
            className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
            style={{ minHeight: "44px" }}
            title="Переключить на утро только"
            data-testid={`chair-quick-morning-${chair.id}`}
          >
            <Sun
              size={12}
              className="shrink-0 text-amber-500"
              aria-hidden="true"
            />
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
            className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
            style={{ minHeight: "44px" }}
            title="Переключить на вечер только"
            data-testid={`chair-quick-evening-${chair.id}`}
          >
            <Moon
              size={12}
              className="shrink-0 text-indigo-400"
              aria-hidden="true"
            />
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
            className="min-h-[44px] sm:min-h-[26px] sm:h-6.5 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-all flex-1 justify-center"
            style={{ minHeight: "44px" }}
            title="Переключить на весь день"
            data-testid={`chair-quick-full-${chair.id}`}
          >
            <Building2
              size={12}
              className="shrink-0 text-[var(--teal)]"
              aria-hidden="true"
            />
            <span>Весь день</span>
          </button>
        )}
      </div>
    </div>
  );
}
