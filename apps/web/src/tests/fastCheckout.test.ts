import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
} from "../components/payments/checkout/fastCheckoutEngine";

describe("1-Click Fast Checkout & 54-FZ Split Engine", () => {
	it("should validate 100% SBP QR payment", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-001",
			totalBillKop: 1960000,
			payments: [{ method: "sbp_qr", amountKop: 1960000 }],
		});
		assert.equal(res.isValid, true);
		assert.equal(res.totalPaidKop, 1960000);
		assert.equal(res.remainingDueKop, 0);
	});

	it("should validate split payment: 50% deposit + 50% card", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-002",
			totalBillKop: 1000000,
			payments: [
				{ method: "patient_deposit", amountKop: 500000 },
				{ method: "bank_card", amountKop: 500000 },
			],
		});
		assert.equal(res.isValid, true);
		assert.equal(res.remainingDueKop, 0);
	});

	it("should calculate cash change correctly", () => {
		const res = validateCheckoutSplit({
			orderId: "CHK-003",
			totalBillKop: 380000,
			payments: [{ method: "cash", amountKop: 380000 }],
			cashTenderedKop: 500000,
		});
		assert.equal(res.isValid, true);
		assert.equal(res.cashChangeDueKop, 120000);
	});

	it("should generate 54-FZ FFD 1.2 payload with correct tags", () => {
		const payload = generate54FzFiscalPayload({
			orderId: "CHK-004",
			totalBillKop: 1000000,
			payments: [
				{ method: "cash", amountKop: 400000 },
				{ method: "bank_card", amountKop: 600000 },
			],
			patientPhone: "+79991234567",
		});
		assert.equal(payload.ffdVersion, "1.2");
		assert.equal(payload.totalSumKop, 1000000);
		assert.equal(payload.paymentsDistribution.cashKop, 400000);
		assert.equal(payload.paymentsDistribution.electronicKop, 600000);
		assert.equal(payload.clientContact, "+79991234567");
	});
});
