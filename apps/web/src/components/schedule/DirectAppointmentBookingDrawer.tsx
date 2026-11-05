/**
 * DirectAppointmentBookingDrawer.tsx
 * Canonical SSOT for Direct Appointment Booking Drawer in DENTE Dental CRM.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo Doctor Sovereignty - No Mandatory Assistant), 8b (Sweet Spot).
 */

import React from "react";
import { QuickBookingDrawer } from "./QuickBookingDrawer";
import type { QuickBookingDrawerProps, QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";

export { QuickBookingDrawer };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

export const DirectAppointmentBookingDrawer: React.FC<QuickBookingDrawerProps> = (props) => {
	return <QuickBookingDrawer {...props} />;
};

export default DirectAppointmentBookingDrawer;
