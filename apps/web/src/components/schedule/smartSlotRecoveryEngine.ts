/**
 * apps/web/src/components/schedule/smartSlotRecoveryEngine.ts
 * Smart Slot Recovery Engine for DENTE Dental CRM.
 * High-performance, clean waitlist matching for clinic chairs and doctors.
 */

import {
  type MatchWaitlistSlotParams,
  type SmartSlotCandidateMatch,
  type SmartSlotRecoveryResult,
  type WaitlistEntryLike,
  type WaitlistUrgency,
  URGENCY_LABELS,
} from "./smartSlotRecoveryTypes";
import {
  calculateSlotDurationMinutes,
  calculateWaitingDays,
  extractPoliteName,
  formatDoctorSalutation,
  generateSlotOfferMessage,
  generateWhatsAppLink,
  getTimeOfDayCategory,
  openWhatsAppLinkDirect,
} from "./smartSlotRecoveryHelpers";
import {
  checkCandidateTimeOfDayFit,
  detectCandidateUrgency,
} from "./smartSlotRecoveryScoring";

export * from "./smartSlotRecoveryTypes";
export * from "./smartSlotRecoveryHelpers";
export * from "./smartSlotRecoveryScoring";

const URGENCY_PRIO: Record<WaitlistUrgency, number> = {
  acute_pain: 40,
  ortho_endo: 30,
  hygiene: 20,
  routine: 10,
};

interface ScoredCandidate {
  entry: WaitlistEntryLike;
  candidateSeq: number;
  score: number;
  rawScore: number;
  urgency: WaitlistUrgency;
  waitingDays: number;
  timeFit: { fits: boolean; hasSpecificPreference: boolean };
}

function buildCandidateMatchReasons(params: {
  entry: WaitlistEntryLike;
  doctorId?: string | null;
  docSpecLower?: string | null;
  timeOfDayCategory: TimeOfDay;
  timeFit: { fits: boolean; hasSpecificPreference: boolean };
  slotDurationMinutes: number;
  urgency: WaitlistUrgency;
  waitingDays: number;
}): string[] {
  const { entry, doctorId, docSpecLower, timeOfDayCategory, timeFit, slotDurationMinutes, urgency, waitingDays } = params;
  const matchReasons: string[] = [];
  if (doctorId && entry.preferredDoctorId && entry.preferredDoctorId === doctorId) {
    matchReasons.push("Желаемый врач совпадает");
  } else if (!entry.preferredDoctorId) {
    matchReasons.push("Любой врач клиники");
  } else if (docSpecLower && entry.treatmentCategory) {
    const c = entry.treatmentCategory.toLowerCase();
    if (c.includes(docSpecLower) || docSpecLower.includes(c)) { matchReasons.push("Специализация врача совпадает"); }
  }

  if (timeFit.fits && timeFit.hasSpecificPreference) {
    matchReasons.push(timeOfDayCategory === "morning" ? "Утреннее время (желаемое)" : timeOfDayCategory === "afternoon" ? "Дневное время (желаемое)" : "Вечернее время (желаемое)");
  } else if (timeFit.fits) {
    matchReasons.push("Время слота подходит");
  }

  const neededDur = entry.desiredDurationMinutes || (urgency === "acute_pain" ? 30 : urgency === "hygiene" || urgency === "ortho_endo" ? 60 : 30);
  if (slotDurationMinutes >= neededDur) { matchReasons.push(`Слот ${slotDurationMinutes} мин подходит`); }
  else if (slotDurationMinutes >= 30 && neededDur - slotDurationMinutes <= 15) { matchReasons.push(`Слот ${slotDurationMinutes} мин (экспресс)`); }

  if (urgency === "acute_pain") { matchReasons.push("Острая боль (наивысший приоритет)"); }
  else if (urgency === "ortho_endo") { matchReasons.push("Продолжение орто/эндо"); }
  else if (urgency === "hygiene") { matchReasons.push("Профгигиена"); }

  if (waitingDays >= 7) { matchReasons.push(`Ожидает ${waitingDays} дн. (длительное ожидание)`); }
  else if (waitingDays >= 3) { matchReasons.push(`Ожидает ${waitingDays} дн.`); }

  return matchReasons;
}

export function matchWaitlistCandidatesForSlot(params: MatchWaitlistSlotParams): SmartSlotRecoveryResult {
  const { doctorId, doctorSpecialty, doctorName, chairId, chairName, startAt, endAt, date = startAt?.includes("T") ? startAt.split("T")[0] : new Date().toISOString().slice(0, 10), waitlistEntries = [], limit = 3, clinicName = "DENTE", now = new Date() } = params;
  const slotDurationMinutes = calculateSlotDurationMinutes(startAt, endAt);
  const timeOfDayCategory = getTimeOfDayCategory(startAt);
  const nowMs = now instanceof Date ? now.getTime() : typeof now === "number" ? now : Date.now();
  const docSpecLower = doctorSpecialty ? doctorSpecialty.toLowerCase() : null;
  let candidateSeq = 0;
  let totalEligibleWaitlist = 0;
  const scoredCandidates: ScoredCandidate[] = [];

  for (let i = 0; i < waitlistEntries.length; i++) {
    const entry = waitlistEntries[i];
    if (!entry) continue;
    const st = entry.status;
    if (st && st.toLowerCase() !== "waiting" && st.toLowerCase() !== "active") continue;

    totalEligibleWaitlist++;
    candidateSeq++;
    const urgency = detectCandidateUrgency(entry);
    const waitingDays = typeof entry.waitingDays === "number" && entry.waitingDays >= 0 ? entry.waitingDays : calculateWaitingDays(entry.createdAt, null, nowMs);

    let score = 10;

    if (doctorId && entry.preferredDoctorId && entry.preferredDoctorId === doctorId) {
      score += 35;
    } else if (!entry.preferredDoctorId) {
      score += 20;
    } else if (docSpecLower && entry.treatmentCategory) {
      const c = entry.treatmentCategory.toLowerCase();
      if (c.includes(docSpecLower) || docSpecLower.includes(c)) { score += 15; }
    }

    const timeFit = checkCandidateTimeOfDayFit(timeOfDayCategory, entry.preferredTimeRanges, entry.notes);
    if (timeFit.fits && timeFit.hasSpecificPreference) {
      score += 20;
    } else if (timeFit.fits) {
      score += 15;
    }

    const neededDur = entry.desiredDurationMinutes || (urgency === "acute_pain" ? 30 : urgency === "hygiene" || urgency === "ortho_endo" ? 60 : 30);
    if (slotDurationMinutes >= neededDur) { score += 15; }
    else if (slotDurationMinutes >= 30 && neededDur - slotDurationMinutes <= 15) { score += 5; }

    if (urgency === "acute_pain") { score += 25; }
    else if (urgency === "ortho_endo") { score += 15; }
    else if (urgency === "hygiene") { score += 10; }
    else { score += 5; }

    if (waitingDays >= 7) { score += 10; }
    else if (waitingDays >= 3) { score += 5; }
    else if (waitingDays >= 1) { score += 2; }

    if (chairId) score += 5;

    scoredCandidates.push({
      entry,
      candidateSeq,
      score: Math.min(100, Math.max(0, Math.round(score))),
      rawScore: score,
      urgency,
      waitingDays,
      timeFit,
    });
  }

  scoredCandidates.sort((a, b) => {
    const rB = b.rawScore ?? b.score;
    const rA = a.rawScore ?? a.score;
    if (rB !== rA) return rB - rA;
    const uB = URGENCY_PRIO[b.urgency] ?? 0;
    const uA = URGENCY_PRIO[a.urgency] ?? 0;
    if (uB !== uA) return uB - uA;
    return b.waitingDays - a.waitingDays;
  });

  const matches: SmartSlotCandidateMatch[] = scoredCandidates.slice(0, Math.max(1, limit)).map((c) => {
    const entry = c.entry;
    const candidateId = entry.id || entry.entryId || `cand-${c.candidateSeq}`;
    const patientId = entry.patientId || candidateId;
    const patientName = entry.patientName || "Пациент";
    const phone = entry.patientPhone || entry.phone || null;
    const procedureName = entry.treatmentCategory || entry.notes || entry.reason || "Консультация и осмотр";

    const matchReasons = buildCandidateMatchReasons({
      entry: c.entry,
      doctorId,
      docSpecLower,
      timeOfDayCategory,
      timeFit: c.timeFit,
      slotDurationMinutes,
      urgency: c.urgency,
      waitingDays: c.waitingDays,
    });
    const offerMessage = generateSlotOfferMessage({ patientName, doctorName: doctorName ?? null, startsAt: startAt, clinicName, durationMinutes: slotDurationMinutes });
    return {
      candidate: c.entry,
      id: candidateId,
      patientId,
      patientName,
      phone,
      procedureName,
      score: c.score,
      rawScore: c.rawScore,
      urgency: c.urgency,
      urgencyLabel: URGENCY_LABELS[c.urgency],
      matchReasons,
      waitingDays: c.waitingDays,
      createdMs: 0,
      timeOfDayCategory,
      slotDurationMinutes,
      offerMessage,
      whatsappUrl: generateWhatsAppLink(phone, offerMessage),
    };
  });

  return {
    slot: { startAt, endAt, date: String(date), durationMinutes: slotDurationMinutes, timeOfDayCategory, doctorId, doctorName, chairId, chairName },
    matches,
    totalEligibleWaitlist,
  };
}

export default matchWaitlistCandidatesForSlot;
