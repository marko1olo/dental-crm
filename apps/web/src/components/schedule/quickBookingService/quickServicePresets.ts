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

export { APPOINTMENT_TYPE_PRESETS, COMMON_REASONS, DURATION_PRESETS };

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
    specialty: "therapy",
    durationMinutes: 60,
    appointmentType: "secondary",
  },
  {
    id: "pulpitis",
    title: "Пульпит",
    specialty: "endodontics",
    durationMinutes: 90,
    appointmentType: "secondary",
  },
  {
    id: "hygiene",
    title: "Профгигиена",
    specialty: "periodontics",
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
    specialty: "surgery",
    durationMinutes: 45,
    appointmentType: "secondary",
  },
  {
    id: "crown",
    title: "Коронка",
    specialty: "prosthodontics",
    durationMinutes: 90,
    appointmentType: "secondary",
  },
  {
    id: "implantation",
    title: "Имплантация",
    specialty: "implantology",
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

/**
 * Appends a preset reason chip to the current reason text without duplicating commas.
 */
export function appendReasonPreset(currentReason: string, chipLabel: string): string {
  const cur = currentReason.trim();
  return cur ? `${cur}, ${chipLabel.toLowerCase()}` : chipLabel;
}

/**
 * Checks whether an initial booking slot carries treatment plan stage binding data.
 */
export function hasTreatmentPlanStageContext(
  initialSlot?: QuickBookingSlotInfo | null,
): boolean {
  return Boolean(
    initialSlot?.stageTitle ||
      initialSlot?.treatmentPlanId ||
      initialSlot?.stageId ||
      initialSlot?.services?.length ||
      initialSlot?.items?.length ||
      initialSlot?.procedures?.length,
  );
}

/**
 * Extracts normalized stage services list from an initial booking slot.
 */
export function extractStageBookingServices(
  initialSlot?: QuickBookingSlotInfo | null,
): QuickBookingStageService[] {
  return (
    initialSlot?.services ||
    initialSlot?.items ||
    initialSlot?.procedures ||
    []
  );
}
