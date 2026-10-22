import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsTypes.js";
import { CANONICAL_DENTAL_SUPPLIERS } from "../acceptanceWaybillsTemplates.js";
import { calculateWaybillTotals, generateDeterministicWaybillItemId } from "./acceptanceWaybillMath.js";
import { getSampleDentalWaybillItems } from "./acceptanceWaybillSampleItems.js";

let _waybillSequenceCounter = 1;

/**
 * Детерминированный генератор номера приходной накладной (ПН-ГГММДД-NNNN).
 */
export function generateDeterministicWaybillNumber(
	receiptDateIso?: string,
	sequence?: number,
): string {
	const rawDate = receiptDateIso || new Date().toISOString().slice(0, 10);
	const dateCode = rawDate.replace(/-/g, "").slice(2);
	const seq = sequence ?? _waybillSequenceCounter++;
	return `ПН-${dateCode}-${String(seq).padStart(4, "0")}`;
}

/**
 * Инициализирует пустой черновик накладной.
 */
export function createDraftAcceptanceWaybill(
	options?: Partial<AcceptanceWaybillDocument>,
): AcceptanceWaybillDocument {
	const defaultSupplier = CANONICAL_DENTAL_SUPPLIERS[0]!;
	const today = new Date().toISOString().slice(0, 10);
	const docNum = options?.waybillNumber || generateDeterministicWaybillNumber(options?.receiptDate || today);
	const items = options?.items || [];
	const totals = calculateWaybillTotals(items);

	return {
		id: options?.id || generateDeterministicWaybillItemId("wb"),
		waybillNumber: docNum,
		receiptDate: options?.receiptDate || today,
		supplier: options?.supplier || defaultSupplier,
		warehouseId: options?.warehouseId || undefined,
		warehouseName: options?.warehouseName || "Центральный склад клиники",
		status: options?.status || "draft",
		items,
		totals,
		notes: options?.notes || "Оприходование материалов от стоматологического поставщика",
		receiverFullName: options?.receiverFullName || "Васильев О.П.",
		receiverPosition: options?.receiverPosition || "Ответственный за снабжение",
		postedAt: options?.postedAt || undefined,
		postedBy: options?.postedBy || undefined,
	};
}

/**
 * Генерирует эталонную образцовую накладную от «ООО Стомторг».
 */
export function createSampleDentalWaybill(): AcceptanceWaybillDocument {
	const today = new Date().toISOString().slice(0, 10);
	const supplier = CANONICAL_DENTAL_SUPPLIERS[0]!;
	const items = getSampleDentalWaybillItems(today);
	const totals = calculateWaybillTotals(items);

	return {
		id: `wb_sample_${Date.now()}`,
		waybillNumber: "СТ-88412",
		receiptDate: today,
		supplier,
		warehouseId: "wh_main",
		warehouseName: "Главный склад расходных материалов",
		status: "draft",
		items,
		totals,
		notes: "Поставка материалов по договору снабжения №СТ/2026-08 от 12.01.2026",
		receiverFullName: "Васильев О.П.",
		receiverPosition: "Заведующий складом",
	};
}
