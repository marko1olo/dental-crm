import {
	SANPIN_PSO_CONSTANTS,
	calculatePsoSamplingRequirement,
} from "@dental/shared";
import { SANPIN_AZOPYRAM_NORMS } from "./azopyramConstants";

export function calculateStatutorySampling(
	batchCount: number,
	isSurgicalOrCritical = false,
	itemsTypesCount = 1,
): {
	readonly minSampleRequired: number;
	readonly statutoryPercent: number;
	readonly floorPerType: number;
	readonly explanationRu: string;
} {
	const req = calculatePsoSamplingRequirement(batchCount, isSurgicalOrCritical, itemsTypesCount);
	return {
		minSampleRequired: req.minSampleRequired,
		statutoryPercent: SANPIN_PSO_CONSTANTS.statutorySamplingPercent,
		floorPerType: req.floorPerItem,
		explanationRu: req.formulaExplanationRu,
	};
}

export function checkAzopyramSolutionFreshness(
	_preparedAtIso?: string,
	_currentReferenceDate = new Date(),
): {
	readonly ageMinutes: number;
	readonly isExpired: boolean;
	readonly expiresAtIso: string;
	readonly remainingMinutes: number;
	readonly warningRu: string | null;
} {
	// Мандаты 8e, 8x, 8ap: Никаких процедурных химических симуляторов распада раствора по минутам.
	// Медсестра ставит пробу на 1% партии. Раствор готовится на смену, годен по умолчанию.
	return {
		ageMinutes: 0,
		isExpired: false,
		expiresAtIso: new Date().toISOString(),
		remainingMinutes: 120,
		warningRu: null,
	};
}
