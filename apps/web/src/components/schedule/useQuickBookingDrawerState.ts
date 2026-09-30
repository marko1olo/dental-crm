import type { Appointment, Dashboard, DentalSpecialty, Patient } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";
import { normalizePhoneToNational } from "../../utils/patientSearchUtils";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { showToast } from "../GlobalToast";
import {
  safeLocalStorageSetJson,
  safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { DEFAULT_SOLO_CHAIR } from "./ScheduleGrid";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import type { QuickBookingDrawerProps } from "./QuickBookingDrawerTypes";
import { useQuickBookingPatientSearch } from "./useQuickBookingPatientSearch";

export function useQuickBookingDrawerState(props: QuickBookingDrawerProps) {
  const {
    isOpen,
    onClose,
    initialSlot,
    dashboard,
    auth,
    onAppointmentCreated,
    loadDashboard,
    setDashboard,
    toDateTimeLocalValue,
    fromDateTimeLocalValue,
    chairDoctorAssignments,
  } = props;

  const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

  const toLocal = useCallback(
    (iso: string) => {
      if (typeof toDateTimeLocalValue === "function") {
        return toDateTimeLocalValue(iso, timezone);
      }
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return "";
      return parsed.toISOString().slice(0, 16);
    },
    [toDateTimeLocalValue, timezone],
  );

  const fromLocal = useCallback(
    (local: string) => {
      if (typeof fromDateTimeLocalValue === "function") {
        return fromDateTimeLocalValue(local, timezone);
      }
      if (!local) return new Date().toISOString();
      const withZ = local.includes("Z") ? local : `${local}:00.000Z`;
      const parsed = new Date(withZ);
      if (Number.isNaN(parsed.getTime())) {
        const fallback = new Date(local);
        return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
      }
      return parsed.toISOString();
    },
    [fromDateTimeLocalValue, timezone],
  );

  const [appointmentType, setAppointmentType] =
    useState<QuickBookingAppointmentType>(() => {
      if (
        initialSlot?.isCitoEmergency ||
        initialSlot?.reason?.includes("CITO") ||
        initialSlot?.reason?.includes("Острая боль")
      ) {
        return "emergency";
      }
      if (
        initialSlot?.reason?.includes("Первичн") ||
        initialSlot?.reason?.includes("Консультация")
      ) {
        return "primary";
      }
      if (initialSlot?.reason) {
        return "secondary";
      }
      return "primary";
    });

  const initialMatchedPatient = useMemo(() => {
    if (initialSlot?.patientId && dashboard?.patients) {
      return dashboard.patients.find((p) => p.id === initialSlot.patientId) || null;
    }
    if (initialSlot?.patientName && dashboard?.patients) {
      const candidate = initialSlot.patientName.trim().toLowerCase();
      return (
        dashboard.patients.find(
          (p) => p.status === "active" && p.fullName.toLowerCase() === candidate,
        ) || null
      );
    }
    return null;
  }, [initialSlot?.patientId, initialSlot?.patientName, dashboard?.patients]);

  const patientSearch = useQuickBookingPatientSearch({
    dashboard,
    initialSlot,
    initialMatchedPatient,
    setDashboard,
    isOpen,
  });

  const staff = dashboard?.clinicSettings?.staff ?? [];
  const doctors = useMemo(
    () =>
      staff.filter(
        (m) =>
          m.active &&
          (m.role === "doctor" || m.role === "owner" || (m as any).role === "chief_doctor"),
      ) as Array<{ id: string; fullName: string; role?: string; specialties?: DentalSpecialty[] }>,
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
  const isSoloClinic =
    dashboard?.clinicSettings?.profile?.mode === "solo_doctor" ||
    dashboard?.clinicSettings?.profile?.mode === "one_chair" ||
    (doctors.length <= 1 && chairs.length <= 1);

  const [doctorUserId, setDoctorUserId] = useState<string>("");
  const [assistantUserId, setAssistantUserId] = useState<string | null>(null);
  const [chairId, setChairId] = useState<string>("");
  const [startsAtLocal, setStartsAtLocal] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [status, setStatus] = useState<Appointment["status"]>("planned");
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Synchronize slot inputs when drawer opens or initialSlot changes
  useEffect(() => {
    if (!isOpen) return;

    let initDoctor = initialSlot?.doctorUserId || "";
    if (!initDoctor && initialSlot?.doctorName) {
      const m = doctors.find(
        (d) =>
          d.fullName.toLowerCase() === initialSlot.doctorName?.toLowerCase() ||
          d.fullName.includes(initialSlot.doctorName || "") ||
          (initialSlot.doctorName && d.fullName.toLowerCase().startsWith(initialSlot.doctorName.toLowerCase())),
      );
      if (m) initDoctor = m.id;
    }
    let initChair = initialSlot?.chairId || "";
    let initStartsAtLocal = "";

    if (initialSlot?.startsAt) {
      initStartsAtLocal = toLocal(initialSlot.startsAt);
    } else if (initialSlot?.dateKey && initialSlot?.startTime) {
      initStartsAtLocal = `${initialSlot.dateKey}T${initialSlot.startTime.slice(0, 5)}`;
    } else {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      initStartsAtLocal = toLocal(now.toISOString());
    }

    if (!initChair && chairs.length > 0) {
      initChair = chairs[0]?.id || "";
    }
    if (!initChair && chairs.length === 0) {
      initChair = DEFAULT_SOLO_CHAIR.id;
    }

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
      if (duty.doctorId) {
        initDoctor = duty.doctorId;
      }
    }
    if (!initDoctor && doctors.length > 0) {
      initDoctor = doctors[0]?.id || "";
    }

    setDoctorUserId(initDoctor);
    setChairId(initChair);
    setStartsAtLocal(initStartsAtLocal);
    setDurationMinutes(initialSlot?.durationMinutes || 30);
    setReason(initialSlot?.reason || "");
    setComment("");
    setStatus(initialSlot?.isCitoEmergency ? "confirmed" : "planned");

    setSubmitError(null);
    setSlotConflict(null);
  }, [
    isOpen,
    initialSlot,
    doctors,
    chairs,
    chairDoctorAssignments,
    toLocal,
  ]);

  const collision = useMemo(() => {
    if (!startsAtLocal) {
      return {
        hasCollision: false,
        conflictType: null,
        conflictingAppointment: null,
        message: null,
      };
    }
    const startsAtIso = fromLocal(startsAtLocal);
    const startMs = Date.parse(startsAtIso);
    const endsAtIso = new Date(startMs + durationMinutes * 60_000).toISOString();

    return checkAppointmentResourceCollision(
      {
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        doctorUserId: doctorUserId || null,
        chairId: chairId || null,
        assistantUserId: assistantUserId || null,
        patientId: patientSearch.patientId || null,
        isCito: appointmentType === "emergency",
        reason,
      },
      dashboard?.appointments,
      {
        staff: dashboard?.clinicSettings?.staff,
        chairs: dashboard?.clinicSettings?.chairs,
        patients: dashboard?.patients,
        formatTimeFn: (iso) => toLocal(iso).slice(11, 16),
        isCito: appointmentType === "emergency",
        allowCitoOverbooking: appointmentType === "emergency",
      },
    );
  }, [
    startsAtLocal,
    durationMinutes,
    doctorUserId,
    chairId,
    assistantUserId,
    patientSearch.patientId,
    appointmentType,
    reason,
    fromLocal,
    toLocal,
    dashboard?.appointments,
    dashboard?.clinicSettings?.staff,
    dashboard?.clinicSettings?.chairs,
    dashboard?.patients,
  ]);

  const handleSelectAppointmentType = useCallback(
    (type: QuickBookingAppointmentType) => {
      setAppointmentType(type);
      if (type === "emergency") {
        setDurationMinutes(30);
        setStatus("confirmed");
        if (!reason.includes("CITO")) {
          setReason((prev) => (prev ? `CITO! ${prev}` : "CITO! Острая боль"));
        }
      } else if (type === "primary") {
        setDurationMinutes(30);
        if (!reason) setReason("Первичный осмотр");
      } else if (type === "secondary") {
        setDurationMinutes(60);
      }
    },
    [reason],
  );

  const handleSelectDuration = useCallback((mins: number) => {
    setDurationMinutes(mins);
  }, []);

  const isDirty = useMemo(() => {
    if (comment.trim().length > 0) return true;
    if (
      patientSearch.newPatientFullName.trim().length > 0 ||
      patientSearch.newPatientPhone.trim().length > 0
    ) {
      return true;
    }
    if (
      patientSearch.patientId &&
      patientSearch.patientId !== (initialSlot?.patientId || "")
    ) {
      return true;
    }
    if (
      patientSearch.searchQuery.trim().length > 0 &&
      patientSearch.searchQuery.trim() !== (initialSlot?.patientName || initialSlot?.patientPhone || "")
    ) {
      return true;
    }
    if (initialSlot?.patientPhone && patientSearch.newPatientPhone.trim().length > 0) {
      return true;
    }
    const initialReason =
      initialSlot?.reason ||
      (initialSlot?.isCitoEmergency ? "CITO! Острая боль" : "Первичный осмотр");
    if (reason.trim() !== initialReason.trim()) return true;
    return false;
  }, [
    comment,
    patientSearch.newPatientFullName,
    patientSearch.newPatientPhone,
    patientSearch.patientId,
    patientSearch.searchQuery,
    initialSlot,
    reason,
  ]);

  const handleSaveDraftAndClose = useCallback(() => {
    try {
      const draftData = {
        appointmentType,
        patientId: patientSearch.patientId,
        selectedPatient: patientSearch.selectedPatient,
        doctorUserId,
        assistantUserId,
        chairId,
        startsAtLocal,
        durationMinutes,
        reason,
        comment,
        savedAt: new Date().toISOString(),
      };
      safeLocalStorageSetJson("dente_quick_booking_draft", draftData, true);
      showToast("Черновик записи сохранен", "info");
    } catch {}
    onClose();
  }, [
    appointmentType,
    patientSearch.patientId,
    patientSearch.selectedPatient,
    doctorUserId,
    assistantUserId,
    chairId,
    startsAtLocal,
    durationMinutes,
    reason,
    comment,
    onClose,
  ]);

  const handleDiscardDraftAndClose = useCallback(() => {
    safeLocalStorageRemoveItem("dente_quick_booking_draft");
    onClose();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      handleSaveDraftAndClose();
    } else {
      onClose();
    }
  }, [isDirty, handleSaveDraftAndClose, onClose]);

  const handleSubmitBooking = async (
    e?: React.FormEvent,
    opts?: { overbookOverride?: boolean },
  ) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    let activePatientId = patientSearch.patientId;

    if (!activePatientId) {
      const rawName = patientSearch.newPatientFullName.trim();
      const rawPhone =
        patientSearch.newPatientPhone.trim() ||
        (/^[0-9+()-\s]+$/.test(patientSearch.searchQuery.trim()) ? patientSearch.searchQuery.trim() : "");
      const fallbackName =
        rawName ||
        (rawPhone ? `Пациент (${rawPhone})` : "") ||
        patientSearch.searchQuery.trim() ||
        (appointmentType === "emergency" ? "Пациент с острой болью (CITO)" : "");

      if (fallbackName) {
        setIsSubmitting(true);
        try {
          const cleanPhone = rawPhone ? normalizePhoneToNational(rawPhone) : null;
          let inlinePat: Patient | null = null;
          try {
            const resp = await fetch("/api/patients", {
              method: "POST",
              headers: denteAdminSecretRequestHeaders({
                "Content-Type": "application/json",
              }),
              body: JSON.stringify({
                fullName: fallbackName,
                phone: rawPhone || null,
                birthDate: patientSearch.newPatientBirthDate.trim() || null,
              }),
            });
            if (resp.ok) {
              const body = await resp.json();
              inlinePat = body.patient || body;
            }
          } catch {}

          if (!inlinePat || !inlinePat.id) {
            inlinePat = {
              id: `pat-${Date.now()}`,
              fullName: fallbackName,
              phone: cleanPhone || rawPhone || null,
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as Patient;
          }

          activePatientId = inlinePat.id;
          patientSearch.setSelectedPatient(inlinePat);
          patientSearch.setPatientId(inlinePat.id);
        } catch {}
      }
    }

    if (!activePatientId && appointmentType !== "emergency") {
      const msg = "Укажите пациента из списка или создайте быстрого пациента (ФИО + телефон)";
      setSubmitError(msg);
      showToast(msg, "warning");
      return;
    }

    const effDoctor = doctorUserId || dutyDoctorId || doctors[0]?.id || "doctor-default";
    const effChair = chairId || (chairs[0] ? chairs[0].id : DEFAULT_SOLO_CHAIR.id);

    let startsAtIso: string;
    if (startsAtLocal) {
      startsAtIso = fromLocal(startsAtLocal);
    } else {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      startsAtIso = now.toISOString();
    }

    const startMs = Date.parse(startsAtIso);
    const endsAtIso = new Date(startMs + durationMinutes * 60_000).toISOString();

    const isEmergency = appointmentType === "emergency";
    const effectiveReason = reason.trim() || (isEmergency ? "CITO! Острая боль" : "Приём врача");

    if (collision.hasCollision && !isEmergency && !opts?.overbookOverride) {
      setSlotConflict({
        message: collision.message,
        suggestedSlots: collision.suggestedSlot ? [collision.suggestedSlot] : [],
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        patientId: activePatientId || null,
        doctorUserId: effDoctor,
        assistantUserId: isSoloClinic ? null : assistantUserId || null,
        chairId: effChair,
        startsAt: startsAtIso,
        endsAt: endsAtIso,
        status,
        reason: effectiveReason,
        comment: comment.trim(),
        isCito: isEmergency,
        cito: isEmergency,
      };

      const result = await fetchWithHandling<{
        appointment?: Appointment;
        appointments?: Appointment[];
        dashboard?: Dashboard;
      }>("/api/appointments", {
        method: "POST",
        headers: denteAdminSecretRequestHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });

      if (!result.success) {
        actionFailureToast(
          result.error?.message || "Ошибка создания записи на сервере",
          "quick_booking_submit",
        );
        setSubmitError(result.error?.message || "Ошибка при создании записи");
        return;
      }

      if (typeof loadDashboard === "function") {
        await loadDashboard();
      }

      const nextDashboard = result.data?.dashboard;
      const patientName =
        patientSearch.selectedPatient?.fullName ||
        patientSearch.newPatientFullName.trim() ||
        (patientSearch.newPatientPhone.trim() ? `Пациент (${patientSearch.newPatientPhone.trim()})` : "") ||
        patientSearch.searchQuery.trim() ||
        "Пациент";
      const timeLabel = startsAtLocal.slice(11, 16);
      showToast(`Запись для «${patientName}» создана на ${timeLabel}!`, "success", 5000);

      if (typeof onAppointmentCreated === "function" && nextDashboard?.appointments) {
        const created = nextDashboard.appointments.find(
          (a) =>
            (a.patientId === activePatientId || a.patientId === patientSearch.patientId) &&
            a.startsAt === startsAtIso,
        );
        if (created) onAppointmentCreated(created);
      }

      safeLocalStorageRemoveItem("dente_quick_booking_draft");
      onClose();
    } catch (err) {
      logger.error("Quick booking submission failed", err);
      const msg = "Не удалось связаться с сервером клиники. Повторите попытку.";
      setSubmitError(msg);
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyBookingConfirmation = async () => {
    const candidateName =
      patientSearch.newPatientFullName.trim() ||
      (patientSearch.newPatientPhone.trim()
        ? `Пациент (${patientSearch.newPatientPhone.trim()})`
        : "") ||
      patientSearch.searchQuery.trim() ||
      (appointmentType === "emergency" ? "Пациент с острой болью (CITO)" : "");

    const patientName = patientSearch.selectedPatient?.fullName || candidateName || "Пациент";

    let formattedDate = "";
    let formattedTime = "";
    if (startsAtLocal) {
      const [dPart, tPart] = startsAtLocal.split("T");
      if (dPart) {
        const parts = dPart.split("-");
        if (parts.length === 3) {
          formattedDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
        } else {
          formattedDate = dPart;
        }
      }
      if (tPart) {
        formattedTime = tPart.slice(0, 5);
      }
    }
    if (!formattedDate) {
      try {
        formattedDate = new Date().toLocaleDateString("ru-RU");
      } catch {
        formattedDate = "01.01.2026";
      }
    }
    if (!formattedTime) {
      formattedTime = "10:00";
    }

    const clinicName =
      dashboard?.clinicSettings?.profile?.clinicName ||
      dashboard?.clinicSettings?.profile?.legalName ||
      "ДЕНТЕ";
    const clinicAddress =
      dashboard?.clinicSettings?.profile?.address || "г. Москва";
    const clinicPhone = dashboard?.clinicSettings?.profile?.phone || "";

    const selectedDoc = doctors.find((d) => d.id === doctorUserId) || dutyDoc;
    const doctorName = selectedDoc?.fullName || "Врач клиники";

    const selectedChair = chairs.find((c) => c.id === chairId) || currentChair;
    const chairName = selectedChair?.name || "Основное кресло";

    const text = [
      `Запись на приём в клинику «${clinicName}»:`,
      `Пациент: ${patientName}`,
      `Дата и время: ${formattedDate}, ${formattedTime} (${durationMinutes} мин)`,
      `Врач: ${doctorName}`,
      `Кабинет / кресло: ${chairName}`,
      `Адрес клиники: ${clinicAddress}`,
      ...(clinicPhone ? [`Телефон для справок: ${clinicPhone}`] : []),
      "Пожалуйста, приходите за 10 минут до начала приёма.",
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      logger.warn("Clipboard writeText failed or not permitted", err);
    }

    showToast("Детали записи скопированы в буфер обмена для отправки пациенту", "success");
  };

  return {
    timezone,
    toLocal,
    fromLocal,
    appointmentType,
    setAppointmentType,
    handleSelectAppointmentType,
    selectedPatient: patientSearch.selectedPatient,
    setSelectedPatient: patientSearch.setSelectedPatient,
    patientId: patientSearch.patientId,
    setPatientId: patientSearch.setPatientId,
    searchQuery: patientSearch.searchQuery,
    setSearchQuery: patientSearch.setSearchQuery,
    isTypeaheadOpen: patientSearch.isTypeaheadOpen,
    setIsTypeaheadOpen: patientSearch.setIsTypeaheadOpen,
    highlightedIndex: patientSearch.highlightedIndex,
    setHighlightedIndex: patientSearch.setHighlightedIndex,
    searchResults: patientSearch.searchResults,
    selectPatient: patientSearch.selectPatient,
    searchInputRef: patientSearch.searchInputRef,
    newPatientFullNameInputRef: patientSearch.newPatientFullNameInputRef,
    focusTimerRef: patientSearch.focusTimerRef,
    showInlineNewPatient: patientSearch.showInlineNewPatient,
    setShowInlineNewPatient: patientSearch.setShowInlineNewPatient,
    newPatientFullName: patientSearch.newPatientFullName,
    setNewPatientFullName: patientSearch.setNewPatientFullName,
    newPatientPhone: patientSearch.newPatientPhone,
    setNewPatientPhone: patientSearch.setNewPatientPhone,
    newPatientBirthDate: patientSearch.newPatientBirthDate,
    setNewPatientBirthDate: patientSearch.setNewPatientBirthDate,
    isCreatingPatient: patientSearch.isCreatingPatient,
    handleCreateInlinePatient: patientSearch.handleCreateInlinePatient,
    potentialDuplicates: patientSearch.potentialDuplicates,
    patientReliability: patientSearch.patientReliability,
    hasActivePatientVisit: patientSearch.hasActivePatientVisit,
    staff,
    doctors,
    assistants,
    chairs,
    isSoloClinic,
    currentChair,
    doctorUserId,
    setDoctorUserId,
    assistantUserId,
    setAssistantUserId,
    chairId,
    setChairId,
    startsAtLocal,
    setStartsAtLocal,
    durationMinutes,
    setDurationMinutes,
    handleSelectDuration,
    status,
    setStatus,
    reason,
    setReason,
    comment,
    setComment,
    isSubmitting,
    submitError,
    slotConflict,
    setSlotConflict,
    dutyDoctorId,
    dutyDoctorHours,
    dutyDoc,
    collision,
    isDirty,
    handleSaveDraftAndClose,
    handleDiscardDraftAndClose,
    handleRequestClose,
    handleSubmitBooking,
    handleCopyBookingConfirmation,
  };
}
