/**
 * purchaseOrdersEngine.ts — Transparent Facade over canonical SSOT warehouse/purchaseOrderEngine.ts.
 *
 * Implements Mandate 8s (Law of Single Undivided Authority).
 * Consolidated all procurement state machine, 3-way matching, delivery batch receiving,
 * and Form M-7 printing inside packages/shared/src/warehouse/purchaseOrderEngine.ts.
 *
 * @see {@link ../warehouse/purchaseOrderEngine.ts}
 */

export * from "../warehouse/purchaseOrderEngine.js";

// Alias lowercase procurement status schema as purchaseOrderStatusSchema for legacy inventory callers
export {
	procurementOrderStatusSchema as purchaseOrderStatusSchema,
	type ProcurementOrderStatus as PurchaseOrderStatus,
	PROCUREMENT_ORDER_STATUS_LABELS_RU as PURCHASE_ORDER_STATUS_LABELS_RU,
} from "../warehouse/purchaseOrderEngine.js";

