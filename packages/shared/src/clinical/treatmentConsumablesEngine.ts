/**
 * packages/shared/src/clinical/treatmentConsumablesEngine.ts
 *
 * Wave 134: Treatment Consumables Deduction & 804n Inventory Linkage Engine.
 * Adapted from reference implementation (DentalPin treatment_consumables module):
 * - backend/app/modules/treatment_consumables/models.py
 * - backend/app/modules/treatment_consumables/schemas.py
 * - backend/app/modules/treatment_consumables/service.py
 * - backend/app/modules/treatment_consumables/events.py
 *
 * CLINICAL & ARCHITECTURAL INVARIANTS:
 * 1. Mandate 8e & 8n (Doctor Autonomy & Scale Sovereignty):
 *    - Soft overdraft by default (`allowOverdraft = true`): warehouse stock shortages
 *      never block doctor from completing a treatment, placing a filling, or relieving pain.
 *    - Strict overdraft verification available (`allowOverdraft = false`) for rigid backoffice audits.
 * 2. Mandate 8k (CRM != Reality Simulator):
 *    - 1-click batch deduction across multiple rendered services of a visit.
 *    - Zero manual nurse data-entry friction for standard treatment BOMs.
 * 3. Mandate 8d item 7 (Studio Clinical HIG / 7 Deadly Sins):
 *    - Form 043/u and SanPiN statutory write-off acts contain STRICTLY 0 cartoon emojis.
 * 4. Kopeck-Exact Financial Calculations:
 *    - Integer kopecks math avoiding IEEE-754 floating point arithmetic drift.
 */

import { z } from "zod";
import { formatKopecksRu } from "../utils/money.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & TYPES
// ─────────────────────────────────────────────────────────────────────────────

export const consumableCategorySchema = z.enum([
	"anesthetic",
	"composite",
	"suture",
	"endo_file",
	"bur",
	"rubber_dam",
	"hygiene_paste",
	"disinfectant",
	"other",
]);
export type ConsumableCategory = z.infer<typeof consumableCategorySchema>;

export const CONSUMABLE_CATEGORY_LABELS: Record<ConsumableCategory, string> = {
	anesthetic: "Анестетики (карпулы / ампулы)",
	composite: "Композиты и пломбировочные материалы",
	suture: "Шовный материал",
	endo_file: "Эндодонтические файлы и гуттаперча",
	bur: "Боры и полировочные диски",
	rubber_dam: "Коффердам / раббердам",
	hygiene_paste: "Пасты и порошки для профгигиены",
	disinfectant: "Дезинфектанты и антисептики",
	other: "Прочие расходные материалы",
};

export const consumableUnitSchema = z.enum([
	"карпула",
	"шприц_гр",
	"ампула",
	"шт",
	"метр",
	"упак",
]);
export type ConsumableUnit = z.infer<typeof consumableUnitSchema>;

export const CONSUMABLE_UNIT_LABELS: Record<ConsumableUnit, string> = {
	карпула: "карпула",
	шприц_гр: "шприц (г)",
	ампула: "ампула",
	шт: "шт.",
	метр: "м",
	упак: "упак.",
};

/**
 * Link between a statutory 804n service and an inventory item BOM.
 */
export const consumableItemLinkSchema = z.object({
	id: z.string().min(1, "ID связи обязателен"),
	service804nCode: z.string().min(1, "Код номенклатуры 804н обязателен"),
	serviceTitle: z.string().min(1, "Наименование услуги обязательно"),
	inventoryItemId: z.string().min(1, "ID складской номенклатуры обязателен"),
	itemName: z.string().min(1, "Наименование расходного материала обязательно"),
	category: consumableCategorySchema.optional().default("other"),
	unit: consumableUnitSchema,
	quantityPerService: z.number().positive("Норма расхода должна быть больше нуля"),
	isMandatory: z.boolean().optional().default(true),
	costPriceKopecks: z.number().int().nonnegative("Себестоимость в копейках должна быть неотрицательной"),
	notes: z.string().optional().nullable(),
});
export type ConsumableItemLink = z.input<typeof consumableItemLinkSchema>;

/**
 * Rendered service in a completed or in-progress clinical visit.
 */
export const renderedServiceItemSchema = z.object({
	serviceCode: z.string().min(1, "Код услуги 804н обязателен"),
	serviceTitle: z.string().optional(),
	quantity: z.number().positive().optional().default(1),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
});
export type RenderedServiceItem = z.input<typeof renderedServiceItemSchema>;

/**
 * Request payload for batch consumable deduction.
 */
export const consumableDeductionRequestSchema = z.object({
	visitId: z.string().min(1, "ID визита обязателен"),
	patientId: z.string().min(1, "ID пациента обязателен"),
	patientFullName: z.string().optional(),
	doctorId: z.string().min(1, "ID врача обязателен"),
	doctorFullName: z.string().optional(),
	visitDate: z.string().optional(),
	renderedServices: z.array(renderedServiceItemSchema),
	currentStockMap: z.record(z.string(), z.number()),
	allowOverdraft: z.boolean().optional().default(true),
});
export type ConsumableDeductionRequest = z.input<typeof consumableDeductionRequestSchema>;

/**
 * Detailed line of an item deducted during the visit.
 */
export const consumableDeductedItemSchema = z.object({
	inventoryItemId: z.string().min(1),
	itemName: z.string().min(1),
	category: consumableCategorySchema.optional(),
	unit: consumableUnitSchema.optional(),
	service804nCode: z.string().optional(),
	toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	deductedQty: z.number().nonnegative(),
	remainingQty: z.number(),
	unitCostPriceKopecks: z.number().int().nonnegative(),
	totalCostPriceKopecks: z.number().int().nonnegative(),
	totalCostPriceRub: z.string(),
	isOverdraft: z.boolean(),
	overdraftWarning: z.string().optional(),
});
export type ConsumableDeductedItem = z.infer<typeof consumableDeductedItemSchema>;

/**
 * Overall outcome of the batch consumable deduction operation.
 */
export const consumableDeductionResultSchema = z.object({
	visitId: z.string(),
	patientId: z.string(),
	doctorId: z.string(),
	totalDeductedItems: z.number().int().nonnegative(),
	totalCostPriceKopecks: z.number().int().nonnegative(),
	totalCostPriceRub: z.string(),
	items: z.array(consumableDeductedItemSchema),
	softOverdrafts: z.array(z.string()),
	hasOverdraft: z.boolean(),
});
export type ConsumableDeductionResult = z.infer<typeof consumableDeductionResultSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE DEDUCTION ENGINE (MANDATES 8E & 8N)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlannedServiceConsumable {
	linkId: string;
	service804nCode: string;
	serviceTitle: string;
	toothNumber: number | null;
	inventoryItemId: string;
	itemName: string;
	category: ConsumableCategory;
	unit: ConsumableUnit;
	requiredQuantity: number;
	unitCostPriceKopecks: number;
	totalCostPriceKopecks: number;
	isMandatory: boolean;
}

/**
 * Calculates normative consumable requirements for rendered 804n services.
 */
export function calculateServiceConsumables(
	renderedServices: RenderedServiceItem[],
	links: ConsumableItemLink[],
): PlannedServiceConsumable[] {
	const planned: PlannedServiceConsumable[] = [];

	for (const service of renderedServices) {
		const serviceQuantity = service.quantity ?? 1;
		const toothNumber = service.toothNumber ?? null;

		// Match links by service804nCode
		const matchedLinks = links.filter((l) => l.service804nCode === service.serviceCode);

		for (const link of matchedLinks) {
			const rawQty = link.quantityPerService * serviceQuantity;
			// Round quantity deterministically to 4 decimal places avoiding IEEE-754 quirks
			const requiredQuantity = Math.round(rawQty * 10000) / 10000;
			const totalCostKopecks = Math.round(link.costPriceKopecks * requiredQuantity);

			planned.push({
				linkId: link.id,
				service804nCode: link.service804nCode,
				serviceTitle: link.serviceTitle,
				toothNumber,
				inventoryItemId: link.inventoryItemId,
				itemName: link.itemName,
				category: link.category ?? "other",
				unit: link.unit,
				requiredQuantity,
				unitCostPriceKopecks: link.costPriceKopecks,
				totalCostPriceKopecks: totalCostKopecks,
				isMandatory: link.isMandatory ?? true,
			});
		}
	}

	return planned;
}

/**
 * Executes batch deduction of consumables against current warehouse stock.
 * Mandate 8e: By default (`allowOverdraft = true`), stock shortages never throw
 * or block patient care; soft overdraft warnings are captured.
 */
export function executeBatchConsumablesDeduction(
	request: ConsumableDeductionRequest,
	links: ConsumableItemLink[],
): ConsumableDeductionResult {
	const allowOverdraft = request.allowOverdraft !== false;
	const plannedConsumables = calculateServiceConsumables(request.renderedServices, links);

	// Running stock tracker
	const stockTracker = new Map<string, number>();
	for (const [itemId, qty] of Object.entries(request.currentStockMap)) {
		stockTracker.set(itemId, qty);
	}

	const deductedItems: ConsumableDeductedItem[] = [];
	const softOverdrafts: string[] = [];
	let totalCostPriceKopecks = 0;
	let hasOverdraft = false;

	for (const planned of plannedConsumables) {
		const currentStock = stockTracker.get(planned.inventoryItemId) ?? 0;
		const rawRemaining = currentStock - planned.requiredQuantity;
		const remainingQty = Math.round(rawRemaining * 10000) / 10000;
		stockTracker.set(planned.inventoryItemId, remainingQty);

		const isOverdraftItem = remainingQty < 0;
		let overdraftWarning: string | undefined;

		if (isOverdraftItem) {
			hasOverdraft = true;
			const warningMsg = `Мандат 8e: Складской овердрафт позиции «${planned.itemName}» (ID: ${planned.inventoryItemId}): списано ${planned.requiredQuantity} ${planned.unit}, остаток ${remainingQty} ${planned.unit}. Операция не блокируется.`;

			if (!allowOverdraft) {
				throw new Error(
					`Складской дефицит: недостаточно остатка позиции «${planned.itemName}» (доступно: ${currentStock}, требуется: ${planned.requiredQuantity} ${planned.unit})`,
				);
			}

			overdraftWarning = warningMsg;
			softOverdrafts.push(warningMsg);
		}

		totalCostPriceKopecks += planned.totalCostPriceKopecks;

		deductedItems.push({
			inventoryItemId: planned.inventoryItemId,
			itemName: planned.itemName,
			category: planned.category,
			unit: planned.unit,
			service804nCode: planned.service804nCode,
			toothNumber: planned.toothNumber,
			deductedQty: planned.requiredQuantity,
			remainingQty,
			unitCostPriceKopecks: planned.unitCostPriceKopecks,
			totalCostPriceKopecks: planned.totalCostPriceKopecks,
			totalCostPriceRub: formatKopecksRu(planned.totalCostPriceKopecks),
			isOverdraft: isOverdraftItem,
			overdraftWarning,
		});
	}

	return {
		visitId: request.visitId,
		patientId: request.patientId,
		doctorId: request.doctorId,
		totalDeductedItems: deductedItems.length,
		totalCostPriceKopecks,
		totalCostPriceRub: formatKopecksRu(totalCostPriceKopecks),
		items: deductedItems,
		softOverdrafts,
		hasOverdraft,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. STATUTORY A4 WRITE-OFF ACT (FORM 043/U & SANPIN, STRICTLY 0 EMOJIS)
// ─────────────────────────────────────────────────────────────────────────────

export interface ConsumablesA4ReportMeta {
	clinicName?: string | undefined;
	patientFullName?: string | undefined;
	doctorFullName?: string | undefined;
	visitDate?: string | undefined;
	cardRecordNumber?: string | undefined;
	actNumber?: string | undefined;
}

/**
 * Formats statutory Form 043/u and SanPiN A4 Material Write-Off Act.
 * STRICTLY 0 CARTOON EMOJIS per Mandate 8d item 7.
 */
export function formatConsumablesWriteOffA4Report(
	result: ConsumableDeductionResult,
	meta?: ConsumablesA4ReportMeta,
): string {
	const clinic = meta?.clinicName ?? "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА";
	const patient = meta?.patientFullName ?? `Пациент ID: ${result.patientId}`;
	const doctor = meta?.doctorFullName ?? `Врач ID: ${result.doctorId}`;
	const date = meta?.visitDate ?? new Date().toISOString().slice(0, 10);
	const card = meta?.cardRecordNumber ?? "б/н";
	const actNum = meta?.actNumber ?? `АКТ-МАТ-${result.visitId.slice(-6).toUpperCase()}`;

	const divider = "=".repeat(78);
	const subDivider = "-".repeat(78);
	const lines: string[] = [];

	lines.push(divider);
	lines.push("МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ");
	lines.push("МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО: ФОРМА N 043/У");
	lines.push("УЧЕТ МЕДИЦИНСКИХ ИЗДЕЛИЙ, МАТЕРИАЛОВ И ДЕЗИНФЕКТАНТОВ ПО САНПИН");
	lines.push(`АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ N ${actNum}`);
	lines.push(divider);
	lines.push(`Организация: ${clinic}`);
	lines.push(`Пациент: ${patient} | Карта 043/у: ${card}`);
	lines.push(`Лечащий врач: ${doctor} | Визит: ${result.visitId}`);
	lines.push(`Дата списания: ${date}`);
	lines.push(subDivider);

	lines.push("1. ВЕДОМОСТЬ СПИСАННЫХ МАТЕРИАЛОВ ПО ОКАЗАННЫМ УСЛУГАМ 804Н:");

	if (result.items.length === 0) {
		lines.push("   (Списанные материалы отсутствуют — услуги без нормативного расхода)");
	} else {
		for (let i = 0; i < result.items.length; i++) {
			const item = result.items[i];
			if (!item) continue;
			const tooth = item.toothNumber ? ` [Зуб ${item.toothNumber}]` : "";
			const code = item.service804nCode ? ` (${item.service804nCode})` : "";
			const overdraftFlag = item.isOverdraft ? " [!] ОВЕРДРАФТ" : "";
			lines.push(`   ${i + 1}. ${item.itemName}${tooth}${code}${overdraftFlag}`);
			lines.push(
				`      Списано: ${item.deductedQty} ${item.unit ?? "шт."} | Себестоимость: ${item.totalCostPriceRub} | Остаток склада: ${item.remainingQty} ${item.unit ?? "шт."}`,
			);
		}
	}
	lines.push(subDivider);

	lines.push("2. ИТОГОВЫЕ ПОКАЗАТЕЛИ СЕБЕСТОИМОСТИ МАТЕРИАЛОВ ВИЗИТА:");
	lines.push(`   Всего списано позиций номенклатуры: ${result.totalDeductedItems}`);
	lines.push(`   Общая себестоимость списанных материалов: ${result.totalCostPriceRub}`);
	lines.push(subDivider);

	lines.push("3. СКЛАДСКОЙ КОНТРОЛЬ И САНПИН РЕГЛАМЕНТ (МАНДАТ 8E):");
	if (result.hasOverdraft) {
		lines.push("   [!] ВНИМАНИЕ: Зафиксирован мягкий овердрафт складских позиций.");
		for (const warning of result.softOverdrafts) {
			lines.push(`       - ${warning}`);
		}
		lines.push("   Мандат 8e: Проведение лечения и спасение пациента не блокируются.");
		lines.push("   Уведомление направлено в отдел снабжения для планового пополнения.");
	} else {
		lines.push("   [OK] Складской баланс в норме, дефицит материалов отсутствует.");
		lines.push("   Нормы СанПиН по учету анестетиков и дезинфектантов соблюдены.");
	}
	lines.push(subDivider);

	lines.push("Подписи ответственных лиц:");
	lines.push(`Врач-стоматолог: ____________________ / ${doctor} /`);
	lines.push("Старшая медицинская сестра / зав. складом: ____________________ /                        /");
	lines.push(divider);

	return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENGINE NAMESPACE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const treatmentConsumablesEngine = {
	calculateServiceConsumables,
	executeBatchConsumablesDeduction,
	formatConsumablesWriteOffA4Report,
	consumableCategorySchema,
	consumableUnitSchema,
	consumableItemLinkSchema,
	renderedServiceItemSchema,
	consumableDeductionRequestSchema,
	consumableDeductedItemSchema,
	consumableDeductionResultSchema,
	CONSUMABLE_CATEGORY_LABELS,
	CONSUMABLE_UNIT_LABELS,
} as const;
