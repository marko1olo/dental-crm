/**
 * prescriptionMnnData.ts — Composite Statutory MNN Catalog Array & Dictionary
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import { MNN_SYSTEMIC } from "./prescriptionMnnDataSystemic";
import { MNN_TOPICAL } from "./prescriptionMnnDataTopical";
import type { DentalMnnDefinition } from "./prescriptionMnnTypes";

export const DENTAL_STATUTORY_MNN_ARRAY: readonly DentalMnnDefinition[] = [
	...MNN_SYSTEMIC,
	...MNN_TOPICAL,
];

export const DENTAL_STATUTORY_MNN_CATALOG: readonly DentalMnnDefinition[] &
	Record<string, DentalMnnDefinition> = Object.assign(
	DENTAL_STATUTORY_MNN_ARRAY.map((item) => ({ ...item, key: item.id })),
	Object.fromEntries(
		DENTAL_STATUTORY_MNN_ARRAY.map((item) => [
			item.id,
			{ ...item, key: item.id },
		]),
	),
);
