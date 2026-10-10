import React from "react";
import { Moon, Plus, Sun, Zap } from "lucide-react";
import { formatDoctorShortName } from "../GridAppointmentCard";
import type { ChairDoctorShiftAssignment } from "./gridTypes";
import { ScheduleChairMultiShiftCard } from "./ScheduleChairMultiShiftCard";
import { ScheduleChairSingleShiftCard } from "./ScheduleChairSingleShiftCard";

export interface ScheduleChairDutySectionProps {
  chair: any;
  assignment?: ChairDoctorShiftAssignment | undefined;
  hasDoctor: boolean;
  isToday: boolean;
  currentHour: number;
  doctors: Array<any>;
  suggestedDoctor: any | null;
  isSoloDoctor: boolean;
  dateKey?: string | undefined;
  openAssignModal: (chairId: string) => void;
  handleConfirmAssignDoctor: (
    chairId: string,
    docId: string,
    shiftPreset: any,
    eveningDocId?: string,
  ) => void;
}

export function ScheduleChairDutySection({
  chair,
  assignment,
  hasDoctor,
  isToday,
  currentHour,
  doctors,
  suggestedDoctor,
  isSoloDoctor,
  dateKey,
  openAssignModal,
  handleConfirmAssignDoctor,
}: ScheduleChairDutySectionProps) {
  if (hasDoctor && assignment) {
    const subShifts = assignment.subShifts;
    const isMultiShift = Boolean(
      (subShifts && subShifts.length > 1) ||
      assignment.shiftPreset === "two_shifts",
    );

    if (isMultiShift) {
      return (
        <ScheduleChairMultiShiftCard
          chair={chair}
          assignment={assignment}
          isToday={isToday}
          currentHour={currentHour}
          openAssignModal={openAssignModal}
          handleConfirmAssignDoctor={handleConfirmAssignDoctor}
        />
      );
    }

    return (
      <ScheduleChairSingleShiftCard
        chair={chair}
        assignment={assignment}
        isToday={isToday}
        currentHour={currentHour}
        dateKey={dateKey}
        openAssignModal={openAssignModal}
        handleConfirmAssignDoctor={handleConfirmAssignDoctor}
      />
    );
  }

  // Unassigned chair: clear, consolidated single CTA with data-testid
  return (
    <div className="w-full flex flex-col gap-0.5">
      <div className="flex items-center gap-1 w-full min-w-0">
        <button
          type="button"
          onClick={() => openAssignModal(chair.id)}
          className="w-full px-2.5 py-1 rounded-lg border border-dashed border-[var(--teal)]/50 hover:border-[var(--teal)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between gap-1.5 text-xs font-semibold cursor-pointer transition-all shadow-2xs group"
          style={{
            minHeight: "32px",
            height: "32px",
            borderRadius: "8px",
            border: "1px dashed var(--teal, #0d9488)",
            background: "var(--paper)",
          }}
          title={`Назначить врача на кресло «${chair.name}»`}
          aria-label={`Назначить врача на кресло ${chair.name}`}
          data-testid={`btn-assign-doctor-${chair.id}`}
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <Plus
              size={13}
              className="shrink-0 text-[var(--teal)] group-hover:scale-110 transition-transform"
            />
            <span className="truncate font-semibold text-xs text-[var(--teal-dark,var(--teal))]">
              Назначить врача
            </span>
          </span>
          {/* Индикатор покрытия смен свободного кресла */}
          <span
            className="flex items-center gap-1 shrink-0 text-[10px] text-[var(--muted)] font-normal"
            data-testid={`chair-shift-strip-${chair.id}`}
          >
            <span
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)]"
              data-testid={`chair-status-morning-${chair.id}`}
              title="Утренняя смена (08:00–14:00): Свободно"
            >
              <Sun
                size={10}
                className="text-amber-500 shrink-0"
                aria-hidden="true"
              />
              <span className="text-[10px] font-semibold">Свободно</span>
            </span>
            <span
              className="sr-only"
              data-testid={`chair-status-evening-${chair.id}`}
              title="Вечерняя смена (14:00–20:00): Свободно"
            >
              Своб.
            </span>
          </span>
        </button>
      </div>
      {suggestedDoctor &&
        !isSoloDoctor &&
        doctors.length > 1 && (
          <button
            type="button"
            onClick={() =>
              handleConfirmAssignDoctor(
                chair.id,
                suggestedDoctor.id,
                "full",
              )
            }
            className="sr-only"
            title={`Быстро назначить: ${suggestedDoctor.fullName}`}
            data-testid={`btn-quick-assign-${chair.id}`}
          >
            <span>Назначить: {formatDoctorShortName(suggestedDoctor.fullName)}</span>
          </button>
        )}
    </div>
  );
}
