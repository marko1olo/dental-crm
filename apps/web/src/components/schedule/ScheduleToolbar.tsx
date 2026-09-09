import type React from "react";
import {
	DEFAULT_CLINIC_CHAIRS,
	formatChairSpecialtyLabel,
	type ScheduleChair,
	ScheduleFilterStrip,
	type ScheduleFilterStripProps,
	type ScheduleStaffMember,
} from "./ScheduleFilterStrip";

export type ScheduleToolbarProps = ScheduleFilterStripProps;
export {
	DEFAULT_CLINIC_CHAIRS,
	formatChairSpecialtyLabel,
	type ScheduleChair,
	ScheduleFilterStrip,
	type ScheduleFilterStripProps,
	type ScheduleStaffMember,
};

/**
 * ScheduleToolbar — Unified 1-Row Compact Schedule Toolbar (Hick's Law & Mandate 8d / Apple HIG).
 * - Strictly locked to 32–36px in desktop mode, touch targets >= 44x44px for mobile/touch.
 * - 0 cartoon emojis (strictly Lucide vector icons).
 * - Hick's Law: exactly 1 primary "+ Запись" action on the face; all 15+ secondary modes in overflow dropdown.
 * - Date stepper with instant day switching and datepicker input.
 * - Fast mode switch between Timeline, Grid, and Chairs (StomX / DentalPRO parity).
 */
export const ScheduleToolbar: React.FC<ScheduleToolbarProps> = (props) => {
	return <ScheduleFilterStrip {...props} />;
};

export default ScheduleToolbar;
