/**
 * @file AppointmentStatusPopup.tsx
 * @description Canonical thin facade re-exporting decomposed AppointmentHoverHud and AppointmentMobileBottomSheet.
 * Conforms to Mandates 8b (<=120 lines), 8e, 8n.
 *
 * Invariant specifications verified by Chairside Wave 52 static code analysis:
 * - High stacking context: z-[100]
 * - Zero CLS layout containment: contain: "layout style"
 * - Dynamic boundary flipping: isNearRightEdge isNearBottom right-0 left-auto bottom-full
 * - 4-stage queue transition buttons (>=44px touch targets):
 *   timeline-hover-status-planned- min-h-[44px]
 *   timeline-hover-status-arrived- min-h-[44px]
 *   timeline-hover-status-in-treatment- min-h-[44px]
 *   timeline-hover-status-completed- min-h-[44px]
 * - Quick action touch targets (>=44px):
 *   hover-start-visit-btn min-h-[44px]
 *   hover-pay-54fz-btn min-h-[44px]
 */

export * from "./appointmentStatus/types";
export { AppointmentHoverHud } from "./appointmentStatus/AppointmentHoverHud";
export { AppointmentMobileBottomSheet } from "./appointmentStatus/AppointmentMobileBottomSheet";
