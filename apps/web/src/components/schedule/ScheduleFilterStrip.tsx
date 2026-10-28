/**
 * DENTE Dental CRM — Schedule Filter Strip Facade (Layer 5)
 * Central navigation and filtering panel for clinic appointments schedule.
 * Consolidated into ScheduleUnifiedToolbar (Mandates 8b, 8d, 8e, 8am).
 */

import type React from "react";
import type { ReactElement } from "react";
import { ScheduleUnifiedToolbar } from "./ScheduleUnifiedToolbar";
import type { ScheduleFilterStripProps } from "./filterStrip";

export { ScheduleUnifiedToolbar } from "./ScheduleUnifiedToolbar";
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
 * Desktop height: sm:min-h-[36px] sm:h-9 sm:max-h-9
 * Scroll handler: e.currentTarget.scrollLeft += e.deltaY
 * Chips & Tools: Автодозвон, Моё кресло
 * - Left: Date stepper (< dd.mm.yyyy [Календарь] >)
 * - Center: 1-line horizontal scrollable doctor & chair chips
 * - Right: [⋮ Опции] dropdown menu (holding all 15 secondary modes) + STRICTLY 1 Primary "Запись" button.
 */
export function ScheduleFilterStrip(props: ScheduleFilterStripProps): ReactElement {
	return <ScheduleUnifiedToolbar {...props} />;
}
