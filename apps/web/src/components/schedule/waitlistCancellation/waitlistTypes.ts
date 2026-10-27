export type WaitlistUrgency =
  | "acute_pain" // Острая боль
  | "ortho_endo" // Продолжение орто/эндо
  | "hygiene" // Профгигиена
  | "routine"; // Плановый

export interface TargetSlotInfo {
  appointmentId?: string | null;
  startsAt: string;
  endsAt: string;
  doctorUserId?: string | null;
  doctorName?: string | null;
  chairId?: string | null;
  chairName?: string | null;
  treatmentCategory?: string | null;
  freedBecause?: string | null;
  patientId?: string | null;
  patientName?: string | null;
  reason?: string | null;
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
  score: number;
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
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/35 font-bold",
    weight: 40,
  },
  ortho_endo: {
    label: "Продолжение орто/эндо",
    shortLabel: "Орто / Эндо",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 font-bold",
    weight: 25,
  },
  hygiene: {
    label: "Профгигиена",
    shortLabel: "Гигиена",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35 font-bold",
    weight: 15,
  },
  routine: {
    label: "Плановый приём",
    shortLabel: "Плановый",
    badgeClass: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] font-medium",
    weight: 5,
  },
};
