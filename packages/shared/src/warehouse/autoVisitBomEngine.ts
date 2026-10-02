/**
 * autoVisitBomEngine.ts — Automatic Background BOM Deduction & Class B Waste Engine.
 *
 * Wave 134+ / Red Team Mandate 8e, 8k, 8n, 8s, 8v:
 * 1. Background BOM Deduction:
 *    When a doctor completes a visit, consumables linked to rendered 804n services
 *    automatically deduct in the background without nurse/doctor clerical clicking.
 * 2. Soft Overdraft (Mandates 8e, 8n, 8s):
 *    Stock shortages NEVER block patient care, visit completion, or saving Form 043/u.
 *    Negative stock balance is recorded with administrative replenishment warnings.
 * 3. 1-Click Class B Waste Disposal (СанПиН 2.1.3684-21):
 *    Used anesthetic carpules, needles, and sharps are automatically tracked and
 *    prepared for the toxic medical waste disposal ledger with 1-person approval
 *    (no 3-person commission required).
 * 4. Exact Kopeck Precision & 0 Cartoon Emojis (Mandate 8d).
 */

import { z } from "zod";
import { formatKopecksRu } from "../utils/money.js";
import { generateClassBWasteSealAndBarcode } from "../utils/idGenerators.js";
import {
	type ConsumableDeductedItem,
	type ConsumableItemLink,
	type PlannedServiceConsumable,
	type RenderedServiceItem,
	CLASS_B_WEIGHT_ESTIMATES,
	calculateClassBWasteWeightKg,
	calculateServiceConsumables,
	consumableDeductedItemSchema,
	consumableDeductionResultSchema,
	consumableItemLinkSchema,
	formatConsumablesWriteOffA4Report,
	processConsumablesStockDeduction,
	renderedServiceItemSchema,
	roundQuantity,
} from "./treatmentConsumablesEngine.js";
import { DEFAULT_804N_CONSUMABLE_LINKS } from "./default804nBomCatalog.js";

// ─── 1. CLASS B MEDICAL WASTE TYPES & SCHEMAS (САНПИН 2.1.3684-21) ───────────

export const classBWasteItemSchema = z.object({
	name: z.string(),
	quantity: z.number(),
	unit: z.string(),
	isSharps: z.boolean(),
	isCarpule: z.boolean(),
});
export type ClassBWasteItem = z.infer<typeof classBWasteItemSchema>;

export const classBWasteSummarySchema = z.object({
	carpulesCount: z.number().int().nonnegative(),
	sharpsCount: z.number().int().nonnegative(),
	contaminatedItemsCount: z.number().int().nonnegative(),
	totalUnits: z.number().nonnegative(),
	estimatedWeightKg: z.number().nonnegative(),
	wasteClass: z.literal("class_B"),
	packagingRecommended: z.enum(["yellow_container_sharps", "yellow_bag"]),
	sealNumber: z.string(),
	barcode: z.string(),
	disposalReason: z.string(),
	sanpinStandard: z.string(),
	singlePersonApproval: z.boolean(),
	items: z.array(classBWasteItemSchema),
});
export type ClassBWasteSummary = z.infer<typeof classBWasteSummarySchema>;

export interface AutoVisitConsumablesOptions {
	readonly customLinks?: readonly ConsumableItemLink[] | undefined;
	readonly includeStandardPpe?: boolean | undefined; // default: true
	readonly fallbackToDefaults?: boolean | undefined; // default: true
}

export const autoVisitBomDeductionInputSchema = z.object({
	visitId: z.string().min(1, "ID визита обязателен"),
	patientId: z.string().min(1, "ID пациента обязателен"),
	doctorId: z.string().min(1, "ID врача обязателен"),
	patientFullName: z.string().optional(),
	doctorFullName: z.string().optional(),
	visitDate: z.string().optional(),
	renderedServices: z.array(renderedServiceItemSchema),
	currentStockMap: z.record(z.string(), z.number()).optional(),
	customLinks: z.array(consumableItemLinkSchema).optional(),
	allowOverdraft: z.boolean().optional().default(true),
	includeStandardPpe: z.boolean().optional().default(true),
	fallbackToDefaults: z.boolean().optional().default(true),
});
export type AutoVisitBomDeductionInput = z.input<typeof autoVisitBomDeductionInputSchema>;

export const autoVisitBomDeductionResultSchema = consumableDeductionResultSchema.extend({
	classBWaste: classBWasteSummarySchema,
	statutoryActText: z.string(),
});
export type AutoVisitBomDeductionResult = z.infer<typeof autoVisitBomDeductionResultSchema>;

// ─── 2. CLASS B WASTE RECOGNITION (САНПИН 2.1.3684-21) ───────────────────────

/**
 * Calculates hazardous Class B medical waste from deducted treatment consumables.
 * Distinguishes puncturing sharps (needles, blades) from empty glass carpules and contaminated PPE.
 */
export function calculateClassBWasteFromItems(
	items: ReadonlyArray<{
		itemName: string;
		category?: string | undefined;
		unit?: string | undefined;
		deductedQty: number;
	}>,
	referenceDate = new Date(),
): ClassBWasteSummary {
	let carpulesCount = 0;
	let sharpsCount = 0;
	let contaminatedItemsCount = 0;
	const wasteItems: ClassBWasteItem[] = [];

	for (const it of items) {
		const nameLower = it.itemName.toLowerCase();
		const unitLower = (it.unit ?? "").toLowerCase();
		const catLower = (it.category ?? "").toLowerCase();

		const isSharps =
			nameLower.includes("игла") ||
			nameLower.includes("needle") ||
			nameLower.includes("скальпель") ||
			nameLower.includes("scalpel") ||
			nameLower.includes("лезвие") ||
			nameLower.includes("шовный") ||
			nameLower.includes("suture") ||
			nameLower.includes("файл") ||
			nameLower.includes("бор ") ||
			nameLower.includes("диск");

		const isCarpule =
			!isSharps &&
			(catLower === "anesthetic" ||
				unitLower === "карпула" ||
				unitLower === "карп." ||
				unitLower === "carpule" ||
				nameLower.includes("карпул") ||
				nameLower.includes("артикаин") ||
				nameLower.includes("мепивакаин") ||
				nameLower.includes("септанест") ||
				nameLower.includes("ультракаин") ||
				nameLower.includes("скандонест"));

		const qty = it.deductedQty;

		if (isCarpule) {
			carpulesCount += Math.max(1, Math.round(qty));
			wasteItems.push({
				name: it.itemName,
				quantity: qty,
				unit: it.unit ?? "карп.",
				isSharps: false,
				isCarpule: true,
			});
		} else if (isSharps) {
			sharpsCount += Math.max(1, Math.round(qty));
			wasteItems.push({
				name: it.itemName,
				quantity: qty,
				unit: it.unit ?? "шт.",
				isSharps: true,
				isCarpule: false,
			});
		} else {
			contaminatedItemsCount += Math.max(1, Math.round(qty));
			wasteItems.push({
				name: it.itemName,
				quantity: qty,
				unit: it.unit ?? "шт.",
				isSharps: false,
				isCarpule: false,
			});
		}
	}

	// Нормативная оценка массы (кг) по СанПиН 2.1.3684-21 через канонический калькулятор
	const estimatedWeightKg = calculateClassBWasteWeightKg(
		carpulesCount,
		sharpsCount,
		contaminatedItemsCount,
	);

	const { sealNumber, barcode } = generateClassBWasteSealAndBarcode(referenceDate, {
		seedKey: items.map((i) => i.itemName).join(";"),
	});
	const packagingRecommended =
		sharpsCount > 0 || carpulesCount > 0 ? "yellow_container_sharps" : "yellow_bag";

	return {
		carpulesCount,
		sharpsCount,
		contaminatedItemsCount,
		totalUnits: carpulesCount + sharpsCount + contaminatedItemsCount,
		estimatedWeightKg,
		wasteClass: "class_B",
		packagingRecommended,
		sealNumber,
		barcode,
		disposalReason:
			"Отработанные карпулы анестетиков, иглы, скальпели и СИЗ после клинического приёма (СанПиН 2.1.3684-21)",
		sanpinStandard: "СанПиН 2.1.3684-21 / СанПиН 3.3686-21",
		singlePersonApproval: true,
		items: wasteItems,
	};
}

// ─── 3. CANONICAL BOM RESOLVER ───────────────────────────────────────────────

/**
 * Calculates planned consumables for rendered services, seamlessly combining
 * custom clinic links with statutory Order 804n defaults and baseline PPE.
 * Reuses the canonical calculateServiceConsumables engine.
 */
export function calculateAutoVisitConsumables(
	renderedServices: readonly RenderedServiceItem[],
	options: AutoVisitConsumablesOptions = {},
): PlannedServiceConsumable[] {
	const customLinks = options.customLinks ?? [];
	const fallbackToDefaults = options.fallbackToDefaults !== false;
	const includePpe = options.includeStandardPpe !== false;

	const effectiveServices: RenderedServiceItem[] = [...renderedServices];

	// Ensure base PPE (B01.065.001) is included if not already explicitly present
	if (includePpe && !effectiveServices.some((s) => s.serviceCode === "B01.065.001")) {
		effectiveServices.push({
			serviceCode: "B01.065.001",
			serviceTitle: "Стандартный расходный набор СИЗ приёма (СанПиН 3.3686-21)",
			quantity: 1,
			toothNumber: null,
		});
	}

	// Prepare effective links: custom links take precedence, fallback to default 804n catalog
	const customCodes = new Set(customLinks.map((l) => l.service804nCode));
	const defaults = fallbackToDefaults
		? DEFAULT_804N_CONSUMABLE_LINKS.filter((l) => !customCodes.has(l.service804nCode))
		: [];
	const effectiveLinks: ConsumableItemLink[] = [...customLinks, ...defaults];

	return calculateServiceConsumables(effectiveServices, effectiveLinks);
}

// ─── 4. EXECUTE AUTO-VISIT BOM DEDUCTION WITH SOFT OVERDRAFT ─────────────────

/**
 * Executes automated background BOM deduction for a completed clinical visit.
 *
 * MANDATE 8e / 8n / 8s:
 * - Soft Overdraft enabled by default: warehouse shortages NEVER block visit completion.
 * - Negative resulting stocks are captured with informative replenishment alerts.
 * - Used carpules and sharps are formatted for 1-click Class B waste disposal.
 */
export function executeAutoVisitBomDeduction(
	input: AutoVisitBomDeductionInput,
): AutoVisitBomDeductionResult {
	const plannedConsumables = calculateAutoVisitConsumables(input.renderedServices, {
		customLinks: input.customLinks,
		includeStandardPpe: input.includeStandardPpe,
		fallbackToDefaults: input.fallbackToDefaults,
	});

	const deduction = processConsumablesStockDeduction(
		plannedConsumables,
		input.currentStockMap ?? {},
		{
			allowOverdraft: input.allowOverdraft !== false,
			overdraftMessagePrefix: "Мандат 8e/8n: Мягкий овердрафт",
		},
	);

	// Class B medical waste recognition
	const classBWaste = calculateClassBWasteFromItems(deduction.deductedItems);

	// Statutory Form 043/u & SanPiN A4 Act formatting
	const statutoryActText = formatConsumablesWriteOffA4Report(
		{
			visitId: input.visitId,
			patientId: input.patientId,
			doctorId: input.doctorId,
			totalDeductedItems: deduction.deductedItems.length,
			totalCostPriceKopecks: deduction.totalCostPriceKopecks,
			totalCostPriceRub: formatKopecksRu(deduction.totalCostPriceKopecks),
			items: deduction.deductedItems,
			softOverdrafts: deduction.softOverdrafts,
			hasOverdraft: deduction.hasOverdraft,
		},
		{
			patientFullName: input.patientFullName,
			doctorFullName: input.doctorFullName,
			visitDate: input.visitDate,
		},
	);

	return {
		visitId: input.visitId,
		patientId: input.patientId,
		doctorId: input.doctorId,
		totalDeductedItems: deduction.deductedItems.length,
		totalCostPriceKopecks: deduction.totalCostPriceKopecks,
		totalCostPriceRub: formatKopecksRu(deduction.totalCostPriceKopecks),
		items: deduction.deductedItems,
		softOverdrafts: deduction.softOverdrafts,
		hasOverdraft: deduction.hasOverdraft,
		classBWaste,
		statutoryActText,
	};
}

export const autoVisitBomEngine = {
	calculateClassBWasteFromItems,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
	classBWasteItemSchema,
	classBWasteSummarySchema,
	autoVisitBomDeductionInputSchema,
	autoVisitBomDeductionResultSchema,
} as const;
