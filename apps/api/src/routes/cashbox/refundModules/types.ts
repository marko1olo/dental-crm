/**
 * apps/api/src/routes/cashbox/refundModules/types.ts
 * Contracts and transactional outcomes for cashbox refunds (54-FZ).
 */

import type { cashBoxes, cashOperations } from "../../../db/schema.js";

export type CashRefundMethod = "cash" | "card" | "sbp" | "advance_deposit" | "bank_transfer";

export interface ExecuteCashRefundParams {
	readonly cashBoxId?: string | undefined;
	readonly refundKop: number;
	readonly amountRub: number;
	readonly method?: CashRefundMethod | undefined;
	readonly reasonText?: string | undefined;
	readonly operatorId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly paymentId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly refundedItemIds?: readonly string[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly effectiveMutationId: string;
}

export type CashRefundTxResult =
	| {
			readonly kind: "replay";
			readonly operation: typeof cashOperations.$inferSelect | undefined;
			readonly cashBox: typeof cashBoxes.$inferSelect | undefined;
			readonly refundPaymentId: string;
			readonly queuedReceiptId: string | undefined;
			readonly fiscalReceiptNumber: string | null;
	  }
	| {
			readonly kind: "payment_not_found";
			readonly paymentId: string;
	  }
	| {
			readonly kind: "invoice_not_found";
			readonly invoiceId: string;
	  }
	| {
			readonly kind: "over_refund_forbidden";
			readonly availableRub: string;
			readonly requestedRub: string;
	  }
	| {
			readonly kind: "box_not_found";
	  }
	| {
			readonly kind: "insufficient_funds";
			readonly balanceBeforeKop: number;
			readonly requestedKop: number;
	  }
	| {
			readonly kind: "ok";
			readonly operation: typeof cashOperations.$inferSelect;
			readonly cashBox: typeof cashBoxes.$inferSelect;
			readonly refundPaymentId: string | undefined;
			readonly queuedReceiptId: string | undefined;
			readonly fiscalReceiptNumber: string | null;
	  };
