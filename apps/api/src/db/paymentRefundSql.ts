/**
 * paymentRefundSql.ts — Canonical Drizzle SQL predicates & expressions for `payments` refund handling.
 *
 * Mirrors `packages/shared/src/finance/paymentRefundNormalization.ts` so PostgreSQL aggregations
 * handle all 3 refund formats identically:
 *   1. Negative counter-entry (`status = 'refunded'` and `amount_kopecks < 0`)
 *   2. Explicit refund metadata or negative amount on `paid` (`amount_kopecks < 0` / `amount_rub < 0` /
 *      `fiscal_receipt->>'operationType' = 'income_return'` / `fiscal_receipt->>'type' in (...)`)
 *   3. Standalone positive `status = 'refunded'` (excluding `refundedInPlace = true`)
 */

import { sql, type SQL } from "drizzle-orm";
import { payments } from "./schema.js";

const SQL_KOPECKS_PER_RUBLE = 100;

/**
 * Exact non-negative integer kopecks expression (`bigint`) preferring non-zero `amount_kopecks`
 * and falling back to `round(amount_rub * 100)` for legacy rows.
 */
export function paymentAbsKopecksSql(): SQL<number> {
	return sql<number>`abs(case when ${payments.amountKopecks} is not null and ${payments.amountKopecks} <> 0 then ${payments.amountKopecks}::bigint else round(coalesce(${payments.amountRub}, 0)::numeric * ${SQL_KOPECKS_PER_RUBLE})::bigint end)::bigint`;
}

/**
 * Exact non-negative legacy ruble expression (for queries selecting separate exact/legacy buckets).
 */
export function paymentAbsRubSql(): SQL<number> {
	return sql<number>`abs(coalesce(${payments.amountRub}, 0))`;
}

/**
 * SQL predicate identifying whether a `payments` row is a refund across all 3 formats.
 */
export function isPaymentRefundFlowSql(): SQL {
	return sql`(
		${payments.status} = 'refunded'
		or coalesce(${payments.amountKopecks}, 0) < 0
		or coalesce(${payments.amountRub}, 0) < 0
		or lower(coalesce(${payments.fiscalReceipt}->>'operationType', '')) in ('income_return', 'refund')
		or lower(coalesce(${payments.fiscalReceipt}->>'type', '')) in ('refund', 'income_return', 'advance_refund', 'return', 'refund_correction')
	)`;
}

/**
 * SQL predicate identifying an in-place voided/refunded payment tagged `refundedInPlace = true`.
 */
export function isPaymentInPlaceRefundedSql(): SQL {
	return sql`(${payments.status} = 'refunded' and coalesce((${payments.fiscalReceipt}->>'refundedInPlace')::boolean, false) = true)`;
}

/**
 * SQL predicate matching true income payment rows (excluding refunds and in-place reversals).
 */
export function isIncomePaymentRowSql(): SQL {
	return sql`(${payments.status} = 'paid' and not (${isPaymentRefundFlowSql()}))`;
}

/**
 * Signed flow multiplier (`+1` for income payments, `-1` for refunds, `0` for ignored/in-place voided).
 */
export function paymentFlowSignSql(): SQL<number> {
	return sql<number>`(case when ${payments.status} not in ('paid', 'refunded') then 0 when ${isPaymentInPlaceRefundedSql()} then 0 when ${isPaymentRefundFlowSql()} then -1 else 1 end)`;
}

/**
 * Signed integer kopecks (`bigint`) for period flow / revenue / doctor profitability queries.
 */
export function paymentSignedFlowKopecksSql(): SQL<number> {
	return sql<number>`(case when ${payments.status} not in ('paid', 'refunded') then 0::bigint when ${isPaymentInPlaceRefundedSql()} then 0::bigint when ${isPaymentRefundFlowSql()} then -${paymentAbsKopecksSql()} else ${paymentAbsKopecksSql()} end)::bigint`;
}

/**
 * Signed legacy ruble amount (`numeric`) for legacy rows where `amount_kopecks` is null or 0.
 */
export function paymentSignedLegacyFlowRubSql(): SQL<number> {
	return sql<number>`(case when (${payments.amountKopecks} is null or ${payments.amountKopecks} = 0) then (case when ${payments.status} not in ('paid', 'refunded') then 0 when ${isPaymentInPlaceRefundedSql()} then 0 when ${isPaymentRefundFlowSql()} then -${paymentAbsRubSql()} else ${paymentAbsRubSql()} end) else 0 end)`;
}

/**
 * Exact integer kopecks (`bigint`) when `amount_kopecks` is populated, else 0 (to pair with legacy ruble fallback).
 */
export function paymentSignedExactFlowKopecksSql(): SQL<number> {
	return sql<number>`(case when ${payments.amountKopecks} is not null and ${payments.amountKopecks} <> 0 then ${paymentSignedFlowKopecksSql()} else 0::bigint end)::bigint`;
}
