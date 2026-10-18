import type { QuickBookingSlotInfo, QuickBookingStageService } from "../QuickBookingDrawerTypes";

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
