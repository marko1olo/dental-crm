import {
  type Appointment,
  type Dashboard,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  checkAppointmentResourceCollision,
  isCitoAppointment,
  type ResourceCollisionResult,
} from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import type { AppointmentModalProps } from "./AppointmentModalTypes";
import {
  type QUICK_APPOINTMENT_REASONS,
  type TECHNICAL_BREAK_PRESETS,
  isTechnicalBreakAppointment,
} from "./AppointmentModalQuickReasons";
import { resolveChairDutyDoctor } from "./QuickBookingDrawer";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import type { TargetSlotInfo } from "./WaitlistDrawer";
import { useAppointmentModalPatient } from "./useAppointmentModalPatient";

export function useAppointmentModalState(props: AppointmentModalProps) {
  const {
    isOpen,
    appointment,
    dashboard,
    onClose,
    onSave,
    patientName,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    chairDoctorAssignments,
    onQuickCreatePatient,
  } = props;

  const timezone =
    dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = useMemo(
    () =>
      staff.filter(
        (m) => m.active && (m.role === "doctor" || m.role === "owner"),
      ),
    [staff],
  );
  const assistants = useMemo(
    () => staff.filter((m) => m.active && m.role === "assistant"),
    [staff],
  );
  const chairs = useMemo(
    () => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active),
    [dashboard?.clinicSettings?.chairs],
  );
  const isSoloDoctor =
    dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
    dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
    (dashboard?.clinicSettings?.profile?.mode as string) === "solo_practice" ||
    (doctors.length <= 1 && chairs.length <= 1) ||
    doctors.length <= 1;

  const patientState = useAppointmentModalPatient({
    isOpen,
    initialPatientId: appointment?.patientId,
    dashboard,
    onQuickCreatePatient,
  });

  const {
    patientId,
    setPatientId,
    patientSearchQuery,
    setPatientSearchQuery,
    isInlineNewPatient,
    setIsInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    isCreatingInlinePatient,
    handleCreateInlinePatient,
    allDisplayPatients,
    activeLabOrders,
  } = patientState;

  const safeToDateTimeLocalValue = useCallback(
    (iso: string | null | undefined, tz?: string | null) => {
      if (!iso) return "";
      if (typeof toDateTimeLocalValue === "function") {
        return toDateTimeLocalValue(iso, tz);
      }
      return iso.length >= 16 ? iso.slice(0, 16) : iso;
    },
    [toDateTimeLocalValue],
  );

  const safeFromDateTimeLocalValue = useCallback(
    (val: string | null | undefined, tz?: string | null) => {
      if (!val) return "";
      if (typeof fromDateTimeLocalValue === "function") {
        return fromDateTimeLocalValue(val, tz);
      }
      return val.includes("T") && val.length === 16 ? `${val}:00.000Z` : val;
    },
    [fromDateTimeLocalValue],
  );

  const [doctorUserId, setDoctorUserId] = useState(
    () => appointment?.doctorUserId ?? "",
  );
  const [assistantUserId, setAssistantUserId] = useState<string | null>(
    () => appointment?.assistantUserId ?? null,
  );
  const [chairId, setChairId] = useState(() => appointment?.chairId ?? "");
  const [startsAtLocal, setStartsAtLocal] = useState(() =>
    appointment?.startsAt
      ? typeof toDateTimeLocalValue === "function"
        ? toDateTimeLocalValue(appointment.startsAt, timezone)
        : appointment.startsAt.slice(0, 16)
      : "",
  );
  const [endsAtLocal, setEndsAtLocal] = useState(() =>
    appointment?.endsAt
      ? typeof toDateTimeLocalValue === "function"
        ? toDateTimeLocalValue(appointment.endsAt, timezone)
        : appointment.endsAt.slice(0, 16)
      : "",
  );
  const [status, setStatus] = useState<Appointment["status"]>(
    () => appointment?.status ?? "planned",
  );
  const [reason, setReason] = useState(() => appointment?.reason ?? "");
  const [comment, setComment] = useState(() => appointment?.comment ?? "");
  const [isCito, setIsCito] = useState(() =>
    Boolean(
      (appointment as any)?.isCito ||
      (appointment as any)?.cito ||
      (appointment as any)?.tag === "cito" ||
      isCitoAppointment(appointment),
    ),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitlistDrawerOpen, setIsWaitlistDrawerOpen] = useState(false);
  const [waitlistTargetSlot, setWaitlistTargetSlot] =
    useState<TargetSlotInfo | null>(null);

  const handleOpenWaitlistForThisSlot = useCallback(() => {
    const doc = dashboard?.clinicSettings?.staff?.find(
      (s) => s.id === doctorUserId,
    );
    const chair = dashboard?.clinicSettings?.chairs?.find(
      (c) => c.id === chairId,
    );
    const pat = patientId
      ? patientName(dashboard?.patients ?? [], patientId)
      : null;
    const startsAtIso = startsAtLocal
      ? safeFromDateTimeLocalValue(startsAtLocal, timezone)
      : appointment?.startsAt || new Date().toISOString();
    const endsAtIso = endsAtLocal
      ? safeFromDateTimeLocalValue(endsAtLocal, timezone)
      : appointment?.endsAt || new Date().toISOString();

    const slotInfo: TargetSlotInfo = {
      appointmentId: appointment?.id,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      doctorUserId: doctorUserId || null,
      doctorName: doc?.fullName || (doc as any)?.name || null,
      chairId: chairId || null,
      chairName: chair?.name || null,
      patientId: patientId || null,
      patientName: pat,
      freedBecause:
        status === "cancelled" ? "Отмена приёма" : "Неявка пациента",
      reason: reason,
    };

    if (props.onOpenWaitlistForSlot) {
      props.onOpenWaitlistForSlot(slotInfo);
      onClose();
    } else {
      setWaitlistTargetSlot(slotInfo);
      setIsWaitlistDrawerOpen(true);
    }
  }, [
    appointment,
    chairId,
    dashboard,
    doctorUserId,
    endsAtLocal,
    onClose,
    patientId,
    patientName,
    props,
    reason,
    safeFromDateTimeLocalValue,
    startsAtLocal,
    status,
    timezone,
  ]);

  useEffect(() => {
    if (!appointment || !isOpen) return;
    let defaultDoc = appointment.doctorUserId || "";
    if (!defaultDoc && (appointment as any).doctorName) {
      const cand = String((appointment as any).doctorName)
        .trim()
        .toLowerCase();
      const m = doctors.find(
        (d) =>
          d.fullName.toLowerCase() === cand ||
          d.fullName.toLowerCase().includes(cand) ||
          cand.includes(d.fullName.toLowerCase()),
      );
      if (m) defaultDoc = m.id;
    }
    let defaultChair =
      appointment.chairId ||
      (isSoloDoctor && chairs[0] ? chairs[0].id : "") ||
      (chairs.length === 1 ? chairs[0]?.id : "") ||
      "";
    if (!defaultChair && defaultDoc) {
      const chairWithDoc = chairs.find(
        (c) => (c as any).defaultDoctorId === defaultDoc,
      );
      if (chairWithDoc) {
        defaultChair = chairWithDoc.id;
      } else {
        const doc = doctors.find((d) => d.id === defaultDoc);
        if (doc?.specialties?.length) {
          const matchingChair = chairs.find(
            (c) =>
              c.specialization && doc.specialties.includes(c.specialization),
          );
          if (matchingChair) {
            defaultChair = matchingChair.id;
          }
        }
      }
    }
    if (!defaultChair && chairs.length > 0) {
      defaultChair = chairs[0]?.id || "";
    }
    if (!defaultChair && chairs.length === 0) {
      defaultChair = DEFAULT_SOLO_CHAIR.id;
    }

    if (!defaultDoc && defaultChair) {
      const chairObj =
        chairs.find((c) => c.id === defaultChair) ||
        (defaultChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
      const duty = resolveChairDutyDoctor(
        defaultChair,
        appointment.startsAt,
        chairDoctorAssignments,
        appointment.startsAt ? appointment.startsAt.slice(0, 10) : undefined,
        null,
        (chairObj as any)?.defaultDoctorId ||
          (chairs.length <= 1 && doctors.length === 1 ? doctors[0]?.id : null),
      );
      if (duty.doctorId) {
        defaultDoc = duty.doctorId;
      }
    }
    if (!defaultDoc && defaultChair) {
      const chairObj = chairs.find((c) => c.id === defaultChair);
      if ((chairObj as any)?.defaultDoctorId) {
        defaultDoc = (chairObj as any).defaultDoctorId;
      }
    }
    if (!defaultDoc) {
      defaultDoc = doctors[0]?.id || "";
    }

    setPatientId(appointment.patientId ?? "");
    setPatientSearchQuery("");
    setIsInlineNewPatient(false);
    setNewPatientFullName("");
    setNewPatientPhone("");
    setDoctorUserId(defaultDoc);
    setAssistantUserId(appointment.assistantUserId ?? null);
    setChairId(defaultChair);
    setStartsAtLocal(safeToDateTimeLocalValue(appointment.startsAt, timezone));
    setEndsAtLocal(safeToDateTimeLocalValue(appointment.endsAt, timezone));
    setStatus(appointment.status || "planned");
    setReason(appointment.reason ?? "");
    setComment(appointment.comment ?? "");
    setIsCito(
      Boolean(
        (appointment as any)?.isCito ||
        (appointment as any)?.cito ||
        (appointment as any)?.tag === "cito" ||
        isCitoAppointment(appointment),
      ),
    );
    setError(null);
    setIsSaving(false);
  }, [
    appointment,
    isOpen,
    safeToDateTimeLocalValue,
    timezone,
    doctors,
    chairs,
    chairDoctorAssignments,
    isSoloDoctor,
    setPatientId,
    setPatientSearchQuery,
    setIsInlineNewPatient,
    setNewPatientFullName,
    setNewPatientPhone,
  ]);

  const currentChair = useMemo(() => {
    return (
      chairs.find((c) => c.id === chairId) ||
      (chairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null)
    );
  }, [chairs, chairId]);

  const dutyDoctorInfo = useMemo(() => {
    const effChair = chairId || appointment?.chairId;
    const effStartsAt =
      startsAtLocal ||
      (appointment?.startsAt
        ? safeToDateTimeLocalValue(appointment.startsAt, timezone)
        : "");
    const effChairObj =
      (effChair === chairId
        ? currentChair
        : chairs.find((c) => c.id === effChair)) ||
      (effChair === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
    return resolveChairDutyDoctor(
      effChair,
      effStartsAt,
      chairDoctorAssignments,
      effStartsAt ? effStartsAt.slice(0, 10) : undefined,
      null,
      (effChairObj as any)?.defaultDoctorId ||
        (chairs.length <= 1 && doctors.length === 1 ? doctors[0]?.id : null),
    );
  }, [
    chairId,
    startsAtLocal,
    chairDoctorAssignments,
    appointment,
    safeToDateTimeLocalValue,
    timezone,
    currentChair,
    chairs,
    doctors,
  ]);

  const dutyDoctorId = dutyDoctorInfo.doctorId;
  const dutyDocHours = dutyDoctorInfo.shiftHours;

  const dutyDoc = useMemo(() => {
    if (!dutyDoctorId) return null;
    return doctors.find((d) => d.id === dutyDoctorId) || null;
  }, [dutyDoctorId, doctors]);

  const hasOpenVisit = Boolean(
    (dashboard?.activeVisit &&
      appointment &&
      dashboard.activeVisit.appointmentId === appointment.id) ||
    (props as any).hasOpenVisit,
  );

  const collision = useMemo(() => {
    if (!appointment || !startsAtLocal || !endsAtLocal) {
      return {
        hasCollision: false,
        conflictType: null,
        conflictingAppointment: null,
        message: null,
        isCitoOverbooking: false,
      } satisfies ResourceCollisionResult;
    }
    const effectiveIsCito = Boolean(
      isCito ||
      (appointment as any)?.isCito ||
      (appointment as any)?.cito ||
      (appointment as any)?.tag === "cito" ||
      isCitoAppointment({ reason, comment }),
    );
    return checkAppointmentResourceCollision(
      {
        startsAt: safeFromDateTimeLocalValue(startsAtLocal, timezone),
        endsAt: safeFromDateTimeLocalValue(endsAtLocal, timezone),
        doctorUserId: doctorUserId || null,
        chairId: chairId || null,
        assistantUserId: assistantUserId || null,
        patientId: patientId || null,
        isCito: effectiveIsCito,
        reason,
      },
      dashboard?.appointments,
      {
        excludeAppointmentId: appointment.id,
        staff: dashboard?.clinicSettings?.staff,
        chairs: dashboard?.clinicSettings?.chairs,
        patients: dashboard?.patients,
        formatTimeFn: (iso) =>
          safeToDateTimeLocalValue(iso, timezone).slice(11, 16),
        isCito: effectiveIsCito,
        allowCitoOverbooking: effectiveIsCito,
      },
    );
  }, [
    appointment,
    startsAtLocal,
    endsAtLocal,
    doctorUserId,
    chairId,
    assistantUserId,
    patientId,
    reason,
    comment,
    isCito,
    fromDateTimeLocalValue,
    safeFromDateTimeLocalValue,
    safeToDateTimeLocalValue,
    timezone,
    dashboard?.appointments,
    dashboard?.clinicSettings?.staff,
    dashboard?.clinicSettings?.chairs,
    dashboard?.patients,
  ]);

  const currentDurationMinutes = useMemo(() => {
    if (!startsAtLocal || !endsAtLocal) return 0;
    try {
      const startMs = Date.parse(
        safeFromDateTimeLocalValue(startsAtLocal, timezone),
      );
      const endMs = Date.parse(
        safeFromDateTimeLocalValue(endsAtLocal, timezone),
      );
      if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return 0;
      return Math.round((endMs - startMs) / (60 * 1000));
    } catch {
      return 0;
    }
  }, [startsAtLocal, endsAtLocal, safeFromDateTimeLocalValue, timezone]);

  const applyDuration = useCallback(
    (minutes: number) => {
      let startVal = startsAtLocal;
      if (!startVal) {
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        startVal = safeToDateTimeLocalValue(now.toISOString(), timezone);
        setStartsAtLocal(startVal);
      }
      try {
        const startDate = new Date(
          safeFromDateTimeLocalValue(startVal, timezone),
        );
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
          setEndsAtLocal(
            safeToDateTimeLocalValue(endDate.toISOString(), timezone),
          );
        }
      } catch {
        // ignore parse error
      }
    },
    [
      startsAtLocal,
      safeFromDateTimeLocalValue,
      safeToDateTimeLocalValue,
      timezone,
    ],
  );

  const handleApplyReasonPreset = useCallback(
    (preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => {
      setReason(preset.reason);
      applyDuration(preset.durationMinutes);
      if (preset.tone === "emergency") {
        setIsCito(true);
      }
      if ("comment" in preset && preset.comment && !comment) {
        setComment(preset.comment);
      }
      if ("status" in preset && preset.status) {
        setStatus(preset.status);
      }
    },
    [applyDuration, comment],
  );

  const handleApplyTechnicalBreakPreset = useCallback(
    (preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => {
      setReason(preset.reason);
      applyDuration(preset.durationMinutes);
      setComment(preset.comment);
    },
    [applyDuration],
  );

  const handleApplyRefusalReason = useCallback((nameRu: string) => {
    const cancelTag = `[Отмена: ${nameRu}]`;
    setComment((prev) => {
      if (/\[Отмена:[^\]]*\]/.test(prev)) {
        return prev.replace(/\[Отмена:[^\]]*\]/, cancelTag);
      }
      return prev.trim() ? `${prev.trim()}\n${cancelTag}` : cancelTag;
    });
  }, []);

  const handleConvertToCito = useCallback(() => {
    setIsCito(true);
    const citoReason = "CITO! Острая боль";
    setReason((prev) => (prev ? `${citoReason} (${prev})` : citoReason));
    applyDuration(30);
    if (!comment.includes("CITO")) {
      setComment((prev) =>
        prev
          ? `${prev}\n[CITO: экстренное обращение с острой болью]`
          : "[CITO: экстренное обращение с острой болью]",
      );
    }
    if (status === "planned") {
      setStatus("confirmed");
    }
    showToast(
      "Приём переведён в CITO (Острая боль): 30 мин, овербукинг разрешён",
      "warning",
      3500,
    );
  }, [comment, status, applyDuration]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!appointment || isSaving) return;

    let effectivePatientId = patientId;
    if (
      isInlineNewPatient &&
      !effectivePatientId &&
      (newPatientFullName.trim() || newPatientPhone.trim())
    ) {
      const created = await handleCreateInlinePatient();
      if (created?.id) {
        effectivePatientId = created.id;
      }
    } else if (!effectivePatientId && patientSearchQuery.trim()) {
      const q = patientSearchQuery.trim();
      const isPhone = /^[0-9+()-\s]+$/.test(q);
      const created = await handleCreateInlinePatient({
        fullName: isPhone ? `Пациент (${q})` : q,
        phone: isPhone ? q : null,
      });
      if (created?.id) {
        effectivePatientId = created.id;
      }
    }

    const effectiveDoctorUserId =
      doctorUserId ||
      dutyDoctorId ||
      doctors[0]?.id ||
      (isSoloDoctor ? "doctor-solo" : "doctor-default");
    let effectiveChairId =
      chairId ||
      (isSoloDoctor && chairs[0] ? chairs[0].id : "") ||
      (chairs.length === 1 ? chairs[0]?.id : "") ||
      "";
    if (!effectiveChairId && effectiveDoctorUserId) {
      const doc = doctors.find((d) => d.id === effectiveDoctorUserId);
      if ((doc as any)?.preferredChairId) {
        const pref = chairs.find((c) => c.id === (doc as any).preferredChairId);
        if (pref) effectiveChairId = pref.id;
      }
      if (!effectiveChairId && doc?.specialties?.length) {
        const matchingChair = chairs.find(
          (c) => c.specialization && doc.specialties.includes(c.specialization),
        );
        if (matchingChair) {
          effectiveChairId = matchingChair.id;
        }
      }
    }
    if (!effectiveChairId) {
      effectiveChairId = chairs[0]?.id || DEFAULT_SOLO_CHAIR.id;
    }

    let effectiveStartsAt = startsAtLocal;
    let effectiveEndsAt = endsAtLocal;

    if (!effectiveStartsAt) {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      effectiveStartsAt = safeToDateTimeLocalValue(now.toISOString(), timezone);
      setStartsAtLocal(effectiveStartsAt);
    }

    if (effectiveStartsAt && !effectiveEndsAt) {
      const startIso = safeFromDateTimeLocalValue(effectiveStartsAt, timezone);
      const startMs = Date.parse(startIso);
      if (!Number.isNaN(startMs)) {
        const defaultEndIso = new Date(startMs + 30 * 60_000).toISOString();
        effectiveEndsAt = safeToDateTimeLocalValue(defaultEndIso, timezone);
        setEndsAtLocal(effectiveEndsAt);
      }
    }

    const isTechBreak = isTechnicalBreakAppointment({ reason, comment });
    if (!effectivePatientId && !isTechBreak) {
      if (isCito || isCitoAppointment({ reason, comment })) {
        const created = await handleCreateInlinePatient({
          fullName: "Пациент с острой болью (CITO)",
        });
        if (created?.id) {
          effectivePatientId = created.id;
        }
      } else {
        setError(
          "Укажите пациента: выберите из списка или создайте во вкладке «+ Новый пациент»",
        );
        return;
      }
    }

    const startsAtIso = safeFromDateTimeLocalValue(effectiveStartsAt, timezone);
    let endsAtIso = safeFromDateTimeLocalValue(effectiveEndsAt, timezone);

    if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
      const startMs = Date.parse(startsAtIso);
      const fixedEndIso = new Date(startMs + 30 * 60_000).toISOString();
      endsAtIso = fixedEndIso;
      setEndsAtLocal(safeToDateTimeLocalValue(fixedEndIso, timezone));
    }

    setIsSaving(true);
    setError(null);

    const success = await onSave(appointment.id, {
      patientId: effectivePatientId || null,
      doctorUserId: effectiveDoctorUserId,
      assistantUserId: isSoloDoctor ? null : assistantUserId?.trim() || null,
      chairId: effectiveChairId,
      startsAt: startsAtIso,
      endsAt: endsAtIso,
      status,
      reason,
      comment,
      isCito,
      cito: isCito,
    } as any);

    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return {
    timezone,
    doctors,
    assistants,
    chairs,
    isSoloDoctor,
    patientId,
    setPatientId,
    patientSearchQuery,
    setPatientSearchQuery,
    isInlineNewPatient,
    setIsInlineNewPatient,
    newPatientFullName,
    setNewPatientFullName,
    newPatientPhone,
    setNewPatientPhone,
    isCreatingInlinePatient,
    handleCreateInlinePatient,
    allDisplayPatients,
    safeToDateTimeLocalValue,
    safeFromDateTimeLocalValue,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    startsAtLocal,
    setStartsAtLocal,
    endsAtLocal,
    setEndsAtLocal,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    isCito,
    setIsCito,
    isSaving,
    error,
    isWaitlistDrawerOpen,
    setIsWaitlistDrawerOpen,
    waitlistTargetSlot,
    setWaitlistTargetSlot,
    handleOpenWaitlistForThisSlot,
    dutyDoctorId,
    dutyDocHours,
    dutyDoc,
    activeLabOrders,
    hasOpenVisit,
    collision,
    currentDurationMinutes,
    applyDuration,
    handleApplyReasonPreset,
    handleApplyTechnicalBreakPreset,
    handleApplyRefusalReason,
    handleConvertToCito,
    handleSave,
  };
}
