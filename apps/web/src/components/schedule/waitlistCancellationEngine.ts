/**
 * Core engine and helpers for Schedule Cancellation Auto-Fill & Waitlist Drawer.
 *
 * Compliant with:
 * - 152-FZ: polite communication without disclosing medical diagnosis, teeth numbers, or clinical reasons.
 * - StomX Parity: fast cancellation auto-fill matching doctor, chair, time window, and urgency.
 * - Scale Sovereignty: solo doctor & small clinic 1-click ergonomics.
 */

export type WaitlistUrgency =
  | "acute_pain" // Острая боль
  | "ortho_endo" // Продолжение орто/эндо
  | "hygiene" // Профгигиена
  | "routine"; // Плановый

export interface TargetSlotInfo {
  appointmentId?: string | null | undefined;
  startsAt: string; // ISO or YYYY-MM-DDTHH:mm
  endsAt: string;
  doctorUserId?: string | null | undefined;
  doctorName?: string | null | undefined;
  chairId?: string | null | undefined;
  chairName?: string | null | undefined;
  treatmentCategory?: string | null | undefined;
  freedBecause?: string | null | undefined;
  patientId?: string | null | undefined;
  patientName?: string | null | undefined;
  reason?: string | null | undefined;
}

export interface WaitlistCandidateItem {
  id: string;
  patientId: string;
  patientName: string | null;
  patientPhone: string | null;
  preferredDoctorId: string | null;
  preferredDoctorName: string | null;
  priorityLevel: "high" | "medium" | "low" | string;
  urgency?: WaitlistUrgency | string;
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any;
  treatmentCategory?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export interface CandidateScoreResult {
  score: number; // 0 to 100
  sameDoctor: boolean;
  sameChair: boolean;
  timeFits: boolean;
  urgency: WaitlistUrgency;
  urgencyLabel: string;
  matchReasons: string[];
}

export const URGENCY_CONFIG: Record<
  WaitlistUrgency,
  { label: string; shortLabel: string; badgeClass: string; weight: number }
> = {
  acute_pain: {
    label: "Острая боль",
    shortLabel: "Острая боль",
    badgeClass:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
    weight: 40,
  },
  ortho_endo: {
    label: "Продолжение орто/эндо",
    shortLabel: "Орто / Эндо",
    badgeClass:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-bold",
    weight: 25,
  },
  hygiene: {
    label: "Профгигиена",
    shortLabel: "Гигиена",
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 font-bold",
    weight: 15,
  },
  routine: {
    label: "Плановый приём",
    shortLabel: "Плановый",
    badgeClass:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/25 font-medium",
    weight: 5,
  },
};

/**
 * Extracts a respectful, polite Russian salutation from patient's full name.
 * Handles "Иванов Иван Иванович" -> "Иван Иванович"
 * Handles "Иванов Иван" -> "Иван"
 * Handles single names or unknown gracefully.
 */
export function extractPatientPoliteName(
  fullName: string | null | undefined,
): string {
  const raw = (fullName || "").trim();
  if (!raw) return "Пациент";
  const parts = raw.split(/\s+/).filter(Boolean);

  if (parts.length === 3) {
    // Russian surname + first name + patronymic
    return `${parts[1]} ${parts[2]}`;
  }
  if (parts.length === 2) {
    const p0 = parts[0]!;
    const p1 = parts[1]!;
    // Check typical Russian surname endings
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
 * Generates a 152-FZ compliant notification message for WhatsApp/SMS.
 * Invariant: ZERO disclosure of medical diagnosis, tooth FDI, clinical status,
 * or procedure details over insecure transport.
 *
 * Standard template:
 * «Здравствуйте, [Имя]! У доктора [Врач] в клинике «[Клиника]» освободилось время сегодня в [Время]. Сможете подойти?»
 */
export function generate152FzWaitlistOfferMessage(params: {
  patientName?: string | null | undefined;
  doctorName?: string | null | undefined;
  startsAt: string; // ISO or YYYY-MM-DDTHH:mm
  clinicName?: string;
}): string {
  const politeName = extractPatientPoliteName(params.patientName);
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

  return `Здравствуйте, ${politeName}! ${whoPhrase} освободилось время ${dateWord} в ${timeStr}. Сможете подойти?`;
}

/**
 * Detects waitlist urgency from explicit field, priorityLevel, or natural text.
 */
export function detectWaitlistUrgency(
  item?:
    | {
        priorityLevel?: string | null;
        urgency?: string | null;
        notes?: string | null;
        treatmentCategory?: string | null;
      }
    | string
    | null,
  explicitPriority?: string | null,
): WaitlistUrgency {
  if (!item && !explicitPriority) return "routine";

  if (typeof item === "string") {
    const text = item.toLowerCase();
    if (
      explicitPriority === "urgent" ||
      explicitPriority === "acute_pain" ||
      explicitPriority === "high" ||
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
      text.includes("элайнер") ||
      text.includes("слепок")
    ) {
      return "ortho_endo";
    }
    if (
      text.includes("гигиен") ||
      text.includes("чистк") ||
      text.includes("airflow") ||
      text.includes("air-flow") ||
      text.includes("уз") ||
      text.includes("отбеливан") ||
      text.includes("налет")
    ) {
      return "hygiene";
    }
    return "routine";
  }

  const prio = item?.priorityLevel || explicitPriority;
  if (
    item?.urgency === "acute_pain" ||
    prio === "urgent" ||
    prio === "acute_pain" ||
    prio === "high"
  ) {
    return "acute_pain";
  }
  if (item?.urgency === "ortho_endo" || prio === "treatment_plan") {
    return "ortho_endo";
  }
  if (item?.urgency === "hygiene") {
    return "hygiene";
  }

  const text =
    `${item?.notes || ""} ${item?.treatmentCategory || ""}`.toLowerCase();
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
    text.includes("элайнер") ||
    text.includes("слепок")
  ) {
    return "ortho_endo";
  }
  if (
    text.includes("гигиен") ||
    text.includes("чистк") ||
    text.includes("airflow") ||
    text.includes("air-flow") ||
    text.includes("уз") ||
    text.includes("отбеливан") ||
    text.includes("налет")
  ) {
    return "hygiene";
  }

  return "routine";
}

/**
 * Checks whether candidate's preferred time of day matches the target slot's hour.
 */
export function checkTimeWindowFit(
  slotStartsAt: string,
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
): boolean {
  if (!slotStartsAt) return true;
  const date = new Date(slotStartsAt);
  const hour = !Number.isNaN(date.getTime())
    ? date.getHours()
    : Number(slotStartsAt.split("T")[1]?.slice(0, 2) || 10);

  const isMorning = hour >= 8 && hour < 12;
  const isDay = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour <= 21;

  if (!Array.isArray(preferredTimeRanges) || preferredTimeRanges.length === 0) {
    return true; // No restrictions
  }

  return preferredTimeRanges.some((tr) => {
    const str = `${tr.slot || ""} ${tr.day || ""}`.toLowerCase();
    if (str.includes("any") || str.includes("любое") || str.includes("весь")) {
      return true;
    }
    if (
      isMorning &&
      (str.includes("утр") || str.includes("morning") || str.includes("09:00"))
    ) {
      return true;
    }
    if (
      isDay &&
      (str.includes("день") || str.includes("day") || str.includes("12:00"))
    ) {
      return true;
    }
    if (
      isEvening &&
      (str.includes("вечер") ||
        str.includes("evening") ||
        str.includes("17:00"))
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Scores a waitlist candidate for a freed target slot.
 * Returns score 0-100 and match reasons.
 */
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
    return {
      score,
      sameDoctor: false,
      sameChair: false,
      timeFits: true,
      urgency,
      urgencyLabel: urgencyCfg.label,
      matchReasons,
    };
  }

  // 1. Doctor match (35 pts)
  let sameDoctor = false;
  if (
    candidate.preferredDoctorId &&
    targetSlot.doctorUserId &&
    candidate.preferredDoctorId === targetSlot.doctorUserId
  ) {
    sameDoctor = true;
    score += 35;
    matchReasons.push("Желаемый врач совпадает");
  } else if (!candidate.preferredDoctorId) {
    sameDoctor = true;
    score += 25;
    matchReasons.push("Любой врач клиники");
  }

  // 2. Time window fit (20 pts)
  const timeFits = checkTimeWindowFit(
    targetSlot.startsAt,
    candidate.preferredTimeRanges,
  );
  if (timeFits) {
    score += 20;
    matchReasons.push("Время слота подходит");
  }

  // 3. Same chair preference (5 pts)
  let sameChair = false;
  if (targetSlot.chairId) {
    sameChair = true;
    score += 5;
  }

  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    sameDoctor,
    sameChair,
    timeFits,
    urgency,
    urgencyLabel: urgencyCfg.label,
    matchReasons,
  };
}

/**
 * Filter waitlist candidates based on active filter toolbar controls.
 */
export function filterWaitlistCandidates(
  items: WaitlistCandidateItem[],
  targetSlotOrFilters:
    | TargetSlotInfo
    | null
    | undefined
    | {
        searchQuery?: string | undefined;
        urgencyFilter?: WaitlistUrgency | "all" | undefined;
        urgency?: WaitlistUrgency | "all" | undefined;
        doctorFilter?: string | undefined;
        onlySameDoctor?: boolean | undefined;
        sameDoctorOnly?: boolean | undefined;
        targetSlot?: TargetSlotInfo | null | undefined;
      },
  maybeFilters?: {
    searchQuery?: string | undefined;
    urgencyFilter?: WaitlistUrgency | "all" | undefined;
    urgency?: WaitlistUrgency | "all" | undefined;
    doctorFilter?: string | undefined;
    onlySameDoctor?: boolean | undefined;
    sameDoctorOnly?: boolean | undefined;
    targetSlot?: TargetSlotInfo | null | undefined;
  },
): Array<{
  item: WaitlistCandidateItem;
  candidate: WaitlistCandidateItem;
  scoring: CandidateScoreResult;
}> {
  let targetSlot: TargetSlotInfo | null | undefined = null;
  // biome-ignore lint/suspicious/noExplicitAny: polymorphic options handling
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
  const onlySameDoctor = Boolean(
    filters.onlySameDoctor || filters.sameDoctorOnly,
  );

  const q = (searchQuery || "").trim().toLowerCase();

  return items
    .filter(
      (item) =>
        item.status === "active" || item.status === "waiting" || !item.status,
    )
    .map((item) => ({
      item,
      candidate: item,
      scoring: scoreWaitlistCandidate(item, targetSlot),
    }))
    .filter(({ item, scoring }) => {
      // Search query filter
      if (q) {
        const name = (item.patientName || "").toLowerCase();
        const phone = (item.patientPhone || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        const doc = (item.preferredDoctorName || "").toLowerCase();
        if (
          !name.includes(q) &&
          !phone.includes(q) &&
          !notes.includes(q) &&
          !doc.includes(q)
        ) {
          return false;
        }
      }

      // Urgency filter
      if (urgencyFilter && urgencyFilter !== "all") {
        if (scoring.urgency !== urgencyFilter) {
          return false;
        }
      }

      // Doctor match filters
      if (onlySameDoctor && targetSlot?.doctorUserId) {
        if (item.preferredDoctorId !== targetSlot.doctorUserId) {
          return false;
        }
      }

      if (doctorFilter && doctorFilter !== "all") {
        if (item.preferredDoctorId && item.preferredDoctorId !== doctorFilter) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.scoring.score - a.scoring.score);
}
