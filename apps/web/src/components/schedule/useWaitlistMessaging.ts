/**
 * apps/web/src/components/schedule/useWaitlistMessaging.ts
 * Waitlist instant messaging hook: WhatsApp, Telegram, and SMS copy.
 */

import { useState } from "react";
import { showToast } from "../GlobalToast";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";
import {
  generateWhatsAppOfferMessage,
  openTelegramChat,
  openWhatsAppChat,
  type WaitlistPatientEntry,
} from "./waitlistMatchScoring";

interface UseWaitlistMessagingParams {
  targetSlot?: TargetSlotInfo | null;
  clinicName: string;
}

export function useWaitlistMessaging({ targetSlot, clinicName }: UseWaitlistMessagingParams) {
  const [contactedPatients, setContactedPatients] = useState<Set<string>>(new Set());

  const handleSendWhatsApp = (patient: WaitlistPatientEntry) => {
    if (!patient.patientPhone) {
      showToast("У пациента не указан номер телефона", "error");
      return;
    }
    const msg = generateWhatsAppOfferMessage({
      patientName: patient.patientName || "Пациент",
      doctorName: targetSlot?.doctorName || patient.preferredDoctorName,
      slotStartsAt: targetSlot?.startsAt || new Date().toISOString(),
      clinicName,
    });
    openWhatsAppChat(patient.patientPhone, msg);
    setContactedPatients((prev) => new Set(prev).add(patient.id));
    showToast(`Предложение слота сформировано для ${patient.patientName || "пациента"}`, "success");
  };

  const handleCopySms = (patient: WaitlistPatientEntry) => {
    const msg = generateWhatsAppOfferMessage({
      patientName: patient.patientName || "Пациент",
      doctorName: targetSlot?.doctorName || patient.preferredDoctorName,
      slotStartsAt: targetSlot?.startsAt || new Date().toISOString(),
      clinicName,
    });
    navigator.clipboard?.writeText(msg).then(() => {
      setContactedPatients((prev) => new Set(prev).add(patient.id));
      showToast("Текст сообщения скопирован в буфер", "success");
    });
  };

  const handleSendTelegram = (patient: WaitlistPatientEntry) => {
    if (!patient.patientPhone) {
      showToast("У пациента не указан номер телефона", "error");
      return;
    }
    const msg = generateWhatsAppOfferMessage({
      patientName: patient.patientName || "Пациент",
      doctorName: targetSlot?.doctorName || patient.preferredDoctorName,
      slotStartsAt: targetSlot?.startsAt || new Date().toISOString(),
      clinicName,
    });
    openTelegramChat(patient.patientPhone, msg);
    setContactedPatients((prev) => new Set(prev).add(patient.id));
    showToast(`Предложение слота сформировано для Telegram: ${patient.patientName || "пациент"}`, "success");
  };

  return {
    contactedPatients,
    handleSendWhatsApp,
    handleCopySms,
    handleSendTelegram,
  };
}
