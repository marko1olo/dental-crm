/**
 * planPriceValidationEngine.ts — Финансово-валидационный движок проверки цен и фиксации смет DENTE CRM.
 * (DOMAIN: PLAN PRICE VALIDATION & PRICELIST LOCK)
 *
 * Логика и математика:
 * 1. Сопоставление позиций плана лечения с актуальным прайс-листом клиники (по ID и коду Минздрава 804н).
 * 2. Анализ расхождений: подорожание, удешевление по акции, вывод в архив, удаление из каталога.
 * 3. Контроль срока действия плана (30 / 90 / 180 дней) и расчет порога инфляции (индексации цен).
 * 4. Разрешение коллизий: фиксация оригинальной цены (гарантия клиники), пересчет по новому прайсу, согласование управляющим.
 * 5. Точные копеечные финансовые расчеты сумм, скидок, маржинальной абсорбции клиникой и дельты стоимости.
 */

import {
	type CatalogServiceItem,
	type PlanPricePolicyPreset,
	PLAN_PRICE_POLICY_PRESETS,
	type PriceDiscrepancyKind,
	type PriceLockResolutionPolicy,
	type TreatmentPlanItemValidationContext,
	type TreatmentPlanValidationPayload,
	type ValidationSeverity,
} from "./planPriceValidationPresets";

export interface ValidatedPlanItem {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly quantity: number;
	readonly planUnitPriceRub: number;
	readonly planDiscountPercent: number;
	readonly planDiscountRub: number;
	readonly planLineGrossRub: number;
	readonly planLineNetRub: number;
	readonly catalogService: CatalogServiceItem | null;
	readonly currentCatalogPriceRub: number;
	readonly currentCatalogActive: boolean;
	readonly isArchived: boolean;
	readonly isNotFound: boolean;
	readonly unitPriceDeltaRub: number; // currentCatalogPriceRub - planUnitPriceRub
	readonly unitPriceDeltaPercent: number; // ((current - plan) / plan) * 100
	readonly lineTotalDeltaRub: number;
	readonly discrepancyKind: PriceDiscrepancyKind;
	readonly severity: ValidationSeverity;
	readonly statusBadgeText: string;
	readonly requiresAdminOverride: boolean;
	readonly suggestedResolution: PriceLockResolutionPolicy;
	readonly selectedResolution: PriceLockResolutionPolicy;
	readonly customPriceRub?: number | undefined;
	readonly effectiveUnitPriceRub: number;
	readonly effectiveDiscountRub: number;
	readonly effectiveLineGrossRub: number;
	readonly effectiveLineNetRub: number;
	readonly clinicAbsorptionRub: number; // Сумма, которую клиника берет на себя при фиксации старой цены
	readonly resolutionReason?: string | undefined;
}

export type OverallValidationStatus =
	| "APPROVED_PRICE_LOCKED"
	| "APPROVED_CURRENT_PRICELIST"
	| "PENDING_ADMIN_OVERRIDE"
	| "BLOCKED_ARCHIVED_SERVICE";

export interface AdminOverrideMetadata {
	readonly isAuthorized: boolean;
	readonly authorizedByAdminName?: string | undefined;
	readonly authorizationPinOrToken?: string | undefined;
	readonly overrideReason?: string | undefined;
	readonly authorizedAtIso?: string | undefined;
}

export interface PlanPriceValidationReport {
	readonly planId: string;
	readonly planNumber: string;
	readonly planTitle: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorFullName: string;
	readonly createdAtIso: string;
	readonly planAgeDays: number;
	readonly isPlanExpired: boolean;
	readonly expiryDaysRemaining: number;
	readonly activePreset: PlanPricePolicyPreset;
	readonly items: readonly ValidatedPlanItem[];
	readonly totalItemsCount: number;
	readonly matchedItemsCount: number;
	readonly increasedItemsCount: number;
	readonly decreasedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly notFoundItemsCount: number;
	readonly discountedItemsCount: number;
	readonly itemsRequiringAdminOverrideCount: number;
	readonly originalPlanGrossRub: number;
	readonly originalPlanDiscountRub: number;
	readonly originalPlanNetRub: number;
	readonly currentCatalogGrossRub: number;
	readonly currentCatalogNetRub: number;
	readonly resolvedGrossRub: number;
	readonly resolvedDiscountRub: number;
	readonly resolvedNetRub: number;
	readonly totalDeltaRub: number; // resolvedNetRub - originalPlanNetRub
	readonly totalDeltaPercent: number;
	readonly totalClinicAbsorptionRub: number;
	readonly overallStatus: OverallValidationStatus;
	readonly canGenerateWorkOrder: boolean;
	readonly canGenerateCompletedAct: boolean;
	readonly validationMessages: readonly string[];
	readonly adminOverride: AdminOverrideMetadata;
}

export interface WorkOrderExportItem {
	readonly itemId: string;
	readonly toothNumber?: number | undefined;
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly category: string;
	readonly quantity: number;
	readonly appliedUnitPriceRub: number;
	readonly appliedDiscountRub: number;
	readonly lineTotalRub: number;
	readonly resolutionPolicyApplied: PriceLockResolutionPolicy;
	readonly isPriceLockedFromPlan: boolean;
}

export interface WorkOrderValidatedExport {
	readonly orderNumber: string;
	readonly orderType: "work_order" | "completed_works_act";
	readonly planId: string;
	readonly planNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly validatedAtIso: string;
	readonly presetUsed: string;
	readonly items: readonly WorkOrderExportItem[];
	readonly totalPayableRub: number;
	readonly totalDiscountRub: number;
	readonly clinicAbsorptionGuaranteeRub: number;
	readonly isApprovedByManager: boolean;
	readonly managerNotes?: string | undefined;
}

/**
 * Расчет разницы в днях между двумя ISO датами (с округлением вниз).
 */
export function calculateDaysBetween(
	startDateIso: string,
	endDateIso: string = new Date().toISOString(),
): number {
	const start = new Date(startDateIso).getTime();
	const end = new Date(endDateIso).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return 0;
	const diffMs = end - start;
	return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Поиск услуги в текущем каталоге клиники: сначала по точному ID, затем по коду Минздрава 804н.
 */
export function findCatalogService(
	code804n: string,
	serviceId?: string | undefined,
	catalog: readonly CatalogServiceItem[] = [],
): CatalogServiceItem | null {
	if (serviceId) {
		const byId = catalog.find((c) => c.id === serviceId);
		if (byId) return byId;
	}
	const byCode = catalog.find(
		(c) => c.code804n.trim().toUpperCase() === code804n.trim().toUpperCase(),
	);
	return byCode || null;
}

/**
 * Валидация одной позиции сметы относительно текущего каталога и настроенной политики.
 */
export function validateSinglePlanItem(
	item: TreatmentPlanItemValidationContext,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset,
	isPlanExpired: boolean,
	resolutionOverride?: PriceLockResolutionPolicy | undefined,
	customPriceOverrideRub?: number | undefined,
): ValidatedPlanItem {
	const catalogService = findCatalogService(item.code804n, item.serviceId, catalog);

	const planUnitPriceRub = Math.max(0, item.planUnitPriceRub);
	const planDiscountRub = Math.max(0, item.planDiscountRub);
	const quantity = Math.max(1, item.quantity);
	const planLineGrossRub = planUnitPriceRub * quantity;
	const planLineNetRub = Math.max(0, planLineGrossRub - planDiscountRub * quantity);

	const isNotFound = !catalogService;
	const isArchived = Boolean(catalogService && (!catalogService.active || catalogService.isArchived));
	const currentCatalogPriceRub = catalogService ? catalogService.basePriceRub : planUnitPriceRub;
	const currentCatalogActive = catalogService ? Boolean(catalogService.active && !catalogService.isArchived) : false;

	const unitPriceDeltaRub = currentCatalogPriceRub - planUnitPriceRub;
	const unitPriceDeltaPercent =
		planUnitPriceRub > 0
			? Number(((unitPriceDeltaRub / planUnitPriceRub) * 100).toFixed(1))
			: 0;
	const lineTotalDeltaRub = unitPriceDeltaRub * quantity;

	let discrepancyKind: PriceDiscrepancyKind = "PRICE_MATCH";
	let severity: ValidationSeverity = "success";
	let statusBadgeText = "Цена подтверждена";
	let requiresAdminOverride = false;
	let suggestedResolution: PriceLockResolutionPolicy = "LOCK_ORIGINAL_PRICE";

	if (isNotFound) {
		discrepancyKind = "SERVICE_NOT_FOUND";
		severity = "warning";
		statusBadgeText = "Не найдено в прайсе";
		requiresAdminOverride = true;
		suggestedResolution = "LOCK_ORIGINAL_PRICE";
	} else if (isArchived) {
		discrepancyKind = "SERVICE_ARCHIVED";
		severity = "error";
		statusBadgeText = "Услуга в архиве";
		requiresAdminOverride = preset.disallowArchivedServices;
		suggestedResolution = "REQUIRE_ADMIN_OVERRIDE";
	} else if (unitPriceDeltaRub > 0) {
		discrepancyKind = "PRICE_INCREASED";
		const isAboveInflationThreshold = unitPriceDeltaPercent > preset.inflationThresholdPercent;
		if (isAboveInflationThreshold && preset.requireManagerOverrideAboveThreshold) {
			severity = "warning";
			requiresAdminOverride = true;
			suggestedResolution = "REQUIRE_ADMIN_OVERRIDE";
			statusBadgeText = `Подорожало +${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (+${unitPriceDeltaPercent}%) [Согласование]`;
		} else {
			severity = "info";
			statusBadgeText = `Подорожало +${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (+${unitPriceDeltaPercent}%)`;
			suggestedResolution = isPlanExpired
				? preset.defaultResolutionForExpiredPlan
				: preset.defaultResolutionForPriceIncrease;
		}
	} else if (unitPriceDeltaRub < 0) {
		discrepancyKind = "PRICE_DECREASED";
		severity = "success";
		statusBadgeText = `Подешевело ${unitPriceDeltaRub.toLocaleString("ru-RU")} ₽ (${unitPriceDeltaPercent}%)`;
		suggestedResolution = preset.defaultResolutionForPriceDecrease;
	} else if (item.planDiscountPercent > preset.maxDoctorDiscountPercent) {
		discrepancyKind = "DISCOUNT_EXPIRED_OR_INVALID";
		severity = "warning";
		statusBadgeText = `Скидка ${item.planDiscountPercent}% превышает лимит врача (${preset.maxDoctorDiscountPercent}%)`;
		requiresAdminOverride = true;
		suggestedResolution = "REQUIRE_ADMIN_OVERRIDE";
	} else {
		discrepancyKind = "PRICE_MATCH";
		severity = "success";
		statusBadgeText = "Цена актуальна";
		suggestedResolution = "LOCK_ORIGINAL_PRICE";
	}

	if (isPlanExpired && discrepancyKind !== "SERVICE_ARCHIVED" && discrepancyKind !== "SERVICE_NOT_FOUND") {
		if (preset.defaultResolutionForExpiredPlan === "REQUIRE_ADMIN_OVERRIDE") {
			requiresAdminOverride = true;
		}
	}

	const selectedResolution: PriceLockResolutionPolicy =
		resolutionOverride || suggestedResolution;

	// Расчет эффективной цены строки в зависимости от выбранного разрешения
	let effectiveUnitPriceRub = planUnitPriceRub;
	let effectiveDiscountRub = planDiscountRub;

	if (selectedResolution === "UPDATE_TO_CURRENT_PRICE") {
		effectiveUnitPriceRub = currentCatalogPriceRub;
		// Сохраняем процентную скидку от новой цены или 0
		if (item.planDiscountPercent > 0) {
			effectiveDiscountRub = Math.round(
				(currentCatalogPriceRub * item.planDiscountPercent) / 100,
			);
		} else {
			effectiveDiscountRub = 0;
		}
	} else if (selectedResolution === "CUSTOM_PRICE_OVERRIDE" && typeof customPriceOverrideRub === "number") {
		effectiveUnitPriceRub = Math.max(0, customPriceOverrideRub);
		effectiveDiscountRub = 0;
	} else {
		// LOCK_ORIGINAL_PRICE или REQUIRE_ADMIN_OVERRIDE (по умолчанию удерживаем цену плана)
		effectiveUnitPriceRub = planUnitPriceRub;
		effectiveDiscountRub = planDiscountRub;
	}

	const effectiveLineGrossRub = effectiveUnitPriceRub * quantity;
	const effectiveLineNetRub = Math.max(0, effectiveLineGrossRub - effectiveDiscountRub * quantity);

	// Сумма, которую клиника компенсирует пациенту при фиксации цены, если прайс выше
	let clinicAbsorptionRub = 0;
	if (selectedResolution === "LOCK_ORIGINAL_PRICE" && currentCatalogPriceRub > planUnitPriceRub) {
		clinicAbsorptionRub = (currentCatalogPriceRub - planUnitPriceRub) * quantity;
	}

	return {
		itemId: item.itemId,
		toothNumber: item.toothNumber,
		code804n: item.code804n,
		serviceTitle: item.serviceTitle,
		category: item.category,
		quantity,
		planUnitPriceRub,
		planDiscountPercent: item.planDiscountPercent,
		planDiscountRub,
		planLineGrossRub,
		planLineNetRub,
		catalogService,
		currentCatalogPriceRub,
		currentCatalogActive,
		isArchived,
		isNotFound,
		unitPriceDeltaRub,
		unitPriceDeltaPercent,
		lineTotalDeltaRub,
		discrepancyKind,
		severity,
		statusBadgeText,
		requiresAdminOverride,
		suggestedResolution,
		selectedResolution,
		customPriceRub: customPriceOverrideRub,
		effectiveUnitPriceRub,
		effectiveDiscountRub,
		effectiveLineGrossRub,
		effectiveLineNetRub,
		clinicAbsorptionRub,
	};
}

/**
 * Комплексная валидация всей сметы плана лечения с формированием отчета и рекомендаций.
 */
export function validateTreatmentPlanPrices(
	plan: TreatmentPlanValidationPayload,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset = PLAN_PRICE_POLICY_PRESETS.standard_30,
	itemResolutions?: Readonly<Record<string, PriceLockResolutionPolicy>> | undefined,
	customPrices?: Readonly<Record<string, number>> | undefined,
	adminOverride?: AdminOverrideMetadata | undefined,
	currentDateIso: string = new Date().toISOString(),
): PlanPriceValidationReport {
	const planAgeDays = calculateDaysBetween(plan.createdAtIso, currentDateIso);
	const isPlanExpired = planAgeDays > preset.validityDays;
	const expiryDaysRemaining = preset.validityDays - planAgeDays;

	let matchedItemsCount = 0;
	let increasedItemsCount = 0;
	let decreasedItemsCount = 0;
	let archivedItemsCount = 0;
	let notFoundItemsCount = 0;
	let discountedItemsCount = 0;
	let itemsRequiringAdminOverrideCount = 0;

	let originalPlanGrossRub = 0;
	let originalPlanDiscountRub = 0;
	let originalPlanNetRub = 0;
	let currentCatalogGrossRub = 0;
	let currentCatalogNetRub = 0;
	let resolvedGrossRub = 0;
	let resolvedDiscountRub = 0;
	let resolvedNetRub = 0;
	let totalClinicAbsorptionRub = 0;

	const validatedItems: ValidatedPlanItem[] = [];
	const validationMessages: string[] = [];

	for (const item of plan.items) {
		const resolutionOverride = itemResolutions?.[item.itemId];
		const customPriceOverride = customPrices?.[item.itemId];

		const validated = validateSinglePlanItem(
			item,
			catalog,
			preset,
			isPlanExpired,
			resolutionOverride,
			customPriceOverride,
		);

		validatedItems.push(validated);

		// Счетчики
		if (validated.discrepancyKind === "PRICE_MATCH") matchedItemsCount++;
		else if (validated.discrepancyKind === "PRICE_INCREASED") increasedItemsCount++;
		else if (validated.discrepancyKind === "PRICE_DECREASED") decreasedItemsCount++;
		else if (validated.discrepancyKind === "SERVICE_ARCHIVED") archivedItemsCount++;
		else if (validated.discrepancyKind === "SERVICE_NOT_FOUND") notFoundItemsCount++;

		if (validated.planDiscountRub > 0) discountedItemsCount++;
		if (validated.requiresAdminOverride) itemsRequiringAdminOverrideCount++;

		// Суммы
		originalPlanGrossRub += validated.planLineGrossRub;
		originalPlanDiscountRub += validated.planDiscountRub * validated.quantity;
		originalPlanNetRub += validated.planLineNetRub;

		currentCatalogGrossRub += validated.currentCatalogPriceRub * validated.quantity;
		currentCatalogNetRub += Math.max(
			0,
			(validated.currentCatalogPriceRub - validated.planDiscountRub) * validated.quantity,
		);

		resolvedGrossRub += validated.effectiveLineGrossRub;
		resolvedDiscountRub += validated.effectiveDiscountRub * validated.quantity;
		resolvedNetRub += validated.effectiveLineNetRub;
		totalClinicAbsorptionRub += validated.clinicAbsorptionRub;
	}

	const totalDeltaRub = resolvedNetRub - originalPlanNetRub;
	const totalDeltaPercent =
		originalPlanNetRub > 0
			? Number(((totalDeltaRub / originalPlanNetRub) * 100).toFixed(1))
			: 0;

	// Анализ статуса валидации
	let overallStatus: OverallValidationStatus = "APPROVED_PRICE_LOCKED";
	const isAuthorizedByAdmin = Boolean(adminOverride?.isAuthorized);

	if (archivedItemsCount > 0 && preset.disallowArchivedServices && !isAuthorizedByAdmin) {
		overallStatus = "BLOCKED_ARCHIVED_SERVICE";
		validationMessages.push(
			`Обнаружено ${archivedItemsCount} архивных услуг. Требуется замена позиций на актуальные перед оформлением.`,
		);
	} else if (itemsRequiringAdminOverrideCount > 0 && !isAuthorizedByAdmin) {
		overallStatus = "PENDING_ADMIN_OVERRIDE";
		validationMessages.push(
			`Требуется согласование управляющего: ${itemsRequiringAdminOverrideCount} позиций с превышением порога инфляции или скидки.`,
		);
	} else if (isPlanExpired && preset.defaultResolutionForExpiredPlan === "REQUIRE_ADMIN_OVERRIDE" && !isAuthorizedByAdmin) {
		overallStatus = "PENDING_ADMIN_OVERRIDE";
		validationMessages.push(
			`Срок действия плана (${preset.validityDays} дн.) истек ${Math.abs(expiryDaysRemaining)} дн. назад. Требуется подтверждение фиксации цен.`,
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

	const canGenerateWorkOrder =
		overallStatus === "APPROVED_PRICE_LOCKED" ||
		overallStatus === "APPROVED_CURRENT_PRICELIST" ||
		isAuthorizedByAdmin;

	const canGenerateCompletedAct = canGenerateWorkOrder;

	return {
		planId: plan.planId,
		planNumber: plan.planNumber,
		planTitle: plan.planTitle,
		patientId: plan.patientId,
		patientName: plan.patientName,
		doctorId: plan.doctorId,
		doctorFullName: plan.doctorFullName,
		createdAtIso: plan.createdAtIso,
		planAgeDays,
		isPlanExpired,
		expiryDaysRemaining,
		activePreset: preset,
		items: validatedItems,
		totalItemsCount: validatedItems.length,
		matchedItemsCount,
		increasedItemsCount,
		decreasedItemsCount,
		archivedItemsCount,
		notFoundItemsCount,
		discountedItemsCount,
		itemsRequiringAdminOverrideCount,
		originalPlanGrossRub,
		originalPlanDiscountRub,
		originalPlanNetRub,
		currentCatalogGrossRub,
		currentCatalogNetRub,
		resolvedGrossRub,
		resolvedDiscountRub,
		resolvedNetRub,
		totalDeltaRub,
		totalDeltaPercent,
		totalClinicAbsorptionRub,
		overallStatus,
		canGenerateWorkOrder,
		canGenerateCompletedAct,
		validationMessages,
		adminOverride: adminOverride || { isAuthorized: false },
	};
}

/**
 * Пакетное применение единой политики ко всем позициям сметы (1-Click Фиксация или 1-Click Обновление).
 */
export function applyBatchResolutionToAllItems(
	plan: TreatmentPlanValidationPayload,
	catalog: readonly CatalogServiceItem[],
	preset: PlanPricePolicyPreset,
	batchResolution: PriceLockResolutionPolicy,
	adminOverride?: AdminOverrideMetadata,
): PlanPriceValidationReport {
	const itemResolutions: Record<string, PriceLockResolutionPolicy> = {};
	for (const item of plan.items) {
		itemResolutions[item.itemId] = batchResolution;
	}
	return validateTreatmentPlanPrices(
		plan,
		catalog,
		preset,
		itemResolutions,
		undefined,
		adminOverride,
	);
}

/**
 * Экспорт проверенной сметы в структуру Наряд-заказа или Акта выполненных работ.
 */
export function generateWorkOrderExportPayload(
	report: PlanPriceValidationReport,
	orderType: "work_order" | "completed_works_act" = "work_order",
): WorkOrderValidatedExport {
	const orderPrefix = orderType === "work_order" ? "НЗ" : "АВР";
	const randomSuffix = Math.floor(1000 + Math.random() * 9000);
	const orderNumber = `${orderPrefix}-${report.planNumber.replace(/[^\d]/g, "") || "41"}-${randomSuffix}`;

	const exportItems: WorkOrderExportItem[] = report.items.map((item) => ({
		itemId: item.itemId,
		toothNumber: item.toothNumber,
		code804n: item.code804n,
		serviceTitle: item.serviceTitle,
		category: item.category,
		quantity: item.quantity,
		appliedUnitPriceRub: item.effectiveUnitPriceRub,
		appliedDiscountRub: item.effectiveDiscountRub,
		lineTotalRub: item.effectiveLineNetRub,
		resolutionPolicyApplied: item.selectedResolution,
		isPriceLockedFromPlan: item.selectedResolution === "LOCK_ORIGINAL_PRICE",
	}));

	return {
		orderNumber,
		orderType,
		planId: report.planId,
		planNumber: report.planNumber,
		patientId: report.patientId,
		patientName: report.patientName,
		doctorFullName: report.doctorFullName,
		validatedAtIso: new Date().toISOString(),
		presetUsed: report.activePreset.title,
		items: exportItems,
		totalPayableRub: report.resolvedNetRub,
		totalDiscountRub: report.resolvedDiscountRub,
		clinicAbsorptionGuaranteeRub: report.totalClinicAbsorptionRub,
		isApprovedByManager: Boolean(report.adminOverride.isAuthorized),
		managerNotes: report.adminOverride.overrideReason,
	};
}
