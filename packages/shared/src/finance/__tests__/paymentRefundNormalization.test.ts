import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildCanonicalRefundPaymentAmounts,
	classifyPaymentFlowRecord,
	isPaymentRefundRecord,
	resolvePaymentNetSignedKopecksBigInt,
	sumPaymentFlowBigInt,
} from "../paymentRefundNormalization.js";

describe("paymentRefundNormalization — canonical 3-format refund unification (BigInt)", () => {
	it("1. Recognizes all 3 refund formats consistently in isPaymentRefundRecord & classifyPaymentFlowRecord (flow mode)", () => {
		// Format 1: Negative counter-entry (cashbox/advance/family canonical write)
		const fmt1 = { status: "refunded", amountKopecks: -50025n, amountRub: "-500.25" };
		// Format 2a: Explicit type/operationType refund marker
		const fmt2Type = { status: "paid", type: "refund", amountKopecks: 50025n };
		// Format 2b: Fiscal receipt income_return marker
		const fmt2Fiscal = {
			status: "paid",
			amountKopecks: 50025n,
			fiscalReceipt: { operationType: "income_return" },
		};
		// Format 2c: Negative amountKopecks on paid row
		const fmt2NegativePaid = { status: "paid", amountKopecks: -50025n };
		// Format 3: Positive status = "refunded" (standalone/historical)
		const fmt3PositiveRefunded = { status: "refunded", amountKopecks: 50025n, amountRub: "500.25" };

		for (const row of [fmt1, fmt2Type, fmt2Fiscal, fmt2NegativePaid, fmt3PositiveRefunded]) {
			assert.equal(isPaymentRefundRecord(row), true);
			const flow = classifyPaymentFlowRecord(row, "flow");
			assert.equal(flow.kind, "refund");
			assert.equal(flow.isRefund, true);
			assert.equal(flow.absKopecks, 50025n);
			assert.equal(flow.signedKopecks, -50025n);
		}
	});

	it("2. Computes identical flow net kopecks for all 3 refund representations paired with a payment", () => {
		const originalPayment = { status: "paid", amountKopecks: 125050n, amountRub: "1250.50" };

		const flow1 = sumPaymentFlowBigInt(
			[originalPayment, { status: "refunded", amountKopecks: -50025n }],
			"flow",
		);
		const flow2 = sumPaymentFlowBigInt(
			[originalPayment, { status: "paid", type: "refund", amountKopecks: 50025n }],
			"flow",
		);
		const flow3 = sumPaymentFlowBigInt(
			[originalPayment, { status: "paid", amountKopecks: -50025n }],
			"flow",
		);
		const flow4 = sumPaymentFlowBigInt(
			[originalPayment, { status: "refunded", amountKopecks: 50025n }],
			"flow",
		);

		for (const summary of [flow1, flow2, flow3, flow4]) {
			assert.equal(summary.paidKopecks, 125050n);
			assert.equal(summary.refundedKopecks, 50025n);
			assert.equal(summary.netKopecks, 75025n);
			assert.equal(summary.paidCount, 1);
			assert.equal(summary.refundCount, 1);
		}
	});

	it("3. Handles ledger mode cleanly: negative & explicit refunds deduct, while in-place positive refunded contributes 0n", () => {
		// Counter-entry refund paired with original paid
		assert.equal(
			resolvePaymentNetSignedKopecksBigInt({ status: "paid", amountKopecks: 50000n }, "ledger") +
				resolvePaymentNetSignedKopecksBigInt({ status: "refunded", amountKopecks: -50000n }, "ledger"),
			0n,
		);
		// Negative paid reversal paired with original paid
		assert.equal(
			resolvePaymentNetSignedKopecksBigInt({ status: "paid", amountKopecks: 50000n }, "ledger") +
				resolvePaymentNetSignedKopecksBigInt({ status: "paid", amountKopecks: -20000n }, "ledger"),
			30000n,
		);
		// Explicit type="refund" with positive amount deducts in ledger
		assert.equal(
			resolvePaymentNetSignedKopecksBigInt({ status: "paid", type: "refund", amountKopecks: 20000n }, "ledger"),
			-20000n,
		);
		// In-place flipped original receipt (status="refunded", positive amount, no explicit refund metadata) -> 0n
		assert.equal(
			resolvePaymentNetSignedKopecksBigInt({ status: "refunded", amountRub: "500.00" }, "ledger"),
			0n,
		);
		// In-place flagged row -> 0n even in flow mode
		assert.equal(
			resolvePaymentNetSignedKopecksBigInt(
				{ status: "refunded", amountKopecks: 50000n, fiscalReceipt: { refundedInPlace: true } },
				"flow",
			),
			0n,
		);
	});

	it("4. Preserves exact BigInt arithmetic above Number.MAX_SAFE_INTEGER and builds canonical negative refunds", () => {
		const hugePaid = 9007199254740993n;
		const hugeRefund = 1000000000000001n;
		const summary = sumPaymentFlowBigInt(
			[
				{ status: "paid", amountKopecks: hugePaid },
				{ status: "refunded", amountKopecks: -hugeRefund },
			],
			"flow",
		);
		assert.equal(summary.netKopecks, 8007199254740992n);

		const canonical = buildCanonicalRefundPaymentAmounts(50025n);
		assert.equal(canonical.status, "refunded");
		assert.equal(canonical.amountKopecks, -50025n);
		assert.equal(canonical.amountRub, -500.25);
		assert.equal(canonical.amountRubString, "-500.25");

		// Also ignores planned/voided/cancelled rows
		assert.equal(isPaymentRefundRecord({ status: "voided", amountKopecks: -10000n }), false);
		assert.equal(resolvePaymentNetSignedKopecksBigInt({ status: "planned", amountKopecks: 10000n }, "flow"), 0n);
	});
});
