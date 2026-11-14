/**
 * DENTE Dental CRM — Schedule Filter Strip Facade (Layer 5)
 * Central navigation and filtering panel for clinic appointments schedule.
 * Consolidated into ScheduleUnifiedToolbar (Mandates 8b, 8d, 8e, 8am).
 */

import React from "react";
import type { ReactElement } from "react";
import { ScheduleUnifiedToolbar } from "./ScheduleUnifiedToolbar";
import type { ScheduleFilterStripProps } from "./filterStrip";

export { ScheduleUnifiedToolbar, ScheduleUnifiedToolbar as ScheduleFilterStrip } from "./ScheduleUnifiedToolbar";
export { QuickAddChairModal, type QuickAddChairData } from "./QuickAddChairModal";

export type {
	ScheduleStaffMember,
	ScheduleBranch,
	ScheduleChair,
	ScheduleFilterStripProps,
	ShiftQueueCounts,
} from "./filterStrip";

export {
	DEFAULT_CLINIC_CHAIRS,
	formatChairSpecialtyLabel,
} from "./filterStrip";
