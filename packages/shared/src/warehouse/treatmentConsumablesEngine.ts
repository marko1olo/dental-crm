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
