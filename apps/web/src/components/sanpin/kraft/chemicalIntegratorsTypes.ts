/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsTypes.ts
 *
 * Типы химических индикаторов 4, 5 и 6 классов (СанПиН 3.3686-21, ГОСТ ISO 11140-1).
 * Мандат 8b: строго <= 120 строк.
 */

import type { SterilizationRegimeId } from "./kraftBagSanpinMath";

export type ChemicalIndicatorClassType = "class_4" | "class_5" | "class_6";

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
