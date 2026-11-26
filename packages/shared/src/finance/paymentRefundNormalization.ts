/**
 * paymentRefundNormalization.ts — Single Source of Truth for Payment & Refund Accounting.
 *
 * Unifies the 3 historical/incompatible refund representations across `payments` and DTOs:
 *   1. Negative counter-entry (`status: "refunded"` with `amountKopecks < 0` / `amountRub < 0`).
 *   2. Explicit refund marker or negative payment (`type: "refund" | "income_return" | "advance_refund"`,
 *      `fiscalReceipt.operationType === "income_return"`, OR `status: "paid"` with `amountKopecks < 0`).
 *   3. Positive in-place/standalone `status: "refunded"` (`amountKopecks > 0` / `amountRub > 0`).
 *
 * All calculations run strictly in `bigint` integer kopecks via `money.ts` without floating-point arithmetic.
 * (Mandates 8bm, 8bo, 8e)
 */

import { kopecksToNumericString, kopecksToRub, parseKopecks } from "../money.js";

export type PaymentRefundAccountingMode = "flow" | "ledger";

export type PaymentFlowKind = "payment" | "refund" | "ignored";

export interface PaymentRefundRecordLike {
	readonly status?: string | null | undefined;
	readonly type?: string | null | undefined;
	readonly operationType?: string | null | undefined;
	readonly amountKopecks?: bigint | number | string | null | undefined;
	readonly amountRub?: number | string | null | undefined;
	readonly fiscalReceipt?: unknown;
}

export interface NormalizedPaymentFlow {
	readonly kind: PaymentFlowKind;
	readonly isRefund: boolean;
	readonly absKopecks: bigint;
	readonly signedKopecks: bigint;
}

export interface PaymentFlowSummaryBigInt {
	readonly paidKopecks: bigint;
	readonly refundedKopecks: bigint;
	readonly netKopecks: bigint;
	readonly paidCount: number;
	readonly refundCount: number;
}

export interface CanonicalRefundPaymentAmounts {
	readonly status: "refunded";
	readonly amountKopecks: bigint;
	readonly amountRub: number;
	readonly amountRubString: string;
}

const IGNORED_PAYMENT_STATUSES = new Set(["planned", "voided", "cancelled", "canceled"]);
const EXPLICIT_REFUND_TYPES = new Set([
	"refund",
	"income_return",
	"advance_refund",
	"return",
	"refund_correction",
]);

function readRecordStringField(source: unknown, field: string): string | null {
	if (typeof source !== "object" || source === null || Array.isArray(source)) {
		return null;
	}
	const descriptor = Object.getOwnPropertyDescriptor(source, field);
	const value = descriptor?.value;
	if (typeof value !== "string") return null;
	const trimmed = value.trim().toLowerCase();
	return trimmed.length > 0 ? trimmed : null;
}

function readRecordBooleanField(source: unknown, field: string): boolean {
	if (typeof source !== "object" || source === null || Array.isArray(source)) {
		return false;
	}
	const descriptor = Object.getOwnPropertyDescriptor(source, field);
	return descriptor?.value === true;
}

/**
 * Extracts signed integer kopecks as `bigint` from a payment row or DTO.
 * Prefers non-zero `amountKopecks`, falling back to `amountRub` via `parseKopecks`.
 */
export function resolveRawPaymentSignedKopecksBigInt(row: PaymentRefundRecordLike): bigint {
	const rawKop = row.amountKopecks;
	if (typeof rawKop === "bigint" && rawKop !== 0n) {
		return rawKop;
	}
	if (typeof rawKop === "number" && Number.isFinite(rawKop) && rawKop !== 0) {
		return BigInt(Number.isInteger(rawKop) ? rawKop : Math.round(rawKop));
	}
	if (typeof rawKop === "string") {
		const trimmed = rawKop.trim();
		if (/^-?\d+$/.test(trimmed)) {
			const parsedBig = BigInt(trimmed);
			if (parsedBig !== 0n) {
				return parsedBig;
			}
		}
	}

	if (row.amountRub !== null && row.amountRub !== undefined && row.amountRub !== "") {
		return BigInt(parseKopecks(row.amountRub));
	}
	return 0n;
}

/**
 * Checks whether metadata (`type`, `operationType`, or `fiscalReceipt`) marks the record as a refund.
 */
export function hasExplicitRefundMetadata(row: PaymentRefundRecordLike): boolean {
	const rowType = row.type?.trim().toLowerCase();
	if (rowType && EXPLICIT_REFUND_TYPES.has(rowType)) {
		return true;
	}
	const rowOpType = row.operationType?.trim().toLowerCase();
	if (rowOpType && EXPLICIT_REFUND_TYPES.has(rowOpType)) {
		return true;
	}
	const receiptOp = readRecordStringField(row.fiscalReceipt, "operationType");
	if (receiptOp && EXPLICIT_REFUND_TYPES.has(receiptOp)) {
		return true;
	}
	const receiptType = readRecordStringField(row.fiscalReceipt, "type");
	if (receiptType && EXPLICIT_REFUND_TYPES.has(receiptType)) {
		return true;
	}
	return false;
}

/**
 * Canonical predicate identifying whether a payment row or DTO represents a refund
 * across all 3 formats (`status: "refunded"`, `type: "refund"/"income_return"`, or negative amount).
 * Returns false for `planned` / `voided` / `cancelled` rows.
 */
export function isPaymentRefundRecord(row: PaymentRefundRecordLike): boolean {
	const status = (row.status ?? "paid").trim().toLowerCase();
	if (IGNORED_PAYMENT_STATUSES.has(status)) {
		return false;
	}
	if (status === "refunded" || hasExplicitRefundMetadata(row)) {
		return true;
	}
	return resolveRawPaymentSignedKopecksBigInt(row) < 0n;
}

/**
 * Classifies a payment record into canonical `payment` (+), `refund` (-), or `ignored` (0n).
 *
 * - `"flow"` mode (revenue, cashflow, doctor payroll deductions):
 *   every refund representation (`status: "refunded"`, negative amount, `type: "refund"`, `income_return`)
 *   produces `{ kind: "refund", signedKopecks: -absKopecks }`.
 * - `"ledger"` mode (patient balance, invoice reconciliation, debt reports, tax deduction):
 *   negative amounts (`amountKopecks < 0`), counter-entries, and explicit refund rows deduct (`-absKopecks`),
 *   while positive `status: "refunded"` rows without explicit refund metadata represent in-place
 *   cancelled/voided original charges and contribute `0n` (avoiding double-counting debt).
 */
export function classifyPaymentFlowRecord(
	row: PaymentRefundRecordLike,
	mode: PaymentRefundAccountingMode = "flow",
): NormalizedPaymentFlow {
	const status = (row.status ?? "paid").trim().toLowerCase();
	if (IGNORED_PAYMENT_STATUSES.has(status)) {
		return { kind: "ignored", isRefund: false, absKopecks: 0n, signedKopecks: 0n };
	}

	const rawSignedKop = resolveRawPaymentSignedKopecksBigInt(row);
	const absKop = rawSignedKop < 0n ? -rawSignedKop : rawSignedKop;
	const explicitRefundMeta = hasExplicitRefundMetadata(row);

	if (absKop === 0n) {
		return {
			kind: "ignored",
			isRefund: status === "refunded" || explicitRefundMeta,
			absKopecks: 0n,
			signedKopecks: 0n,
		};
	}

	if (explicitRefundMeta || rawSignedKop < 0n) {
		return {
			kind: "refund",
			isRefund: true,
			absKopecks: absKop,
			signedKopecks: -absKop,
		};
	}

	if (status === "refunded") {
		if (mode === "ledger" || readRecordBooleanField(row.fiscalReceipt, "refundedInPlace")) {
			return {
				kind: "ignored",
				isRefund: true,
				absKopecks: absKop,
				signedKopecks: 0n,
			};
		}
		return {
			kind: "refund",
			isRefund: true,
			absKopecks: absKop,
			signedKopecks: -absKop,
		};
	}

	if (status === "paid") {
		return {
			kind: "payment",
			isRefund: false,
			absKopecks: absKop,
			signedKopecks: absKop,
		};
	}

	return { kind: "ignored", isRefund: false, absKopecks: 0n, signedKopecks: 0n };
}

/**
 * Convenience helper returning the exact signed `bigint` kopecks contribution of a payment row.
 */
export function resolvePaymentNetSignedKopecksBigInt(
	row: PaymentRefundRecordLike,
	mode: PaymentRefundAccountingMode = "ledger",
): bigint {
	return classifyPaymentFlowRecord(row, mode).signedKopecks;
}

/**
 * Aggregates paid, refunded, and net kopecks strictly in `bigint` across a collection of payment rows.
 */
export function sumPaymentFlowBigInt(
	rows: readonly PaymentRefundRecordLike[],
	mode: PaymentRefundAccountingMode = "flow",
): PaymentFlowSummaryBigInt {
	let paidKopecks = 0n;
	let refundedKopecks = 0n;
	let paidCount = 0;
	let refundCount = 0;

	for (const row of rows) {
		const classified = classifyPaymentFlowRecord(row, mode);
		if (classified.kind === "payment") {
			paidKopecks += classified.absKopecks;
			paidCount += 1;
		} else if (classified.kind === "refund") {
			refundedKopecks += classified.absKopecks;
			refundCount += 1;
		}
	}

	return {
		paidKopecks,
		refundedKopecks,
		netKopecks: paidKopecks - refundedKopecks,
		paidCount,
		refundCount,
	};
}

/**
 * Canonical builder for writing new counter-entry refund rows into `payments`.
 * Guarantees negative `amountKopecks` (< 0n), negative `amountRub`, and `status: "refunded"`.
 */
export function buildCanonicalRefundPaymentAmounts(
	refundKopecksInput: bigint | number,
): CanonicalRefundPaymentAmounts {
	const rawKop =
		typeof refundKopecksInput === "bigint"
			? refundKopecksInput
			: BigInt(Math.round(refundKopecksInput));
	const absKop = rawKop < 0n ? -rawKop : rawKop;
	if (absKop <= 0n) {
		throw new Error("Сумма возврата должна быть больше 0 копеек");
	}
	const negativeKop = -absKop;
	return {
		status: "refunded",
		amountKopecks: negativeKop,
		amountRub: kopecksToRub(negativeKop),
		amountRubString: kopecksToNumericString(negativeKop),
	};
}
