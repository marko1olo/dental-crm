/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsTypes.ts
 * Типы химических индикаторов стерилизации. Мандат 8b: строго <= 120 строк.
 */

import type { SterilizationRegimeId } from "@dental/shared";

export type ChemicalIndicatorClassType = "class_4" | "class_5" | "class_6";

export type VisualIndicatorMatchState =
	| "match_reference"
	| "darker_than_reference"
	| "lighter_than_reference"
	| "unchanged_initial";

export interface ChemicalIntegratorDefinition {
	readonly id: string;
	readonly code: string;
	readonly nameRu: string;
	readonly shortLabelRu: string;
	readonly brandRu: string;
	readonly manufacturerRu: string;
	readonly classType: ChemicalIndicatorClassType;
	readonly classLabelRu: string;
	readonly regimeId: SterilizationRegimeId;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly initialColorHex: string;
	readonly initialColorNameRu: string;
	readonly targetColorHex: string;
	readonly targetColorNameRu: string;
	readonly placementLocationRu: string;
	readonly interpretationRuleRu: string;
	readonly isCriticalSurgeryRecommended: boolean;
	readonly sanpinNormClauseRu: string;
}

export interface IntegratorEvaluationResult {
	readonly isValid: boolean;
	readonly integrator: ChemicalIntegratorDefinition;
	readonly matchState: VisualIndicatorMatchState;
	readonly statusColorHex: string;
	readonly allowsClinicalUse: boolean;
	readonly verdictRu: string;
	readonly protocolNoteRu: string;
}
