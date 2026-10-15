import type { Dashboard, DentalSpecialty } from "@dental/shared";
import { useMemo } from "react";

export function useQuickBookingStaff(dashboard?: Dashboard | null) {
  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = useMemo(
    () => staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner" || (m as any).role === "chief_doctor")) as Array<{ id: string; fullName: string; role?: string; specialties?: DentalSpecialty[] }>,
    [staff],
  );
  const assistants = useMemo(() => staff.filter((m) => m.active && m.role === "assistant"), [staff]);
  const chairs = useMemo(() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active), [dashboard?.clinicSettings?.chairs]);
  const isSoloClinic = dashboard?.clinicSettings?.profile?.mode === "solo_doctor" || dashboard?.clinicSettings?.profile?.mode === "one_chair" || (doctors.length <= 1 && chairs.length <= 1);

  return { staff, doctors, assistants, chairs, isSoloClinic };
}
