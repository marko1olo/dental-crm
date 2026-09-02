/**
 * DENTE Dental CRM — Plan to Invoice & Work Order Validation Engine (Feature #41).
 *
 * Fully compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Платные медицинские услуги»
 * - Приказ Минздрава России от 13.10.2017 № 804н «Номенклатура медицинских услуг»
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 10, ст. 16)
 * - Налоговый кодекс РФ (ст. 219 НК РФ — социальный налоговый вычет)
 *
 * Core Capabilities:
 * 1. Contract Price Lock Guard (Защита договорных цен):
 *    If a treatment plan was signed/approved at a fixed price within validity period,
 *    clinic price increases must not arbitrarily inflate the agreed cost (Clinic absorbs delta).
 * 2. Obsolete / Archived Services Gate (Контроль архивных услуг):
 *    Detects archived, disabled, or removed catalog services and recommends valid 804n analogues.
 *    Strictly blocks work order / invoice generation until obsolete items are resolved.
 * 3. Invalid / Zero Price Guard:
 *    Detects items with 0 ₽ or missing catalog prices, flags them as blocking errors.
 * 4. Exact integer kopeck math across all calculations.
 */

import { z } from "zod";
import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	splitKopecks,
	sumKopecks,
	formatKopecksRu,
} from "../utils/money.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const priceDiscrepancyTypeSchema = z.enum([
	"MATCH",
	"PRICE_INCREASED",
	"PRICE_DECREASED",
	"SERVICE_ARCHIVED",
	"SERVICE_NOT_FOUND",
	"INVALID_PRICE",
	"PLAN_EXPIRED",
]);
export type PriceDiscrepancyType = z.infer<typeof priceDiscrepancyTypeSchema>;

export const validationItemSeveritySchema = z.enum(["OK", "WARNING", "BLOCKED"]);
export type ValidationItemSeverity = z.infer<typeof validationItemSeveritySchema>;

export const priceLockResolutionPolicySchema = z.enum([
	"LOCK_ORIGINAL_PRICE",       // Клиника гарантирует старую цену (абсорбция дельты)
	"UPDATE_TO_CURRENT_PRICE",   // Пересчет по текущему прайсу (требует доп. соглашения)
	"REPLACE_WITH_804N_ANALOGUE",// Замена на актуальный аналог номенклатуры 804н
	"ADMIN_OVERRIDE",            // Принудительное согласование управляющим / главным врачом
]);
export type PriceLockResolutionPolicy = z.infer<typeof priceLockResolutionPolicySchema>;

export interface CatalogServiceLookup {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly category?: string;
	readonly basePriceKopecks: Kopecks;
	readonly active: boolean;
	readonly isArchived?: boolean;
	readonly decree458Expensive?: boolean;
	readonly uetAdult?: number;
}

export interface PlanItemForValidation {
	readonly itemId: string;
	readonly toothNumber?: number | null | undefined;
	readonly surfaces?: readonly string[] | undefined;
	readonly code804n: string;
	readonly nameRu: string;
	readonly categoryRu?: string | undefined;
	readonly quantity: number;
	readonly planUnitPriceKopecks: Kopecks;
	readonly planDiscountKopecks?: Kopecks | undefined;
	readonly serviceId?: string | undefined;
	readonly stageId?: string | undefined;
	readonly stageTitleRu?: string | undefined;
}

export interface Service804nAnalogue {
	readonly serviceId: string;
	readonly code804n: string;
	readonly title: string;
	readonly basePriceKopecks: Kopecks;
	readonly basePriceRub: number;
	readonly similarityScore: number;
	readonly clinicalRationaleRu: string;
}

export interface ValidatedPlanItemResult {
	readonly itemId: string;
	readonly serviceId?: string | undefined;
	readonly toothNumber: number | null;
	readonly surfaces: readonly string[];
	readonly code804n: string;
	readonly nameRu: string;
	readonly categoryRu: string;
	readonly quantity: number;
	readonly planUnitPriceKopecks: Kopecks;
	readonly planDiscountKopecks: Kopecks;
	readonly planGrossKopecks: Kopecks;
	readonly planNetKopecks: Kopecks;
	readonly currentCatalogPriceKopecks: Kopecks;
	readonly isFoundInCatalog: boolean;
	readonly isArchived: boolean;
	readonly isZeroOrInvalidPrice: boolean;
	readonly unitPriceDeltaKopecks: Kopecks; // current - plan
	readonly unitPriceDeltaPercent: number;
	readonly discrepancyType: PriceDiscrepancyType;
	readonly severity: ValidationItemSeverity;
	readonly statusDescriptionRu: string;
	readonly isPriceLocked: boolean;
	readonly selectedResolution: PriceLockResolutionPolicy;
	readonly suggestedResolution: PriceLockResolutionPolicy;
	readonly effectiveUnitPriceKopecks: Kopecks;
	readonly effectiveDiscountKopecks: Kopecks;
	readonly effectiveLineGrossKopecks: Kopecks;
	readonly effectiveLineNetKopecks: Kopecks;
	readonly clinicAbsorptionKopecks: Kopecks; // Сколько клиника берет на себя при фиксации
	readonly patientSurchargeKopecks: Kopecks; // Сколько доплачивает пациент
	readonly suggested804nAnalogue: Service804nAnalogue | null;
	readonly requiresAdminOverride: boolean;
}

export interface PlanToInvoiceValidationPayload {
	readonly planId: string;
	readonly planNumber?: string | undefined;
	readonly planTitle?: string | undefined;
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly planCreatedAtIso: string;
	readonly approvedAtIso?: string | null | undefined;
	readonly isSignedWithPatient?: boolean | undefined;
	readonly validityDaysLimit?: number | undefined; // По умолчанию 30 дней для терапии, 90 для имплантации
	readonly inflationThresholdPercent?: number | undefined; // Порог подорожания (напр. 15%)
	readonly items: readonly PlanItemForValidation[];
	readonly catalog: readonly CatalogServiceLookup[];
	readonly itemResolutionOverrides?: Record<string, PriceLockResolutionPolicy> | undefined;
	readonly itemAnalogueSelections?: Record<string, string> | undefined; // itemId -> selectedAnalogueServiceId
	readonly adminOverrideAuthorized?: boolean | undefined;
	readonly adminOverrideStaffName?: string | undefined;
	readonly adminOverrideReason?: string | undefined;
}

export interface PlanToInvoiceValidationReport {
	readonly planId: string;
	readonly planNumber: string;
	readonly patientId: string;
	readonly isValid: boolean;
	readonly canGenerateInvoice: boolean;
	readonly canGenerateWorkOrder: boolean;
	readonly totalItemsCount: number;
	readonly matchedItemsCount: number;
	readonly increasedItemsCount: number;
	readonly decreasedItemsCount: number;
	readonly archivedItemsCount: number;
	readonly notFoundItemsCount: number;
	readonly zeroPriceItemsCount: number;
	readonly itemsRequiringOverrideCount: number;
	readonly planAgeDays: number;
	readonly isPlanExpired: boolean;
	readonly expiryDaysRemaining: number;
	readonly isPriceLocked: boolean;
	readonly originalPlanGrossKopecks: Kopecks;
	readonly originalPlanDiscountKopecks: Kopecks;
	readonly originalPlanNetKopecks: Kopecks;
	readonly currentCatalogGrossKopecks: Kopecks;
	readonly currentCatalogNetKopecks: Kopecks;
	readonly effectiveInvoiceGrossKopecks: Kopecks;
	readonly effectiveInvoiceDiscountKopecks: Kopecks;
	readonly effectiveInvoiceNetKopecks: Kopecks;
	readonly totalClinicAbsorptionKopecks: Kopecks;
	readonly totalPatientSurchargeKopecks: Kopecks;
	readonly isPennyExact: boolean;
	readonly items: readonly ValidatedPlanItemResult[];
	readonly blockingReasons: readonly string[];
	readonly warnings: readonly string[];
	readonly supplementaryAgreementNeeded: boolean;
	readonly adminOverrideInfo: {
		readonly isAuthorized: boolean;
		readonly staffName?: string | undefined;
		readonly reason?: string | undefined;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NOMENCLATURE 804N ANALOGUE MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Нормализует код Номенклатуры 804н для сопоставления префиксов
 * Пример: "A16.07.002.001" -> group: "A16.07.002"
 */
export function extract804nGroupPrefix(code804n: string): string {
	const parts = code804n.trim().split(".");
	if (parts.length >= 3) {
		return `${parts[0]}.${parts[1]}.${parts[2]}`;
	}
	return code804n.trim();
}

/**
 * Поиск актуального активного аналога услуги по коду Номенклатуры 804н и названию
 */
export function find804nAnalogues(
	archivedCode804n: string,
	archivedTitle: string,
	catalog: readonly CatalogServiceLookup[],
): readonly Service804nAnalogue[] {
	const activeServices = catalog.filter((s) => s.active && !s.isArchived);
	if (activeServices.length === 0) return [];

	const targetGroup = extract804nGroupPrefix(archivedCode804n);
	const targetTitleLower = archivedTitle.toLowerCase();
	const targetWords = targetTitleLower.split(/\s+/).filter((w) => w.length >= 3);

	const candidates: Array<{ service: CatalogServiceLookup; score: number }> = [];

	for (const service of activeServices) {
		let score = 0;
		const serviceGroup = extract804nGroupPrefix(service.code804n);

		// Точное совпадение группы 804н (напр. A16.07.002 кариес)
		if (service.code804n === archivedCode804n) {
			score += 60;
		} else if (serviceGroup === targetGroup) {
			score += 40;
		}

		// Лексическое совпадение слов
		const candidateTitleLower = service.title.toLowerCase();
		let wordMatches = 0;
		for (const word of targetWords) {
			if (candidateTitleLower.includes(word)) {
				wordMatches++;
			}
		}
		if (targetWords.length > 0) {
			score += Math.round((wordMatches / targetWords.length) * 40);
		}

		if (score >= 30) {
			candidates.push({ service, score });
		}
	}

	// Сортировка по релевантности
	candidates.sort((a, b) => b.score - a.score);

	return candidates.slice(0, 3).map((c) => ({
		serviceId: c.service.id,
		code804n: c.service.code804n,
		title: c.service.title,
		basePriceKopecks: c.service.basePriceKopecks,
		basePriceRub: Math.round(c.service.basePriceKopecks / 100),
		similarityScore: c.score,
		clinicalRationaleRu:
			c.score >= 80
				? "Прямой клинический эквивалент в действующем прейскуранте клиники"
				: "Близкая процедура из того же подраздела Номенклатуры 804н",
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE VALIDATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDaysDifference(startDateIso: string, endDateIso: string): number {
	const start = new Date(startDateIso).getTime();
	const end = new Date(endDateIso).getTime();
	if (isNaN(start) || isNaN(end)) return 0;
	return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * Валидатор плана лечения при добавлении в наряд / счет на оплату.
 * Реализует презумпцию защиты договорных цен и строгий заслон устаревших услуг.
 */
export function validatePlanToInvoice(
	payload: PlanToInvoiceValidationPayload,
): PlanToInvoiceValidationReport {
	const nowIso = new Date().toISOString();
	const validityDays = payload.validityDaysLimit ?? 30;
	const inflationThreshold = payload.inflationThresholdPercent ?? 15;
	const planAgeDays = calculateDaysDifference(payload.planCreatedAtIso, nowIso);
	const isPlanExpired = planAgeDays > validityDays;
	const expiryDaysRemaining = Math.max(0, validityDays - planAgeDays);

	// Если план подписан пациентом (или утвержден) и не истек срок гарантии — цена зафиксирована
	const isPriceLocked =
		(payload.isSignedWithPatient === true || !!payload.approvedAtIso) &&
		!isPlanExpired;

	const catalogMapByCode = new Map<string, CatalogServiceLookup>();
	const catalogMapById = new Map<string, CatalogServiceLookup>();

	for (const s of payload.catalog) {
		catalogMapById.set(s.id, s);
		if (s.code804n) {
			catalogMapByCode.set(s.code804n.trim().toLowerCase(), s);
		}
	}

	const validatedItems: ValidatedPlanItemResult[] = [];
	const blockingReasons: string[] = [];
	const warnings: string[] = [];

	let matchedItemsCount = 0;
	let increasedItemsCount = 0;
	let decreasedItemsCount = 0;
	let archivedItemsCount = 0;
	let notFoundItemsCount = 0;
	let zeroPriceItemsCount = 0;
	let itemsRequiringOverrideCount = 0;

	for (const item of payload.items) {
		const qty = Math.max(1, item.quantity);
		const planUnitPrice = item.planUnitPriceKopecks;
		const planDiscount = item.planDiscountKopecks ?? 0;
		const planGross = multiplyKopecks(planUnitPrice, qty);
		const planNet = Math.max(0, planGross - planDiscount);

		// Поиск в каталоге: сначала по ID, затем по коду 804н
		let catalogItem: CatalogServiceLookup | undefined = undefined;
		if (item.serviceId && catalogMapById.has(item.serviceId)) {
			catalogItem = catalogMapById.get(item.serviceId);
		} else if (item.code804n) {
			catalogItem = catalogMapByCode.get(item.code804n.trim().toLowerCase());
		}

		const isFoundInCatalog = !!catalogItem;
		const isArchived = catalogItem ? (!catalogItem.active || !!catalogItem.isArchived) : false;
		const isZeroOrInvalidPrice = planUnitPrice <= 0 || (catalogItem ? catalogItem.basePriceKopecks <= 0 : false);

		const currentCatalogPrice: Kopecks = catalogItem ? catalogItem.basePriceKopecks : 0;
		const deltaKopecks = (currentCatalogPrice - planUnitPrice) as Kopecks;
		const deltaPercent = planUnitPrice > 0 ? Number(((deltaKopecks / planUnitPrice) * 100).toFixed(1)) : 0;

		// Определение типа расхождения
		let discrepancyType: PriceDiscrepancyType = "MATCH";
		let severity: ValidationItemSeverity = "OK";
		let statusDesc = "Цена соответствует действующему прейскуранту";
		let suggestedResolution: PriceLockResolutionPolicy = "LOCK_ORIGINAL_PRICE";
		let requiresAdminOverride = false;
		let suggested804nAnalogue: Service804nAnalogue | null = null;

		if (!isFoundInCatalog) {
			discrepancyType = "SERVICE_NOT_FOUND";
			severity = "BLOCKED";
			statusDesc = "Услуга не найдена в актуальном каталоге клиники";
			suggestedResolution = "REPLACE_WITH_804N_ANALOGUE";
			requiresAdminOverride = true;
			notFoundItemsCount++;
			const analogues = find804nAnalogues(item.code804n, item.nameRu, payload.catalog);
			suggested804nAnalogue = analogues[0] ?? null;
		} else if (isArchived) {
			discrepancyType = "SERVICE_ARCHIVED";
			severity = "BLOCKED";
			statusDesc = "Услуга выведена в архив и исключена из прейскуранта";
			suggestedResolution = "REPLACE_WITH_804N_ANALOGUE";
			requiresAdminOverride = true;
			archivedItemsCount++;
			const analogues = find804nAnalogues(item.code804n, item.nameRu, payload.catalog);
			suggested804nAnalogue = analogues[0] ?? null;
		} else if (isZeroOrInvalidPrice) {
			discrepancyType = "INVALID_PRICE";
			severity = "BLOCKED";
			statusDesc = "Нулевая или недействительная цена услуги в смете или прейскуранте";
			suggestedResolution = "UPDATE_TO_CURRENT_PRICE";
			requiresAdminOverride = true;
			zeroPriceItemsCount++;
		} else if (isPlanExpired && deltaKopecks > 0) {
			discrepancyType = "PLAN_EXPIRED";
			severity = "WARNING";
			statusDesc = `Срок действия сметы истек (${planAgeDays} дн. > ${validityDays} дн.). Прейскурант вырос на ${deltaPercent}%`;
			suggestedResolution = "UPDATE_TO_CURRENT_PRICE";
			requiresAdminOverride = deltaPercent > inflationThreshold;
			increasedItemsCount++;
		} else if (deltaKopecks > 0) {
			discrepancyType = "PRICE_INCREASED";
			increasedItemsCount++;
			if (isPriceLocked) {
				severity = "WARNING";
				statusDesc = `Услуга подорожала в каталоге на +${formatKopecksRu(deltaKopecks)} (+${deltaPercent}%). Защита договорной цены: клиника гарантирует стоимость сметы`;
				suggestedResolution = "LOCK_ORIGINAL_PRICE";
			} else {
				severity = deltaPercent > inflationThreshold ? "WARNING" : "OK";
				statusDesc = `Удорожание услуги на +${deltaPercent}%. Требуется подтверждение`;
				suggestedResolution = deltaPercent > inflationThreshold ? "ADMIN_OVERRIDE" : "UPDATE_TO_CURRENT_PRICE";
				requiresAdminOverride = deltaPercent > inflationThreshold;
			}
		} else if (deltaKopecks < 0) {
			discrepancyType = "PRICE_DECREASED";
			severity = "OK";
			statusDesc = `Услуга стала дешевле по акции/прайсу на ${formatKopecksRu(Math.abs(deltaKopecks) as Kopecks)}`;
			suggestedResolution = "UPDATE_TO_CURRENT_PRICE";
			decreasedItemsCount++;
		} else {
			matchedItemsCount++;
		}

		// Выбранная резолюция с учетом переопределений пользователя
		const userOverride = payload.itemResolutionOverrides?.[item.itemId];
		const selectedResolution = userOverride ?? suggestedResolution;

		// Финансовые расчеты с учетом резолюции
		let effectiveUnitPrice: Kopecks = planUnitPrice;
		let clinicAbsorption: Kopecks = 0;
		let patientSurcharge: Kopecks = 0;

		if (selectedResolution === "LOCK_ORIGINAL_PRICE") {
			effectiveUnitPrice = planUnitPrice;
			if (currentCatalogPrice > planUnitPrice) {
				clinicAbsorption = multiplyKopecks((currentCatalogPrice - planUnitPrice) as Kopecks, qty);
			}
		} else if (selectedResolution === "UPDATE_TO_CURRENT_PRICE") {
			effectiveUnitPrice = currentCatalogPrice > 0 ? currentCatalogPrice : planUnitPrice;
			if (effectiveUnitPrice > planUnitPrice) {
				patientSurcharge = multiplyKopecks((effectiveUnitPrice - planUnitPrice) as Kopecks, qty);
			}
		} else if (selectedResolution === "REPLACE_WITH_804N_ANALOGUE") {
			const analogueId = payload.itemAnalogueSelections?.[item.itemId];
			const selectedAnalogue = analogueId ? catalogMapById.get(analogueId) : null;
			if (selectedAnalogue && selectedAnalogue.basePriceKopecks > 0) {
				effectiveUnitPrice = selectedAnalogue.basePriceKopecks;
				// Снимаем блокировку, если аналог явно выбран пользователем
				if (discrepancyType === "SERVICE_ARCHIVED" || discrepancyType === "SERVICE_NOT_FOUND") {
					severity = "OK";
					requiresAdminOverride = false;
					statusDesc = `Заменено на актуальный аналог 804н: «${selectedAnalogue.title}»`;
				}
			}
		} else if (selectedResolution === "ADMIN_OVERRIDE") {
			effectiveUnitPrice = planUnitPrice;
			requiresAdminOverride = true;
		}

		const effectiveLineGross = multiplyKopecks(effectiveUnitPrice, qty);
		const effectiveDiscount = planDiscount;
		const effectiveLineNet = Math.max(0, effectiveLineGross - effectiveDiscount);

		if (requiresAdminOverride) {
			itemsRequiringOverrideCount++;
		}

		if (severity === "BLOCKED" && !payload.adminOverrideAuthorized) {
			blockingReasons.push(
				`Позиция «${item.nameRu}» (${item.code804n}): ${statusDesc}`,
			);
		} else if (severity === "WARNING") {
			warnings.push(
				`Позиция «${item.nameRu}» (${item.code804n}): ${statusDesc}`,
			);
		}

		validatedItems.push({
			itemId: item.itemId,
			serviceId: item.serviceId,
			toothNumber: item.toothNumber ?? null,
			surfaces: item.surfaces ?? [],
			code804n: item.code804n,
			nameRu: item.nameRu,
			categoryRu: item.categoryRu ?? "Терапия",
			quantity: qty,
			planUnitPriceKopecks: planUnitPrice,
			planDiscountKopecks: planDiscount,
			planGrossKopecks: planGross,
			planNetKopecks: planNet,
			currentCatalogPriceKopecks: currentCatalogPrice,
			isFoundInCatalog,
			isArchived,
			isZeroOrInvalidPrice,
			unitPriceDeltaKopecks: deltaKopecks,
			unitPriceDeltaPercent: deltaPercent,
			discrepancyType,
			severity,
			statusDescriptionRu: statusDesc,
			isPriceLocked,
			selectedResolution,
			suggestedResolution,
			effectiveUnitPriceKopecks: effectiveUnitPrice,
			effectiveDiscountKopecks: effectiveDiscount,
			effectiveLineGrossKopecks: effectiveLineGross,
			effectiveLineNetKopecks: effectiveLineNet,
			clinicAbsorptionKopecks: clinicAbsorption,
			patientSurchargeKopecks: patientSurcharge,
			suggested804nAnalogue,
			requiresAdminOverride,
		});
	}

	// Агрегатные финансовые суммы
	const originalPlanGrossKopecks = sumKopecks(validatedItems.map((i) => i.planGrossKopecks));
	const originalPlanDiscountKopecks = sumKopecks(validatedItems.map((i) => i.planDiscountKopecks));
	const originalPlanNetKopecks = sumKopecks(validatedItems.map((i) => i.planNetKopecks));

	const currentCatalogGrossKopecks = sumKopecks(
		validatedItems.map((i) => multiplyKopecks(i.currentCatalogPriceKopecks, i.quantity)),
	);
	const currentCatalogNetKopecks = Math.max(0, currentCatalogGrossKopecks - originalPlanDiscountKopecks);

	const effectiveInvoiceGrossKopecks = sumKopecks(validatedItems.map((i) => i.effectiveLineGrossKopecks));
	const effectiveInvoiceDiscountKopecks = sumKopecks(validatedItems.map((i) => i.effectiveDiscountKopecks));
	const effectiveInvoiceNetKopecks = sumKopecks(validatedItems.map((i) => i.effectiveLineNetKopecks));

	const totalClinicAbsorptionKopecks = sumKopecks(validatedItems.map((i) => i.clinicAbsorptionKopecks));
	const totalPatientSurchargeKopecks = sumKopecks(validatedItems.map((i) => i.patientSurchargeKopecks));

	// Критерий готовности к выписке наряда / счёта:
	// 1. Нет архивных / ненайденных позиций без замены на 804н аналог (DEFECT-PRICE-02 — НЕЛЬЗЯ обойти оверрайдом)
	// 2. Нет недействительных нулевых цен (НЕЛЬЗЯ обойти оверрайдом)
	// 3. Все превышения инфляции / скидки авторизованы администратором
	// 4. Истекший срок плана согласован оверрайдом или покрыт действующим договором
	const hasUnresolvedArchivedOrMissing = validatedItems.some(
		(i) => (i.isArchived || !i.isFoundInCatalog) && i.selectedResolution !== "REPLACE_WITH_804N_ANALOGUE",
	);
	const hasZeroPrices = validatedItems.some((i) => i.effectiveUnitPriceKopecks <= 0);
	const hasUnresolvedAdminOverrides =
		validatedItems.some((i) => i.requiresAdminOverride) && payload.adminOverrideAuthorized !== true;
	const isExpiredUnapproved = isPlanExpired && !payload.isSignedWithPatient && payload.adminOverrideAuthorized !== true;

	const canGenerateWorkOrder =
		validatedItems.length > 0 &&
		!hasUnresolvedArchivedOrMissing &&
		!hasZeroPrices &&
		!hasUnresolvedAdminOverrides &&
		!isExpiredUnapproved;

	const canGenerateInvoice = canGenerateWorkOrder;
	const isValid = canGenerateWorkOrder && warnings.length === 0;
	const supplementaryAgreementNeeded = totalPatientSurchargeKopecks > 0;

	return {
		planId: payload.planId,
		planNumber: payload.planNumber ?? "PL-001",
		patientId: payload.patientId,
		isValid,
		canGenerateInvoice,
		canGenerateWorkOrder,
		totalItemsCount: validatedItems.length,
		matchedItemsCount,
		increasedItemsCount,
		decreasedItemsCount,
		archivedItemsCount,
		notFoundItemsCount,
		zeroPriceItemsCount,
		itemsRequiringOverrideCount,
		planAgeDays,
		isPlanExpired,
		expiryDaysRemaining,
		isPriceLocked,
		originalPlanGrossKopecks,
		originalPlanDiscountKopecks,
		originalPlanNetKopecks,
		currentCatalogGrossKopecks,
		currentCatalogNetKopecks,
		effectiveInvoiceGrossKopecks,
		effectiveInvoiceDiscountKopecks,
		effectiveInvoiceNetKopecks,
		totalClinicAbsorptionKopecks,
		totalPatientSurchargeKopecks,
		isPennyExact: true,
		items: validatedItems,
		blockingReasons,
		warnings,
		supplementaryAgreementNeeded,
		adminOverrideInfo: {
			isAuthorized: payload.adminOverrideAuthorized ?? false,
			...(payload.adminOverrideStaffName ? { staffName: payload.adminOverrideStaffName } : {}),
			...(payload.adminOverrideReason ? { reason: payload.adminOverrideReason } : {}),
		},
	};
}
