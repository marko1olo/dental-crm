/**
 * purchaseOrderEngine.ts — Warehouse Purchase Order (PO) & Goods Receipt Engine.
 *
 * Wave 121 — Purchase Order Lifecycle & Warehouse Receipt Adapter.
 *
 * Reference implementation adapted from DentalPin:
 * - backend/app/modules/purchase_orders/service.py
 *
 * INVARIANTS:
 * 1. Zero Mocks & Zero Dead-Ends (Mandate 8e, 8n):
 *    - Fully typed with Zod contracts and pure deterministic calculations.
 *    - Scale sovereignty: functions seamlessly for a solo doctor / small clinic
 *      without requiring complex commission approvals or backoffice bloat.
 * 2. Exact Kopecks Math (Mandate 8b):
 *    - Strict integer kopecks arithmetic for unit prices, line totals, and VAT.
 *    - Zero floating-point drift.
 * 3. Statutory Russian Tax & B2B Purchasing (ст. 149, 164, 168 НК РФ):
 *    - Standard VAT rates: 20%, 10%, 0%, and EXEMPT (пп. 2 п. 2 ст. 149 НК РФ —
 *      medical devices and dental materials exempt from VAT).
 * 4. Purchase Order State Machine:
 *    - DRAFT -> SENT -> CONFIRMED -> COMPLETED / CANCELLED.
 *    - Terminal states CANCELLED and COMPLETED cannot transition further.
 * 5. Goods Receipt & Overdraft Governance:
 *    - Automatically updates receivedQuantity and transitions order to
 *      PARTIALLY_RECEIVED or COMPLETED.
 *    - Strict protection against over-receipt unless soft overdraft flag is set.
 * 6. Clean Statutory Print Summaries (Mandate 8d):
 *    - Zero emojis in printed documents and legal specifications.
 */

import { z } from "zod";
import type { ReorderSuggestion } from "./inventoryReorderEngine.js";

// ─── 1. STATUSES & STATE MACHINE CONTRACTS ────────────────────────────────────

export const purchaseOrderStatusSchema = z.enum([
	"DRAFT",
	"SENT",
	"CONFIRMED",
	"PARTIALLY_RECEIVED",
	"COMPLETED",
	"CANCELLED",
]);
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

/** Russian human-readable labels for Purchase Order statuses */
export const PURCHASE_ORDER_STATUS_LABELS_RU: Record<PurchaseOrderStatus, string> = {
	DRAFT: "Черновик",
	SENT: "Отправлен поставщику",
	CONFIRMED: "Подтвержден поставщиком",
	PARTIALLY_RECEIVED: "Частично принят",
	COMPLETED: "Завершен (полностью принят)",
	CANCELLED: "Отменен",
};

/**
 * Allowed status transitions for Purchase Orders.
 *
 * Rules:
 * - DRAFT: can be sent to supplier or cancelled.
 * - SENT: can return to DRAFT (if rejected/needs edits), be CONFIRMED, CANCELLED, or receive goods.
 * - CONFIRMED: goods can be received (PARTIALLY_RECEIVED / COMPLETED) or order cancelled.
 * - PARTIALLY_RECEIVED: remainder can be received (COMPLETED) or order cancelled.
 * - COMPLETED: terminal state, no further transitions allowed.
 * - CANCELLED: terminal state, no further transitions allowed.
 */
export const ALLOWED_PO_TRANSITIONS: Record<
	PurchaseOrderStatus,
	readonly PurchaseOrderStatus[]
> = {
	DRAFT: ["SENT", "CANCELLED"],
	SENT: ["DRAFT", "CONFIRMED", "CANCELLED", "PARTIALLY_RECEIVED", "COMPLETED"],
	CONFIRMED: ["PARTIALLY_RECEIVED", "COMPLETED", "CANCELLED"],
	PARTIALLY_RECEIVED: ["COMPLETED", "CANCELLED"],
	COMPLETED: [],
	CANCELLED: [],
};

/** Statuses in which a Purchase Order is eligible to receive warehouse deliveries */
export const RECEIVABLE_PO_STATUSES: readonly PurchaseOrderStatus[] = [
	"SENT",
	"CONFIRMED",
	"PARTIALLY_RECEIVED",
];

// ─── 2. VAT RATES & LINE ITEM CONTRACTS ───────────────────────────────────────

export const vatRateSchema = z.union([
	z.literal(0),
	z.literal(10),
	z.literal(20),
	z.literal("EXEMPT"),
]);
export type VatRate = z.infer<typeof vatRateSchema>;

export const VAT_RATE_LABELS_RU: Record<VatRate, string> = {
	0: "0%",
	10: "10%",
	20: "20%",
	EXEMPT: "Без НДС (Освобожден)",
};

export const purchaseOrderLineItemSchema = z.object({
	id: z.string(),
	itemId: z.string(),
	itemName: z.string(),
	supplierSku: z.string().optional(),
	orderedQuantity: z.number().nonnegative(),
	receivedQuantity: z.number().nonnegative().default(0),
	unitPriceKopecks: z.number().int().nonnegative(),
	vatRate: vatRateSchema,
	totalPriceKopecks: z.number().int().nonnegative(),
});
export type PurchaseOrderLineItem = z.infer<typeof purchaseOrderLineItemSchema>;

export const purchaseOrderSchema = z.object({
	id: z.string(),
	orderNumber: z.string(),
	supplierId: z.string(),
	supplierName: z.string(),
	status: purchaseOrderStatusSchema,
	lines: z.array(purchaseOrderLineItemSchema),
	totalAmountKopecks: z.number().int().nonnegative(),
	vatAmountKopecks: z.number().int().nonnegative(),
	createdAt: z.string(),
	expectedDeliveryDate: z.string().optional(),
});
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

// ─── 3. BUSINESS LOGIC & CALCULATION ENGINES ─────────────────────────────────

/**
 * Validates whether a Purchase Order status transition from currentStatus to
 * targetStatus is legally and logically permitted.
 *
 * @param currentStatus - The existing status of the purchase order.
 * @param targetStatus - The desired target status.
 * @returns boolean - True if the transition is allowed, false otherwise.
 */
export function validatePOStatusTransition(
	currentStatus: PurchaseOrderStatus,
	targetStatus: PurchaseOrderStatus,
): boolean {
	if (currentStatus === targetStatus) {
		return false;
	}
	const allowed = ALLOWED_PO_TRANSITIONS[currentStatus];
	return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Options for calculating purchase order line totals.
 */
export interface POLineTotalOptions {
	/**
	 * If true, unitPriceKopecks is treated as including VAT (в том числе НДС).
	 * If false (default), unitPriceKopecks is net price excluding VAT (цена без НДС),
	 * and VAT is added on top.
	 */
	readonly priceIncludesVat?: boolean;
}

/**
 * Calculates statutory line total and VAT amount in exact integer kopecks.
 *
 * Statutory formulas:
 * - When price excludes VAT (standard B2B Russian invoice / УПД / ТОРГ-12):
 *     netKopecks = Math.round(quantity * unitPriceKopecks)
 *     vatKopecks = (vatRate === 'EXEMPT' || vatRate === 0) ? 0 : Math.round((netKopecks * vatRate) / 100)
 *     lineTotalKopecks = netKopecks + vatKopecks
 * - When price includes VAT (gross price):
 *     lineTotalKopecks = Math.round(quantity * unitPriceKopecks)
 *     vatKopecks = (vatRate === 'EXEMPT' || vatRate === 0) ? 0 : Math.round((lineTotalKopecks * vatRate) / (100 + vatRate))
 *
 * @param quantity - Number of units ordered (can be fractional for bulk materials, e.g. 1.5 kg).
 * @param unitPriceKopecks - Unit price in integer kopecks.
 * @param vatRate - Statutory VAT rate (0, 10, 20, or 'EXEMPT').
 * @param options - Optional calculation flags (e.g. priceIncludesVat).
 * @returns { lineTotalKopecks: number; vatKopecks: number }
 */
export function calculatePOLineTotal(
	quantity: number,
	unitPriceKopecks: number,
	vatRate: VatRate,
	options?: POLineTotalOptions,
): { lineTotalKopecks: number; vatKopecks: number } {
	// Guard against non-finite or negative values
	if (
		!Number.isFinite(quantity) ||
		quantity <= 0 ||
		!Number.isFinite(unitPriceKopecks) ||
		unitPriceKopecks <= 0
	) {
		return { lineTotalKopecks: 0, vatKopecks: 0 };
	}

	const isExemptOrZero = vatRate === "EXEMPT" || vatRate === 0;

	if (options?.priceIncludesVat) {
		const lineTotalKopecks = Math.round(quantity * unitPriceKopecks);
		if (isExemptOrZero) {
			return { lineTotalKopecks, vatKopecks: 0 };
		}
		const ratePercent = typeof vatRate === "number" ? vatRate : 0;
		const vatKopecks = Math.round((lineTotalKopecks * ratePercent) / (100 + ratePercent));
		return { lineTotalKopecks, vatKopecks };
	}

	const netKopecks = Math.round(quantity * unitPriceKopecks);
	if (isExemptOrZero) {
		return { lineTotalKopecks: netKopecks, vatKopecks: 0 };
	}

	const ratePercent = typeof vatRate === "number" ? vatRate : 0;
	const vatKopecks = Math.round((netKopecks * ratePercent) / 100);
	const lineTotalKopecks = netKopecks + vatKopecks;

	return { lineTotalKopecks, vatKopecks };
}

/**
 * Parameters for generating a Purchase Order from ROP Reorder Suggestions.
 */
export interface GeneratePurchaseOrderParams {
	readonly supplierId: string;
	readonly supplierName: string;
	readonly suggestions: readonly ReorderSuggestion[];
	readonly orderNumber?: string;
	readonly expectedDeliveryDate?: string;
	readonly defaultVatRate?: VatRate;
	readonly id?: string;
}

/**
 * Generates a structured Purchase Order in DRAFT status from ROP warehouse
 * replenishment recommendations (inventoryReorderEngine from Wave 120).
 *
 * Rules:
 * - Automatically filters out suggestions where suggestedQuantity <= 0.
 * - Computes exact line totals and VAT amounts in integer kopecks.
 * - Sets default status to 'DRAFT'.
 * - Generates statutory order number if omitted (e.g. PO-YYYY-XXX).
 *
 * @param params - Supplier metadata and reorder suggestion list.
 * @returns PurchaseOrder
 */
export function generatePurchaseOrderFromReorderSuggestions(
	params: GeneratePurchaseOrderParams,
): PurchaseOrder {
	const orderId =
		params.id ??
		(typeof crypto !== "undefined" && crypto.randomUUID
			? crypto.randomUUID()
			: `po-${Date.now()}`);
	const defaultVat = params.defaultVatRate ?? "EXEMPT";
	const currentYear = new Date().getFullYear();
	const orderNumber =
		params.orderNumber ??
		`PO-${currentYear}-${String(Math.floor(Math.random() * 900) + 100)}`;

	const lines: PurchaseOrderLineItem[] = [];
	let totalAmountKopecks = 0;
	let totalVatKopecks = 0;

	let lineIdx = 1;
	for (const suggestion of params.suggestions) {
		// Filter out suggestions that don't need ordering
		if (!suggestion.suggestedQuantity || suggestion.suggestedQuantity <= 0) {
			continue;
		}

		const lineId =
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `line-${orderId}-${lineIdx++}`;
		const itemId = suggestion.inventoryItemId ?? `item-${lineIdx}`;
		const itemName = suggestion.itemName ?? "Расходный стоматологический материал";
		const orderedQuantity = suggestion.suggestedQuantity;
		const unitPriceKopecks = suggestion.unitPriceKopecks ?? 0;
		const vatRate = defaultVat;

		const { lineTotalKopecks, vatKopecks } = calculatePOLineTotal(
			orderedQuantity,
			unitPriceKopecks,
			vatRate,
		);

		lines.push({
			id: lineId,
			itemId,
			itemName,
			orderedQuantity,
			receivedQuantity: 0,
			unitPriceKopecks,
			vatRate,
			totalPriceKopecks: lineTotalKopecks,
		});

		totalAmountKopecks += lineTotalKopecks;
		totalVatKopecks += vatKopecks;
	}

	return {
		id: orderId,
		orderNumber,
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		status: "DRAFT",
		lines,
		totalAmountKopecks,
		vatAmountKopecks: totalVatKopecks,
		createdAt: new Date().toISOString(),
		...(params.expectedDeliveryDate ? { expectedDeliveryDate: params.expectedDeliveryDate } : {}),
	};
}

/**
 * Receipt line item input.
 */
export interface PurchaseReceiptLineInput {
	readonly lineId: string;
	readonly receivedQuantity: number;
}

/**
 * Options for applying a warehouse purchase receipt.
 */
export interface ApplyPurchaseReceiptOptions {
	/**
	 * If true, allows soft overdraft where received quantity exceeds ordered quantity.
	 * If false (default), over-receiving throws a validation error.
	 */
	readonly allowOverdraft?: boolean;
	/**
	 * If true, permits receiving goods even if order is currently in DRAFT status
	 * (auto-advances to SENT/CONFIRMED path). Defaults to false.
	 */
	readonly allowDraftReceipt?: boolean;
}

/**
 * Result of applying a purchase receipt to a Purchase Order.
 */
export interface ApplyPurchaseReceiptResult {
	readonly updatedOrder: PurchaseOrder;
	readonly isFullyReceived: boolean;
	readonly totalReceivedItems: number;
}

/**
 * Applies a goods delivery receipt to an active Purchase Order.
 *
 * Rules:
 * 1. Status Guard: Order must be in a receivable status (SENT, CONFIRMED, or PARTIALLY_RECEIVED).
 *    Receiving on COMPLETED or CANCELLED is strictly forbidden.
 * 2. Overdraft Protection: If receivedQuantity + newReceived > orderedQuantity and
 *    allowOverdraft is false, throws a detailed error.
 * 3. Status Progression:
 *    - If all lines have receivedQuantity >= orderedQuantity, status becomes COMPLETED.
 *    - If at least one item was received but order is not complete, status becomes PARTIALLY_RECEIVED.
 * 4. Immutability: Returns a new updated PurchaseOrder instance without mutating original object.
 *
 * @param order - The target purchase order.
 * @param receiptLines - Array of received quantities per line ID.
 * @param options - Overdraft and validation options.
 * @returns ApplyPurchaseReceiptResult
 */
export function applyPurchaseReceipt(
	order: PurchaseOrder,
	receiptLines: readonly PurchaseReceiptLineInput[],
	options?: ApplyPurchaseReceiptOptions,
): ApplyPurchaseReceiptResult {
	// 1. Guard order status
	if (order.status === "COMPLETED") {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}": order is already COMPLETED`,
		);
	}
	if (order.status === "CANCELLED") {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}": order is CANCELLED`,
		);
	}
	if (order.status === "DRAFT" && !options?.allowDraftReceipt) {
		throw new Error(
			`Cannot apply receipt to purchase order "${order.orderNumber}" in DRAFT status: order must be SENT or CONFIRMED before receiving`,
		);
	}

	// 2. Clone lines into a lookup map
	const lineMap = new Map<string, PurchaseOrderLineItem>(
		order.lines.map((l) => [l.id, { ...l }]),
	);

	let batchReceivedQuantity = 0;

	// 3. Process incoming receipt lines
	for (const receiptEntry of receiptLines) {
		const line = lineMap.get(receiptEntry.lineId);
		if (!line) {
			throw new Error(
				`Receipt line ID "${receiptEntry.lineId}" does not exist in purchase order "${order.orderNumber}"`,
			);
		}

		if (receiptEntry.receivedQuantity < 0) {
			throw new Error(
				`Received quantity must be non-negative, got ${receiptEntry.receivedQuantity} for line "${line.itemName}"`,
			);
		}

		if (receiptEntry.receivedQuantity === 0) {
			continue;
		}

		const nextReceived = line.receivedQuantity + receiptEntry.receivedQuantity;

		// Check overdraft
		if (nextReceived > line.orderedQuantity && !options?.allowOverdraft) {
			throw new Error(
				`Received quantity (${nextReceived}) exceeds ordered quantity (${line.orderedQuantity}) for item "${line.itemName}". Overdraft flag required.`,
			);
		}

		line.receivedQuantity = nextReceived;
		batchReceivedQuantity += receiptEntry.receivedQuantity;
	}

	// 4. Reconstruct updated lines preserving original order
	const updatedLines = order.lines.map((l) => lineMap.get(l.id)!);

	// 5. Evaluate completion status
	const isFullyReceived =
		updatedLines.length > 0 &&
		updatedLines.every((l) => l.receivedQuantity >= l.orderedQuantity);

	const hasAnyReceived = updatedLines.some((l) => l.receivedQuantity > 0);

	let nextStatus: PurchaseOrderStatus = order.status;
	if (isFullyReceived) {
		nextStatus = "COMPLETED";
	} else if (hasAnyReceived) {
		nextStatus = "PARTIALLY_RECEIVED";
	}

	const updatedOrder: PurchaseOrder = {
		...order,
		status: nextStatus,
		lines: updatedLines,
	};

	return {
		updatedOrder,
		isFullyReceived,
		totalReceivedItems: batchReceivedQuantity,
	};
}

// ─── 4. STATUTORY PRINT SUMMARY FORMATTING ────────────────────────────────────

/**
 * Formats integer kopecks as human-readable Russian rubles string with 2 decimals.
 * Example: 150000 -> "1 500,00 ₽"
 */
function formatKopecksToRublesRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return "0,00 ₽";
	const rubles = Math.floor(Math.abs(kopecks) / 100);
	const remKopecks = Math.round(Math.abs(kopecks) % 100);
	const rublesStr = rubles.toLocaleString("ru-RU");
	const kopecksStr = String(remKopecks).padStart(2, "0");
	const sign = kopecks < 0 ? "-" : "";
	return `${sign}${rublesStr},${kopecksStr} ₽`;
}

/**
 * Formats an ISO date string (e.g. "2026-09-11T12:00:00Z") to Russian date "DD.MM.YYYY".
 */
function formatDateRu(isoString: string): string {
	try {
		const d = new Date(isoString);
		if (Number.isNaN(d.getTime())) return isoString;
		const day = String(d.getDate()).padStart(2, "0");
		const month = String(d.getMonth() + 1).padStart(2, "0");
		const year = d.getFullYear();
		return `${day}.${month}.${year}`;
	} catch {
		return isoString;
	}
}

/**
 * Formats a clean, structured, statutory text summary of a Purchase Order
 * suitable for printing, emailing to suppliers, or legal archiving.
 *
 * Adheres strictly to Mandate 8d (7 deadly sins checklist):
 * - ZERO cartoon emojis (no 🎉, 🚀, 💡, 🦷, 📦, 📄).
 * - Complete supplier details, order number, dates, and Russian status label.
 * - Itemized specification table with quantities, kopeck-exact prices, VAT, and totals.
 * - Summary totals (total ordered, total received, VAT amount, grand total).
 * - Statutory signature blocks for Buyer and Supplier.
 *
 * @param order - The purchase order to format.
 * @param clinicName - Optional custom clinic / buyer legal entity name.
 * @returns string - Clean plain-text print summary.
 */
export function formatPurchaseOrderPrintSummary(
	order: PurchaseOrder,
	clinicName?: string,
): string {
	const legalClinicName = clinicName || 'ООО "ДЕНТЕ"';
	const statusLabel = PURCHASE_ORDER_STATUS_LABELS_RU[order.status] ?? order.status;
	const dateCreated = formatDateRu(order.createdAt);
	const deliveryDate = order.expectedDeliveryDate
		? formatDateRu(order.expectedDeliveryDate)
		: "По согласованию сторон";

	const headerSep = "=".repeat(80);
	const sectionSep = "-".repeat(80);

	let totalOrderedUnits = 0;
	let totalReceivedUnits = 0;

	const lineItemsText = order.lines.map((line, index) => {
		totalOrderedUnits += line.orderedQuantity;
		totalReceivedUnits += line.receivedQuantity;

		const num = String(index + 1).padStart(2, " ");
		const skuStr = line.supplierSku ? ` (Артикул поставщика: ${line.supplierSku})` : "";
		const unitPriceStr = formatKopecksToRublesRu(line.unitPriceKopecks);
		const vatLabel = VAT_RATE_LABELS_RU[line.vatRate] ?? String(line.vatRate);
		const lineTotalStr = formatKopecksToRublesRu(line.totalPriceKopecks);

		return [
			` ${num}. ${line.itemName}${skuStr}`,
			`     Заказано: ${line.orderedQuantity} шт. | Принято: ${line.receivedQuantity} шт.`,
			`     Цена за ед.: ${unitPriceStr} | Ставка НДС: ${vatLabel}`,
			`     Стоимость по строке: ${lineTotalStr}`,
		].join("\n");
	});

	const specificationSection =
		order.lines.length > 0
			? lineItemsText.join("\n\n")
			: " [Позиции заказа отсутствуют]";

	const grandTotalStr = formatKopecksToRublesRu(order.totalAmountKopecks);
	const grandVatStr = formatKopecksToRublesRu(order.vatAmountKopecks);

	return [
		headerSep,
		`                     ДОГОВОР-ЗАКАЗ ПОСТАВЩИКУ № ${order.orderNumber}`,
		headerSep,
		`Покупатель (Заказчик):  ${legalClinicName}`,
		`Поставщик:              ${order.supplierName} (ID: ${order.supplierId})`,
		`Дата составления:       ${dateCreated}`,
		`Статус заказа:          ${statusLabel}`,
		`Ожидаемый срок поставки:${deliveryDate}`,
		sectionSep,
		"СПЕЦИФИКАЦИЯ ТОВАРОВ К ПОСТАВКЕ:",
		sectionSep,
		specificationSection,
		sectionSep,
		"ИТОГОВЫЙ РАСЧЕТ:",
		`Всего номенклатурных позиций:     ${order.lines.length}`,
		`Всего единиц товара к поставке:   ${totalOrderedUnits}`,
		`Всего единиц товара принято:      ${totalReceivedUnits}`,
		`Сумма НДС:                        ${grandVatStr}`,
		`Итого к оплате (с учетом НДС):    ${grandTotalStr}`,
		headerSep,
		"ПОДПИСИ СТОРОН:",
		"",
		"Заказчик (Покупатель):                         Поставщик:",
		"",
		"____________________ / ____________________ /   ____________________ / ____________________ /",
		"М.П.                                            М.П.",
		headerSep,
	].join("\n");
}
