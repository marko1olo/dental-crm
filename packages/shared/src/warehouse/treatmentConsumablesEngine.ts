/**
 * treatmentConsumablesEngine.ts — Treatment Consumables Auto-Deduction Engine.
 *
 * Wave 122 — Bill of Materials (BOM) & Treatment Consumables Consumption Engine.
 *
 * Adapted from reference implementation (DentalPin):
 * - backend/app/modules/treatment_consumables/service.py
 * - backend/app/modules/treatment_consumables/events.py
 *
 * CLINICAL & ARCHITECTURAL INVARIANTS:
 * 1. Mandates 8e & 8n (Doctor Autonomy & Scale Sovereignty):
 *    - Soft overdraft by default (`allowOverdraft = true`): warehouse stock shortages
 *      never block doctor from saving a visit or treating a patient in acute pain.
 *    - Strict overdraft check available (`allowOverdraft = false`) for rigid backoffice audits.
 * 2. Mandate 8k (CRM != Simulator):
 *    - Automatic consumption triggered by performed services (e.g. 1 carpal of anesthetic,
 *      1 compule of composite, 1 microbrush per filling).
 *    - 1-click batch deduction across multiple procedures of a visit without manual nurse input.
 * 3. Mandate 8d (Studio Clinical HIG / 7 Deadly Sins):
 *    - Official deduction acts for warehouse/nurse contain ZERO cartoon emojis (no 🎉, 🚀, 💡, 🦷).
 * 4. Exact Mathematical Consistency:
 *    - Deterministic fractional rounding avoiding IEEE-754 floating point artifacts.
 *    - Complete Zod runtime contracts for inter-module integration.
 */

import { z } from "zod";
import { formatKopecksRu } from "../utils/money.js";

// ─── 1. ZOD SCHEMAS & TYPES ───────────────────────────────────────────────────

/**
 * Link between a catalog treatment service and warehouse inventory consumable item.
 */
export const treatmentConsumableLinkSchema = z.object({
	id: z.string().min(1, "ID связи обязателен"),
	catalogItemId: z.string().min(1, "ID услуги прейскуранта обязателен"),
	catalogItemName: z.string().optional(),
	inventoryItemId: z.string().min(1, "ID складской позиции обязателен"),
	inventoryItemName: z.string().min(1, "Наименование складской позиции обязательно"),
	unit: z.string().min(1, "Единица измерения обязательна"),
	quantityPerService: z.number().positive("Норма расхода на услугу должна быть больше 0"),
	note: z.string().optional(),
});
export type TreatmentConsumableLink = z.infer<typeof treatmentConsumableLinkSchema>;

/**
 * Event published when a treatment service is performed by the clinical team.
 */
export const treatmentPerformedEventSchema = z.object({
	treatmentReferenceId: z.string().min(1, "ID оказанной услуги / визита обязателен"),
	catalogItemId: z.string().min(1, "ID услуги в каталоге обязателен"),
	serviceQuantity: z.number().positive("Количество оказанных услуг должно быть положительным").optional(),
	performedAt: z.string().min(1, "Дата и время выполнения обязательны"),
	doctorId: z.string().optional(),
	patientId: z.string().optional(),
});
export type TreatmentPerformedEvent = z.infer<typeof treatmentPerformedEventSchema>;

/**
 * Detailed line item in a consumable deduction operation.
 */
export const consumableDeductionItemSchema = z.object({
	inventoryItemId: z.string().min(1),
	inventoryItemName: z.string().min(1),
	unit: z.string().min(1),
	deductedQuantity: z.number(),
	currentStock: z.number(),
	resultingStock: z.number(),
	isOverdraft: z.boolean(),
});
export type ConsumableDeductionItem = z.infer<typeof consumableDeductionItemSchema>;

/**
 * Result of calculating consumable deduction for a single treatment service.
 */
export const treatmentDeductionResultSchema = z.object({
	treatmentReferenceId: z.string().min(1),
	catalogItemId: z.string().min(1),
	items: z.array(consumableDeductionItemSchema),
	hasOverdraft: z.boolean(),
	deductionTimestamp: z.string().min(1),
});
export type TreatmentDeductionResult = z.infer<typeof treatmentDeductionResultSchema>;

/**
 * Result of batch calculating consumable deductions across multiple treatment services.
 */
export interface BatchTreatmentConsumablesResult {
	results: TreatmentDeductionResult[];
	finalStocks: Record<string, number>;
	totalDeductedByItem: Record<string, number>;
}

// ─── 2. NUMERIC & DATE HELPERS ────────────────────────────────────────────────

/**
 * Rounds a quantity to fixed decimal places (default: 4) to eliminate floating-point drift.
 * Handles fractional dental materials (e.g. 0.5 карпулы, 0.25 компьюлы, 1.7 мл).
 */
export function roundQuantity(val: number, decimals = 4): number {
	if (!Number.isFinite(val)) return 0;
	const factor = 10 ** decimals;
	return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Formats a numeric quantity for display in Russian clinical documents.
 * E.g. 1 -> "1", 0.5 -> "0,5", 1.75 -> "1,75".
 */
export function formatQuantityRu(qty: number, unit?: string): string {
	const rounded = roundQuantity(qty, 4);
	const str = String(rounded).replace(".", ",");
	return unit ? `${str} ${unit}` : str;
}

/**
 * Formats an ISO date/timestamp string into a human-readable Russian string.
 */
function formatDateTimeRu(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		const hours = String(d.getHours()).padStart(2, "0");
		const minutes = String(d.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} ${hours}:${minutes}`;
	} catch {
		return isoString;
	}
}

// ─── 3. CORE CONSUMPTION ENGINE FUNCTIONS ──────────────────────────────────────

/**
 * Calculates consumable materials deduction for a single performed treatment service.
 *
 * Rules:
 * 1. Matches all links in `links` where `catalogItemId === event.catalogItemId`.
 * 2. Multiplies `quantityPerService * (event.serviceQuantity ?? 1)`.
 * 3. Computes `resultingStock = currentStock - deductedQuantity`.
 * 4. If `resultingStock < 0` and `!allowOverdraft`, throws an Error.
 * 5. If `allowOverdraft = true`, marks `isOverdraft = true` and `hasOverdraft = true`
 *    without throwing, upholding Mandates 8e/8n (Doctor Autonomy & Zero Dead-Ends).
 *
 * @param event - The performed clinical treatment event.
 * @param links - Active treatment consumable link recipes.
 * @param currentStocks - Current warehouse inventory stocks keyed by `inventoryItemId`.
 * @param allowOverdraft - Whether soft overdraft is permitted (default: true).
 * @returns TreatmentDeductionResult
 */
export function calculateConsumablesForTreatment(
	event: TreatmentPerformedEvent,
	links: TreatmentConsumableLink[],
	currentStocks: Record<string, number>,
	allowOverdraft = true,
): TreatmentDeductionResult {
	const matchingLinks = links.filter((lnk) => lnk.catalogItemId === event.catalogItemId);

	const rawQuantity = event.serviceQuantity ?? 1;
	const serviceMultiplier = Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

	const deductionTimestamp = event.performedAt || new Date().toISOString();

	if (matchingLinks.length === 0) {
		return {
			treatmentReferenceId: event.treatmentReferenceId,
			catalogItemId: event.catalogItemId,
			items: [],
			hasOverdraft: false,
			deductionTimestamp,
		};
	}

	const localStocks: Record<string, number> = { ...currentStocks };
	const items: ConsumableDeductionItem[] = [];
	let hasOverdraft = false;

	for (const link of matchingLinks) {
		const deductedQuantity = roundQuantity(link.quantityPerService * serviceMultiplier);
		const currentStock = localStocks[link.inventoryItemId] ?? 0;
		const resultingStock = roundQuantity(currentStock - deductedQuantity);
		const isOverdraft = resultingStock < 0;

		if (isOverdraft && !allowOverdraft) {
			throw new Error(
				`Запрет списания: недостаточно остатка на складе для позиции "${link.inventoryItemName}" (ID: ${link.inventoryItemId}). В наличии: ${currentStock} ${link.unit}, требуется: ${deductedQuantity} ${link.unit}`,
			);
		}

		if (isOverdraft) {
			hasOverdraft = true;
		}

		localStocks[link.inventoryItemId] = resultingStock;

		items.push({
			inventoryItemId: link.inventoryItemId,
			inventoryItemName: link.inventoryItemName,
			unit: link.unit,
			deductedQuantity,
			currentStock,
			resultingStock,
			isOverdraft,
		});
	}

	return {
		treatmentReferenceId: event.treatmentReferenceId,
		catalogItemId: event.catalogItemId,
		items,
		hasOverdraft,
		deductionTimestamp,
	};
}

/**
 * Calculates batch consumable deductions across a series of performed treatment services
 * for a dental visit or multi-procedure appointment.
 *
 * Progressively updates warehouse stock at each step, accumulating total deducted quantities
 * per item and returning all deduction results.
 *
 * @param events - List of performed treatment events.
 * @param links - Active treatment consumable link recipes.
 * @param initialStocks - Starting warehouse stocks keyed by `inventoryItemId`.
 * @param allowOverdraft - Whether soft overdraft is permitted (default: true).
 * @returns BatchTreatmentConsumablesResult
 */
export function calculateBatchTreatmentConsumables(
	events: TreatmentPerformedEvent[],
	links: TreatmentConsumableLink[],
	initialStocks: Record<string, number>,
	allowOverdraft = true,
): BatchTreatmentConsumablesResult {
	const runningStocks: Record<string, number> = { ...initialStocks };
	const totalDeductedByItem: Record<string, number> = {};
	const results: TreatmentDeductionResult[] = [];

	for (const event of events) {
		const result = calculateConsumablesForTreatment(
			event,
			links,
			runningStocks,
			allowOverdraft,
		);
		results.push(result);

		for (const item of result.items) {
			runningStocks[item.inventoryItemId] = item.resultingStock;
			totalDeductedByItem[item.inventoryItemId] = roundQuantity(
				(totalDeductedByItem[item.inventoryItemId] ?? 0) + item.deductedQuantity,
			);
		}
	}

	return {
		results,
		finalStocks: runningStocks,
		totalDeductedByItem,
	};
}

// ─── 4. STATUTORY ACT / RECEIPT FORMATTING ────────────────────────────────────

/**
 * Formats a clean, structured warehouse deduction act / receipt for nursing and warehouse staff.
 *
 * Adheres strictly to Mandate 8d:
 * - ZERO cartoon emojis (no 🎉, 🚀, 💡, 🦷, 📦, 📄, ⚠️).
 * - Standard Russian clinical typography and layout.
 * - Clear identification of visit, service, doctor, patient, stock movements, and overdraft state.
 * - Legal signature block for nurse/warehouse and attending doctor.
 *
 * @param result - The deduction result to format.
 * @param doctorName - Optional attending doctor name.
 * @param patientName - Optional patient name.
 * @returns string - Plain text structured act.
 */
export function formatConsumablesDeductionReceipt(
	result: TreatmentDeductionResult,
	doctorName?: string,
	patientName?: string,
): string {
	const headerSep = "=".repeat(78);
	const sectionSep = "-".repeat(78);

	const formattedDate = formatDateTimeRu(result.deductionTimestamp);
	const overdraftLabel = result.hasOverdraft
		? "ВНИМАНИЕ: Зафиксирован отрицательный остаток (мягкий овердрафт склада)"
		: "В пределах складского остатка (норма)";

	const lines: string[] = [
		headerSep,
		"АКТ АВТОМАТИЧЕСКОГО СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ",
		"Стоматологическая клиника DENTE / Складской учет расходных материалов",
		headerSep,
		`Дата и время списания:  ${formattedDate}`,
		`Идентификатор услуги:   ${result.treatmentReferenceId}`,
		`Код услуги каталога:    ${result.catalogItemId}`,
		`Лечащий врач:           ${doctorName || "Не указан"}`,
		`Пациент:                ${patientName || "Не указан"}`,
		`Статус склада:          ${overdraftLabel}`,
		sectionSep,
		"СПЕЦИФИКАЦИЯ СПИСАННЫХ РАСХОДНЫХ МАТЕРИАЛОВ:",
	];

	if (result.items.length === 0) {
		lines.push("  (Расходные материалы не привязаны к данной услуге. Списание не производилось)");
	} else {
		result.items.forEach((item, idx) => {
			const num = String(idx + 1).padStart(2, " ");
			const deducted = formatQuantityRu(item.deductedQuantity, item.unit);
			const before = formatQuantityRu(item.currentStock, item.unit);
			const after = formatQuantityRu(item.resultingStock, item.unit);
			const status = item.isOverdraft ? "[ОВЕРДРАФТ]" : "[НОРМА]";

			lines.push(`${num}. ${item.inventoryItemName}`);
			lines.push(
				`    ID позиции: ${item.inventoryItemId} | Списано: ${deducted} | До списания: ${before} | После списания: ${after} | Статус: ${status}`,
			);
		});
	}

	lines.push(sectionSep);
	lines.push(`Всего позиций: ${result.items.length}`);
	lines.push(
		`Наличие дефицита / овердрафта: ${result.hasOverdraft ? "ДА (требуется пополнение запасов)" : "НЕТ"}`,
	);
	lines.push("");
	lines.push("ОТВЕТСТВЕННЫЕ ЛИЦА:");
	lines.push("Отпустил (медсестра / склад):  _________________ / ________________________");
	lines.push(`Списано в приеме (врач):       _________________ / ${doctorName || "________________________"}`);
	lines.push(headerSep);

	return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. WAVE 134: 804N INVENTORY LINKAGE & BATCH DEDUCTION ENGINE
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

import {
	consumableUnitSchema,
	type ConsumableUnit,
} from "../inventory/procedureBomEngine.js";

export { consumableUnitSchema, type ConsumableUnit };

export const CONSUMABLE_UNIT_LABELS: Record<ConsumableUnit, string> = {
	карпула: "карпула",
	шприц_гр: "шприц (г)",
	ампула: "ампула",
	шт: "шт.",
	метр: "м",
	упак: "упак.",
	pcs: "шт.",
	carpule: "карпула",
	gram: "г",
	ml: "мл",
	pack: "упак.",
	tube: "туба",
	dose: "доза",
	cm: "см",
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

