import type { TargetSlotInfo, WaitlistCandidateItem, CandidateScoreResult, WaitlistUrgency } from "./waitlistTypes";
import { URGENCY_CONFIG } from "./waitlistTypes";
import { detectWaitlistUrgency } from "./waitlistUrgencyDetector";
import { checkTimeWindowFit } from "./waitlistTimeFit";

export function scoreWaitlistCandidate(
  candidate: WaitlistCandidateItem,
  targetSlot?: TargetSlotInfo | null,
): CandidateScoreResult {
  const urgency = detectWaitlistUrgency(candidate);
  const urgencyCfg = URGENCY_CONFIG[urgency];
  const matchReasons: string[] = [];
  let score = urgencyCfg.weight;
  matchReasons.push(urgencyCfg.label);

  if (!targetSlot) {
    return { score, sameDoctor: false, sameChair: false, timeFits: true, urgency, urgencyLabel: urgencyCfg.label, matchReasons };
  }

  let sameDoctor = false;
  if (candidate.preferredDoctorId && targetSlot.doctorUserId && candidate.preferredDoctorId === targetSlot.doctorUserId) {
    sameDoctor = true; score += 35; matchReasons.push("Желаемый врач совпадает");
  } else if (!candidate.preferredDoctorId) {
    sameDoctor = true; score += 25; matchReasons.push("Любой врач клиники");
  }

  const timeFits = checkTimeWindowFit(targetSlot.startsAt, candidate.preferredTimeRanges);
  if (timeFits) { score += 20; matchReasons.push("Время слота подходит"); }

  let sameChair = false;
  if (targetSlot.chairId) { sameChair = true; score += 5; }

  return {
    score: Math.min(100, Math.max(0, score)), sameDoctor, sameChair, timeFits,
    urgency, urgencyLabel: urgencyCfg.label, matchReasons,
  };
}

export function filterWaitlistCandidates(
  items: WaitlistCandidateItem[],
  targetSlotOrFilters: any,
  maybeFilters?: any,
): Array<{ item: WaitlistCandidateItem; candidate: WaitlistCandidateItem; scoring: CandidateScoreResult }> {
  let targetSlot: TargetSlotInfo | null | undefined = null;
  let filters: any = {};

  if (maybeFilters !== undefined) {
    targetSlot = targetSlotOrFilters as TargetSlotInfo;
    filters = maybeFilters;
  } else if (targetSlotOrFilters && "startsAt" in targetSlotOrFilters) {
    targetSlot = targetSlotOrFilters as TargetSlotInfo;
  } else if (targetSlotOrFilters) {
    filters = targetSlotOrFilters;
    targetSlot = filters.targetSlot;
  }

  const searchQuery = filters.searchQuery;
  const urgencyFilter = filters.urgencyFilter || filters.urgency;
  const doctorFilter = filters.doctorFilter;
  const onlySameDoctor = Boolean(filters.onlySameDoctor || filters.sameDoctorOnly);
  const q = (searchQuery || "").trim().toLowerCase();

  return items
    .filter((item) => item.status === "active" || item.status === "waiting" || !item.status)
    .map((item) => ({ item, candidate: item, scoring: scoreWaitlistCandidate(item, targetSlot) }))
    .filter(({ item, scoring }) => {
      if (q) {
        const name = (item.patientName || "").toLowerCase();
        const phone = (item.patientPhone || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        const doc = (item.preferredDoctorName || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !notes.includes(q) && !doc.includes(q)) return false;
      }
      if (urgencyFilter && urgencyFilter !== "all" && scoring.urgency !== urgencyFilter) return false;
      if (onlySameDoctor && targetSlot?.doctorUserId && item.preferredDoctorId !== targetSlot.doctorUserId) return false;
      if (doctorFilter && doctorFilter !== "all" && item.preferredDoctorId && item.preferredDoctorId !== doctorFilter) return false;
      return true;
    })
    .sort((a, b) => b.scoring.score - a.scoring.score);
}

export function openWhatsAppChat(phone: string, text: string) {
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
}

export function openTelegramChat(phone: string, text: string) {
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, "_blank");
}
