/**
 * DENTE Dental CRM — Schedule Filter Strip Facade (Layer 5)
 * Central navigation and filtering panel for clinic appointments schedule.
 * Decomposed Facade: delegates to ./filterStrip/ (<800 lines per file, Mandate 8d, 8e)
 */

import type React from "react";
import type { ReactElement } from "react";
import { ScheduleFilterStripContent } from "./filterStrip";
import type { ScheduleFilterStripProps } from "./filterStrip";

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

/**
 * ScheduleFilterStrip component for filtering schedule view by date, doctor, or chair.
 * ZERO-CLUTTER LAW: Compressed into STRICTLY 1 COMPACT ROW (36px) with:
 * - Left: Date stepper (< dd.mm.yyyy [Календарь] >)
 * - Center: 1-line horizontal scrollable doctor & chair chips
 * - Right: [⋮ Опции] dropdown menu (holding all 15 secondary modes) + STRICTLY 1 Primary "+ Запись" button.
 */
export function ScheduleFilterStrip(props: ScheduleFilterStripProps): ReactElement {
	return <ScheduleFilterStripContent {...props} />;
}
