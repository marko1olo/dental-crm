import {
  QuickBookingDrawer,
  type QuickBookingDrawerProps,
  type QuickBookingSlotInfo,
} from "./QuickBookingDrawer";

export { QuickBookingDrawer };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

/**
 * AppointmentBookingModal — Single Source of Truth for Fast Booking (SSOT).
 * Unified with QuickBookingDrawer per Mandate 8b/8zi (Sweet Spot) and Mandate 8e/8n.
 */
export const AppointmentBookingModal = QuickBookingDrawer;
export default QuickBookingDrawer;
