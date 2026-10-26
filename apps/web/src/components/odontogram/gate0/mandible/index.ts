/**
 * DENTE Dental CRM — Mandible Full Arch Module Index
 * Mandate 8b <= 120 lines.
 */

export { ToothMandibleFullArch } from "./ToothMandibleFullArch";
export { MandibleToothCell } from "./MandibleToothCell";
export { MandibleMidlineNotch } from "./MandibleMidlineNotch";
export { MandibleToothBadge } from "./MandibleToothBadge";
export { resolveMandibleToothComponent } from "./mandibleToothResolver";
export { toothDataToGate0Flags, cariesToToothDataUpdate } from "./toothDataAdapter";
export {
	QUADRANT_4_TEETH,
	QUADRANT_3_TEETH,
	MANDIBLE_TEETH,
	type MandibleToothNumber,
	type ToothMandibleFullArchProps,
	type MandibleToothCellProps,
} from "./mandibleTypes";
