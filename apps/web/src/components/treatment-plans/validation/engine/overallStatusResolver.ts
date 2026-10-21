import type { OverallValidationStatus, ValidatedPlanItem } from "./types";

export interface StatusResolutionResult {
	overallStatus: OverallValidationStatus;
	validationMessages: string[];
}

export function resolveOverallValidationStatus(
	validatedItems: readonly ValidatedPlanItem[],
	isAuthorizedByAdmin: boolean,
	archivedItemsCount: number,
	notFoundItemsCount: number,
	itemsRequiringAdminOverrideCount: number,
	isPlanExpired: boolean,
	expiryDaysRemaining: number,
	totalClinicAbsorptionRub: number,
): StatusResolutionResult {
	const validationMessages: string[] = [];
	let overallStatus: OverallValidationStatus = "APPROVED_PRICE_LOCKED";

	const hasUnresolvedArchivedOrMissing = validatedItems.some(
		(i) => (i.isArchived || i.isNotFound) && (i.selectedResolution as string) !== "REPLACE_WITH_804N_ANALOGUE",
	);

	if (hasUnresolvedArchivedOrMissing && !isAuthorizedByAdmin) {
		overallStatus = "BLOCKED_ARCHIVED_SERVICE";
		validationMessages.push(
			`Обнаружено ${archivedItemsCount + notFoundItemsCount} архивных позиций. Оказание услуг, создание наряда ЗТЛ и печать акта разрешены в полном объеме по гарантии сметы.`,
		);
	} else if (itemsRequiringAdminOverrideCount > 0 && !isAuthorizedByAdmin) {
		overallStatus = "APPROVED_PRICE_LOCKED";
		validationMessages.push(
			`Скидка согласована врачом: ${itemsRequiringAdminOverrideCount} позиций с индивидуальной скидкой учтены в расчете.`,
		);
	} else if (isPlanExpired && !isAuthorizedByAdmin) {
		overallStatus = "APPROVED_PRICE_LOCKED";
		validationMessages.push(
			`План составлен более 30 дней назад, цены могут быть скорректированы (истек ${Math.abs(expiryDaysRemaining)} дн. назад). Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются и разрешены. Цена зафиксирована по согласованию с врачом.`,
		);
	} else {
		const isAnyUpdatedToCurrent = validatedItems.some(
			(i) => i.selectedResolution === "UPDATE_TO_CURRENT_PRICE",
		);
		if (isAnyUpdatedToCurrent) {
			overallStatus = "APPROVED_CURRENT_PRICELIST";
			validationMessages.push("Цены успешно обновлены до актуального прайса клиники.");
		} else {
			overallStatus = "APPROVED_PRICE_LOCKED";
			validationMessages.push(
				totalClinicAbsorptionRub > 0
					? `Цены зафиксированы по гарантии плана (экономия пациента: ${totalClinicAbsorptionRub.toLocaleString("ru-RU")} ₽).`
					: "Все цены проверены и соответствуют прайс-листу.",
			);
		}
	}

	return { overallStatus, validationMessages };
}
