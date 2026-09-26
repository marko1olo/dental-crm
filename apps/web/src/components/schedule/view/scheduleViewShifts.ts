import type { DoctorShift } from "../roster/DoctorShiftRosterModal";
import type { ChairDoctorShiftAssignment } from "../grid/gridTypes";
import { formatDoctorShortName } from "../GridAppointmentCard";

export function buildChairDoctorAssignmentsFromShifts(
  shifts: DoctorShift[],
  targetDateKey: string,
): Record<string, ChairDoctorShiftAssignment> {
  const assignments: Record<string, ChairDoctorShiftAssignment> = {};
  const shiftsByChair: Record<string, DoctorShift[]> = {};

  for (const shift of shifts) {
    if (
      shift.dateIso === targetDateKey &&
      shift.chairId &&
      shift.doctorId &&
      shift.status !== "cancelled"
    ) {
      if (!shiftsByChair[shift.chairId]) {
        shiftsByChair[shift.chairId] = [];
      }
      shiftsByChair[shift.chairId]!.push(shift);
    }
  }

  for (const [chairId, chairShifts] of Object.entries(shiftsByChair)) {
    if (chairShifts.length === 0) continue;
    if (chairShifts.length === 1) {
      const s = chairShifts[0]!;
      const preset: "morning" | "evening" | "full" | "custom" =
        s.archetypeId === "morning_shift"
          ? "morning"
          : s.archetypeId === "evening_shift"
            ? "evening"
            : "custom";
      const hours = `${s.startTime}–${s.endTime}`;
      const sH = Number.parseInt(s.startTime.slice(0, 2), 10) || 8;
      const eH = Number.parseInt(s.endTime.slice(0, 2), 10) || 20;
      assignments[chairId] = {
        chairId,
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        doctorSpecialty: s.doctorRole,
        shiftPreset: preset,
        shiftLabel: s.customNotes || hours,
        shiftHours: hours,
        startHour: sH,
        endHour: eH,
        subShifts: [
          {
            doctorId: s.doctorId,
            doctorName: s.doctorName,
            doctorSpecialty: s.doctorRole,
            startHour: sH,
            endHour: eH,
            shiftHours: hours,
          },
        ],
      };
    } else {
      const sorted = [...chairShifts].sort((a, b) =>
        a.startTime.localeCompare(b.startTime),
      );
      const primary = sorted[0]!;
      const subShifts = sorted.map((s) => ({
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        doctorSpecialty: s.doctorRole,
        startHour: Number.parseInt(s.startTime.slice(0, 2), 10) || 8,
        endHour: Number.parseInt(s.endTime.slice(0, 2), 10) || 20,
        shiftHours: `${s.startTime}–${s.endTime}`,
      }));
      const shortNamesComposite = sorted
        .map(
          (s) =>
            `${s.startTime.slice(0, 2)}–${s.endTime.slice(0, 2)}: ${formatDoctorShortName(s.doctorName)}`,
        )
        .join(" / ");
      const hoursComposite = sorted
        .map((s) => `${s.startTime}–${s.endTime}`)
        .join(" & ");

      assignments[chairId] = {
        chairId,
        doctorId: primary.doctorId,
        doctorName: sorted.map((s) => s.doctorName).join(" / "),
        doctorSpecialty: primary.doctorRole,
        shiftPreset: "custom",
        shiftLabel: shortNamesComposite,
        shiftHours: hoursComposite,
        startHour: subShifts[0]!.startHour,
        endHour: subShifts[subShifts.length - 1]!.endHour,
        subShifts,
      };
    }
  }

  return assignments;
}

export function buildChairDoctorAssignmentsByDate(
  shifts: DoctorShift[],
): Record<string, Record<string, ChairDoctorShiftAssignment>> {
  const dates = new Set<string>();
  for (const s of shifts) {
    if (s.dateIso && s.chairId && s.doctorId && s.status !== "cancelled") {
      dates.add(s.dateIso);
    }
  }
  const result: Record<string, Record<string, ChairDoctorShiftAssignment>> = {};
  for (const dateIso of dates) {
    result[dateIso] = buildChairDoctorAssignmentsFromShifts(shifts, dateIso);
  }
  return result;
}
