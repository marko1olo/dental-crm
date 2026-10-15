/**
 * apps/web/src/components/schedule/smartSlotRecoveryTypes.ts
 * Types and constants for Smart Slot Recovery Engine.
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
  reasons?: string[] | undefined;
  isSameDoctor?: boolean | undefined;
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
