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
	preparedAtIso: string,
	currentReferenceDate = new Date(),
): {
	readonly ageMinutes: number;
	readonly isExpired: boolean;
	readonly expiresAtIso: string;
	readonly remainingMinutes: number;
	readonly warningRu: string | null;
} {
	const preparedTime = new Date(preparedAtIso).getTime();
	const now = currentReferenceDate.getTime();
	const diffMs = Math.max(0, now - preparedTime);
	const ageMinutes = Math.floor(diffMs / (60 * 1000));
	const remainingMinutes = Math.max(0, SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes - ageMinutes);
	const isExpired = ageMinutes > SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes;

	const expiresAtDate = new Date(preparedTime + SANPIN_AZOPYRAM_NORMS.workingSolutionLifespanMinutes * 60 * 1000);
	const expiresAtIso = expiresAtDate.toISOString();

	let warningRu: string | null = null;
	if (isExpired) {
		warningRu = `КРИТИЧЕСКИЙ БРАК: Рабочий раствор азопирама приготовлен ${ageMinutes} мин. назад (срок годности истек!). Максимальный регламентный срок хранения — 2 часа (120 мин.). Проба НЕДЕЙСТВИТЕЛЬНА. Немедленно утилизировать раствор и приготовить свежую порцию 1:1 с 3% H2O2.`;
	} else if (remainingMinutes <= 15) {
		warningRu = `ВНИМАНИЕ: Срок годности рабочего раствора азопирама истекает через ${remainingMinutes} мин. Приготовьте новую порцию для следующих партий.`;
	}

	return {
		ageMinutes,
		isExpired,
		expiresAtIso,
		remainingMinutes,
		warningRu,
	};
}
