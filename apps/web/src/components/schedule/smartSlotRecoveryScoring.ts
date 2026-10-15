/**
 * apps/web/src/components/schedule/smartSlotRecoveryScoring.ts
 * Clean, high-performance scoring and urgency detection for waitlist slot recovery.
 */

import type { TimeOfDay, WaitlistEntryLike, WaitlistUrgency } from "./smartSlotRecoveryTypes";

export function detectCandidateUrgency(item: WaitlistEntryLike | string | null | undefined): WaitlistUrgency {
  if (!item) return "routine";
  if (typeof item === "object") {
    const explicit = item.urgency;
    if (explicit) {
      const e = explicit.toLowerCase();
      if (e === "acute_pain" || e === "ortho_endo" || e === "hygiene" || e === "routine") {
        return e as WaitlistUrgency;
      }
    }
    const prio = item.priorityLevel ? item.priorityLevel.toLowerCase() : "";
    if (prio === "urgent" || prio === "acute_pain" || prio === "high") return "acute_pain";
    if (prio === "treatment_plan") return "ortho_endo";
  }

  const rawText = typeof item === "string" ? item : `${item.notes || ""} ${item.treatmentCategory || ""} ${item.reason || ""}`;
  const t = rawText.toLowerCase();
  if (t.includes("острая") || t.includes("боль") || t.includes("cito") || t.includes("неотложн") || t.includes("пульпит")) return "acute_pain";
  if (t.includes("орто") || t.includes("эндо") || t.includes("канал") || t.includes("коронк") || t.includes("брекет") || t.includes("элайнер")) return "ortho_endo";
  if (t.includes("гигиен") || t.includes("чистк") || t.includes("airflow") || t.includes("air-flow")) return "hygiene";
  return "routine";
}

export function checkCandidateTimeOfDayFit(
  slotTimeOfDay: TimeOfDay,
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
  notes?: string | null,
): { fits: boolean; hasSpecificPreference: boolean } {
  if (notes) {
    const t = notes.toLowerCase();
    if (slotTimeOfDay === "morning" && t.includes("утр")) return { fits: true, hasSpecificPreference: true };
    if (slotTimeOfDay === "afternoon" && t.includes("день")) return { fits: true, hasSpecificPreference: true };
    if (slotTimeOfDay === "evening" && t.includes("вечер")) return { fits: true, hasSpecificPreference: true };
  }
  if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
    return { fits: true, hasSpecificPreference: false };
  }
  let found = false;
  let hasRestr = false;
  for (let i = 0; i < preferredTimeRanges.length; i++) {
    const tr = preferredTimeRanges[i];
    const s = `${tr?.slot || ""} ${tr?.day || ""}`.toLowerCase();
    if (!s.trim()) continue;
    if (s.includes("any") || s.includes("любое") || s.includes("весь")) return { fits: true, hasSpecificPreference: false };
    hasRestr = true;
    if (slotTimeOfDay === "morning" && (s.includes("утр") || s.includes("morning") || s.includes("09:00") || s.includes("10:00") || s.includes("11:00"))) { found = true; break; }
    if (slotTimeOfDay === "afternoon" && (s.includes("день") || s.includes("day") || s.includes("12:00") || s.includes("13:00") || s.includes("14:00") || s.includes("15:00") || s.includes("16:00"))) { found = true; break; }
    if (slotTimeOfDay === "evening" && (s.includes("вечер") || s.includes("evening") || s.includes("17:00") || s.includes("18:00") || s.includes("19:00") || s.includes("20:00"))) { found = true; break; }
  }
  return hasRestr ? { fits: found, hasSpecificPreference: true } : { fits: true, hasSpecificPreference: false };
}

export function scoreCandidateWaitlist(params: {
  entry: WaitlistEntryLike;
  doctorId?: string | null;
  docSpecLower?: string | null;
  chairId?: string | null;
  timeOfDayCategory: TimeOfDay;
  slotDurationMinutes: number;
  waitingDays: number;
  urgency: WaitlistUrgency;
}): { score: number; rawScore: number; matchReasons: string[] } {
  const { entry, doctorId, docSpecLower, chairId, timeOfDayCategory, slotDurationMinutes, waitingDays, urgency } = params;
  let score = 10;
  const matchReasons: string[] = [];

  // Врач и специальность
  if (doctorId && entry.preferredDoctorId && entry.preferredDoctorId === doctorId) {
    score += 35;
    matchReasons.push("Желаемый врач совпадает");
  } else if (!entry.preferredDoctorId) {
    score += 20;
    matchReasons.push("Любой врач клиники");
  } else if (docSpecLower && entry.treatmentCategory) {
    const c = entry.treatmentCategory.toLowerCase();
    if (c.includes(docSpecLower) || docSpecLower.includes(c)) { score += 15; matchReasons.push("Специализация врача совпадает"); }
  }

  // Время дня
  const timeFit = checkCandidateTimeOfDayFit(timeOfDayCategory, entry.preferredTimeRanges, entry.notes);
  if (timeFit.fits && timeFit.hasSpecificPreference) {
    score += 20;
    matchReasons.push(timeOfDayCategory === "morning" ? "Утреннее время (желаемое)" : timeOfDayCategory === "afternoon" ? "Дневное время (желаемое)" : "Вечернее время (желаемое)");
  } else if (timeFit.fits) {
    score += 15;
    matchReasons.push("Время слота подходит");
  }

  // Длительность
  const neededDur = entry.desiredDurationMinutes || (urgency === "acute_pain" ? 30 : urgency === "hygiene" || urgency === "ortho_endo" ? 60 : 30);
  if (slotDurationMinutes >= neededDur) { score += 15; matchReasons.push(`Слот ${slotDurationMinutes} мин подходит`); }
  else if (slotDurationMinutes >= 30 && neededDur - slotDurationMinutes <= 15) { score += 5; matchReasons.push(`Слот ${slotDurationMinutes} мин (экспресс)`); }

  // Срочность
  if (urgency === "acute_pain") { score += 25; matchReasons.push("Острая боль (наивысший приоритет)"); }
  else if (urgency === "ortho_endo") { score += 15; matchReasons.push("Продолжение орто/эндо"); }
  else if (urgency === "hygiene") { score += 10; matchReasons.push("Профгигиена"); }
  else { score += 5; }

  // Ожидание
  if (waitingDays >= 7) { score += 10; matchReasons.push(`Ожидает ${waitingDays} дн. (длительное ожидание)`); }
  else if (waitingDays >= 3) { score += 5; matchReasons.push(`Ожидает ${waitingDays} дн.`); }
  else if (waitingDays >= 1) { score += 2; }

  if (chairId) score += 5;

  return { score: Math.min(100, Math.max(0, Math.round(score))), rawScore: score, matchReasons };
}
