import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateAndResolvePaymentSplit } from "../paymentSplitValidation.js";

const TEST_PATIENT_ID = "00000000-0000-0000-0000-000000000001";

describe("Backend Payment Creation Pipeline Split Resolver", () => {
	it("resolves single cash payment", () => {
		const res = validateAndResolvePaymentSplit({
			patientId: TEST_PATIENT_ID,
			amountRub: 4500,
			method: "cash",
		});

		assert.equal(res.incomingPaymentKopecks, 450000);
		assert.equal(res.isSplit, false);
		assert.equal(res.isWarrantyOrFullDiscount, false);
	});

	it("resolves multi-tender split with cash and electronic components", () => {
		const res = validateAndResolvePaymentSplit({
			patientId: TEST_PATIENT_ID,
			amountRub: 10000,
			method: "split",
			cashAmountRub: 4000,
			electronicAmountRub: 6000,
		});

		assert.equal(res.isSplit, true);
		assert.equal(res.resolvedCashKop, 400000);
		assert.equal(res.resolvedElectronicKop, 600000);
	});

	it("resolves 100% warranty discount without throwing error on 0 rub", () => {
		const res = validateAndResolvePaymentSplit({
			patientId: TEST_PATIENT_ID,
			amountRub: 0,
			method: "card",
			discountPercent: 100,
		});

		assert.equal(res.incomingPaymentKopecks, 0);
		assert.equal(res.isWarrantyOrFullDiscount, true);
	});

	it("throws if split parts sum does not match total amount", () => {
		assert.throws(
			() => {
				validateAndResolvePaymentSplit({
					patientId: TEST_PATIENT_ID,
					amountRub: 5000,
					method: "split",
					cashAmountRub: 2000,
					electronicAmountRub: 2000, // 4000 != 5000
				});
			},
			(err: any) => err.message.includes("не совпадает с общей суммой"),
		);
	});
});
