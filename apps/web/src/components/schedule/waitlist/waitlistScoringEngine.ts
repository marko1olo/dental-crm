/**
 * waitlistScoringEngine.ts — Детерминированный движок скоринга и подбора кандидатов листа ожидания DENTE
 * (Мандат 8ap: Ноль regex-скоринга, строго типизированные поля; Мандат 8b: <= 300 строк).
 */

import type {
  CandidateScoreResult,
  TargetSlotInfo,
  WaitlistCandidateItem,
} from "./waitlistTypes";
import {
  URGENCY_CONFIG,
  detectWaitlistUrgency,
  checkTimeWindowFit,
} from "./waitlistTypes";

/**
 * Детерминированный расчет рейтинга соответствия кандидата и окна.
 */
export function scoreWaitlistCandidate(
  candidate: WaitlistCandidateItem,
  targetSlot?: TargetSlotInfo | null,
): CandidateScoreResult {
  const urgency = detectWaitlistUrgency(candidate);
  const urgencyCfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.routine!;
  const matchReasons: string[] = [];
  const mismatchReasons: string[] = [];

  let score = urgencyCfg.weight;
  matchReasons.push(urgencyCfg.label);

  if (!targetSlot) {
    return {
      score,
      sameDoctor: false,
      sameChair: false,
      timeFits: true,
      urgency,
      urgencyLabel: urgencyCfg.label,
      matchReasons,
      priorityRank: urgencyCfg.rank,
    };
  }

  // 1. Врач: совпадение или согласие на любого
  let sameDoctor = false;
  if (candidate.preferredDoctorId && targetSlot.doctorUserId && candidate.preferredDoctorId === targetSlot.doctorUserId) {
    sameDoctor = true;
    score += 35;
    matchReasons.push("Желаемый врач совпадает");
  } else if (!candidate.preferredDoctorId) {
    sameDoctor = true;
    score += 25;
    matchReasons.push("Пациент согласен на любого врача");
  } else {
    mismatchReasons.push("Пациент ждёт другого специалиста");
  }

  // 2. Время и день недели
  const dayFits = checkTimeWindowFit(targetSlot.startsAt, undefined, candidate.preferredDays, undefined);
  const timeFits = checkTimeWindowFit(
    targetSlot.startsAt,
    candidate.preferredTimeRanges,
    candidate.preferredDays,
    candidate.preferredTimeOfDay,
  );

  if (dayFits) {
    if (candidate.preferredDays?.includes("weekend")) {
      matchReasons.push("Желаемый выходной день подходит");
    } else if (candidate.preferredDays?.includes("weekdays")) {
      matchReasons.push("Желаемый будний день подходит");
    }
  } else {
    mismatchReasons.push("День не попадает в желаемые (пациент предпочитает будни)");
  }

  if (timeFits) {
    score += 20;
    if (candidate.preferredTimeOfDay?.includes("evening")) {
      matchReasons.push("Вечернее время подходит");
    } else if (candidate.preferredTimeOfDay?.includes("morning")) {
      matchReasons.push("Утреннее время подходит");
    } else {
      matchReasons.push("Желаемое время и день подходят");
    }
  } else {
    mismatchReasons.push("Время слота не попадает в интервал пациента");
  }

  // 3. Категория лечения
  let categoryFits = true;
  if (candidate.treatmentCategory && targetSlot.treatmentCategory) {
    if (candidate.treatmentCategory.toLowerCase() === targetSlot.treatmentCategory.toLowerCase()) {
      score += 5;
      matchReasons.push(`Профиль: ${candidate.treatmentCategory}`);
    } else {
      categoryFits = false;
    }
  }

  let sameChair = false;
  if (targetSlot.chairId) {
    sameChair = true;
  }

  const finalScore = Math.min(100, Math.max(0, score));
  let rating: "excellent" | "good" | "moderate" | "poor" = "moderate";
  if (finalScore >= 80) rating = "excellent";
  else if (finalScore >= 60) rating = "good";
  else if (finalScore >= 40) rating = "moderate";
  else rating = "poor";

  return {
    score: finalScore,
    sameDoctor,
    sameChair,
    timeFits,
    dayFits,
    categoryFits,
    rating,
    urgency,
    urgencyLabel: urgencyCfg.label,
    matchReasons,
    mismatchReasons,
    priorityRank: urgencyCfg.rank,
  };
}

// Алиас для обратной совместимости
export const calculateMatchScore = scoreWaitlistCandidate;

/**
 * Фильтрация и сортировка кандидатов для заполнения окна.
 */
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

  const searchQuery = (filters.searchQuery || filters.query || "").trim().toLowerCase();
  const urgencyFilter = filters.urgencyFilter || filters.urgency;
  const doctorFilter = filters.doctorFilter;
  const onlySameDoctor = Boolean(filters.onlySameDoctor || filters.sameDoctorOnly);

  return items
    .filter((item) => item.status === "active" || item.status === "waiting" || !item.status)
    .map((item) => ({
      item,
      candidate: item,
      scoring: scoreWaitlistCandidate(item, targetSlot),
    }))
    .filter(({ item, scoring }) => {
      if (searchQuery) {
        const name = (item.patientName || "").toLowerCase();
        const phone = (item.patientPhone || "").toLowerCase();
        const doc = (item.preferredDoctorName || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        if (!name.includes(searchQuery) && !phone.includes(searchQuery) && !doc.includes(searchQuery) && !notes.includes(searchQuery)) {
          return false;
        }
      }
      if (urgencyFilter && urgencyFilter !== "all") {
        if (scoring.urgency !== urgencyFilter && item.urgency !== urgencyFilter && item.priorityLevel !== urgencyFilter) {
          return false;
        }
      }
      if (onlySameDoctor && targetSlot?.doctorUserId && item.preferredDoctorId && item.preferredDoctorId !== targetSlot.doctorUserId) {
        return false;
      }
      if (doctorFilter && doctorFilter !== "all" && item.preferredDoctorId && item.preferredDoctorId !== doctorFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.scoring.score - a.scoring.score);
}

export function openWhatsAppChat(phone: string, text: string): void {
  if (typeof window === "undefined") return;
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
}

export function openTelegramChat(phone: string, text: string): void {
  if (typeof window === "undefined") return;
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  window.open(`https://t.me/share/url?text=${encodeURIComponent(text)}`, "_blank");
}
