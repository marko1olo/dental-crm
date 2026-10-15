import { useEffect, useMemo, useState } from "react";
import type { Appointment, DentalSpecialty } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";
import { resolveQuickBookingInitialValues } from "./quickBookingSlotMath";

export interface UseQuickBookingSlotSyncParams {
  isOpen: boolean;
  initialSlot: QuickBookingSlotInfo | null | undefined;
  editingAppt: Appointment | null;
  doctors: Array<{ id: string; fullName: string; role?: string; specialties?: DentalSpecialty[] }>;
  chairs: any[];
  chairDoctorAssignments?: Record<string, any> | undefined;
  isSoloClinic: boolean;
  toLocal: (iso: string) => string;
}

export function useQuickBookingSlotSync({
  isOpen,
  initialSlot,
  editingAppt,
  doctors,
  chairs,
  chairDoctorAssignments,
  isSoloClinic,
  toLocal,
}: UseQuickBookingSlotSyncParams) {
  const [doctorUserId, setDoctorUserId] = useState<string>("");
  const [assistantUserId, setAssistantUserId] = useState<string | null>(null);
  const [chairId, setChairId] = useState<string>("");
  const [startsAtLocal, setStartsAtLocal] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [status, setStatus] = useState<Appointment["status"]>("planned");
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotConflict, setSlotConflict] = useState<any>(null);

  const currentChair = useMemo(() => {
    return chairs.find((c) => c.id === chairId) || (chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
  }, [chairs, chairId]);

  const dutyDoctorInfo = useMemo(() => {
    const effChair = chairId || initialSlot?.chairId;
    const effStartsAt = startsAtLocal;
    const effChairObj = effChair === chairId ? currentChair : chairs.find((c) => c.id === effChair);
    return resolveChairDutyDoctor(
      effChair,
      effStartsAt,
      chairDoctorAssignments,
      effStartsAt ? effStartsAt.slice(0, 10) : undefined,
      initialSlot?.chairId === effChair ? initialSlot?.doctorUserId : null,
      (effChairObj as any)?.defaultDoctorId || (isSoloClinic && doctors[0] ? doctors[0].id : null),
    );
  }, [chairId, startsAtLocal, chairDoctorAssignments, initialSlot, currentChair, chairs, doctors, isSoloClinic]);

  const dutyDoctorId = dutyDoctorInfo.doctorId;
  const dutyDoctorHours = dutyDoctorInfo.shiftHours;

  const dutyDoc = useMemo(() => {
    if (!dutyDoctorId) return null;
    return doctors.find((d) => d.id === dutyDoctorId) || null;
  }, [dutyDoctorId, doctors]);

  useEffect(() => {
    if (!isOpen) return;
    const { initDoctor, initChair, initStartsAtLocal, initDuration, initReason, initComment, initStatus } =
      resolveQuickBookingInitialValues({ initialSlot, editingAppt, doctors, chairs, chairDoctorAssignments, isSoloClinic, toLocal });

    setDoctorUserId(initDoctor);
    setChairId(initChair);
    setStartsAtLocal(initStartsAtLocal);
    setDurationMinutes(initDuration);
    setReason(initReason);
    setComment(initComment);
    setStatus(initStatus);
    setSubmitError(null);
    setSlotConflict(null);
  }, [isOpen, initialSlot, editingAppt, doctors, chairs, chairDoctorAssignments, toLocal, isSoloClinic]);

  return {
    doctorUserId, setDoctorUserId, assistantUserId, setAssistantUserId, chairId, setChairId,
    startsAtLocal, setStartsAtLocal, durationMinutes, setDurationMinutes, status, setStatus,
    reason, setReason, comment, setComment, submitError, setSubmitError, slotConflict, setSlotConflict,
    currentChair, dutyDoctorId, dutyDoctorHours, dutyDoc,
  };
}
