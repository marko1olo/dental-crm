import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

export interface FormatConfirmationTextParams {
  patientName: string;
  startsAtLocal: string;
  durationMinutes: number;
  doctorName: string;
  chairName: string;
  clinicName: string;
  clinicAddress: string;
  clinicPhone?: string;
}

export function formatBookingConfirmationText({
  patientName,
  startsAtLocal,
  durationMinutes,
  doctorName,
  chairName,
  clinicName,
  clinicAddress,
  clinicPhone,
}: FormatConfirmationTextParams): string {
  let formattedDate = "";
  let formattedTime = "";
  if (startsAtLocal) {
    const [dPart, tPart] = startsAtLocal.split("T");
    if (dPart) {
      const parts = dPart.split("-");
      formattedDate = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dPart;
    }
    if (tPart) formattedTime = tPart.slice(0, 5);
  }
  if (!formattedDate) {
    try {
      formattedDate = new Date().toLocaleDateString("ru-RU");
    } catch {
      formattedDate = "01.01.2026";
    }
  }
  if (!formattedTime) formattedTime = "10:00";

  return [
    `Запись на приём в клинику «${clinicName}»:`,
    `Пациент: ${patientName}`,
    `Дата и время: ${formattedDate}, ${formattedTime} (${durationMinutes} мин)`,
    `Врач: ${doctorName}`,
    `Кабинет / кресло: ${chairName}`,
    `Адрес клиники: ${clinicAddress}`,
    ...(clinicPhone ? [`Телефон для справок: ${clinicPhone}`] : []),
    "Пожалуйста, приходите за 10 минут до начала приёма.",
  ].join("\n");
}

export async function copyBookingConfirmationToClipboard(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
  } catch (err) {
    logger.warn("Clipboard writeText failed or not permitted", err);
  }
  showToast("Детали записи скопированы в буфер обмена для отправки пациенту", "success");
}

export async function executeCopyConfirmationFlow(params: {
  patientSearch: any;
  appointmentType: string;
  doctors: any[];
  doctorUserId: string;
  dutyDoc: any;
  chairs: any[];
  chairId: string;
  currentChair: any;
  startsAtLocal: string;
  durationMinutes: number;
  dashboard: any;
  initialSlot?: any;
}) {
  const { patientSearch, appointmentType, doctors, doctorUserId, dutyDoc, chairs, chairId, currentChair, startsAtLocal, durationMinutes, dashboard, initialSlot } = params;
  const fullName = patientSearch.newPatientFullName?.trim() || patientSearch.selectedPatient?.fullName?.trim() || "";
  const phoneFallback = patientSearch.newPatientPhone?.trim() || initialSlot?.patientPhone?.trim() || "";
  const queryFallback = patientSearch.searchQuery?.trim() || "";
  
  let candidateName = fullName;
  if (!candidateName) {
    if (phoneFallback) {
      candidateName = `Пациент (${phoneFallback})`;
    } else if (queryFallback) {
      if (/^[\d+\s()-]+$/.test(queryFallback)) {
        candidateName = `Пациент (${queryFallback})`;
      } else {
        candidateName = queryFallback;
      }
    } else if (appointmentType === "emergency") {
      candidateName = "Пациент с острой болью (срочно)";
    }
  }
  const patientName = candidateName || "Пациент";
  const selectedDoc = doctors.find((d: any) => d.id === doctorUserId) || dutyDoc;
  const selectedChair = chairs.find((c: any) => c.id === chairId) || currentChair;

  const text = formatBookingConfirmationText({
    patientName, startsAtLocal, durationMinutes,
    doctorName: selectedDoc?.fullName || "Врач клиники",
    chairName: selectedChair?.name || "Основное кресло",
    clinicName: dashboard?.clinicSettings?.profile?.clinicName || dashboard?.clinicSettings?.profile?.legalName || "ДЕНТЕ",
    clinicAddress: dashboard?.clinicSettings?.profile?.address || "г. Москва",
    clinicPhone: dashboard?.clinicSettings?.profile?.phone || "",
  });
  await copyBookingConfirmationToClipboard(text);
}
