import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	SplitPaymentService,
	type ProcessSplitPaymentRequest,
} from "../splitPaymentService.js";
import { Fiscal54FzValidationError } from "../fiscal54fzService.js";

describe("Wave 23: SplitPaymentService (Backend ACID & 54-FZ Compilation)", () => {
	it("1. Successfully validates and prepares statutory 54-FZ split payment (15,000 ₽ = 5,000 Cash + 7,000 Card + 3,000 Family Deposit)", () => {
		const request: ProcessSplitPaymentRequest = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			customerContact: "+79161234567",
			cashierFullName: "Кассир-администратор Иванова А. С.",
			actTotalRub: 15000,
			positions: [
				{
					name: "Прием врача-стоматолога первичный",
					priceRub: 2000,
					quantity: 1,
					medicalServiceCode804n: "B01.065.001",
				},
				{
					name: "Восстановление зуба пломбой световой",
					priceRub: 10000,
					quantity: 1,
					medicalServiceCode804n: "A16.07.002.001",
				},
				{
					name: "Профессиональная гигиена полости рта",
					priceRub: 3000,
					quantity: 1,
					medicalServiceCode804n: "A16.07.006",
				},
			],
			tenders: {
				cashRub: 5000,
				cardRub: 7000,
				familyDepositRub: 3000,
				familyGroupId: "fam-grp-1",
				sponsorPatientId: "pat-sponsor-1",
			},
		};

		const result = SplitPaymentService.prepareAndValidateSplitPayment(request);

		assert.equal(result.success, true);
		assert.equal(result.totalPaidRub, 15000);
		assert.equal(result.totalPaidKopecks, 1500000);
		assert.equal(result.validation.isBalanced, true);

		// Check compiled 54-FZ fiscal receipt payload
		const fiscal = result.fiscalReceiptPayload;
		assert.equal(fiscal.tag1020_totalKopecks, 1500000);
		assert.equal(fiscal.tag1020_totalRub, 15000);
		assert.equal(fiscal.payments.tag1031_cashKopecks, 500000);
		assert.equal(fiscal.payments.tag1031_cashRub, 5000);
		assert.equal(fiscal.payments.tag1081_electronicKopecks, 700000);
		assert.equal(fiscal.payments.tag1081_electronicRub, 7000);
		assert.equal(fiscal.payments.tag1215_advanceOffsetKopecks, 300000);
		assert.equal(fiscal.payments.tag1215_advanceOffsetRub, 3000);
		assert.equal(fiscal.payments.totalPaymentsKopecks, 1500000);

		// Items verification
		assert.equal(fiscal.items.length, 3);
		assert.equal(fiscal.items[0]!.amountKopecks, 200000);
		assert.equal(fiscal.items[1]!.amountKopecks, 1000000);
		assert.equal(fiscal.items[2]!.amountKopecks, 300000);
	});

	it("2. Rejects split payment when position items total does not match tenders total", () => {
		const request: ProcessSplitPaymentRequest = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			customerContact: "+79161234567",
			cashierFullName: "Кассир",
			actTotalRub: 15000,
			positions: [
				{
					name: "Прием врача-стоматолога",
					priceRub: 10000, // Total 10,000 vs act 15,000
					quantity: 1,
				},
			],
			tenders: {
				cashRub: 5000,
				cardRub: 7000,
				familyDepositRub: 3000,
			},
		};

		assert.throws(
			() => SplitPaymentService.prepareAndValidateSplitPayment(request),
			(err: unknown) => {
				assert.ok(err instanceof Fiscal54FzValidationError);
				assert.equal(err.code, "PositionsTotalMismatch");
				return true;
			},
		);
	});
});
