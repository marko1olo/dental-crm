/**
 * apps/web/src/components/schedule/smartSlotRecoveryHelpers.ts
 * Time utilities and patient privacy-compliant communication helpers for slot recovery.
 */

import type { TimeOfDay, WaitlistUrgency } from "./smartSlotRecoveryTypes";

export function extractPoliteName(fullName: string | null | undefined): string {
  const raw = (fullName || "").trim();
  if (!raw) return "Пациент";
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 3) return `${parts[1]} ${parts[2]}`;
  if (parts.length === 2) {
    const [p0, p1] = parts;
    if (/(ов|ова|ев|ева|ин|ина|ский|ская|ых|их)$/i.test(p0!)) return p1!;
    return p0!;
  }
  return parts[0] || "Пациент";
}

export function formatDoctorSalutation(doctorName?: string | null): string {
  if (!doctorName || !doctorName.trim()) return "доктора";
  const clean = doctorName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
  return `доктора ${clean}`;
}

export function calculateSlotDurationMinutes(startAt: string, endAt: string): number {
  if (!startAt || !endAt) return 30;
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
    return Math.max(15, Math.round((endMs - startMs) / 60_000));
  }
  const sMatch = /(\d{1,2}):(\d{2})/.exec(startAt);
  const eMatch = /(\d{1,2}):(\d{2})/.exec(endAt);
  if (sMatch && eMatch) {
    const sMin = Number(sMatch[1]) * 60 + Number(sMatch[2]);
    const eMin = Number(eMatch[1]) * 60 + Number(eMatch[2]);
    if (eMin > sMin) return eMin - sMin;
  }
  return 30;
}

export function getTimeOfDayCategory(timeOrIso: string): TimeOfDay {
  if (!timeOrIso) return "morning";
  let hour = 10;
  const dateObj = new Date(timeOrIso);
  if (!Number.isNaN(dateObj.getTime()) && timeOrIso.includes("T")) {
    hour = dateObj.getHours();
  } else {
    const match = /(\d{1,2}):(\d{2})/.exec(timeOrIso);
    if (match) hour = Number(match[1]);
  }
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function calculateWaitingDays(
  createdAt?: string | Date | null,
  explicitDays?: number | null,
  now: Date | number = new Date(),
): number {
  if (typeof explicitDays === "number" && explicitDays >= 0) return explicitDays;
  if (!createdAt) return 0;
  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(String(createdAt));
  if (Number.isNaN(createdMs)) return 0;
  const nowMs = typeof now === "number" ? now : now.getTime();
  return Math.max(0, Math.floor((nowMs - createdMs) / 86400000));
}

export function generateSlotOfferMessage(params: {
  patientName?: string | null;
  doctorName?: string | null;
  startsAt: string;
  clinicName?: string;
  durationMinutes?: number;
}): string {
  const politeName = extractPoliteName(params.patientName);
  const dateObj = new Date(params.startsAt);
  const now = new Date();
  const isToday = !Number.isNaN(dateObj.getTime()) && dateObj.toDateString() === now.toDateString();
  const tomorrow = new Date(now.getTime() + 86400000);
  const isTomorrow = !Number.isNaN(dateObj.getTime()) && dateObj.toDateString() === tomorrow.toDateString();

  let dateWord = "сегодня";
  if (isTomorrow) dateWord = "завтра";
  else if (!isToday && !Number.isNaN(dateObj.getTime())) {
    dateWord = dateObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }

  let timeStr = "10:00";
  if (params.startsAt?.includes("T")) {
    timeStr = params.startsAt.split("T")[1]?.slice(0, 5) || "10:00";
  } else if (!Number.isNaN(dateObj.getTime())) {
    timeStr = dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } else if (params.startsAt?.includes(":")) {
    timeStr = params.startsAt.slice(0, 5);
  }

  const docSalutation = params.doctorName ? formatDoctorSalutation(params.doctorName) : null;
  const clinicStr = params.clinicName ? `«${params.clinicName}»` : "";
  const who = docSalutation && clinicStr ? `В клинике ${clinicStr} у ${docSalutation}` : docSalutation ? `У ${docSalutation}` : clinicStr ? `В клинике ${clinicStr}` : "В клинике";
  const dur = params.durationMinutes ? ` (${params.durationMinutes} мин)` : "";

  return `Здравствуйте, ${politeName}! ${who} освободилось время ${dateWord} в ${timeStr}${dur}. Сможете подойти?`;
}

/**
 * Backward-compatibility alias for generateSlotOfferMessage.
 * @deprecated Use generateSlotOfferMessage instead (Mandates 8ao, 8ap).
 */
export const generate152FzSlotOfferMessage = generateSlotOfferMessage;

export function generateWhatsAppLink(phone: string | null | undefined, message: string): string {
  if (!phone) return "";
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppLinkDirect(phone: string | null | undefined, message: string): void {
  const url = generateWhatsAppLink(phone, message);
  if (url && typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
}
