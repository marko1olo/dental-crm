/**
 * treatmentPlanBundlesEngine.ts — клинико-финансовый движок готовых пакетов «под ключ» DENTE CRM.
 * (Мандат 8e: Запрет на палки в колёса врачам и персоналу / Пакеты под ключ вместо номенклатурного ада).
 *
 * Врач не должен набивать 15 мелких кодов Минздрава на одну пломбу или удаление.
 * Добавление готового клинического комплекса выполняется в 1 клик с автоматической
 * раскладкой по номенклатуре Приказа Минздрава РФ № 804н, копейкам и клиническим этапам.
 */

import {
	type Kopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";
import type { InvoiceServiceItem } from "../finance/invoiceEngine";
import {
	CBCT_CLINICAL_BUNDLES,
	CLINICAL_BUNDLES,
	type CbctBundleId,
	type ClinicalBundleCategory,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	type ClinicalBundleItemTemplate,
} from "./treatmentPlanBundlesPresets";
import { computeTierInstallments } from "./treatmentPlanStagesEngine";
import type {
	CashierInvoiceExportData,
	NdflDeductionResult,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
} from "./types";

export * from "./treatmentPlanBundlesPresets";

/**
 * Получить пакет по его идентификатору (из основного каталога или специализированных пакетов КЛКТ)
 */
export function getClinicalBundleById(
	bundleId: ClinicalBundleId | CbctBundleId | string,
): ClinicalBundleDefinition | undefined {
	return (
		CLINICAL_BUNDLES.find((b) => b.id === bundleId) ??
		CBCT_CLINICAL_BUNDLES.find((b) => b.id === bundleId)
	);
}

/**
 * Получить специализированный клинический пакет КЛКТ по идентификатору
 */
export function getCbctBundleById(
	bundleId: CbctBundleId | string,
): ClinicalBundleDefinition | undefined {
	return CBCT_CLINICAL_BUNDLES.find((b) => b.id === bundleId);
}

/**
 * Получить все специализированные клинические пакеты КЛКТ (синус-лифтинг, остеопластика, коронки на имплантатах)
 */
export function getAllCbctBundles(): readonly ClinicalBundleDefinition[] {
	return CBCT_CLINICAL_BUNDLES;
}

/**
 * Получить все доступные клинические пакеты
 */
export function getAllClinicalBundles(): readonly ClinicalBundleDefinition[] {
	return CLINICAL_BUNDLES;
}

export interface BundlePriceBreakdown {
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly selectedItems: readonly ClinicalBundleItemTemplate[];
	readonly excludedItems: readonly ClinicalBundleItemTemplate[];
	readonly savingsRub: number;
	readonly savingsKopecks: Kopecks;
	readonly isFullySelected: boolean;
}

/**
 * Расчет цены пакета с учетом гибкой корректировки отдельных позиций (например, без анестезии).
 * Копеечно-точный расчет без погрешностей с плавающей запятой (ACID / 54-ФЗ).
 */
export function calculateBundlePrice(
	bundleId: ClinicalBundleId,
	selectedItemIds?: readonly string[],
): BundlePriceBreakdown {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const selectedSet =
		selectedItemIds && selectedItemIds.length > 0 ? new Set(selectedItemIds) : null;

	const selectedItems: ClinicalBundleItemTemplate[] = [];
	const excludedItems: ClinicalBundleItemTemplate[] = [];

	for (const item of bundle.items) {
		if (selectedSet === null || selectedSet.has(item.id)) {
			selectedItems.push(item);
		} else {
			excludedItems.push(item);
		}
	}

	const totalRub = selectedItems.reduce((acc, it) => acc + it.defaultPriceRub, 0);
	const totalKopecks = sumKopecks(
		selectedItems.map((it) => it.defaultPriceKopecks ?? parseKopecks(it.defaultPriceRub)),
	);

	const savingsRub = Math.max(0, bundle.totalPriceRub - totalRub);
	const savingsKopecks = Math.max(0, bundle.totalPriceKopecks - totalKopecks) as Kopecks;

	return {
		totalRub,
		totalKopecks,
		selectedItems,
		excludedItems,
		savingsRub,
		savingsKopecks,
		isFullySelected: excludedItems.length === 0,
	};
}

export interface CreateBundlePlanItemsOptions {
	readonly toothNumber?: number | undefined;
	readonly selectedItemIds?: readonly string[] | undefined;
	readonly customPriceMap?: Record<string, number> | undefined;
}

/**
 * Создать массив элементов плана лечения (TreatmentPlanItem[]) для указанного пакета.
 * Поддерживает как простой вызов toothNumber, так и объект options с фильтрацией позиций.
 */
export function createBundlePlanItems(
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanItem[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Неизвестный пакет: ${bundleId}`);
	}

	let toothNumber: number | undefined;
	let selectedItemIds: readonly string[] | undefined;
	let customPriceMap: Record<string, number> | undefined;

	if (typeof toothNumberOrOptions === "number") {
		toothNumber = toothNumberOrOptions;
	} else if (toothNumberOrOptions && typeof toothNumberOrOptions === "object") {
		toothNumber = toothNumberOrOptions.toothNumber;
		selectedItemIds = toothNumberOrOptions.selectedItemIds;
		customPriceMap = toothNumberOrOptions.customPriceMap;
	}

	const effectiveTooth = bundle.requiresTooth
		? toothNumber && toothNumber > 0
			? toothNumber
			: bundle.defaultTooth
		: undefined;

	const breakdown = calculateBundlePrice(bundleId, selectedItemIds);
	const now = Date.now();

	return breakdown.selectedItems.map((item, idx) => {
		const priceRub =
			customPriceMap && customPriceMap[item.id] !== undefined
				? Math.max(0, customPriceMap[item.id]!)
				: item.defaultPriceRub;

		const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";
		const uniqueId = `item-bundle-${bundle.id}-${effectiveTooth ?? "mouth"}-${now}-${idx + 1}`;

		return {
			id: uniqueId,
			toothNumber: effectiveTooth,
			code804n: item.code804n,
			name: `${toothPrefix}${item.name}`,
			category: item.category,
			priceRub,
			unitPriceRub: priceRub,
			discountRub: 0,
			quantity: 1,
			phase: bundle.stageNumber,
			stageKind: bundle.stageKind,
			isAuto: false,
			materials: item.materials,
			clinicalRationale: item.clinicalRationale,
			fromCatalog: true,
			isDraft: false,
			requiresManualPricing: false,
		};
	});
}

/**
 * Применить готовый клинический пакет под ключ к списку этапов плана лечения (TreatmentPlanStage[]).
 * Добавляет позиции в соответствующий клинический этап (Этап 1, 2 или 3) с автоматическим пересчетом сумм и копеек.
 */
export function applyClinicalBundleToStages(
	stages: readonly TreatmentPlanStage[],
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanStage[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		return [...stages];
	}

	const newItems = createBundlePlanItems(bundleId, toothNumberOrOptions);
	if (newItems.length === 0) {
		return [...stages];
	}

	const targetStageExists = stages.some(
		(st) => st.stageKind === bundle.stageKind || st.stageNumber === bundle.stageNumber,
	);

	if (!targetStageExists) {
		const stageTitles: Record<1 | 2 | 3, { title: string; subtitle: string; goal: string }> = {
			1: {
				title: "Этап 1: Неотложная помощь и терапевтическая санация",
				subtitle: "Ликвидация очагов инфекции, лечение кариеса и гигиена",
				goal: "Полная санация полости рта и устранение болевых симптомов",
			},
			2: {
				title: "Этап 2: Хирургический этап и дентальная имплантация",
				subtitle: "Удаление безнадежных зубов, костная пластика и имплантация",
				goal: "Восстановление фундамента челюстной кости и опор",
			},
			3: {
				title: "Этап 3: Ортопедический этап и протезирование",
				subtitle: "Эстетическое и функциональное восстановление зубных рядов",
				goal: "Окончательное протезирование и нормализация окклюзии",
			},
		};

		const meta = stageTitles[bundle.stageNumber];
		const stageTotalRub = newItems.reduce((acc, it) => acc + it.priceRub, 0);
		const stageTotalKopecks = parseKopecks(stageTotalRub);

		const newStage: TreatmentPlanStage = {
			stageNumber: bundle.stageNumber,
			stageKind: bundle.stageKind,
			title: meta.title,
			subtitle: meta.subtitle,
			clinicalGoal: meta.goal,
			items: newItems,
			totalRub: stageTotalRub,
			totalKopecks: stageTotalKopecks,
			estimatedVisits: Math.max(1, Math.ceil(newItems.length / 2)),
			estimatedWeeks: bundle.stageNumber === 2 ? 12 : 2,
			order804nCodes: newItems.map((it) => it.code804n),
		};

		return [...stages, newStage].sort((a, b) => a.stageNumber - b.stageNumber);
	}

	return stages.map((stage) => {
		if (stage.stageKind !== bundle.stageKind && stage.stageNumber !== bundle.stageNumber) {
			return stage;
		}

		const updatedItems = [...stage.items, ...newItems];
		const updatedTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
		const updatedTotalKopecks = sumKopecks(updatedItems.map((it) => parseKopecks(it.priceRub)));
		const updated804nCodes = Array.from(
			new Set([...stage.order804nCodes, ...newItems.map((it) => it.code804n)]),
		);

		return {
			...stage,
			items: updatedItems,
			totalRub: updatedTotalRub,
			totalKopecks: updatedTotalKopecks,
			estimatedVisits: Math.max(stage.estimatedVisits, Math.ceil(updatedItems.length / 2)),
			order804nCodes: updated804nCodes,
		};
	});
}

/**
 * Применить готовый клинический пакет под ключ к варианту тарифа TreatmentPlanTier
 * с полным пересчетом вычета 13% НДФЛ, рассрочки 0% и графика платежей.
 */
export function applyClinicalBundleToTier(
	tier: TreatmentPlanTier,
	bundleId: ClinicalBundleId,
	toothNumberOrOptions?: number | CreateBundlePlanItemsOptions,
): TreatmentPlanTier {
	const updatedStages = applyClinicalBundleToStages(tier.stages, bundleId, toothNumberOrOptions);
	const totalKopecks = sumKopecks(updatedStages.map((s) => s.totalKopecks));
	const totalRub = Math.round(totalKopecks / 100);
	const allItems = updatedStages.flatMap((s) => s.items);

	const ndflBreakdown = calculatePlanTaxDeductionBreakdown(allItems);
	const isHighCost = ndflBreakdown.hasCode02ExpensiveServices;
	const ndflDetails: NdflDeductionResult = {
		code: isHighCost ? "02" : "01",
		codeDescription: isHighCost
			? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
			: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом базы 150 000 ₽ (макс. возврат 19 500 ₽)",
		isHighCostCode02: isHighCost,
		baseKopecks: (isHighCost
			? totalKopecks
			: Math.min(totalKopecks, parseKopecks(150000))) as Kopecks,
		refundKopecks: parseKopecks(ndflBreakdown.grandTotalRefund13Rub),
		refundRub: ndflBreakdown.grandTotalRefund13Rub,
		finalPriceWithRefundRub: ndflBreakdown.netPriceWithRefundRub,
		annualLimitRub: isHighCost ? undefined : 150000,
	};
	const installments = computeTierInstallments(totalKopecks);
	const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

	return {
		...tier,
		stages: updatedStages,
		itemsCount: allItems.length,
		totalRub,
		totalKopecks,
		monthlyInstallment12Rub: installments[12].monthlyPaymentRub,
		installments,
		ndflDetails,
		ndflRefundRub: ndflBreakdown.grandTotalRefund13Rub,
		priceWithNdflRefundRub: ndflBreakdown.netPriceWithRefundRub,
		stagedSchedule,
	};
}

/**
 * Создать массив элементов для счета пациента (InvoiceServiceItem[])
 * для 1-клик вставки пакета в активный счет / кассу 54-ФЗ.
 */
export function createBundleInvoiceItems(
	bundleId: ClinicalBundleId,
	options: CreateBundlePlanItemsOptions = {},
): InvoiceServiceItem[] {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const { toothNumber, selectedItemIds, customPriceMap } = options;
	const effectiveTooth = bundle.requiresTooth
		? toothNumber && toothNumber > 0
			? toothNumber
			: bundle.defaultTooth
		: undefined;

	const breakdown = calculateBundlePrice(bundleId, selectedItemIds);
	const now = Date.now();

	return breakdown.selectedItems.map((item, idx) => {
		const priceRub =
			customPriceMap && customPriceMap[item.id] !== undefined
				? Math.max(0, customPriceMap[item.id]!)
				: item.defaultPriceRub;

		const toothPrefix = effectiveTooth ? `[Зуб ${effectiveTooth}] ` : "";

		const mappedCategory: InvoiceServiceItem["category"] =
			bundle.category === "therapy"
				? "therapy"
				: bundle.category === "surgery"
					? "surgery"
					: bundle.category === "hygiene"
						? "hygiene"
						: "orthopedics";

		return {
			id: `inv-item-${bundle.id}-${effectiveTooth ?? "0"}-${now}-${idx + 1}`,
			name: `${toothPrefix}${item.name}`,
			code804n: item.code804n,
			toothNumber: effectiveTooth,
			quantity: 1,
			priceRub,
			discountRub: 0,
			category: mappedCategory,
		};
	});
}

export interface CreateBundleInvoiceExportOptions extends CreateBundlePlanItemsOptions {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly discountPercent?: number | undefined;
	readonly notes?: string | undefined;
}

/**
 * Создать полный экспорт счета пациента для кассы 54-ФЗ (CashierInvoiceExportData) в 1 клик.
 */
export function createBundleInvoiceExport(
	bundleId: ClinicalBundleId,
	options: CreateBundleInvoiceExportOptions = {},
): CashierInvoiceExportData {
	const bundle = getClinicalBundleById(bundleId);
	if (!bundle) {
		throw new Error(`[treatmentPlanBundlesEngine] Пакет не найден: ${bundleId}`);
	}

	const planItems = createBundlePlanItems(bundleId, options);
	const grossTotalRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
	const discountPercent = Math.max(0, Math.min(100, options.discountPercent ?? 0));
	const discountRub = Math.round((grossTotalRub * discountPercent) / 100);
	const netTotalRub = Math.max(0, grossTotalRub - discountRub);
	const netTotalKopecks = parseKopecks(netTotalRub);

	const toothNote = bundle.requiresTooth
		? ` (Зуб ${options.toothNumber ?? bundle.defaultTooth})`
		: "";

	return {
		patientId: options.patientId ?? "patient-walkin",
		patientName: options.patientName ?? "Пациент",
		invoiceId: `inv-chairside-${bundleId}-${Date.now()}`,
		invoiceNumber: `ПАКЕТ-${Date.now().toString().slice(-6)}`,
		items: planItems,
		grossTotalRub,
		discountRub,
		bonusPointsUsedRub: 0,
		bonusPointsUsedKopecks: 0 as Kopecks,
		netTotalRub,
		netTotalKopecks,
		notes: options.notes ?? `Клинический пакет «${bundle.shortTitle}»${toothNote}`,
		createdAtIso: new Date().toISOString(),
	};
}

// ---------------------------------------------------------------------------
// Обратная совместимость и удобные алиасы (Chairside aliases)
// ---------------------------------------------------------------------------
export const getChairsideBundleById = getClinicalBundleById;
export const getAllChairsideBundles = getAllClinicalBundles;
export const CHAIRSIDE_CLINICAL_BUNDLES = CLINICAL_BUNDLES;
export const calculateChairsideBundlePrice = calculateBundlePrice;
export const createChairsideBundlePlanItems = createBundlePlanItems;
export const applyChairsideBundleToStages = applyClinicalBundleToStages;
export const applyChairsideBundleToTier = applyClinicalBundleToTier;
export const createChairsideBundleInvoiceItems = createBundleInvoiceItems;
export const createChairsideBundleInvoiceExport = createBundleInvoiceExport;

export type ChairsideBundleId = ClinicalBundleId;
export type ChairsideBundleCategory = ClinicalBundleCategory;
export type ChairsideClinicalBundleDefinition = ClinicalBundleDefinition;
export type ChairsideBundleItemDefinition = ClinicalBundleItemTemplate;
