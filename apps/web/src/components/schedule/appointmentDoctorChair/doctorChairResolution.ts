import type { Dashboard } from "@dental/shared";
import { safeLocalStorageGetJson } from "../../../lib/safeLocalStorage";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export function checkDoctorOnShift(
  dId: string,
  dutyDoctorId: string | null,
  dutyDoc: { id: string; fullName: string } | null,
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment>,
): boolean {
  if (dId === dutyDoctorId || (dutyDoc && dutyDoc.id === dId)) return true;
  if (!chairDoctorAssignments) return false;
  return Object.values(chairDoctorAssignments).some((assignment) => {
    if (!assignment) return false;
    if (assignment.doctorId === dId) return true;
    if (assignment.subShifts?.some((s) => s.doctorId === dId)) return true;
    return false;
  });
}

export function resolveDoctorTargetChair(
  newDocId: string,
  doctors: Array<{ id: string; fullName: string; specialties?: string[] }>,
  chairs: Array<{ id: string; name: string; specialization?: string | null | undefined }>,
  dashboard: Dashboard,
  startsAtLocal: string,
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined,
): string | null {
  if (!newDocId) return null;

  const doc =
    doctors.find((d) => d.id === newDocId) ||
    dashboard?.clinicSettings?.staff?.find((s) => s.id === newDocId);

  // 1. Doctor's preferred chair
  if ((doc as any)?.preferredChairId) {
    const pref = chairs.find((c) => c.id === (doc as any).preferredChairId);
    if (pref) return pref.id;
  }
  if (typeof window !== "undefined") {
    const storedPref = safeLocalStorageGetJson<Record<string, string>>(
      "dente_doctor_preferred_chairs",
      {},
    );
    if (storedPref[newDocId]) {
      const pref = chairs.find((c) => c.id === storedPref[newDocId]);
      if (pref) return pref.id;
    }
  }

  // 2. Chair default doctor
  const def = chairs.find((c) => (c as any).defaultDoctorId === newDocId);
  if (def) return def.id;

  if (typeof window !== "undefined") {
    const storedChairDef = safeLocalStorageGetJson<Record<string, string>>(
      "dente_chair_default_doctors",
      {},
    );
    for (const [cId, dId] of Object.entries(storedChairDef)) {
      if (dId === newDocId) {
        const found = chairs.find((c) => c.id === cId);
        if (found) return found.id;
      }
    }
  }

  // 3. Duty chair on scheduled time
  const assignedChair = chairs.find((c) => {
    const duty = resolveChairDutyDoctor(
      c.id,
      startsAtLocal,
      chairDoctorAssignments,
      startsAtLocal ? startsAtLocal.slice(0, 10) : undefined,
    );
    return duty.doctorId === newDocId;
  });
  if (assignedChair) return assignedChair.id;

  // 4. Specialization match
  if (doc?.specialties?.length) {
    const matchingChair = chairs.find(
      (c) => c.specialization && doc.specialties?.includes(c.specialization),
    );
    if (matchingChair) return matchingChair.id;
  }

  return null;
}
