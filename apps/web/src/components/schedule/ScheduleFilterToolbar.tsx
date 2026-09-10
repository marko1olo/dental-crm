import type React from "react";
import {
	DEFAULT_CLINIC_CHAIRS,
	formatChairSpecialtyLabel,
	type ScheduleChair,
	ScheduleFilterStrip,
	type ScheduleFilterStripProps,
	type ScheduleStaffMember,
} from "./ScheduleFilterStrip";

export type ScheduleFilterToolbarProps = ScheduleFilterStripProps;
export {
	DEFAULT_CLINIC_CHAIRS,
	formatChairSpecialtyLabel,
	type ScheduleChair,
	ScheduleFilterStrip,
	type ScheduleFilterStripProps,
	type ScheduleStaffMember,
};

/**
 * ScheduleFilterToolbar — Discoverable alias for ScheduleToolbar / ScheduleFilterStrip.
 * Compliance:
 * - Hick's Law & Mandate 8d / Apple HIG: Exactly 1 primary action row, 32–36px desktop height.
 * - StomX & IDENT Parity: Chair filters, doctor filters, shift toggles, and view mode switcher.
 */
export const ScheduleFilterToolbar: React.FC<ScheduleFilterToolbarProps> = (props) => {
	return <ScheduleFilterStrip {...props} />;
};

export default ScheduleFilterToolbar;
