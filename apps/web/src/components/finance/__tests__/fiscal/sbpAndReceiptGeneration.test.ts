/**
 * sbpAndReceiptGeneration.test.ts — SBP dynamic QR payload & receipt generation.
 * Mandate 8b: <= 120 lines.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseKopecks } from "@dental/shared";
import { generateFiscalReceipt54Fz, generateSbpPaymentQr } from "../../fiscalReceiptEngine.js";
import type { TreatmentPlanItem } from "../../../treatment-plans/types.js";

describe("Fiscal Receipt Engine — SBP QR & Receipt Generation", () => {
	it("generates valid NSPK SBP dynamic QR payload with CRC16 checksum", () => {
		const sbp = generateSbpPaymentQr({
			amountKopecks: parseKopecks(40000),
			orderNumber: "CHK-2026-99123",
			bankMemberId: "100000000111",
		});
		assert.ok(sbp.payloadUrl.startsWith("https://qr.nspk.ru/CHK202699123?type=02&bank=100000000111&sum=4000000&cur=RUB&crc="));
		assert.equal(sbp.crc16.length, 4);
		assert.ok(/^[0-9A-F]{4}$/.test(sbp.crc16));
	});

	it("generates full fiscal receipt with all mandatory requisites and OFD verification url", () => {
		const items: TreatmentPlanItem[] = [
			{
				id: "1",
				toothNumber: 16,
				code804n: "A16.07.002.001",
				name: "Кариес",
				category: "therapy",
				unitPriceRub: 4000,
				priceRub: 4000,
				discountRub: 0,
				quantity: 1,
				stageKind: "stage_1_therapy",
			},
		];
		const receipt = generateFiscalReceipt54Fz({
			items,
			splitPayment: { cardRub: 4000 },
			patientId: "pat-1",
			patientName: "Иванов Иван",
			customerContact: "+7 (999) 111-22-33",
			cashierFullName: "Сидорова А. П.",
			clinicLegalName: "ООО «ДЕНТЕ»",
		});

		assert.equal(receipt.totalRub, 4000);
		assert.equal(receipt.totalKopecks, 400000);
		assert.equal(receipt.operationType, "income");
		assert.equal(receipt.operationTypeName, "Приход");
		assert.ok(receipt.receiptNumber.startsWith("CHK-"));
		assert.ok(receipt.ofdUrl.startsWith("https://ofd.ru/check?fn="));
		assert.equal(receipt.payments.cardRub, 4000);
		assert.equal(receipt.payments.isFullyAllocated, true);
	});
});
