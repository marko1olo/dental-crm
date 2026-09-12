/**
 * purchaseOrdersEngine.ts — Procurement & Purchase Orders (PO) Engine.
 *
 * Wave 136 — Procurement Lifecycle, Delivery Receiving with Quality Verdicts & 3-Way Matching.
 *
 * Reference implementation adapted from DentalPin:
 * - backend/app/modules/purchase_orders/models.py
 * - backend/app/modules/purchase_orders/schemas.py
 * - backend/app/modules/purchase_orders/service.py
 *
 * INVARIANTS:
 * 1. Zero Mocks & Production Ready: Pure deterministic calculations and strict Zod contracts.
 * 2. Exact Kopecks Math (Mandate 8b): All monetary values stored and calculated in integer kopecks.
 * 3. Doctor & Clinic Autonomy (Mandates 8e, 8n): Scale sovereignty for solo doctor to multi-chair clinic.
 * 4. Zero Emojis (Mandate 8d p. 7): Clean printable Form M-7 / TORG-1 statutory documents.
 * 5. PO State Machine: draft -> sent -> confirmed -> (received | cancelled).
 * 6. Batch Receiving & Quality Verdicts: Good units fulfil lines; rejected units keep lines open.
 * 7. Three-Way Matching: Order (PO) vs Goods Receipt (GR) vs Supplier Invoice (Invoice).
 */

import { z } from "zod";

// ─── 1. ZOD SCHEMAS & TYPES ──────────────────────────────────────────────────

/** Purchase order lifecycle status matching DentalPin */
export const purchaseOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"confirmed",
	"received",
	"cancelled",
]);
export type PurchaseOrderStatus = z.infer<typeof purchaseOrderStatusSchema>;

/** Alias for unambiguous procurement domain imports */
export const procurementOrderStatusSchema = purchaseOrderStatusSchema;
export type ProcurementOrderStatus = PurchaseOrderStatus;

/** Russian labels for purchase order statuses */
export const PURCHASE_ORDER_STATUS_LABELS_RU: Record<PurchaseOrderStatus, string> = {
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

/** Single line item on a purchase order */
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
	status: purchaseOrderStatusSchema,
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

// ─── 2. STATE MACHINE & STATUS TRANSITIONS ───────────────────────────────────

/** Allowed transitions matching DentalPin service.py */
export const ALLOWED_PROCUREMENT_PO_TRANSITIONS: Record<
	PurchaseOrderStatus,
	readonly PurchaseOrderStatus[]
> = {
	draft: ["sent", "cancelled"],
	sent: ["draft", "confirmed", "cancelled"],
	confirmed: ["cancelled"],
	received: [],
	cancelled: [],
};

/** Statuses in which goods delivery batches can be received */
export const RECEIVABLE_PROCUREMENT_STATUSES: readonly PurchaseOrderStatus[] = ["sent", "confirmed"];

/**
 * Validates whether a purchase order status transition is allowed.
 */
export function validatePurchaseOrderStatusTransition(
	fromStatus: PurchaseOrderStatus,
	toStatus: PurchaseOrderStatus,
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
	toStatus: PurchaseOrderStatus,
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

// ─── 3. PO CREATION & HELPERS ────────────────────────────────────────────────

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

// ─── 4. DELIVERY BATCH RECEIVING & QUALITY VERDICTS ──────────────────────────

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
 *
 * Business Rules (DentalPin adapter):
 * 1. Order status must be receivable ('sent' or 'confirmed').
 * 2. Only 'good' units increment `line.quantityReceived` and increase stock/value.
 * 3. 'rejected' units are recorded in the receipt audit trail but DO NOT increase
 *    `line.quantityReceived`, keeping the line open for a replacement delivery.
 * 4. When every line is fulfilled (`quantityReceived >= quantityOrdered` with good units),
 *    the order status automatically transitions to 'received'.
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

	const nextStatus: PurchaseOrderStatus = fullyReceived ? "received" : order.status;

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

// ─── 5. THREE-WAY MATCHING (3-WAY MATCHING ENGINE) ───────────────────────────

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
 *
 * Detects:
 * - Price discrepancies between PO unit price and invoice unit price.
 * - Quantity discrepancies between physically received goods (GR) and invoiced quantity.
 * - Missing items present in invoice but never ordered or received.
 * - Overall net monetary variance.
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

// ─── 6. REGULATORY FORM M-7 A4 (МАТЕРИАЛЬНЫЙ АКТ ПРИЕМКИ) ─────────────────────

function formatKopecksToRublesRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return "0,00 руб.";
	const rubles = Math.floor(Math.abs(kopecks) / 100);
	const remKopecks = Math.round(Math.abs(kopecks) % 100);
	const rublesStr = rubles.toLocaleString("ru-RU");
	const kopecksStr = String(remKopecks).padStart(2, "0");
	const sign = kopecks < 0 ? "-" : "";
	return `${sign}${rublesStr},${kopecksStr} руб.`;
}

function formatDateRu(isoString?: string | null): string {
	if (!isoString) return "Не указана";
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
 *
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
