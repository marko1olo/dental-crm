/**
 * packages/shared/src/sanpin/packagingSsot/shelfLifeCalculators.ts
 * Расчет сроков годности и стерильности упаковок (СанПиН 3.3686-21).
 * Мандат 8b: строго <= 120 строк.
 */

import { getSanpinPackagingMaterial, type SanpinPackagingMaterialId } from "./packagingMaterials.js";

export type PackageSterilityStatus = "valid" | "expiring_soon" | "expired" | "immediate_use";

export interface PackageExpiryCalculationResult {
	readonly packDateIso: string;
	readonly expiryDateIso: string;
	readonly packDateFormatted: string;
	readonly expiryDateFormatted: string;
	readonly shelfLifeDays: number;
	readonly daysRemaining: number;
	readonly status: PackageSterilityStatus;
	readonly isExpired: boolean;
	readonly isExpiringSoon: boolean;
	readonly statusLabelRu: string;
	readonly statusColorHex: string;
	readonly sanpinClause: string;
	readonly recommendationRu: string;
}

export function calculatePackageExpiryDate(
	packDateInput: string | Date,
	packagingType: SanpinPackagingMaterialId,
	options?: { customDays?: number | undefined; referenceDate?: string | Date | undefined },
): PackageExpiryCalculationResult {
	const packDate = typeof packDateInput === "string" ? new Date(packDateInput) : new Date(packDateInput.getTime());
	const refDate = options?.referenceDate
		? (typeof options.referenceDate === "string" ? new Date(options.referenceDate) : new Date(options.referenceDate.getTime()))
		: new Date();

	const def = getSanpinPackagingMaterial(packagingType);
	const shelfLifeDays = typeof options?.customDays === "number" && options.customDays >= 0
		? options.customDays
		: def.statutoryShelfLifeDays;

	const expDate = new Date(packDate.getTime());
	expDate.setDate(expDate.getDate() + shelfLifeDays);
	const diffMs = expDate.getTime() - refDate.getTime();
	const daysRemaining = shelfLifeDays === 0 ? 0 : Math.ceil(diffMs / (1000 * 60 * 60 * 24));

	let status: PackageSterilityStatus = "valid";
	let statusLabelRu = "Стерильно (Годен)";
	let statusColorHex = "#10b981";
	let recommendationRu = "Изделие стерильно, допущено к клиническому применению у кресла.";

	if (def.isImmediateUseOnly) {
		status = "immediate_use";
		statusLabelRu = "Использовать немедленно";
		statusColorHex = "#0d9488";
		recommendationRu = "Без упаковки: использовать сразу после извлечения из стерилизатора.";
	} else if (daysRemaining <= 0) {
		status = "expired";
		statusLabelRu = daysRemaining === 0 ? "Истекает сегодня" : `Просрочено на ${Math.abs(daysRemaining)} дн.`;
		statusColorHex = "#ef4444";
		recommendationRu = "Срок стерильности истек. Использование запрещено. Отправить на повторную предстерилизационную очистку.";
	} else if (daysRemaining <= 7) {
		status = "expiring_soon";
		statusLabelRu = `Истекает через ${daysRemaining} дн.`;
		statusColorHex = "#f59e0b";
		recommendationRu = "Срок стерильности менее 7 суток. Рекомендуется использовать в первую очередь.";
	}

	return {
		packDateIso: packDate.toISOString(),
		expiryDateIso: expDate.toISOString(),
		packDateFormatted: packDate.toISOString().slice(0, 10),
		expiryDateFormatted: expDate.toISOString().slice(0, 10),
		shelfLifeDays,
		daysRemaining,
		status,
		isExpired: status === "expired",
		isExpiringSoon: status === "expiring_soon",
		statusLabelRu,
		statusColorHex,
		sanpinClause: def.sanpinClauseRu,
		recommendationRu,
	};
}
