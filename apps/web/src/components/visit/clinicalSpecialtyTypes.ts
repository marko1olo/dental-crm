/**
 * apps/web/src/components/visit/clinicalSpecialtyTypes.ts
 *
 * Типы клинических разделов стоматологии у кресла врача (Мандат 8e).
 */

import type React from "react";

export const COMMON_FDI_TEETH = [
	16, 26, 36, 46, 11, 21, 31, 41, 14, 24, 34, 44, 18, 48,
];

export {
	UPPER_JAW_FDI_TEETH,
	LOWER_JAW_FDI_TEETH,
	ALL_ADULT_FDI_TEETH,
	INTACT_QUADRANTS,
	TOOTH_UI_STATE_LABELS,
	getToothColorVariant,
	getQuadrantForTooth,
	isPathologicalToothState,
	normalizeToothUiState,
	getDynamicPatientTeeth,
	type DynamicToothItem,
	type DynamicTeethResult,
	type IntactQuadrant,
	type QuadrantId,
	type ToothColorVariant,
} from "./dynamicTeethSelector";

export interface ClinicalSpecialtyItem {
	presetId: string;
	label: string;
	subtext?: string;
	compactSubtext?: string;
}

export interface ClinicalSpecialtySection {
	id: string;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	items: ClinicalSpecialtyItem[];
}
