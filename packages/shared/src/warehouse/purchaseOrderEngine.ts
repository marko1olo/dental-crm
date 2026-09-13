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

// ─── 5. PROCUREMENT LIFECYCLE & QUALITY VERDICTS (DENTALPIN ADAPTER) ─────────

/** Procurement lifecycle status matching DentalPin (lowercase) */
export const procurementOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"confirmed",
	"received",
	"cancelled",
]);
export type ProcurementOrderStatus = z.infer<typeof procurementOrderStatusSchema>;

/** Russian labels for procurement statuses */
export const PROCUREMENT_ORDER_STATUS_LABELS_RU: Record<ProcurementOrderStatus, string> = {
	draft: "Черновик",
	sent: "Отправлен поставщику",
	confirmed: "Подтвержден поставщиком",
	received: "Принят (завершен)",
	cancelled: "Отменен",
};

/** Goods receipt quality verdict matching DentalPin */
export const receiptQualityVerdictSchema = z.enum(["good", "rejected"]);
export type ReceiptQualityVerdict = z.infer<typeof receiptQualityVerdictSchema>;

/** Line fulfillment status */
export const purchaseOrderLineStatusSchema = z.enum([
	"unfulfilled",
	"partially_received",
	"fully_received",
	"over_received",
]);
export type PurchaseOrderLineStatus = z.infer<typeof purchaseOrderLineStatusSchema>;

/** Russian labels for line fulfillment status */
export const PURCHASE_ORDER_LINE_STATUS_LABELS_RU: Record<PurchaseOrderLineStatus, string> = {
	unfulfilled: "Не выполнен",
	partially_received: "Частично принят",
	fully_received: "Полностью принят",
	over_received: "Принят с избытком",
};

/** Single line item on a purchase order record */
export const purchaseOrderLineSchema = z.object({
	id: z.string().min(1, "Line ID is required"),
	inventoryItemId: z.string().min(1, "Inventory Item ID is required"),
	itemName: z.string().min(1, "Item name is required"),
	quantityOrdered: z.number().positive("Ordered quantity must be positive"),
	quantityReceived: z.number().nonnegative("Received quantity cannot be negative").default(0),
	unitPriceKopecks: z.number().int().nonnegative("Unit price must be non-negative kopecks"),
	status: purchaseOrderLineStatusSchema.default("unfulfilled"),
});
export type PurchaseOrderLine = z.infer<typeof purchaseOrderLineSchema>;

/** Single line in a delivery receipt batch */
export const purchaseReceiptLineSchema = z.object({
	id: z.string().min(1, "Receipt line ID is required"),
	purchaseOrderLineId: z.string().min(1, "Purchase order line ID is required"),
	inventoryItemId: z.string().min(1, "Inventory item ID is required"),
	quantityReceived: z.number().positive("Received quantity must be positive"),
	quality: receiptQualityVerdictSchema.default("good"),
});
export type PurchaseReceiptLine = z.infer<typeof purchaseReceiptLineSchema>;

/** Goods receipt delivery record against a purchase order */
export const purchaseReceiptSchema = z.object({
	id: z.string().min(1, "Receipt ID is required"),
	purchaseOrderId: z.string().min(1, "Purchase order ID is required"),
	receivedAt: z.string().min(1, "Received date is required"),
	receivedBy: z.string().nullable().optional(),
	lines: z.array(purchaseReceiptLineSchema),
});
export type PurchaseReceipt = z.infer<typeof purchaseReceiptSchema>;

/** Complete purchase order record */
export const purchaseOrderRecordSchema = z.object({
	id: z.string().min(1, "Order ID is required"),
	clinicId: z.string().min(1, "Clinic ID is required"),
	supplierId: z.string().min(1, "Supplier ID is required"),
	supplierName: z.string().min(1, "Supplier name is required"),
	status: procurementOrderStatusSchema,
	expectedDate: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	lines: z.array(purchaseOrderLineSchema),
	receipts: z.array(purchaseReceiptSchema).default([]),
	totalAmountKopecks: z.number().int().nonnegative("Total amount must be non-negative kopecks"),
	receivedAmountKopecks: z.number().int().nonnegative("Received amount must be non-negative kopecks").default(0),
	createdAt: z.string().optional(),
	updatedAt: z.string().optional(),
});
export type PurchaseOrderRecord = z.infer<typeof purchaseOrderRecordSchema>;

/** Allowed transitions matching DentalPin service.py */
export const ALLOWED_PROCUREMENT_PO_TRANSITIONS: Record<
	ProcurementOrderStatus,
	readonly ProcurementOrderStatus[]
> = {
	draft: ["sent", "cancelled"],
	sent: ["draft", "confirmed", "cancelled"],
	confirmed: ["cancelled"],
	received: [],
	cancelled: [],
};

/** Statuses in which goods delivery batches can be received */
export const RECEIVABLE_PROCUREMENT_STATUSES: readonly ProcurementOrderStatus[] = ["sent", "confirmed"];

/**
 * Validates whether a procurement purchase order status transition is allowed.
 */
export function validatePurchaseOrderStatusTransition(
	fromStatus: ProcurementOrderStatus,
	toStatus: ProcurementOrderStatus,
): boolean {
	if (fromStatus === toStatus) return false;
	const allowed = ALLOWED_PROCUREMENT_PO_TRANSITIONS[fromStatus];
	return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Transitions a purchase order status if allowed, throwing an error otherwise.
 */
export function transitionPurchaseOrderStatus(
	order: PurchaseOrderRecord,
	toStatus: ProcurementOrderStatus,
): PurchaseOrderRecord {
	if (!validatePurchaseOrderStatusTransition(order.status, toStatus)) {
		throw new Error(
			`Status transition from "${order.status}" to "${toStatus}" is not permitted for purchase order ${order.id}`,
		);
	}
	return {
		...order,
		status: toStatus,
		updatedAt: new Date().toISOString(),
	};
}

/**
 * Computes line fulfillment status based on ordered vs received quantities.
 */
export function computePurchaseOrderLineStatus(
	quantityOrdered: number,
	quantityReceived: number,
): PurchaseOrderLineStatus {
	if (quantityReceived <= 0) return "unfulfilled";
	if (quantityReceived < quantityOrdered) return "partially_received";
	if (quantityReceived === quantityOrdered) return "fully_received";
	return "over_received";
}

export interface CreatePurchaseOrderLineInput {
	readonly id?: string;
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly quantityOrdered: number;
	readonly unitPriceKopecks: number;
}

export interface CreatePurchaseOrderParams {
	readonly id?: string;
	readonly clinicId: string;
	readonly supplierId: string;
	readonly supplierName: string;
	readonly expectedDate?: string | null;
	readonly notes?: string | null;
	readonly lines: readonly CreatePurchaseOrderLineInput[];
}

/**
 * Creates a new purchase order record in draft status with calculated totals.
 */
export function createPurchaseOrderRecord(params: CreatePurchaseOrderParams): PurchaseOrderRecord {
	if (params.lines.length === 0) {
		throw new Error("Purchase order must contain at least one line item");
	}

	const seenItemIds = new Set<string>();
	for (const line of params.lines) {
		if (seenItemIds.has(line.inventoryItemId)) {
			throw new Error(`Duplicate inventoryItemId "${line.inventoryItemId}" in purchase order lines`);
		}
		seenItemIds.add(line.inventoryItemId);
		if (line.quantityOrdered <= 0) {
			throw new Error(`Quantity ordered must be positive for item "${line.itemName}"`);
		}
		if (line.unitPriceKopecks < 0) {
			throw new Error(`Unit price cannot be negative for item "${line.itemName}"`);
		}
	}

	let totalAmountKopecks = 0;
	let lineIdx = 1;
	const lines: PurchaseOrderLine[] = params.lines.map((l) => {
		const lineTotal = Math.round(l.quantityOrdered * l.unitPriceKopecks);
		totalAmountKopecks += lineTotal;
		return {
			id: l.id ?? `pol-${Date.now()}-${lineIdx++}`,
			inventoryItemId: l.inventoryItemId,
			itemName: l.itemName,
			quantityOrdered: l.quantityOrdered,
			quantityReceived: 0,
			unitPriceKopecks: l.unitPriceKopecks,
			status: "unfulfilled",
		};
	});

	const orderId = params.id ?? `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
	const now = new Date().toISOString();

	return {
		id: orderId,
		clinicId: params.clinicId,
		supplierId: params.supplierId,
		supplierName: params.supplierName,
		status: "draft",
		expectedDate: params.expectedDate ?? null,
		notes: params.notes ?? null,
		lines,
		receipts: [],
		totalAmountKopecks,
		receivedAmountKopecks: 0,
		createdAt: now,
		updatedAt: now,
	};
}

export interface DeliveryReceiptLineInput {
	readonly purchaseOrderLineId: string;
	readonly quantityReceived: number;
	readonly quality: ReceiptQualityVerdict;
}

export interface ReceiveDeliveryBatchInput {
	readonly receiptId?: string;
	readonly receivedAt?: string;
	readonly receivedBy?: string | null;
	readonly lines: readonly DeliveryReceiptLineInput[];
}

export interface ReceiveDeliveryBatchOptions {
	/** If true, permits receiving more than ordered (over-delivery). Defaults to false. */
	readonly allowOverdelivery?: boolean;
}

export interface ReceiveDeliveryBatchResult {
	readonly updatedOrder: PurchaseOrderRecord;
	readonly receipt: PurchaseReceipt;
	readonly fullyReceived: boolean;
	readonly totalGoodQuantity: number;
	readonly totalRejectedQuantity: number;
}

/**
 * Receives a delivery batch against a purchase order with good/rejected quality verdicts.
 */
export function receiveDeliveryBatch(
	order: PurchaseOrderRecord,
	batch: ReceiveDeliveryBatchInput,
	options?: ReceiveDeliveryBatchOptions,
): ReceiveDeliveryBatchResult {
	if (!RECEIVABLE_PROCUREMENT_STATUSES.includes(order.status)) {
		throw new Error(
			`Purchase order in status "${order.status}" cannot receive deliveries. Status must be "sent" or "confirmed".`,
		);
	}

	if (batch.lines.length === 0) {
		throw new Error("Delivery batch must contain at least one line item");
	}

	const lineMap = new Map<string, PurchaseOrderLine>(
		order.lines.map((l) => [l.id, { ...l }]),
	);

	const receiptId = batch.receiptId ?? `rcpt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
	const receivedAt = batch.receivedAt ?? new Date().toISOString();
	let receiptLineIdx = 1;

	const receiptLines: PurchaseReceiptLine[] = [];
	let totalGoodQuantity = 0;
	let totalRejectedQuantity = 0;

	for (const entry of batch.lines) {
		const line = lineMap.get(entry.purchaseOrderLineId);
		if (!line) {
			throw new Error(
				`Receipt line references unknown purchaseOrderLineId "${entry.purchaseOrderLineId}" in PO ${order.id}`,
			);
		}

		if (entry.quantityReceived <= 0) {
			throw new Error(
				`Received quantity must be positive, got ${entry.quantityReceived} for line "${line.itemName}"`,
			);
		}

		if (entry.quality === "good") {
			const nextReceived = line.quantityReceived + entry.quantityReceived;
			if (nextReceived > line.quantityOrdered && !options?.allowOverdelivery) {
				throw new Error(
					`Received quantity (${nextReceived}) exceeds ordered quantity (${line.quantityOrdered}) for line "${line.itemName}". Overdelivery flag required.`,
				);
			}
			line.quantityReceived = nextReceived;
			totalGoodQuantity += entry.quantityReceived;
		} else {
			totalRejectedQuantity += entry.quantityReceived;
		}

		line.status = computePurchaseOrderLineStatus(line.quantityOrdered, line.quantityReceived);

		receiptLines.push({
			id: `rcptl-${receiptId}-${receiptLineIdx++}`,
			purchaseOrderLineId: line.id,
			inventoryItemId: line.inventoryItemId,
			quantityReceived: entry.quantityReceived,
			quality: entry.quality,
		});
	}

	const updatedLines = order.lines.map((l) => lineMap.get(l.id)!);
	const fullyReceived =
		updatedLines.length > 0 &&
		updatedLines.every((l) => l.quantityReceived >= l.quantityOrdered);

	let receivedAmountKopecks = 0;
	for (const l of updatedLines) {
		receivedAmountKopecks += Math.round(l.quantityReceived * l.unitPriceKopecks);
	}

	const newReceipt: PurchaseReceipt = {
		id: receiptId,
		purchaseOrderId: order.id,
		receivedAt,
		receivedBy: batch.receivedBy ?? null,
		lines: receiptLines,
	};

	const nextStatus: ProcurementOrderStatus = fullyReceived ? "received" : order.status;

	const updatedOrder: PurchaseOrderRecord = {
		...order,
		status: nextStatus,
		lines: updatedLines,
		receipts: [...order.receipts, newReceipt],
		receivedAmountKopecks,
		updatedAt: new Date().toISOString(),
	};

	return {
		updatedOrder,
		receipt: newReceipt,
		fullyReceived,
		totalGoodQuantity,
		totalRejectedQuantity,
	};
}

// ─── 6. THREE-WAY MATCHING (3-WAY MATCHING ENGINE) ───────────────────────────

export interface SupplierInvoiceLineInput {
	readonly inventoryItemId: string;
	readonly itemName?: string;
	readonly quantityInvoiced: number;
	readonly unitPriceKopecks: number;
	readonly totalAmountKopecks?: number;
}

export interface SupplierInvoiceInput {
	readonly invoiceNumber: string;
	readonly invoiceDate: string;
	readonly supplierId: string;
	readonly lines: readonly SupplierInvoiceLineInput[];
	readonly totalAmountKopecks: number;
}

export interface ThreeWayMatchingOptions {
	/** Allowed price variance percentage (0 to 100). Default is 0 (strict exact match). */
	readonly priceTolerancePercent?: number;
	/** Allowed quantity variance percentage (0 to 100). Default is 0 (strict exact match). */
	readonly quantityTolerancePercent?: number;
}

export type ThreeWayMatchingVerdict =
	| "match"
	| "price_discrepancy"
	| "quantity_discrepancy"
	| "total_discrepancy"
	| "unmatched_items";

export interface ThreeWayMatchingDiscrepancy {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly discrepancyType:
		| "price_mismatch"
		| "quantity_mismatch"
		| "missing_in_order"
		| "missing_in_receipt";
	readonly expectedValue: number;
	readonly actualValue: number;
	readonly difference: number;
	readonly message: string;
}

export interface ThreeWayMatchingSummary {
	readonly totalOrderedKopecks: number;
	readonly totalReceivedKopecks: number;
	readonly totalInvoicedKopecks: number;
	readonly netVarianceKopecks: number;
	readonly totalOrderedUnits: number;
	readonly totalReceivedUnits: number;
	readonly totalInvoicedUnits: number;
}

export interface ThreeWayMatchingResult {
	readonly isMatched: boolean;
	readonly verdict: ThreeWayMatchingVerdict;
	readonly discrepancies: readonly ThreeWayMatchingDiscrepancy[];
	readonly summary: ThreeWayMatchingSummary;
}

/**
 * Validates Three-Way Matching: Purchase Order (PO) vs Goods Receipt (GR) vs Supplier Invoice (INV).
 */
export function validateThreeWayMatching(
	order: PurchaseOrderRecord,
	invoice: SupplierInvoiceInput,
	options?: ThreeWayMatchingOptions,
): ThreeWayMatchingResult {
	const priceTol = Math.max(0, options?.priceTolerancePercent ?? 0);
	const qtyTol = Math.max(0, options?.quantityTolerancePercent ?? 0);

	const discrepancies: ThreeWayMatchingDiscrepancy[] = [];
	const orderLinesByItem = new Map<string, PurchaseOrderLine>(
		order.lines.map((l) => [l.inventoryItemId, l]),
	);

	let totalOrderedUnits = 0;
	let totalReceivedUnits = 0;
	let totalInvoicedUnits = 0;

	for (const l of order.lines) {
		totalOrderedUnits += l.quantityOrdered;
		totalReceivedUnits += l.quantityReceived;
	}

	const seenItemIdsInInvoice = new Set<string>();

	for (const invLine of invoice.lines) {
		seenItemIdsInInvoice.add(invLine.inventoryItemId);
		totalInvoicedUnits += invLine.quantityInvoiced;

		const poLine = orderLinesByItem.get(invLine.inventoryItemId);
		const itemName = invLine.itemName || poLine?.itemName || invLine.inventoryItemId;

		if (!poLine) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "missing_in_order",
				expectedValue: 0,
				actualValue: invLine.quantityInvoiced,
				difference: invLine.quantityInvoiced,
				message: `Позиция "${itemName}" присутствует в счете поставщика, но отсутствует в заказе PO ${order.id}`,
			});
			continue;
		}

		// 1. Price comparison (PO price vs Invoice price)
		const priceDiffKopecks = invLine.unitPriceKopecks - poLine.unitPriceKopecks;
		const maxAllowedPriceDiff = Math.round((poLine.unitPriceKopecks * priceTol) / 100);
		if (Math.abs(priceDiffKopecks) > maxAllowedPriceDiff) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "price_mismatch",
				expectedValue: poLine.unitPriceKopecks,
				actualValue: invLine.unitPriceKopecks,
				difference: priceDiffKopecks,
				message: `Расхождение цены по "${itemName}": заказано по ${(poLine.unitPriceKopecks / 100).toFixed(2)} руб., выставлено по ${(invLine.unitPriceKopecks / 100).toFixed(2)} руб.`,
			});
		}

		// 2. Quantity comparison (Receipt quantity vs Invoiced quantity)
		const qtyDiff = invLine.quantityInvoiced - poLine.quantityReceived;
		const maxAllowedQtyDiff = (poLine.quantityReceived * qtyTol) / 100;
		if (Math.abs(qtyDiff) > maxAllowedQtyDiff) {
			discrepancies.push({
				inventoryItemId: invLine.inventoryItemId,
				itemName,
				discrepancyType: "quantity_mismatch",
				expectedValue: poLine.quantityReceived,
				actualValue: invLine.quantityInvoiced,
				difference: qtyDiff,
				message: `Расхождение объема по "${itemName}": принято годных ${poLine.quantityReceived} ед., выставлено в счете ${invLine.quantityInvoiced} ед.`,
			});
		}
	}

	// 3. Check for received items missing from invoice
	for (const poLine of order.lines) {
		if (poLine.quantityReceived > 0 && !seenItemIdsInInvoice.has(poLine.inventoryItemId)) {
			discrepancies.push({
				inventoryItemId: poLine.inventoryItemId,
				itemName: poLine.itemName,
				discrepancyType: "missing_in_receipt",
				expectedValue: poLine.quantityReceived,
				actualValue: 0,
				difference: -poLine.quantityReceived,
				message: `Позиция "${poLine.itemName}" принята на складе (${poLine.quantityReceived} ед.), но не включена в счет поставщика`,
			});
		}
	}

	const totalOrderedKopecks = order.totalAmountKopecks;
	const totalReceivedKopecks = order.receivedAmountKopecks;
	const totalInvoicedKopecks = invoice.totalAmountKopecks;
	const netVarianceKopecks = totalInvoicedKopecks - totalReceivedKopecks;

	let verdict: ThreeWayMatchingVerdict = "match";
	if (discrepancies.length > 0) {
		const hasMissing = discrepancies.some(
			(d) => d.discrepancyType === "missing_in_order" || d.discrepancyType === "missing_in_receipt",
		);
		const hasPrice = discrepancies.some((d) => d.discrepancyType === "price_mismatch");
		const hasQty = discrepancies.some((d) => d.discrepancyType === "quantity_mismatch");

		if (hasMissing) verdict = "unmatched_items";
		else if (hasPrice && !hasQty) verdict = "price_discrepancy";
		else if (hasQty && !hasPrice) verdict = "quantity_discrepancy";
		else verdict = "total_discrepancy";
	} else if (netVarianceKopecks !== 0) {
		verdict = "total_discrepancy";
	}

	return {
		isMatched: discrepancies.length === 0 && netVarianceKopecks === 0,
		verdict,
		discrepancies,
		summary: {
			totalOrderedKopecks,
			totalReceivedKopecks,
			totalInvoicedKopecks,
			netVarianceKopecks,
			totalOrderedUnits,
			totalReceivedUnits,
			totalInvoicedUnits,
		},
	};
}

// ─── 7. REGULATORY FORM M-7 A4 (МАТЕРИАЛЬНЫЙ АКТ ПРИЕМКИ) ─────────────────────

export interface FormatMaterialReceiptActM7Options {
	readonly clinicName?: string;
	readonly actNumber?: string;
	readonly actDate?: string;
	readonly commissionPresident?: string;
	readonly commissionMembers?: readonly string[];
	readonly storekeeperName?: string;
	readonly supplierDocumentNumber?: string;
	readonly supplierDocumentDate?: string;
}

/**
 * Formats a clean, statutory Russian Form M-7 / TORG-1 material receipt act (Акт о приемке материалов).
 * Adheres strictly to Mandate 8d p. 7: ZERO EMOJIS!
 */
export function formatMaterialReceiptActM7A4(
	order: PurchaseOrderRecord,
	options?: FormatMaterialReceiptActM7Options,
): string {
	const clinicName = options?.clinicName || 'ООО "ДЕНТЕ"';
	const actNumber = options?.actNumber || `М7-${order.id.replace(/^po-/, "")}`;
	const actDate = formatDateRu(options?.actDate || new Date().toISOString());
	const president = options?.commissionPresident || "Главный врач клиники";
	const members = options?.commissionMembers || ["Старшая медицинская сестра", "Заведующий складом"];
	const storekeeper = options?.storekeeperName || "Материально ответственное лицо";
	const docNum = options?.supplierDocumentNumber || `СФ-${order.id}`;
	const docDate = formatDateRu(options?.supplierDocumentDate || order.expectedDate);

	const sep = "=".repeat(80);
	const subSep = "-".repeat(80);

	// Aggregate good and rejected quantities across all receipts
	const goodQtyByLine = new Map<string, number>();
	const rejectedQtyByLine = new Map<string, number>();

	for (const receipt of order.receipts) {
		for (const rline of receipt.lines) {
			if (rline.quality === "good") {
				goodQtyByLine.set(
					rline.purchaseOrderLineId,
					(goodQtyByLine.get(rline.purchaseOrderLineId) ?? 0) + rline.quantityReceived,
				);
			} else {
				rejectedQtyByLine.set(
					rline.purchaseOrderLineId,
					(rejectedQtyByLine.get(rline.purchaseOrderLineId) ?? 0) + rline.quantityReceived,
				);
			}
		}
	}

	let totalOrderedUnits = 0;
	let totalGoodUnits = 0;
	let totalRejectedUnits = 0;
	let totalAcceptedKopecks = 0;

	const lineRows = order.lines.map((line, index) => {
		const num = String(index + 1).padStart(2, " ");
		const goodQty = goodQtyByLine.get(line.id) ?? line.quantityReceived;
		const rejectedQty = rejectedQtyByLine.get(line.id) ?? 0;
		const lineAcceptedKopecks = Math.round(goodQty * line.unitPriceKopecks);

		totalOrderedUnits += line.quantityOrdered;
		totalGoodUnits += goodQty;
		totalRejectedUnits += rejectedQty;
		totalAcceptedKopecks += lineAcceptedKopecks;

		const priceStr = formatKopecksToRublesRu(line.unitPriceKopecks);
		const sumStr = formatKopecksToRublesRu(lineAcceptedKopecks);

		return [
			` ${num}. ${line.itemName} (Код: ${line.inventoryItemId})`,
			`     Заказано: ${line.quantityOrdered} шт. | Принято годных: ${goodQty} шт. | Брак/дефект: ${rejectedQty} шт.`,
			`     Цена за ед.: ${priceStr} | Сумма принятого: ${sumStr}`,
		].join("\n");
	});

	const itemsSection = lineRows.length > 0 ? lineRows.join("\n\n") : " [Позиции отсутствуют]";
	const hasDiscrepancy = totalRejectedUnits > 0 || totalGoodUnits !== totalOrderedUnits;

	const conclusionText = hasDiscrepancy
		? `ВНИМАНИЕ: При приемке выявлены расхождения/дефекты. Принято годных: ${totalGoodUnits} шт., забраковано: ${totalRejectedUnits} шт. Составлена рекламация поставщику.`
		: "ЗАКЛЮЧЕНИЕ КОМИССИИ: Материалы поступили в полном объеме, надлежащего качества, дефектов и повреждений тары не обнаружено. Оприходовано на баланс склада.";

	return [
		sep,
		"               ТИПОВАЯ МЕЖОТРАСЛЕВАЯ ФОРМА № М-7 (ТОРГ-1)",
		"          Утверждена постановлением Госкомстата России от 30.10.97 № 71а",
		`                     АКТ О ПРИЕМКЕ МАТЕРИАЛОВ № ${actNumber}`,
		sep,
		`Организация-получатель:   ${clinicName}`,
		`Поставщик:                ${order.supplierName} (ID: ${order.supplierId})`,
		`Дата составления акта:    ${actDate}`,
		`Документ поставщика:      Накладная/УПД № ${docNum} от ${docDate}`,
		`Номер заказа (PO):        ${order.id}`,
		subSep,
		"СОСТАВ КОМИССИИ:",
		`Председатель комиссии:    ${president}`,
		`Члены комиссии:           ${members.join(", ")}`,
		subSep,
		"ВЕДОМОСТЬ ПРИНЯТЫХ МАТЕРИАЛОВ И РАСХОЖДЕНИЙ:",
		subSep,
		itemsSection,
		subSep,
		"ИТОГИ ПРИЕМКИ:",
		`Всего номенклатурных позиций:          ${order.lines.length}`,
		`Всего единиц по заказу:                ${totalOrderedUnits} шт.`,
		`Фактически принято годных (Good):      ${totalGoodUnits} шт.`,
		`Забраковано / дефект / бой (Rejected): ${totalRejectedUnits} шт.`,
		`Общая сумма принятых материалов:      ${formatKopecksToRublesRu(totalAcceptedKopecks)}`,
		subSep,
		conclusionText,
		sep,
		"ПОДПИСИ ЧЛЕНОВ КОМИССИИ:",
		"",
		`Председатель комиссии:     ____________________ / ${president} /`,
		"",
		...members.map((m) => `Член комиссии:             ____________________ / ${m} /`),
		"",
		`Материально ответственное`,
		`лицо (принял на склад):    ____________________ / ${storekeeper} /`,
		sep,
	].join("\n");
}

