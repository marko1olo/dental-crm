/**
 * types.ts — Layer 0: Purchase Order & Warehouse Receipt Domain Contracts.
 *
 * Strict Zod schemas, TypeScript types, and statutory dictionaries for
 * purchase orders, goods receipts, VAT rates, and stock thresholds.
 */

import { z } from "zod";
import type { ReorderSuggestion } from "../inventoryReorderEngine.js";

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

/** Alias for PurchaseOrderLineItem for clinical inventory domain parity */
export type PurchaseOrderItem = PurchaseOrderLineItem;

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

/** Options for calculating purchase order line totals */
export interface POLineTotalOptions {
	readonly priceIncludesVat?: boolean;
}

/** Parameters for generating a Purchase Order from ROP Reorder Suggestions */
export interface GeneratePurchaseOrderParams {
	readonly supplierId: string;
	readonly supplierName: string;
	readonly suggestions: readonly ReorderSuggestion[];
	readonly orderNumber?: string;
	readonly expectedDeliveryDate?: string;
	readonly defaultVatRate?: VatRate;
	readonly id?: string;
}

/** Receipt line item input */
export interface PurchaseReceiptLineInput {
	readonly lineId: string;
	readonly receivedQuantity: number;
}

/** Options for applying a warehouse purchase receipt */
export interface ApplyPurchaseReceiptOptions {
	readonly allowOverdraft?: boolean;
	readonly allowDraftReceipt?: boolean;
}

/** Result of applying a purchase receipt to a Purchase Order */
export interface ApplyPurchaseReceiptResult {
	readonly updatedOrder: PurchaseOrder;
	readonly isFullyReceived: boolean;
	readonly totalReceivedItems: number;
}

// ─── 3. DENTALPIN PROCUREMENT ADAPTER CONTRACTS ───────────────────────────────

export const procurementOrderStatusSchema = z.enum([
	"draft",
	"sent",
	"confirmed",
	"received",
	"cancelled",
]);
export type ProcurementOrderStatus = z.infer<typeof procurementOrderStatusSchema>;

export const PROCUREMENT_ORDER_STATUS_LABELS_RU: Record<ProcurementOrderStatus, string> = {
	draft: "Черновик",
	sent: "Отправлен поставщику",
	confirmed: "Подтвержден поставщиком",
	received: "Принят (завершен)",
	cancelled: "Отменен",
};

export const receiptQualityVerdictSchema = z.enum(["good", "rejected"]);
export type ReceiptQualityVerdict = z.infer<typeof receiptQualityVerdictSchema>;

export const purchaseOrderLineStatusSchema = z.enum([
	"unfulfilled",
	"partially_received",
	"fully_received",
	"over_received",
]);
export type PurchaseOrderLineStatus = z.infer<typeof purchaseOrderLineStatusSchema>;

export const PURCHASE_ORDER_LINE_STATUS_LABELS_RU: Record<PurchaseOrderLineStatus, string> = {
	unfulfilled: "Не выполнен",
	partially_received: "Частично принят",
	fully_received: "Полностью принят",
	over_received: "Принят с избытком",
};

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

export const purchaseReceiptLineSchema = z.object({
	id: z.string().min(1, "Receipt line ID is required"),
	purchaseOrderLineId: z.string().min(1, "Purchase order line ID is required"),
	inventoryItemId: z.string().min(1, "Inventory item ID is required"),
	quantityReceived: z.number().positive("Received quantity must be positive"),
	quality: receiptQualityVerdictSchema.default("good"),
});
export type PurchaseReceiptLine = z.infer<typeof purchaseReceiptLineSchema>;

export const purchaseReceiptSchema = z.object({
	id: z.string().min(1, "Receipt ID is required"),
	purchaseOrderId: z.string().min(1, "Purchase order ID is required"),
	receivedAt: z.string().min(1, "Received date is required"),
	receivedBy: z.string().nullable().optional(),
	lines: z.array(purchaseReceiptLineSchema),
});
export type PurchaseReceipt = z.infer<typeof purchaseReceiptSchema>;

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

export const RECEIVABLE_PROCUREMENT_STATUSES: readonly ProcurementOrderStatus[] = ["sent", "confirmed"];

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
	readonly allowOverdelivery?: boolean;
}

export interface ReceiveDeliveryBatchResult {
	readonly updatedOrder: PurchaseOrderRecord;
	readonly receipt: PurchaseReceipt;
	readonly fullyReceived: boolean;
	readonly totalGoodQuantity: number;
	readonly totalRejectedQuantity: number;
}

// ─── 4. THREE-WAY MATCHING & INVOICE CONTRACTS ───────────────────────────────

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
	readonly priceTolerancePercent?: number;
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

// ─── 5. REGULATORY REPORT CONTRACTS ──────────────────────────────────────────

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

// ─── 6. STOCK THRESHOLDS & SUPPLIER COMPARISON EXTENSIONS ─────────────────────

export interface StockThresholdConfig {
	readonly minStock: number;
	readonly maxStock: number;
	readonly safetyStock: number;
	readonly reorderPoint: number;
	readonly averageDailyConsumption: number;
	readonly leadTimeDays: number;
}

export interface ReorderThresholdStatus {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly currentStock: number;
	readonly reorderPoint: number;
	readonly isBelowThreshold: boolean;
	readonly suggestedQuantity: number;
	readonly urgency: "CRITICAL" | "STANDARD" | "OPTIMAL";
}

export interface SupplierPriceQuote {
	readonly supplierId: string;
	readonly supplierName: string;
	readonly supplierSku?: string;
	readonly priceKopecks: number;
	readonly currency?: "RUB" | "USD" | "EUR" | "CNY";
	readonly exchangeRateToRub?: number;
	readonly leadTimeDays?: number;
	readonly minOrderQuantity?: number;
	readonly vatRate?: VatRate;
}

export interface SupplierPriceComparisonResult {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly quotes: readonly SupplierPriceQuote[];
	readonly bestQuote: SupplierPriceQuote | null;
	readonly minPriceKopecks: number;
	readonly priceSpreadPercent: number;
}
