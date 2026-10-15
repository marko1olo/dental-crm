/**
 * packages/shared/src/warehouse/warehouseAcceptance.ts
 *
 * Канонический чистый модуль оприходования накладных и ликвидации мягкого овердрафта.
 * Реализует Мандаты 8e (Doctor Autonomy), 8k (Exact Kopecks), 8n (Solo Doctor & Soft Overdraft), 8s (Anti-Bloat):
 * 1. Ликвидация мягкого овердрафта: поступившее количество сначала гасит дефицит, возникший при экстренном списании.
 * 2. FEFO-контроль сроков годности (First Expired, First Out) по сериям и партиям.
 * 3. Точный расчет сумм и НДС строго в целых копейках (без float-дрейфа).
 * 4. Пакетная приёмка накладных без бюрократических комиссий.
 */

import { z } from "zod";
import { kopecksToRubles, rublesToKopecks } from "../money.js";

// ─── 1. ZOD SCHEMAS & TYPES ───────────────────────────────────────────────────

export const acceptanceVatRateSchema = z.union([
	z.literal(0),
	z.literal(5),
	z.literal(7),
	z.literal(10),
	z.literal(20),
]);
export type AcceptanceVatRate = z.infer<typeof acceptanceVatRateSchema>;
const vatRateSchema = acceptanceVatRateSchema;
type VatRate = AcceptanceVatRate;

export const fefoStatusSchema = z.enum(["fresh", "warning", "critical", "expired"]);
export type FefoStatus = z.infer<typeof fefoStatusSchema>;

export interface FefoEvaluation {
	readonly fefoStatus: FefoStatus;
	readonly badgeLabelRu: string;
	readonly hexColor: string;
	readonly bgSoft: string;
	readonly daysRemaining: number;
}

export interface OverdraftReconciliationResult {
	readonly previousStock: number;
	readonly clearedDeficit: number;
	readonly newStockQuantity: number;
	readonly overdraftResolved: boolean;
}

export const acceptanceWaybillItemSchema = z.object({
	id: z.string().min(1, "ID позиции обязателен"),
	inventoryItemId: z.string().optional(),
	name: z.string().min(1, "Наименование обязательно"),
	category: z.string().default("Материалы"),
	unit: z.string().default("шт"),
	batchNumber: z.string().min(1, "Номер серии / партии обязателен"),
	expirationDate: z.string().min(10, "Срок годности обязателен (ГГГГ-ММ-ДД)"),
	manufactureDate: z.string().optional(),
	quantity: z.number().positive("Количество должно быть положительным"),
	unitPriceKopecks: z.number().nonnegative("Цена должна быть неотрицательной"),
	vatRate: vatRateSchema.default(0),
	lineSubtotalKopecks: z.number().nonnegative(),
	vatKopecks: z.number().nonnegative(),
	lineTotalKopecks: z.number().nonnegative(),
	fefoStatus: fefoStatusSchema,
	daysUntilExpiration: z.number(),
	barcode: z.string().optional(),
	sku: z.string().optional(),
	notes: z.string().optional(),
});
export type AcceptanceWaybillItem = z.infer<typeof acceptanceWaybillItemSchema>;

export interface AcceptanceWaybillTotals {
	readonly totalPositions: number;
	readonly totalQuantity: number;
	readonly subtotalKopecks: number;
	readonly totalVatKopecks: number;
	readonly totalCostKopecks: number;
	readonly subtotalRubles: number;
	readonly totalVatRubles: number;
	readonly totalCostRubles: number;
}

export interface AcceptanceSupplier {
	readonly id: string;
	readonly name: string;
	readonly inn: string;
	readonly kpp?: string;
	readonly phone?: string;
	readonly isCanonicalDentalSupplier: boolean;
}

export interface AcceptanceWaybillDocument {
	readonly id: string;
	readonly waybillNumber: string;
	readonly waybillDate: string;
	readonly supplier: AcceptanceSupplier;
	readonly warehouseId: string;
	readonly warehouseName: string;
	readonly items: AcceptanceWaybillItem[];
	readonly totals: AcceptanceWaybillTotals;
	readonly status: "draft" | "accepted" | "cancelled";
	readonly acceptedAt?: string;
	readonly acceptedByUserId?: string;
	readonly notes?: string;
	readonly resolvedOverdraftItemCount?: number;
}

// ─── 2. ЧИСТЫЕ ФУНКЦИИ ВЫЧИСЛЕНИЯ FEFO И КОПЕЕЧНЫХ СУММ ─────────────────────

/**
 * Рассчитывает количество дней до истечения срока годности.
 */
export function calculateDaysUntilExpiration(
	expirationDateIso: string,
	referenceDateIso?: string | Date,
): number {
	const refDateStr = typeof referenceDateIso === "string"
		? referenceDateIso
		: referenceDateIso instanceof Date
			? referenceDateIso.toISOString().slice(0, 10)
			: new Date().toISOString().slice(0, 10);
	const target = new Date(`${expirationDateIso.slice(0, 10)}T00:00:00Z`).getTime();
	const ref = new Date(`${refDateStr.slice(0, 10)}T00:00:00Z`).getTime();
	if (Number.isNaN(target) || Number.isNaN(ref)) return 0;
	return Math.round((target - ref) / (1000 * 60 * 60 * 24));
}

/**
 * Оценивает статус партии по регламенту FEFO (First Expired, First Out).
 * 1. Красный (<= 0 дней): просрочен.
 * 2. Красный (<= 30 дней): критический срок, первоочередной расход.
 * 3. Желтый (<= 180 дней): 1-6 месяцев, плановое использование.
 * 4. Зеленый (> 180 дней): свежая партия (> 6 месяцев).
 */
export function calculateFefoStatus(
	expirationDateIso: string,
	referenceDateIso?: string | Date,
): FefoEvaluation {
	const days = calculateDaysUntilExpiration(expirationDateIso, referenceDateIso);

	if (days <= 0) {
		return {
			fefoStatus: "expired",
			badgeLabelRu: "Просрочено",
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 30) {
		return {
			fefoStatus: "critical",
			badgeLabelRu: `Критический срок (≤ 30 дн.)`,
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 90) {
		return {
			fefoStatus: "warning",
			badgeLabelRu: `Внимание (≤ 90 дн.)`,
			hexColor: "var(--amber, #f59e0b)",
			bgSoft: "rgba(245, 158, 11, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 180) {
		return {
			fefoStatus: "warning",
			badgeLabelRu: `FEFO: ${days} дн. (1–6 мес., первая очередь)`,
			hexColor: "var(--amber, #f59e0b)",
			bgSoft: "rgba(245, 158, 11, 0.12)",
			daysRemaining: days,
		};
	}
	return {
		fefoStatus: "fresh",
		badgeLabelRu: `Свежая партия`,
		hexColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.12)",
		daysRemaining: days,
	};
}

/**
 * Расчет стоимостных показателей строки накладной в целых копейках.
 * Поддерживает как объект параметров, так и позиционные аргументы.
 */
export function calculateItemTotals(
	paramsOrQuantity: { readonly quantity: number; readonly unitPriceKopecks: number; readonly vatRate?: VatRate } | number,
	unitPriceKopecksArg?: number,
	vatRateArg?: VatRate,
): {
	readonly lineSubtotalKopecks: number;
	readonly vatKopecks: number;
	readonly lineTotalKopecks: number;
} {
	let quantity = 0;
	let unitPriceKopecks = 0;
	let vatRate: VatRate = 0;

	if (typeof paramsOrQuantity === "object" && paramsOrQuantity !== null) {
		quantity = paramsOrQuantity.quantity;
		unitPriceKopecks = paramsOrQuantity.unitPriceKopecks;
		vatRate = paramsOrQuantity.vatRate ?? 0;
	} else {
		quantity = paramsOrQuantity;
		unitPriceKopecks = unitPriceKopecksArg ?? 0;
		vatRate = vatRateArg ?? 0;
	}

	const qty = Math.max(0, quantity);
	const unitPrice = Math.max(0, Math.round(unitPriceKopecks));
	const lineSubtotalKopecks = Math.round(qty * unitPrice);

	const validRates: readonly VatRate[] = [0, 5, 7, 10, 20];
	const rate: VatRate = validRates.includes(vatRate) ? vatRate : 0;
	const vatKopecks = Math.round((lineSubtotalKopecks * rate) / 100);
	const lineTotalKopecks = lineSubtotalKopecks + vatKopecks;

	return {
		lineSubtotalKopecks,
		vatKopecks,
		lineTotalKopecks,
	};
}

/**
 * Сводный расчет итогов по всей накладной в целых копейках.
 */
export function calculateWaybillTotals(
	items: readonly AcceptanceWaybillItem[],
): AcceptanceWaybillTotals {
	let totalQuantity = 0;
	let subtotalKopecks = 0;
	let totalVatKopecks = 0;
	let totalCostKopecks = 0;

	for (const item of items) {
		totalQuantity += item.quantity;
		subtotalKopecks += item.lineSubtotalKopecks;
		totalVatKopecks += item.vatKopecks;
		totalCostKopecks += item.lineTotalKopecks;
	}

	return {
		totalPositions: items.length,
		totalQuantity: Number(totalQuantity.toFixed(3)),
		subtotalKopecks,
		totalVatKopecks,
		totalCostKopecks,
		subtotalRubles: kopecksToRubles(subtotalKopecks),
		totalVatRubles: kopecksToRubles(totalVatKopecks),
		totalCostRubles: kopecksToRubles(totalCostKopecks),
	};
}

let _deterministicItemIdSeq = 1;

/**
 * Детерминированный генератор ID позиции накладной.
 */
export function generateDeterministicWaybillItemId(prefix = "item"): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
	}
	const timestamp = Date.now().toString(36);
	const seq = (_deterministicItemIdSeq++).toString(36);
	return `${prefix}_${timestamp}_${seq}`;
}

/**
 * Создание готовой строки накладной с автоматическим вычислением FEFO и копеек.
 */
export function createWaybillItem(params: {
	readonly id?: string | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly name: string;
	readonly category?: string | undefined;
	readonly unit?: string | undefined;
	readonly batchNumber: string;
	readonly expirationDate: string;
	readonly manufactureDate?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate?: VatRate | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly notes?: string | undefined;
	readonly referenceDateIso?: string | undefined;
}): AcceptanceWaybillItem {
	const vatRate = params.vatRate ?? 0;
	const totals = calculateItemTotals({
		quantity: params.quantity,
		unitPriceKopecks: params.unitPriceKopecks,
		vatRate,
	});
	const fefo = calculateFefoStatus(params.expirationDate, params.referenceDateIso);

	return {
		id: params.id || generateDeterministicWaybillItemId(),
		inventoryItemId: params.inventoryItemId,
		name: params.name.trim(),
		category: params.category || "Материалы",
		unit: params.unit || "шт",
		batchNumber: params.batchNumber.trim(),
		expirationDate: params.expirationDate.trim(),
		manufactureDate: params.manufactureDate?.trim() || undefined,
		quantity: Math.max(0, params.quantity),
		unitPriceKopecks: Math.max(0, Math.round(params.unitPriceKopecks)),
		vatRate,
		lineSubtotalKopecks: totals.lineSubtotalKopecks,
		vatKopecks: totals.vatKopecks,
		lineTotalKopecks: totals.lineTotalKopecks,
		fefoStatus: fefo.fefoStatus,
		daysUntilExpiration: fefo.daysRemaining,
		barcode: params.barcode?.trim() || undefined,
		sku: params.sku?.trim() || undefined,
		notes: params.notes?.trim() || undefined,
	};
}

/**
 * Сортировка позиций накладной по приоритету FEFO (ближайший срок годности вверху).
 */
export function sortWaybillItemsByFefo(
	items: readonly AcceptanceWaybillItem[],
	direction: "asc" | "desc" = "asc",
): AcceptanceWaybillItem[] {
	return [...items].sort((a, b) => {
		const daysA = typeof a.daysUntilExpiration === "number"
			? a.daysUntilExpiration
			: calculateDaysUntilExpiration(a.expirationDate);
		const daysB = typeof b.daysUntilExpiration === "number"
			? b.daysUntilExpiration
			: calculateDaysUntilExpiration(b.expirationDate);
		const diff = daysA - daysB;
		return direction === "asc" ? diff : -diff;
	});
}

/**
 * Ликвидация мягкого овердрафта (Мандат 8n).
 * При задержке оприходования накладной расходники списываются в отрицательный остаток без блокировок лечения.
 * Поступившее по накладной количество сначала погашает накопленный дефицит, а чистый остаток переходит на склад.
 */
export function reconcileOverdraftOnReceipt(
	stockQuantity: number,
	receivedQuantity: number,
): OverdraftReconciliationResult {
	const previousStock = Number(stockQuantity.toFixed(3));
	const received = Math.max(0, Number(receivedQuantity.toFixed(3)));

	if (previousStock >= 0) {
		return {
			previousStock,
			clearedDeficit: 0,
			newStockQuantity: Number((previousStock + received).toFixed(3)),
			overdraftResolved: true,
		};
	}

	const deficit = Math.abs(previousStock);
	const clearedDeficit = Math.min(deficit, received);
	const newStockQuantity = Number((previousStock + received).toFixed(3));

	return {
		previousStock,
		clearedDeficit,
		newStockQuantity,
		overdraftResolved: newStockQuantity >= 0,
	};
}

/**
 * Валидация черновика приходной накладной перед проведением.
 */
export function validateAcceptanceWaybill(
	doc: Partial<AcceptanceWaybillDocument> & {
		readonly supplierInn?: string;
	},
): { readonly isValid: boolean; readonly errors: readonly string[] } {
	const errors: string[] = [];

	if (!doc.waybillNumber || !doc.waybillNumber.trim()) {
		errors.push("Укажите номер накладной");
	}
	const supplierName = doc.supplier?.name?.trim();
	const supplierInn = doc.supplier?.inn?.trim() || doc.supplierInn?.trim();
	if (!supplierName && !supplierInn) {
		errors.push("Укажите поставщика или ИНН поставщика");
	}
	if (supplierInn && !/^\d{10}(\d{2})?$/.test(supplierInn)) {
		errors.push("Некорректный ИНН поставщика (должен содержать 10 или 12 цифр)");
	}
	if (!doc.items || doc.items.length === 0) {
		errors.push("Накладная не может быть пустой (требуется хотя бы одна позиция)");
	} else {
		doc.items.forEach((item, idx) => {
			if (!item.name?.trim()) {
				errors.push(`Позиция ${idx + 1}: укажите наименование товара`);
			}
			if (item.quantity <= 0) {
				errors.push(`Позиция ${idx + 1} (${item.name || "без названия"}): количество должно быть > 0`);
			}
			if (!item.batchNumber?.trim()) {
				errors.push(`Позиция ${idx + 1} (${item.name}): укажите номер партии / серии`);
			}
			if (!item.expirationDate?.trim()) {
				errors.push(`Позиция ${idx + 1} (${item.name}): укажите срок годности`);
			}
		});
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
