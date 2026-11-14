import type { Appointment } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "./grid/gridConstants";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";

export interface ResolveInitialSlotValuesParams {
  initialSlot: QuickBookingSlotInfo | null | undefined;
  editingAppt: Appointment | null;
  doctors: Array<{ id: string; fullName: string }>;
  chairs: any[];
  chairDoctorAssignments?: Record<string, any> | undefined;
  isSoloClinic: boolean;
  toLocal: (iso: string) => string;
}

export function resolveQuickBookingInitialValues({
  initialSlot,
  editingAppt,
  doctors,
  chairs,
  chairDoctorAssignments,
  isSoloClinic,
  toLocal,
}: ResolveInitialSlotValuesParams) {
  let initDoctor = editingAppt?.doctorUserId || initialSlot?.doctorUserId || "";
  let initChair = editingAppt?.chairId || initialSlot?.chairId || "";
  let initStartsAtLocal = "";

  if (editingAppt?.startsAt) {
    initStartsAtLocal = toLocal(editingAppt.startsAt);
  } else if (initialSlot?.startsAt) {
    initStartsAtLocal = toLocal(initialSlot.startsAt);
  } else if (initialSlot?.dateKey && initialSlot?.startTime) {
    initStartsAtLocal = `${initialSlot.dateKey}T${initialSlot.startTime.slice(0, 5)}`;
  } else {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    initStartsAtLocal = toLocal(now.toISOString());
  }

  let initDuration = 30;
  if (editingAppt?.startsAt && editingAppt?.endsAt) {
    const apptDuration = Math.round((new Date(editingAppt.endsAt).getTime() - new Date(editingAppt.startsAt).getTime()) / 60000);
    if (apptDuration > 0) initDuration = apptDuration;
  } else {
    initDuration =
      initialSlot?.durationMinutes ||
      initialSlot?.estimatedDurationMinutes ||
      (initialSlot?.services?.length ? Math.min(120, Math.max(30, initialSlot.services.length * 30)) : 30);
  }

  const initReason = editingAppt?.reason || initialSlot?.reason || initialSlot?.stageTitle || (initialSlot?.isCitoEmergency ? "Срочно! Острая боль" : "");
  const initComment = editingAppt?.comment || initialSlot?.comment || "";
  const initStatus: Appointment["status"] = editingAppt?.status || (initialSlot?.status as any) || (initialSlot?.isCitoEmergency ? "confirmed" : "planned");

  if (!initDoctor && initialSlot?.doctorName) {
    const m = doctors.find(
      (d) =>
        d.fullName.toLowerCase() === initialSlot.doctorName?.toLowerCase() ||
        d.fullName.includes(initialSlot.doctorName || "") ||
        (initialSlot.doctorName && d.fullName.toLowerCase().startsWith(initialSlot.doctorName.toLowerCase())),
    );
    if (m) initDoctor = m.id;
  }

  if (!initChair && chairs.length > 0) initChair = chairs[0]?.id || "";
  if (!initChair && chairs.length === 0) initChair = DEFAULT_SOLO_CHAIR.id;

  if (!initDoctor && initChair) {
    const chairObj = chairs.find((c) => c.id === initChair) || (initChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
    const duty = resolveChairDutyDoctor(
      initChair,
      initStartsAtLocal,
      chairDoctorAssignments,
      initStartsAtLocal.slice(0, 10),
      null,
      (chairObj as any)?.defaultDoctorId || (isSoloClinic && doctors[0] ? doctors[0].id : null),
    );
    if (duty.doctorId) initDoctor = duty.doctorId;
  }
  if (!initDoctor && doctors.length > 0) initDoctor = doctors[0]?.id || "";

  return { initDoctor, initChair, initStartsAtLocal, initDuration, initReason, initComment, initStatus };
}
