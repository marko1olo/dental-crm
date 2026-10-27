import { useState } from "react";
import type { Appointment, Dashboard, Patient, StaffMember } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { usePatientStore } from "../../../store/patientStore";
import { useAppStore } from "../../../store/appStore";
import {
  getDoctorSpecialtyTheme,
  formatRussianAge,
} from "../appointmentCardHelpers";

export function useScheduleInspectorState(
  a: Appointment,
  patientLookupMap: Map<string, Patient>,
  staffLookupMap: Map<string, StaffMember>,
  dashboard?: Dashboard | null,
  timezone: string = "Europe/Moscow",
  toDateTimeLocalValue?: (iso: string, tz?: string | null) => string,
  onOpenVisit?: (appointment: Appointment) => void,
) {
  const [isCopiedPhone, setIsCopiedPhone] = useState(false);

  const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
  const pName = patObj?.fullName || (a as any).patient?.fullName || (a as any).patientName || "Пациент";
  const pPhone = patObj?.phone || (a as any).patient?.phone || "";

  const timeVal = toDateTimeLocalValue ? toDateTimeLocalValue(a.startsAt, timezone) : a.startsAt;
  const timeEndVal = toDateTimeLocalValue ? toDateTimeLocalValue(a.endsAt, timezone) : a.endsAt;
  const aStart = timeVal.slice(11, 16);
  const aEnd = timeEndVal.slice(11, 16);
  const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
  const durationMin = (Number.isFinite(diffMs) && diffMs > 0 ? Math.round(diffMs / 60000) : 0) || (a as any).durationMinutes || 30;

  const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
  const doctorSpecialty = docObj?.specialty || (Array.isArray(docObj?.specialties) ? docObj?.specialties[0] : undefined) || docObj?.role;
  const docTheme = getDoctorSpecialtyTheme(doctorSpecialty);
  const docName = docObj?.fullName || a.doctorUserId || "Врач не назначен";

  const chairObj = dashboard?.clinicSettings?.chairs?.find((c) => c.id === a.chairId);
  const chairName = chairObj?.name || (a.chairId ? `Кресло ${a.chairId}` : "Кресло не указано");

  let patientAgeLabel: string | null = null;
  if (patObj?.birthDate) {
    const bDate = new Date(patObj.birthDate);
    if (!Number.isNaN(bDate.getTime())) {
      const ageYears = Math.floor((Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (ageYears > 0 && ageYears < 120) patientAgeLabel = formatRussianAge(ageYears);
    }
  }

  const handleOpenVisitClick = () => {
    if (a.patientId) usePatientStore.getState().setSelectedPatientId(a.patientId);
    if (onOpenVisit) {
      onOpenVisit(a);
    } else {
      if (typeof window !== "undefined") window.location.hash = "#visit";
      useAppStore.getState().setCurrentView("visit");
      showToast(`Открыт приём: ${pName}`, "info");
    }
  };

  const handleOpenPatientCard = () => {
    if (a.patientId) {
      usePatientStore.getState().setSelectedPatientId(a.patientId);
      useAppStore.getState().setCurrentView("patients");
      showToast(`Открыта карта: ${pName}`, "info");
    }
  };

  const handleCopyPhone = () => {
    if (!pPhone) return;
    navigator.clipboard.writeText(pPhone);
    setIsCopiedPhone(true);
    showToast(`Телефон ${pPhone} скопирован`, "success", 2000);
    setTimeout(() => setIsCopiedPhone(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!pPhone) return;
    const cleanDigits = pPhone.replace(/\D/g, "");
    const formattedPhone = cleanDigits.startsWith("8") ? `7${cleanDigits.slice(1)}` : cleanDigits;
    window.open(`https://wa.me/${formattedPhone}`, "_blank");
  };

  return {
    patObj,
    pName,
    pPhone,
    aStart,
    aEnd,
    durationMin,
    docTheme,
    docName,
    chairName,
    patientAgeLabel,
    isCopiedPhone,
    handleOpenVisitClick,
    handleOpenPatientCard,
    handleCopyPhone,
    handleWhatsApp,
  };
}
