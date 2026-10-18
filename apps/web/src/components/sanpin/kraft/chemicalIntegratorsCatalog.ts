/**
 * apps/web/src/components/sanpin/kraft/chemicalIntegratorsCatalog.ts
 *
 * Функции поиска и оценки химических индикаторов (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import type { SterilizationRegimeId } from "./kraftBagSanpinMath";
import {
	CHEMICAL_INTEGRATORS_CATALOG,
	type ChemicalIndicatorClassType,
	type ChemicalIntegratorDefinition,
} from "./chemicalIntegratorsData";

export * from "./chemicalIntegratorsData";

export type VisualIndicatorMatchState =
	| "match_reference"
	| "darker_than_reference"
	| "lighter_than_reference"
	| "unchanged_initial";

export interface IntegratorEvaluationResult {
	readonly isValid: boolean;
	readonly integrator: ChemicalIntegratorDefinition;
	readonly matchState: VisualIndicatorMatchState;
	readonly verdictRu: string;
	readonly statusColorHex: string;
	readonly allowsClinicalUse: boolean;
	readonly protocolNoteRu: string;
}

export function getAllChemicalIntegrators(): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG;
}

export function getChemicalIntegratorById(id: string): ChemicalIntegratorDefinition | undefined {
	return CHEMICAL_INTEGRATORS_CATALOG.find((c) => c.id === id || c.code === id);
}

export function getChemicalIntegratorsByClass(classType: ChemicalIndicatorClassType): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((c) => c.classType === classType);
}

export function getChemicalIntegratorsByRegime(regimeId: SterilizationRegimeId): readonly ChemicalIntegratorDefinition[] {
	return CHEMICAL_INTEGRATORS_CATALOG.filter((c) => c.regimeId === regimeId);
}

export function evaluateChemicalIntegratorColorMatch(
	integratorId: string,
	matchState: VisualIndicatorMatchState,
): IntegratorEvaluationResult {
	const integrator = getChemicalIntegratorById(integratorId) || CHEMICAL_INTEGRATORS_CATALOG[0]!;
	const isPass = matchState === "match_reference" || matchState === "darker_than_reference";

	return {
		isValid: isPass,
		integrator,
		matchState,
		statusColorHex: isPass ? "#10b981" : matchState === "lighter_than_reference" ? "#f59e0b" : "#ef4444",
		allowsClinicalUse: isPass,
		verdictRu: isPass
			? `Цвет метки соответствует эталону (${integrator.targetColorNameRu}). Стерилизация подтверждена.`
			: matchState === "unchanged_initial"
				? `КРИТИЧЕСКИЙ БРАК: Цвет метки не изменился (${integrator.initialColorNameRu}). Цикл не пройден.`
				: `БРАК: Цвет метки не соответствует эталону. Использование запрещено.`,
		protocolNoteRu: isPass
			? `Хим. контроль (${integrator.shortLabelRu}): СООТВЕТСТВУЕТ ЭТАЛОНУ. Допущен.`
			: `Хим. контроль (${integrator.shortLabelRu}): БРАК. Забраковано.`,
	};
}

export function getRecommendedIntegrator(
	regimeId: SterilizationRegimeId,
	options?: { forCriticalSurgery?: boolean; preferredClass?: ChemicalIndicatorClassType },
): ChemicalIntegratorDefinition {
	const candidates = getChemicalIntegratorsByRegime(regimeId);
	if (candidates.length === 0) return CHEMICAL_INTEGRATORS_CATALOG[0]!;

	if (options?.preferredClass) {
		const byClass = candidates.find((c) => c.classType === options.preferredClass);
		if (byClass) return byClass;
	}

	if (options?.forCriticalSurgery) {
		const class6 = candidates.find((c) => c.classType === "class_6");
		if (class6) return class6;
		const class5 = candidates.find((c) => c.classType === "class_5");
		if (class5) return class5;
	}

	return candidates[0]!;
}
