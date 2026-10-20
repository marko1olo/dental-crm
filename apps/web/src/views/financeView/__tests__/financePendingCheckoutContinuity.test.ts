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

	it("2. useFinanceView prioritizes pendingCheckout patient and billing summary over stale props", () => {
		const source = fs.readFileSync(hookPath, "utf8");
		// pendingCheckout must be checked before documentPatient fallback in effectivePatient
		const patientMatch = source.indexOf("if (pendingCheckout?.patientId)");
		const docPatientFallback = source.indexOf("if (documentPatient) return documentPatient;");
		assert.ok(patientMatch !== -1, "effectivePatient must check pendingCheckout?.patientId");
		assert.ok(docPatientFallback !== -1, "effectivePatient must have documentPatient fallback");
		assert.ok(
			patientMatch < docPatientFallback,
			"pendingCheckout must take precedence over stale documentPatient in effectivePatient",
		);

		// pendingCheckout must be checked before billingSummary in effectiveBillingSummary
		const billingSummaryPendingMatch = source.indexOf("if (pendingCheckout?.totalDueRub && pendingCheckout.totalDueRub > 0)");
		const billingSummaryFallback = source.indexOf("if (billingSummary && billingSummary.totalDueRub > 0) return billingSummary;");
		assert.ok(billingSummaryPendingMatch !== -1, "effectiveBillingSummary must check pendingCheckout");
		assert.ok(billingSummaryFallback !== -1, "effectiveBillingSummary must check billingSummary");
		assert.ok(
			billingSummaryPendingMatch < billingSummaryFallback,
			"pendingCheckout.totalDueRub must take precedence over stale billingSummary",
		);
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
