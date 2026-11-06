import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("RED TEAM INQUISITION: Finance POS & Pending Checkout Data Continuity", () => {
	const indexPath = path.resolve(__dirname, "../index.tsx");
	const hookPath = path.resolve(__dirname, "../useFinanceView.ts");
	const logicPath = path.resolve(__dirname, "../../../hooks/domains/useFinanceLogic.ts");
	const checkoutBarPath = path.resolve(__dirname, "../../../PaymentCheckoutBar.tsx");

	it("1. FinanceView index.tsx is purged of ClinicalRulePanel, ClinicalAiPersonalizePanel, and clinical accordion", () => {
		const source = fs.readFileSync(indexPath, "utf8");
		assert.ok(
			!source.includes("ClinicalRulePanel"),
			"ClinicalRulePanel must NOT be imported or rendered in FinanceView POS",
		);
		assert.ok(
			!source.includes("ClinicalAiPersonalizePanel"),
			"ClinicalAiPersonalizePanel must NOT be imported or rendered in FinanceView POS",
		);
		assert.ok(
			!source.includes("clinical-recommendations-accordion"),
			"clinical-recommendations-accordion must NOT exist in FinanceView POS",
		);
	});

	it("2. useFinanceView prioritizes pendingCheckout patient and billing summary over stale props", { timeout: 30000 }, async () => {
		const { resolveEffectivePatient, resolveEffectiveBillingSummary } = await import("../useFinanceView.js");

		const mockStalePatient = { id: "pat-stale", fullName: "Старый Пациент" };
		const mockPendingCheckout = {
			patientId: "pat-pending",
			patientName: "Свежий Пациент из Приёма",
			patientPhone: "+7 (999) 000-11-22",
			totalDueRub: 15400,
			services: [{ id: "srv-1" }],
		};

		// 1. Проверяем приоритет pendingCheckout над устаревшим documentPatient
		const patientWithPending = resolveEffectivePatient({
			pendingCheckout: mockPendingCheckout as any,
			documentPatient: mockStalePatient,
		});
		assert.strictEqual(patientWithPending?.id, "pat-pending", "pendingCheckout patient must take precedence");
		assert.strictEqual(patientWithPending?.fullName, "Свежий Пациент из Приёма");

		// 2. Fallback на documentPatient при отсутствии pendingCheckout
		const patientWithoutPending = resolveEffectivePatient({
			pendingCheckout: null,
			documentPatient: mockStalePatient,
		});
		assert.strictEqual(patientWithoutPending?.id, "pat-stale", "Must fallback to documentPatient when no pending checkout");

		// 3. Проверяем приоритет суммы pendingCheckout над устаревшим billingSummary
		const mockStaleBilling = { totalDueRub: 5000, totalPaidRub: 0 };
		const summaryWithPending = resolveEffectiveBillingSummary({
			pendingCheckout: mockPendingCheckout as any,
			billingSummary: mockStaleBilling,
		});
		assert.strictEqual(summaryWithPending?.totalDueRub, 15400, "pendingCheckout totalDueRub must take precedence");

		// 4. Fallback на billingSummary при отсутствии pendingCheckout
		const summaryWithoutPending = resolveEffectiveBillingSummary({
			pendingCheckout: null,
			billingSummary: mockStaleBilling,
		});
		assert.strictEqual(summaryWithoutPending?.totalDueRub, 5000, "Must fallback to billingSummary when no pending checkout");
	});

	it("3. onRecordPayment wrapper clears dente_pending_checkout from storage upon completion", () => {
		const source = fs.readFileSync(hookPath, "utf8");
		assert.ok(
			source.includes("handleRecordPayment"),
			"useFinanceView must wrap onRecordPayment in handleRecordPayment",
		);
		assert.ok(
			source.includes("sessionStorage.removeItem(\"dente_pending_checkout\")"),
			"handleRecordPayment must clear sessionStorage dente_pending_checkout",
		);
		assert.ok(
			source.includes("localStorage.removeItem(\"dente_pending_checkout\")"),
			"handleRecordPayment must clear localStorage dente_pending_checkout",
		);
		assert.ok(
			source.includes("setPendingCheckout(null)"),
			"handleRecordPayment must reset pendingCheckout state to null",
		);
	});

	it("4. useFinanceLogic injects Idempotency-Key in payment mutation headers", () => {
		const source = fs.readFileSync(logicPath, "utf8");
		assert.ok(
			source.includes('"Idempotency-Key": paymentClientMutationId'),
			"Billing payment API call must send client Idempotency-Key",
		);
		assert.ok(
			source.includes('"Idempotency-Key": familyClientMutationId'),
			"Family payment API call must send client Idempotency-Key",
		);
	});

	it("5. PaymentCheckoutBar provides Apple HIG 52px sticky touch target on mobile", () => {
		const source = fs.readFileSync(checkoutBarPath, "utf8");
		assert.ok(
			source.includes("min-h-[52px]"),
			"PaymentCheckoutBar primary button must have min-h-[52px] for mobile touch ergonomics",
		);
		assert.ok(
			source.includes("env(safe-area-inset-bottom)"),
			"PaymentCheckoutBar must support safe-area-inset-bottom for modern smartphones",
		);
	});
});
