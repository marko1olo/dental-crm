/**
 * waitlistTypes.ts — Единый SSOT типов, чистых хелперов и детерминированного сопоставления
 * для листа ожидания клиники DENTE (Мандат 8ap: Ноль regex-скоринга, строго типизированные поля).
 */

export type WaitlistUrgency =
  | "urgent"
  | "acute_pain"
  | "treatment_plan"
  | "ortho_endo"
  | "vip"
  | "hygiene"
  | "routine";

export type WaitlistPriorityLevel =
  | "urgent"
  | "acute_pain"
  | "high"
  | "treatment_plan"
  | "vip"
  | "medium"
  | "low"
  | "routine";

export interface TargetSlotInfo {
  appointmentId: string;
  startsAt: string;
  endsAt: string;
  doctorUserId?: string | null;
  doctorName?: string | null;
  chairId?: string | null;
  chairName?: string | null;
  freedBecause?: string | null;
  treatmentCategory?: string | null;
}

export interface WaitlistTimeRange {
  day?: string;
  slot?: string;
  notes?: string;
  urgency?: string;
  treatmentCategory?: string;
}

export interface WaitlistCandidateItem {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  preferredDoctorId?: string | null;
  preferredDoctorName?: string | null;
  priorityLevel?: string | null;
  urgency?: WaitlistUrgency | string | null;
  treatmentCategory?: string | null;
  preferredTimeRanges?: WaitlistTimeRange[] | null;
  preferredDays?: string[];
  preferredTimeOfDay?: string[];
  notes?: string | null;
  status?: "waiting" | "active" | "booked" | "cancelled" | string | null;
  createdAt?: string;
}

// Алиас для обратной совместимости со старыми модулями
export type WaitlistPatientEntry = WaitlistCandidateItem;

export interface CandidateScoreResult {
  score: number;
  sameDoctor: boolean;
  sameChair: boolean;
  timeFits: boolean;
  urgency: WaitlistUrgency;
  urgencyLabel: string;
  matchReasons: string[];
  mismatchReasons?: string[];
  rating?: "excellent" | "good" | "moderate" | "poor";
  dayFits?: boolean;
  categoryFits?: boolean;
  priorityRank?: number;
}

export type WaitlistMatchScore = CandidateScoreResult;

export const URGENCY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; color: string; weight: number; rank: number }
> = {
  urgent: { label: "Острая боль", badgeClass: "badge-error", color: "var(--danger, #ef4444)", weight: 40, rank: 4 },
  acute_pain: { label: "Острая боль", badgeClass: "badge-error", color: "var(--danger, #ef4444)", weight: 40, rank: 4 },
  treatment_plan: { label: "По плану лечения", badgeClass: "badge-warning", color: "var(--amber, #f59e0b)", weight: 30, rank: 3 },
  ortho_endo: { label: "Продолжение орто/эндо", badgeClass: "badge-warning", color: "var(--amber, #f59e0b)", weight: 30, rank: 3 },
  vip: { label: "VIP пациент", badgeClass: "badge-primary", color: "var(--primary, #0d9488)", weight: 25, rank: 2 },
  hygiene: { label: "Профгигиена", badgeClass: "badge-info", color: "var(--info, #3b82f6)", weight: 20, rank: 1.5 },
  routine: { label: "Плановый приём", badgeClass: "badge-neutral", color: "var(--text-muted, #64748b)", weight: 10, rank: 1 },
  high: { label: "Высокий приоритет", badgeClass: "badge-error", color: "var(--danger, #ef4444)", weight: 35, rank: 3.5 },
  medium: { label: "Средний приоритет", badgeClass: "badge-neutral", color: "var(--text-muted, #64748b)", weight: 15, rank: 1.5 },
  low: { label: "Низкий приоритет", badgeClass: "badge-neutral", color: "var(--text-muted, #64748b)", weight: 5, rank: 0.5 },
};

export const PRIORITY_CONFIG = URGENCY_CONFIG;

export const TREATMENT_CATEGORIES: readonly string[] = [
  "Терапия",
  "Ортопедия",
  "Хирургия",
  "Ортодонтия",
  "Пародонтология",
  "Профгигиена",
  "Детская стоматология",
] as const;

/**
 * Детерминированное распознавание срочности (Мандат 8ap):
 * Строго по типизированным полям базы данных и API, ноль regex-парсинга свободных заметок.
 */
export function detectWaitlistUrgency(
  item?:
    | {
        priorityLevel?: string | null;
        urgency?: string | null;
        treatmentCategory?: string | null;
      }
    | string
    | null,
  explicitPriority?: string | null,
): WaitlistUrgency {
  if (!item && !explicitPriority) return "routine";

  const prio = typeof item === "string" ? explicitPriority || item : item?.priorityLevel || explicitPriority;
  const urg = typeof item === "object" && item ? item.urgency : null;

  if (urg === "urgent" || urg === "acute_pain" || prio === "urgent" || prio === "acute_pain" || prio === "high") {
    return "acute_pain";
  }
  if (urg === "treatment_plan" || urg === "ortho_endo" || prio === "treatment_plan") {
    return "ortho_endo";
  }
  if (urg === "vip" || prio === "vip") {
    return "vip";
  }
  if (urg === "hygiene" || prio === "hygiene") {
    return "hygiene";
  }
  return "routine";
}

/**
 * Имя и отчество для вежливого обращения.
 */
export function extractPatientPoliteName(fullName?: string | null): string {
  if (!fullName || typeof fullName !== "string") return "Пациент";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Пациент";
  if (parts.length === 1) return parts[0]!;
  if (parts.length >= 3) {
    // Иванов Иван Иванович -> Иван Иванович
    return `${parts[1]} ${parts[2]}`;
  }
  // Петрова Анна -> Анна
  return parts[1] || parts[0]!;
}

/**
 * Вежливое форматирование имени врача.
 */
export function formatDoctorSalutation(doctorName?: string | null): string {
  if (!doctorName || typeof doctorName !== "string") return "доктора";
  const cleaned = doctorName.replace(/^(д-р|врач|доктор)\s+/i, "").trim();
  if (!cleaned) return "доктора";
  return `доктора ${cleaned}`;
}

/**
 * Генерация вежливого предложения окна без раскрытия диагнозов (Медицинская тайна 323-ФЗ).
 */
export function generateWaitlistOfferMessage(params: {
  patientName?: string | null;
  doctorName?: string | null;
  startsAt?: string | null;
  clinicName?: string | null;
}): string {
  const politeName = extractPatientPoliteName(params.patientName);
  const clinic = params.clinicName || "Стоматология DENTE";
  const doctorSalutation = formatDoctorSalutation(params.doctorName);

  let timeStr = "";
  if (params.startsAt) {
    try {
      const date = new Date(params.startsAt);
      if (!Number.isNaN(date.getTime())) {
        const timeMatch = /T(\d{2}):(\d{2})/.exec(params.startsAt);
        const hours = timeMatch ? timeMatch[1] : String(date.getHours()).padStart(2, "0");
        const minutes = timeMatch ? timeMatch[2] : String(date.getMinutes()).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        timeStr = `на ${day}.${month} в ${hours}:${minutes}`;
      }
    } catch {
      timeStr = "";
    }
  }

  const timePart = timeStr ? ` ${timeStr}` : "";
  return `Здравствуйте, ${politeName}! В клинике ${clinic} освободилось окно к ${doctorSalutation}${timePart}. Вы оставляли заявку в листе ожидания. Сможете подойти?`;
}

// Алиас для обратной совместимости
export function generateWhatsAppOfferMessage(params: {
  patientName?: string | null;
  doctorName?: string | null;
  slotStartsAt?: string | null;
  clinicName?: string | null;
}): string {
  const pName = params.patientName ? params.patientName.trim() : "Пациент";
  const clinic = params.clinicName || "Стоматология DENTE";
  const doc = params.doctorName ? params.doctorName.trim() : "врачу клиники";

  let timeStr = "";
  if (params.slotStartsAt) {
    const timeMatch = /T(\d{2}):(\d{2})/.exec(params.slotStartsAt);
    if (timeMatch) timeStr = ` в ${timeMatch[1]}:${timeMatch[2]}`;
  }

  return `Здравствуйте, ${pName}! В ${clinic} к специалисту ${doc} освободилось окно${timeStr}. Ответьте ДА или позвоните нам.`;
}

const WEEKDAY_NAMES: Readonly<Record<string, number>> = {
  вс: 0, воскресенье: 0, sunday: 0, sun: 0,
  пн: 1, понедельник: 1, monday: 1, mon: 1,
  вт: 2, вторник: 2, tuesday: 2, tue: 2,
  ср: 3, среда: 3, wednesday: 3, wed: 3,
  чт: 4, четверг: 4, thursday: 4, thu: 4,
  пт: 5, пятница: 5, friday: 5, fri: 5,
  сб: 6, суббота: 6, saturday: 6, sat: 6,
};

export function parsePreferredWeekday(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw >= 0 && raw <= 6 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  const byName = WEEKDAY_NAMES[value];
  if (byName !== undefined) return byName;
  if (/^[0-6]$/.test(value)) return Number(value);
  const asDate = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : null;
  if (asDate && !Number.isNaN(asDate.getTime())) return asDate.getDay();
  return null;
}

export function parseTimeToMinutes(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const clean = raw.trim();
  const m = /(\d{1,2}):(\d{2})/.exec(clean);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Проверка соответствия времени и дня недели слота желаемым интервалам пациента.
 */
export function checkTimeWindowFit(
  slotStartsAt: string,
  preferredTimeRanges?: Array<{ day?: string; slot?: string }> | any,
  preferredDays?: string[],
  preferredTimeOfDay?: string[],
): boolean {
  if (!slotStartsAt) return true;

  const date = new Date(slotStartsAt);
  const timeMatch = /T(\d{2}):(\d{2})/.exec(slotStartsAt);
  const hour = timeMatch ? Number(timeMatch[1]) : !Number.isNaN(date.getTime()) ? date.getHours() : 10;
  const minute = timeMatch ? Number(timeMatch[2]) : !Number.isNaN(date.getTime()) ? date.getMinutes() : 0;
  const slotMinute = hour * 60 + minute;
  const slotWeekday = !Number.isNaN(date.getTime()) ? date.getDay() : null;
  const isWeekend = slotWeekday === 0 || slotWeekday === 6;
  const dateStrMatch = /^(\d{4}-\d{2}-\d{2})/.exec(slotStartsAt);
  const slotDateStr = dateStrMatch ? dateStrMatch[1] : null;

  const isMorning = slotMinute >= 8 * 60 && slotMinute < 12 * 60;
  const isDay = slotMinute >= 12 * 60 && slotMinute < 17 * 60;
  const isEvening = slotMinute >= 17 * 60 && slotMinute <= 21 * 60;

  // 1. Проверка по preferredDays (weekdays vs weekend)
  if (preferredDays && preferredDays.length > 0) {
    const wantsWeekdays = preferredDays.includes("weekdays");
    const wantsWeekend = preferredDays.includes("weekend");
    if (wantsWeekdays && !wantsWeekend && isWeekend) return false;
    if (wantsWeekend && !wantsWeekdays && !isWeekend) return false;
  }

  // 2. Проверка по preferredTimeOfDay (morning, day, evening)
  if (preferredTimeOfDay && preferredTimeOfDay.length > 0) {
    const matchesTimeOfDay = preferredTimeOfDay.some((tod) => {
      if (tod === "morning" && isMorning) return true;
      if (tod === "day" && isDay) return true;
      if (tod === "evening" && isEvening) return true;
      if (tod === "any") return true;
      return false;
    });
    if (!matchesTimeOfDay) return false;
  }

  // 3. Проверка по preferredTimeRanges
  if (Array.isArray(preferredTimeRanges) && preferredTimeRanges.length > 0) {
    return preferredTimeRanges.some((tr) => {
      if (!tr || typeof tr !== "object") return true;
      const dayStr = String(tr.day || "").trim().toLowerCase();
      const slotStr = String(tr.slot || "").trim().toLowerCase();

      let dayFits = true;
      if (dayStr && !dayStr.includes("any") && !dayStr.includes("любой") && !dayStr.includes("all")) {
        if (dayStr.includes("weekend") || dayStr.includes("выходн")) dayFits = isWeekend;
        else if (dayStr.includes("weekdays") || dayStr.includes("будни")) dayFits = !isWeekend;
        else if (slotDateStr && dayStr === slotDateStr) dayFits = true;
        else {
          const parsedDay = parsePreferredWeekday(dayStr);
          if (parsedDay !== null && slotWeekday !== null) dayFits = parsedDay === slotWeekday;
        }
      }
      if (!dayFits) return false;

      if (!slotStr || slotStr.includes("any") || slotStr.includes("любое") || slotStr.includes("весь")) return true;

      const intervalParts = slotStr.split(/[-–—]/);
      if (intervalParts.length === 2) {
        const fromMin = parseTimeToMinutes(intervalParts[0]);
        const toMin = parseTimeToMinutes(intervalParts[1]);
        if (fromMin !== null && toMin !== null && toMin > fromMin) {
          return slotMinute >= fromMin && slotMinute <= toMin;
        }
      }

      const singleMin = parseTimeToMinutes(slotStr);
      if (singleMin !== null) return slotMinute >= singleMin && slotMinute < singleMin + 30;

      if (isMorning && (slotStr.includes("утр") || slotStr.includes("morning") || slotStr.includes("09:00"))) return true;
      if (isDay && (slotStr.includes("день") || slotStr.includes("day") || slotStr.includes("12:00"))) return true;
      if (isEvening && (slotStr.includes("вечер") || slotStr.includes("evening") || slotStr.includes("17:00"))) return true;

      return false;
    });
  }

  return true;
}

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
