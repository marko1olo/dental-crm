/**
 * apps/web/src/components/schedule/smartSlotRecoveryEngine.ts
 *
 * Smart Slot Recovery Engine for DENTE Dental CRM.
 * Matches and ranks waitlist patients when an appointment is cancelled,
 * filling schedule gaps in 1-click while complying with:
 * - 152-FZ: polite communication without disclosing medical diagnoses or teeth numbers
 * - Mandate 8e: Doctor & Staff Autonomy (zero disabled buttons, instant suggestions)
 * - Mandate 8k: CRM != Reality Simulator (friction-killer hot path)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

export type WaitlistUrgency =
  | "acute_pain" // Острая боль (CITO)
  | "ortho_endo" // Ортодонтия / эндодонтия
  | "hygiene"    // Профгигиена
  | "routine";   // Плановый приём

export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface WaitlistEntryLike {
  id?: string;
  entryId?: string;
  patientId?: string;
  patientName?: string | null;
  patientPhone?: string | null;
  phone?: string | null;
  preferredDoctorId?: string | null;
  preferredDoctorName?: string | null;
  priorityLevel?: "high" | "medium" | "low" | string | null;
  urgency?: WaitlistUrgency | string | null;
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any;
  treatmentCategory?: string | null;
  desiredDurationMinutes?: number | null;
  notes?: string | null;
  reason?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  waitingDays?: number | null;
}

export interface MatchWaitlistSlotParams {
  doctorId?: string | null | undefined;
  doctorSpecialty?: string | null | undefined;
  doctorName?: string | null | undefined;
  chairId?: string | null | undefined;
  chairName?: string | null | undefined;
  startAt: string; // ISO or "HH:mm" or "YYYY-MM-DDTHH:mm"
  endAt: string;   // ISO or "HH:mm" or "YYYY-MM-DDTHH:mm"
  date?: string | undefined;   // "YYYY-MM-DD"
  waitlistEntries: WaitlistEntryLike[];
  limit?: number | undefined;  // default: 3
  clinicName?: string | undefined;
  now?: Date | undefined;
}

export interface SmartSlotCandidateMatch {
  candidate: WaitlistEntryLike;
  id: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  procedureName: string;
  score: number; // 0..100
  rawScore?: number | undefined;
  urgency: WaitlistUrgency;
  urgencyLabel: string;
  matchReasons: string[];
  waitingDays: number;
  createdMs?: number | undefined;
  timeOfDayCategory: TimeOfDay;
  slotDurationMinutes: number;
  offerMessage: string;
  whatsappUrl: string;
}

export interface SmartSlotRecoveryResult {
  slot: {
    startAt: string;
    endAt: string;
    date: string;
    durationMinutes: number;
    timeOfDayCategory: TimeOfDay;
    doctorId?: string | null | undefined;
    doctorName?: string | null | undefined;
    chairId?: string | null | undefined;
    chairName?: string | null | undefined;
  };
  matches: SmartSlotCandidateMatch[];
  totalEligibleWaitlist: number;
}

export const URGENCY_LABELS: Record<WaitlistUrgency, string> = {
  acute_pain: "Острая боль",
  ortho_endo: "Орто / Эндо",
  hygiene: "Профгигиена",
  routine: "Плановый",
};

/**
 * Extracts a respectful Russian polite name ("Иван Иванович" or "Анна").
 */
export function extractPoliteName(fullName: string | null | undefined): string {
  const raw = (fullName || "").trim();
  if (!raw) return "Пациент";
  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length === 3) {
    return `${parts[1]} ${parts[2]}`;
  }
  if (parts.length === 2) {
    const p0 = parts[0]!;
    const p1 = parts[1]!;
    if (/(ов|ова|ев|ева|ин|ина|ский|ская|ых|их)$/i.test(p0)) {
      return p1;
    }
    if (/(ов|ова|ев|ева|ин|ина|ский|ская|ых|их)$/i.test(p1)) {
      return p0;
    }
    return p0;
  }
  return parts[0] || "Пациент";
}

/**
 * Clean doctor salutation, removing redundant prefix words if already present.
 */
export function formatDoctorSalutation(
  doctorName?: string | null | undefined,
): string {
  if (!doctorName || !doctorName.trim()) return "доктора";
  const clean = doctorName.trim().replace(/^(д-р|доктор|врач)\s+/i, "");
  return `доктора ${clean}`;
}

/**
 * Calculates slot duration in minutes from start and end strings.
 */
export function calculateSlotDurationMinutes(startAt: string, endAt: string): number {
  if (!startAt || !endAt) return 30;

  // Try parsing as ISO or full dates
  const startMs = Date.parse(startAt);
  const endMs = Date.parse(endAt);
  if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
    return Math.max(15, Math.round((endMs - startMs) / 60_000));
  }

  // Try parsing as "HH:mm"
  const startMatch = /(\d{1,2}):(\d{2})/.exec(startAt);
  const endMatch = /(\d{1,2}):(\d{2})/.exec(endAt);
  if (startMatch && endMatch) {
    const sMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
    const eMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
    if (eMinutes > sMinutes) {
      return eMinutes - sMinutes;
    }
  }

  return 30;
}

/**
 * Categorizes time of day into morning, afternoon, or evening.
 */
export function getTimeOfDayCategory(timeOrIso: string): TimeOfDay {
  if (!timeOrIso) return "morning";

  let hour = 10;
  const dateObj = new Date(timeOrIso);
  if (!Number.isNaN(dateObj.getTime()) && timeOrIso.includes("T")) {
    hour = dateObj.getHours();
  } else {
    const match = /(\d{1,2}):(\d{2})/.exec(timeOrIso);
    if (match) {
      hour = Number(match[1]);
    }
  }

  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Detects waitlist urgency from explicit field, priorityLevel, or natural text.
 */
export function detectCandidateUrgency(
  item: WaitlistEntryLike | string | null | undefined,
): WaitlistUrgency {
  if (!item) return "routine";

  if (typeof item === "string") {
    const text = item.toLowerCase();
    if (
      text.includes("острая") ||
      text.includes("боль") ||
      text.includes("cito") ||
      text.includes("неотложн") ||
      text.includes("пульпит")
    ) {
      return "acute_pain";
    }
    if (
      text.includes("орто") ||
      text.includes("эндо") ||
      text.includes("канал") ||
      text.includes("коронк") ||
      text.includes("брекет") ||
      text.includes("элайнер")
    ) {
      return "ortho_endo";
    }
    if (
      text.includes("гигиен") ||
      text.includes("чистк") ||
      text.includes("airflow") ||
      text.includes("air-flow")
    ) {
      return "hygiene";
    }
    return "routine";
  }

  const prio = (item.priorityLevel || "").toLowerCase();
  const explicitUrgency = (item.urgency || "").toLowerCase();

  if (
    explicitUrgency === "acute_pain" ||
    prio === "urgent" ||
    prio === "acute_pain" ||
    prio === "high"
  ) {
    return "acute_pain";
  }
  if (explicitUrgency === "ortho_endo" || prio === "treatment_plan") {
    return "ortho_endo";
  }
  if (explicitUrgency === "hygiene") {
    return "hygiene";
  }
  if (explicitUrgency === "routine") {
    return "routine";
  }

  const text = `${item.notes || ""} ${item.treatmentCategory || ""} ${item.reason || ""}`.toLowerCase();
  if (
    text.includes("острая") ||
    text.includes("боль") ||
    text.includes("cito") ||
    text.includes("неотложн") ||
    text.includes("пульпит")
  ) {
    return "acute_pain";
  }
  if (
    text.includes("орто") ||
    text.includes("эндо") ||
    text.includes("канал") ||
    text.includes("коронк") ||
    text.includes("брекет") ||
    text.includes("элайнер")
  ) {
    return "ortho_endo";
  }
  if (
    text.includes("гигиен") ||
    text.includes("чистк") ||
    text.includes("airflow") ||
    text.includes("air-flow")
  ) {
    return "hygiene";
  }

  return "routine";
}

/**
 * Checks whether candidate's preferred time of day matches the target slot's time of day.
 */
export function checkCandidateTimeOfDayFit(
  slotTimeOfDay: TimeOfDay,
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
  notes?: string | null,
): { fits: boolean; hasSpecificPreference: boolean } {
  if (notes) {
    const textPool = notes.toLowerCase();
    if (slotTimeOfDay === "morning" && textPool.includes("утр")) {
      return { fits: true, hasSpecificPreference: true };
    }
    if (slotTimeOfDay === "afternoon" && textPool.includes("день")) {
      return { fits: true, hasSpecificPreference: true };
    }
    if (slotTimeOfDay === "evening" && textPool.includes("вечер")) {
      return { fits: true, hasSpecificPreference: true };
    }
  }

  if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
    return { fits: true, hasSpecificPreference: false };
  }

  let foundMatch = false;
  let hasRestriction = false;

  for (const tr of preferredTimeRanges) {
    const str = `${tr?.slot || ""} ${tr?.day || ""}`.toLowerCase();
    if (!str.trim()) continue;

    if (str.includes("any") || str.includes("любое") || str.includes("весь")) {
      return { fits: true, hasSpecificPreference: false };
    }

    hasRestriction = true;

    if (
      slotTimeOfDay === "morning" &&
      (str.includes("утр") || str.includes("morning") || str.includes("09:00") || str.includes("10:00") || str.includes("11:00"))
    ) {
      foundMatch = true;
      break;
    }
    if (
      slotTimeOfDay === "afternoon" &&
      (str.includes("день") || str.includes("day") || str.includes("12:00") || str.includes("13:00") || str.includes("14:00") || str.includes("15:00") || str.includes("16:00"))
    ) {
      foundMatch = true;
      break;
    }
    if (
      slotTimeOfDay === "evening" &&
      (str.includes("вечер") || str.includes("evening") || str.includes("17:00") || str.includes("18:00") || str.includes("19:00") || str.includes("20:00"))
    ) {
      foundMatch = true;
      break;
    }
  }

  if (!hasRestriction) {
    return { fits: true, hasSpecificPreference: false };
  }

  return { fits: foundMatch, hasSpecificPreference: true };
}

/**
 * Calculates waiting days from creation date.
 */
export function calculateWaitingDays(
  createdAt?: string | Date | null,
  explicitDays?: number | null,
  now: Date | number = new Date(),
): number {
  if (typeof explicitDays === "number" && explicitDays >= 0) {
    return explicitDays;
  }
  if (!createdAt) return 0;

  const createdMs = createdAt instanceof Date ? createdAt.getTime() : Date.parse(String(createdAt));
  if (Number.isNaN(createdMs)) return 0;

  const nowMs = typeof now === "number" ? now : now.getTime();
  const diffMs = nowMs - createdMs;
  return Math.max(0, Math.floor(diffMs / 86400000));
}

/**
 * Generates a 152-FZ compliant notification message for WhatsApp/SMS.
 * Invariant: ZERO disclosure of medical diagnosis, tooth FDI, clinical status,
 * or procedure details over insecure transport.
 */
export function generate152FzSlotOfferMessage(params: {
  patientName?: string | null | undefined;
  doctorName?: string | null | undefined;
  startsAt: string;
  clinicName?: string;
  durationMinutes?: number;
}): string {
  const politeName = extractPoliteName(params.patientName);
  const dateObj = new Date(params.startsAt);
  const now = new Date();

  const isToday =
    !Number.isNaN(dateObj.getTime()) &&
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    !Number.isNaN(dateObj.getTime()) &&
    dateObj.getFullYear() === tomorrow.getFullYear() &&
    dateObj.getMonth() === tomorrow.getMonth() &&
    dateObj.getDate() === tomorrow.getDate();

  let dateWord = "сегодня";
  if (isTomorrow) {
    dateWord = "завтра";
  } else if (!isToday && !Number.isNaN(dateObj.getTime())) {
    dateWord = dateObj.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
  }

  let timeStr = "10:00";
  if (params.startsAt && params.startsAt.includes("T")) {
    timeStr = params.startsAt.split("T")[1]?.slice(0, 5) || "10:00";
  } else if (!Number.isNaN(dateObj.getTime())) {
    timeStr = dateObj.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (params.startsAt.includes(":")) {
    timeStr = params.startsAt.slice(0, 5);
  }

  const docSalutation = params.doctorName
    ? formatDoctorSalutation(params.doctorName)
    : null;
  const clinicNameStr = params.clinicName ? `«${params.clinicName}»` : "";

  let whoPhrase = "В клинике";
  if (docSalutation && clinicNameStr) {
    whoPhrase = `В клинике ${clinicNameStr} у ${docSalutation}`;
  } else if (docSalutation) {
    whoPhrase = `У ${docSalutation}`;
  } else if (clinicNameStr) {
    whoPhrase = `В клинике ${clinicNameStr}`;
  }

  const durationStr = params.durationMinutes ? ` (${params.durationMinutes} мин)` : "";

  return `Здравствуйте, ${politeName}! ${whoPhrase} освободилось время ${dateWord} в ${timeStr}${durationStr}. Сможете подойти?`;
}

/**
 * Generates WhatsApp click-to-chat URL.
 */
export function generateWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string {
  if (!phone) return "";
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Directly opens WhatsApp chat in window/browser.
 */
export function openWhatsAppLinkDirect(
  phone: string | null | undefined,
  message: string,
): void {
  const url = generateWhatsAppLink(phone, message);
  if (url && typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Main Smart Slot Recovery matching and ranking function.
 * Evaluates waitlist candidates for a freed slot and returns top candidates with relevance score 0..100.
 */
export function matchWaitlistCandidatesForSlot(
  params: MatchWaitlistSlotParams,
): SmartSlotRecoveryResult {
  const {
    doctorId,
    doctorSpecialty,
    doctorName,
    chairId,
    chairName,
    startAt,
    endAt,
    date = startAt?.includes("T") ? startAt.split("T")[0] : new Date().toISOString().slice(0, 10),
    waitlistEntries = [],
    limit = 3,
    clinicName = "DENTE",
    now = new Date(),
  } = params;

  const slotDurationMinutes = calculateSlotDurationMinutes(startAt, endAt);
  const timeOfDayCategory = getTimeOfDayCategory(startAt);

  const nowMs = now instanceof Date ? now.getTime() : (typeof now === "number" ? now : Date.now());
  const docSpecLower = doctorSpecialty ? doctorSpecialty.toLowerCase() : null;
  let candidateSeq = 0;
  let totalEligibleWaitlist = 0;
  const scoredCandidates: SmartSlotCandidateMatch[] = [];

  for (let i = 0; i < waitlistEntries.length; i++) {
    const entry = waitlistEntries[i];
    if (!entry) continue;
    const st = entry.status;
    if (st) {
      const stLower = st.toLowerCase();
      if (stLower !== "waiting" && stLower !== "active") {
        continue;
      }
    }

    totalEligibleWaitlist += 1;
    candidateSeq += 1;

    const candidateId = entry.id || entry.entryId || `cand-${candidateSeq}`;
    const patientId = entry.patientId || candidateId;
    const patientName = entry.patientName || "Пациент";
    const phone = entry.patientPhone || entry.phone || null;
    const procedureName =
      entry.treatmentCategory ||
      entry.notes ||
      entry.reason ||
      "Консультация и осмотр";

    const urgency = detectCandidateUrgency(entry);
    const urgencyLabel = URGENCY_LABELS[urgency];
    const matchReasons: string[] = [];

    let score = 10; // Baseline points

    // 1. Doctor & Specialization match (max 35 pts)
    if (doctorId && entry.preferredDoctorId && entry.preferredDoctorId === doctorId) {
      score += 35;
      matchReasons.push("Желаемый врач совпадает");
    } else if (!entry.preferredDoctorId) {
      score += 20;
      matchReasons.push("Любой врач клиники");
    } else if (docSpecLower && entry.treatmentCategory) {
      const tcLower = entry.treatmentCategory.toLowerCase();
      if (tcLower.includes(docSpecLower) || docSpecLower.includes(tcLower)) {
        score += 15;
        matchReasons.push("Специализация врача совпадает");
      }
    }

    // 2. Desired time of day match (max 20 pts)
    const timeFit = checkCandidateTimeOfDayFit(
      timeOfDayCategory,
      entry.preferredTimeRanges,
      entry.notes,
    );

    if (timeFit.fits && timeFit.hasSpecificPreference) {
      score += 20;
      const todLabel =
        timeOfDayCategory === "morning"
          ? "Утреннее время (желаемое)"
          : timeOfDayCategory === "afternoon"
            ? "Дневное время (желаемое)"
            : "Вечернее время (желаемое)";
      matchReasons.push(todLabel);
    } else if (timeFit.fits) {
      score += 15;
      matchReasons.push("Время слота подходит");
    }

    // 3. Slot duration fit (max 15 pts)
    let estimatedNeededDuration = 30;
    if (typeof entry.desiredDurationMinutes === "number" && entry.desiredDurationMinutes > 0) {
      estimatedNeededDuration = entry.desiredDurationMinutes;
    } else if (urgency === "acute_pain") {
      estimatedNeededDuration = 30;
    } else if (urgency === "hygiene" || urgency === "ortho_endo") {
      estimatedNeededDuration = 60;
    }

    if (slotDurationMinutes >= estimatedNeededDuration) {
      score += 15;
      matchReasons.push(`Слот ${slotDurationMinutes} мин подходит`);
    } else if (slotDurationMinutes >= 30 && estimatedNeededDuration - slotDurationMinutes <= 15) {
      score += 5;
      matchReasons.push(`Слот ${slotDurationMinutes} мин (экспресс)`);
    }

    // 4. Urgency & Priority (max 25 pts)
    if (urgency === "acute_pain") {
      score += 25;
      matchReasons.push("Острая боль (наивысший приоритет)");
    } else if (urgency === "ortho_endo") {
      score += 15;
      matchReasons.push("Продолжение орто/эндо");
    } else if (urgency === "hygiene") {
      score += 10;
      matchReasons.push("Профгигиена");
    } else {
      score += 5;
    }

    // 5. Waiting duration (max 10 pts)
    const waitingDays = calculateWaitingDays(entry.createdAt, entry.waitingDays, nowMs);
    if (waitingDays >= 7) {
      score += 10;
      matchReasons.push(`Ожидает ${waitingDays} дн. (длительное ожидание)`);
    } else if (waitingDays >= 3) {
      score += 5;
      matchReasons.push(`Ожидает ${waitingDays} дн.`);
    } else if (waitingDays >= 1) {
      score += 2;
    }

    // 6. Same Chair match (bonus 5 pts)
    if (chairId) {
      score += 5;
    }

    const rawScore = score;
    const finalScore = Math.min(100, Math.max(0, Math.round(score)));

    let createdMs = 0;
    if (entry.createdAt) {
      createdMs = entry.createdAt instanceof Date ? entry.createdAt.getTime() : (Date.parse(String(entry.createdAt)) || 0);
    }

    scoredCandidates.push({
      candidate: entry,
      id: candidateId,
      patientId,
      patientName,
      phone,
      procedureName,
      score: finalScore,
      rawScore,
      urgency,
      urgencyLabel,
      matchReasons,
      waitingDays,
      createdMs,
      timeOfDayCategory,
      slotDurationMinutes,
      offerMessage: "",
      whatsappUrl: "",
    });
  }

  const urgencyPriorityOrder: Record<WaitlistUrgency, number> = {
    acute_pain: 40,
    ortho_endo: 30,
    hygiene: 20,
    routine: 10,
  };

  // Sort descending by raw score, then clinical urgency (acute pain first), then waitingDays, then createdAt
  scoredCandidates.sort((a, b) => {
    const rawB = b.rawScore ?? b.score;
    const rawA = a.rawScore ?? a.score;
    if (rawB !== rawA) {
      return rawB - rawA;
    }
    const urgB = urgencyPriorityOrder[b.urgency] ?? 0;
    const urgA = urgencyPriorityOrder[a.urgency] ?? 0;
    if (urgB !== urgA) {
      return urgB - urgA;
    }
    if (b.waitingDays !== a.waitingDays) {
      return b.waitingDays - a.waitingDays;
    }
    return (a.createdMs ?? 0) - (b.createdMs ?? 0);
  });

  // Materialize 152-FZ offer messages and WhatsApp URLs only for top matched candidates
  const matches: SmartSlotCandidateMatch[] = scoredCandidates
    .slice(0, Math.max(1, limit))
    .map((candidate) => {
      const offerMessage = generate152FzSlotOfferMessage({
        patientName: candidate.patientName,
        doctorName,
        startsAt: startAt,
        clinicName,
        durationMinutes: slotDurationMinutes,
      });

      const whatsappUrl = generateWhatsAppLink(candidate.phone, offerMessage);

      return {
        ...candidate,
        offerMessage,
        whatsappUrl,
      };
    });

  return {
    slot: {
      startAt,
      endAt,
      date: String(date),
      durationMinutes: slotDurationMinutes,
      timeOfDayCategory,
      doctorId,
      doctorName,
      chairId,
      chairName,
    },
    matches,
    totalEligibleWaitlist,
  };
}

export default matchWaitlistCandidatesForSlot;
