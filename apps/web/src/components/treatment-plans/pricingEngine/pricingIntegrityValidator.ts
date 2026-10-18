import { type Kopecks, sumKopecks } from "@dental/shared";
import type { TreatmentPlanTier } from "../types";
import { safeKopecks } from "./pricingFormatters";

/**
 * Валидатор целостности математических сумм плана лечения (Parity Check).
 */
export function validatePlanFinancialIntegrity(tier: TreatmentPlanTier): {
	readonly isValid: boolean;
	readonly sumItemsKopecks: Kopecks;
	readonly sumStagesKopecks: Kopecks;
	readonly tierTotalKopecks: Kopecks;
	readonly kopecksDrift: number;
	readonly errors: readonly string[];
} {
	const errors: string[] = [];

	// 1. Сумма всех процедур
	const allItems = tier.stages.flatMap((s) => s.items);
	const sumItemsKopecks = sumKopecks(
		allItems.map((it) => safeKopecks(it.priceRub ?? 0, { allowEmptyAsZero: true }) ?? (0 as Kopecks)),
	);

	// 2. Сумма этапов
	const sumStagesKopecks = sumKopecks(tier.stages.map((s) => s.totalKopecks));

	// 3. Общая сумма варианта
	const tierTotalKopecks = tier.totalKopecks;

	const kopecksDrift = Math.abs(sumStagesKopecks - tierTotalKopecks);

	if (kopecksDrift > 0) {
		errors.push(`Рассинхрон сумм этапов и общего итога варианта: ${kopecksDrift} коп.`);
	}

	// 4. Проверка рассрочки
	if (tier.installments && tier.installments[12]) {
		const inst12 = tier.installments[12];
		const sumParts = sumKopecks(inst12.partsKopecks);
		if (tierTotalKopecks > 0 && Math.abs(sumParts - tierTotalKopecks) > 0) {
			errors.push(
				`Рассрочка на 12 мес не сходится с итогом: сумма частей ${sumParts} != ${tierTotalKopecks}`,
			);
		}
	}

	return {
		isValid: errors.length === 0,
		sumItemsKopecks,
		sumStagesKopecks,
		tierTotalKopecks,
		kopecksDrift,
		errors,
	};
}
