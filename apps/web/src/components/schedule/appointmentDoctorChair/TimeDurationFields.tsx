import React from "react";
import { Clock, Zap } from "lucide-react";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";
import { DurationPillsRow } from "./DurationPillsRow";

export function TimeDurationFields({
  startsAtLocal,
  setStartsAtLocal,
  endsAtLocal,
  setEndsAtLocal,
  currentDurationMinutes,
  applyDuration,
  chairId,
  doctorUserId,
  dutyDoctorId,
  setDoctorUserId,
  chairDoctorAssignments,
}: {
  startsAtLocal: string;
  setStartsAtLocal: (val: string) => void;
  endsAtLocal: string;
  setEndsAtLocal: (val: string) => void;
  currentDurationMinutes: number;
  applyDuration: (minutes: number) => void;
  chairId: string;
  doctorUserId: string;
  dutyDoctorId: string | null;
  setDoctorUserId: (id: string) => void;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
}) {
  return (
    <>
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <Clock size={13} className="text-[var(--teal)]" />
          <span>Начало *</span>
        </label>
        <input
          type="datetime-local"
          value={startsAtLocal}
          onChange={(e) => {
            const nextVal = e.target.value;
            setStartsAtLocal(nextVal);
            if (chairId && nextVal) {
              const newDuty = resolveChairDutyDoctor(
                chairId,
                nextVal,
                chairDoctorAssignments,
                nextVal.slice(0, 10),
              );
              if (newDuty.doctorId && (!doctorUserId || doctorUserId === dutyDoctorId)) {
                setDoctorUserId(newDuty.doctorId);
              }
            }
          }}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
          <Clock size={13} className="text-[var(--teal)]" />
          <span>Окончание *</span>
        </label>
        <input
          type="datetime-local"
          value={endsAtLocal}
          onChange={(e) => setEndsAtLocal(e.target.value)}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] font-medium"
        />
      </div>

      <div className="sm:col-span-2">
        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
            <Zap size={13} className="text-[var(--teal)]" />
            <span>Длительность приёма (Быстрый выбор длительности):</span>
          </label>
          <div className="flex items-center gap-2">
            {currentDurationMinutes > 0 && (
              <span className="text-xs font-mono font-bold text-[var(--teal)]">
                {currentDurationMinutes} мин
              </span>
            )}
            <div className="flex items-center gap-1.5 bg-[var(--paper-soft)] px-2 py-0.5 rounded-lg border border-[var(--line)]">
              <span className="text-[11px] text-[var(--muted)] font-medium">Своя:</span>
              <input
                type="number"
                min="5"
                max="720"
                step="5"
                placeholder="мин"
                value={currentDurationMinutes > 0 ? currentDurationMinutes : ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) applyDuration(val);
                }}
                className="text-xs text-center font-bold font-mono rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-strong)] focus:ring-1 focus:ring-[var(--teal)] outline-none w-14 h-6 px-1"
                data-testid="appointment-custom-duration-input"
                title="Произвольная длительность приёма в минутах"
              />
              <span className="text-[11px] text-[var(--muted)]">мин</span>
            </div>
          </div>
        </div>
        <DurationPillsRow currentDurationMinutes={currentDurationMinutes} applyDuration={applyDuration} />
      </div>
    </>
  );
}
