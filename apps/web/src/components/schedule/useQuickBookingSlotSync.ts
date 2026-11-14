import { useEffect, useMemo, useState } from "react";
import type { Appointment, DentalSpecialty } from "@dental/shared";
import { DEFAULT_SOLO_CHAIR } from "./grid/gridConstants";
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
  const initialValues = useMemo(() => {
    return resolveQuickBookingInitialValues({
      initialSlot,
      editingAppt,
      doctors,
      chairs,
      chairDoctorAssignments,
      isSoloClinic,
      toLocal,
    });
  }, [initialSlot, editingAppt, doctors, chairs, chairDoctorAssignments, isSoloClinic, toLocal]);

  const [doctorUserId, setDoctorUserId] = useState<string>(() => initialValues.initDoctor);
  const [assistantUserId, setAssistantUserId] = useState<string | null>(null);
  const [chairId, setChairId] = useState<string>(() => initialValues.initChair);
  const [startsAtLocal, setStartsAtLocal] = useState<string>(() => initialValues.initStartsAtLocal);
  const [durationMinutes, setDurationMinutes] = useState<number>(() => initialValues.initDuration);
  const [status, setStatus] = useState<Appointment["status"]>(() => initialValues.initStatus);
  const [reason, setReason] = useState<string>(() => initialValues.initReason);
  const [comment, setComment] = useState<string>(() => initialValues.initComment);
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
    setDoctorUserId(initialValues.initDoctor);
    setChairId(initialValues.initChair);
    setStartsAtLocal(initialValues.initStartsAtLocal);
    setDurationMinutes(initialValues.initDuration);
    setReason(initialValues.initReason);
    setComment(initialValues.initComment);
    setStatus(initialValues.initStatus);
    setSubmitError(null);
    setSlotConflict(null);
  }, [isOpen, initialValues]);

  return {
    doctorUserId, setDoctorUserId, assistantUserId, setAssistantUserId, chairId, setChairId,
    startsAtLocal, setStartsAtLocal, durationMinutes, setDurationMinutes, status, setStatus,
    reason, setReason, comment, setComment, submitError, setSubmitError, slotConflict, setSlotConflict,
    currentChair, dutyDoctorId, dutyDoctorHours, dutyDoc,
  };
}
