/**
 * prescriptionFastSets.ts — Fast 1-Click Dental Prescription Presets
 * Decomposed module <= 120 lines (Mandate 8b).
 */

import {
	CORE_FAST_PRESCRIPTION_SETS,
	type DentalFastPrescriptionSet,
} from "./prescriptionFastSetsCore";
import { EXTENDED_FAST_PRESCRIPTION_SETS } from "./prescriptionFastSetsExtended";

export type { DentalFastPrescriptionSet };

export const DENTAL_FAST_PRESCRIPTION_SETS: readonly DentalFastPrescriptionSet[] =
	[...CORE_FAST_PRESCRIPTION_SETS, ...EXTENDED_FAST_PRESCRIPTION_SETS];
