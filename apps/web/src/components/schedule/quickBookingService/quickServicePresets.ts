import {
  APPOINTMENT_TYPE_PRESETS,
  DURATION_PRESETS,
} from "../patientReliabilityScore";
import {
  COMMON_REASONS,
  type QuickBookingSlotInfo,
  type QuickBookingStageService,
} from "../QuickBookingDrawerTypes";
import type { QuickServicePreset } from "./types";
import {
  appendReasonPreset,
  hasTreatmentPlanStageContext,
  extractStageBookingServices,
} from "./quickServiceHelpers";

export {
  APPOINTMENT_TYPE_PRESETS,
  COMMON_REASONS,
  DURATION_PRESETS,
  appendReasonPreset,
  hasTreatmentPlanStageContext,
  extractStageBookingServices,
};

/**
 * Catalog of clinical quick-booking presets by dental specialty with standard duration in minutes.
 */
export const QUICK_SERVICE_PRESETS: readonly QuickServicePreset[] = [
  {
    id: "primary-exam",
    title: "Первичный осмотр",
    specialty: "general",
    durationMinutes: 30,
    appointmentType: "primary",
  },
  {
    id: "checkup",
    title: "Осмотр",
    specialty: "general",
    durationMinutes: 15,
    appointmentType: "primary",
  },
  {
    id: "caries",
    title: "Кариес",
    specialty: "therapist",
    durationMinutes: 60,
    appointmentType: "secondary",
  },
  {
    id: "pulpitis",
    title: "Пульпит",
    specialty: "therapist",
    durationMinutes: 90,
    appointmentType: "secondary",
  },
  {
    id: "hygiene",
    title: "Профгигиена",
    specialty: "periodontist",
    durationMinutes: 60,
    appointmentType: "secondary",
  },
  {
    id: "consultation",
    title: "Консультация",
    specialty: "general",
    durationMinutes: 30,
    appointmentType: "primary",
  },
  {
    id: "extraction",
    title: "Удаление",
    specialty: "surgeon",
    durationMinutes: 45,
    appointmentType: "secondary",
  },
  {
    id: "crown",
    title: "Коронка",
    specialty: "orthopedist",
    durationMinutes: 90,
    appointmentType: "secondary",
  },
  {
    id: "implantation",
    title: "Имплантация",
    specialty: "implantologist",
    durationMinutes: 90,
    appointmentType: "secondary",
  },
  {
    id: "emergency-pain",
    title: "Срочно! Острая боль",
    specialty: "general",
    durationMinutes: 30,
    appointmentType: "emergency",
  },
];
