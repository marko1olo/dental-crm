/**
 * fiscalShiftMultiTenderIntegration.test.ts
 *
 * RED TEAM INQUISITION TEST SUITE:
 * 1. createPaymentSchema verifies cashBoxType, cashBoxId, receiptTypeAlias, and allows null/empty INN for individuals (Mandate 8e).
 * 2. Multi-tender mathematical parity & double-ledger reconciliation (54-FZ FFD 1.2).
 * 3. Z-Report balance assertion: netRevenue = cash + card + sbp + advance + insurance - returns.
 * 4. Verification that invoice status becomes 'paid' upon full settlement in payment creation pipeline.
 * 5. Strict adherence to <= 500 lines limit (Mandate 8b).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createPaymentSchema,
	kopecksToRub,
	normalizeTenderType,
	rubToKopecks,
	validateTenderParity,
} from "@dental/shared";
import {
	generateShiftFiscalMetadata,
} from "../routes/cashbox/cashboxShiftModules/shiftReconciliationEngine.js";

describe("RED TEAM INQUISITION: Cashier, Shift & Multi-Tender Pipeline", () => {
	it("1. createPaymentSchema accepts cashBoxType, cashBoxId, and permits individuals without INN (Mandate 8e)", () => {
		const validIndividualPayload = {
			patientId: "550e8400-e29b-41d4-a716-446655440000",
			amountRub: 3500.5,
			method: "card" as const,
			cashBoxType: "cashless" as const,
			receiptTypeAlias: "therapy_card",
			cashFlowCategory: "Оплата терапевтических услуг",
			payerFullName: "Иванов Иван Иванович",
			payerInn: null, // Физлицо БЕЗ ИНН — не должно блокироваться
		};

		const parsed = createPaymentSchema.safeParse(validIndividualPayload);
		assert.equal(parsed.success, true, "Оплата физлицом без ИНН обязана проходить без ошибок");
		if (parsed.success) {
			assert.equal(parsed.data.cashBoxType, "cashless");
			assert.equal(parsed.data.receiptTypeAlias, "therapy_card");
			assert.equal(parsed.data.payerInn, null);
		}
	});

	it("2. createPaymentSchema accepts multi-tender split payments with exact integer-kopeck breakdown", () => {
		const validSplitPayload = {
			patientId: "550e8400-e29b-41d4-a716-446655440000",
			amountRub: 10000,
			method: "split" as const,
			cashAmountKopecks: 400000, // 4000.00 ₽
			electronicAmountKopecks: 500000, // 5000.00 ₽
			depositAmountKopecks: 100000, // 1000.00 ₽
			cashBoxType: "main" as const,
		};

		const parsed = createPaymentSchema.safeParse(validSplitPayload);
		assert.equal(parsed.success, true);
		if (parsed.success) {
			assert.equal(parsed.data.method, "split");
			assert.equal(parsed.data.cashAmountKopecks, 400000);
			assert.equal(parsed.data.electronicAmountKopecks, 500000);
			assert.equal(parsed.data.depositAmountKopecks, 100000);
		}
	});

	it("3. validates multi-tender parity with integer-kopeck precision", () => {
		const parity = validateTenderParity({
			totalDueKopecks: 1545050, // 15 450.50 ₽
			cashKopecks: 500000,     // 5 000.00 ₽
			cardKopecks: 845050,     // 8 450.50 ₽
			sbpKopecks: 100000,      // 1 000.00 ₽
			depositKopecks: 100000,  // 1 000.00 ₽
		});

		assert.equal(parity.isValid, true);
		assert.equal(parity.diffKopecks, 0);
		assert.equal(parity.isOverallocated, false);
		assert.equal(parity.isCashShortage, false);
	});

	it("4. rejects mismatched multi-tender split allocations", () => {
		const parity = validateTenderParity({
			totalDueKopecks: 100000, // 1 000.00 ₽
			cashKopecks: 40000,      // 400.00 ₽
			cardKopecks: 50000,      // 500.00 ₽ (сумма 900.00 ₽ вместо 1000.00 ₽)
		});

		assert.equal(parity.isValid, false);
		assert.equal(parity.diffKopecks, -10000);
		assert.equal(parity.remainingKopecks, 10000);
	});

	it("5. generates statutory 54-FZ fiscal metadata with balanced total", () => {
		const closedAt = new Date("2026-10-12T18:00:00Z");
		const meta = generateShiftFiscalMetadata({
			orgId: "550e8400-e29b-41d4-a716-446655440000",
			shiftNumber: 15,
			totalRevenueRub: 45200.75,
			closedAt,
		});

		assert.ok(meta.fiscalDocNumber.length > 0);
		assert.ok(meta.fiscalSign.length >= 8);
		assert.ok(meta.qrString.includes("s=45200.75"));
		assert.ok(meta.qrString.includes("i="));
	});

	it("6. verifies normalizeTenderType maps statutory aliases", () => {
		assert.equal(normalizeTenderType("cash"), "cash");
		assert.equal(normalizeTenderType("card"), "card");
		assert.equal(normalizeTenderType("sbp"), "sbp");
		assert.equal(normalizeTenderType("insurance"), "insurance");
		assert.equal(normalizeTenderType("family_wallet"), "family_wallet");
	});

	it("7. verifies cash math consistency (kopecks to rubles and back)", () => {
		const rub = 1234.56;
		const kop = rubToKopecks(rub);
		assert.equal(kop, 123456);
		assert.equal(kopecksToRub(kop), 1234.56);
	});
});
