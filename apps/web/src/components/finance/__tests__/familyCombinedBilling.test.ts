import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	compileFamilyBillingDraft,
	calculateSbpMultiTenderSplit,
	resolveDentalTaxDeductionCategory,
	generateDynamicSbpQrPayload,
	type CombinedFamilyBillingDraft,
} from "@dental/shared";

describe("Web Finance: Family Combined Billing & Dynamic SBP QR Multi-Tender 54-FZ", () => {
	it("1.1 Dynamic SBP QR generation produces valid CRC16 and NSPK URL format", () => {
		const sbp = generateDynamicSbpQrPayload({
			sumRub: 14500,
			orderId: "FAM-9981",
			clinicName: "ООО ДЕНТЕ СТОМАТОЛОГИЯ",
			purpose: "Оплата стоматологических услуг семьи",
		});

		assert.equal(sbp.sumRub, 14500);
		assert.equal(sbp.sumKopecks, 1450000);
		assert.ok(sbp.nspkUrl.startsWith("https://qr.nspk.ru/"));
		assert.ok(sbp.nspkUrl.includes("sum=1450000"));
		assert.ok(sbp.nspkUrl.includes("cur=RUB"));
		assert.equal(typeof sbp.crc16Hex, "string");
		assert.equal(sbp.crc16Hex.length, 4);
		assert.ok(sbp.emvPayload.includes("ru.nspk.sbp"));
	});

	it("1.2 Multi-tender split with family wallet and SBP QR matches exact kopecks", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 52000,
			depositAvailableRub: 20000,
			orderId: "FAM-CHK-1",
			clinicName: "ДЕНТЕ",
		});

		// Total: 52 000 ₽ (5 200 000 kop)
		assert.equal(split.totalAmountRub, 52000);
		assert.equal(split.totalAmountKopecks, 5200000);

		// Tag 1215: 20 000 ₽
		assert.equal(split.depositOffsetRub, 20000);
		assert.equal(split.depositOffsetKopecks, 2000000);

		// Tag 1081: 32 000 ₽
		assert.equal(split.sbpChargeRub, 32000);
		assert.equal(split.sbpChargeKopecks, 3200000);

		// Dynamic QR generated for exact remainder
		assert.ok(split.sbpQr !== null);
		assert.equal(split.sbpQr?.sumRub, 32000);
		assert.equal(split.sbpQr?.sumKopecks, 3200000);
		assert.ok(split.sbpQr?.nspkUrl.includes("sum=3200000"));
	});

	it("1.3 Tax deduction categorization separates Code 01 and Code 02 with full precision", () => {
		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "pat-parent-1",
				payerFullName: "Кузнецов Владимир Петрович",
				payerInn: "770199887766",
				payerPhone: "+7 (916) 123-45-67",
			},
			familyGroupName: "Семья Кузнецовых",
			availableFamilyWalletRub: 5000,
			items: [
				{
					id: "item-1",
					patientId: "pat-parent-1",
					patientFullName: "Кузнецов Владимир Петрович",
					relationship: "self",
					serviceName: "Дентальная имплантация Astra Tech",
					code804n: "A16.07.054",
					toothNumber: 46,
					priceRub: 55000,
					quantity: 1,
					taxDeductionCategory: resolveDentalTaxDeductionCategory("Дентальная имплантация Astra Tech", "A16.07.054"),
				},
				{
					id: "item-2",
					patientId: "pat-child-1",
					patientFullName: "Кузнецова Алина Владимировна",
					relationship: "child",
					serviceName: "Лечение пульпита молочного зуба с пломбированием",
					code804n: "A16.07.002",
					toothNumber: 74,
					priceRub: 6800,
					quantity: 1,
					taxDeductionCategory: resolveDentalTaxDeductionCategory("Лечение пульпита", "A16.07.002"),
				},
			],
		};

		const result = compileFamilyBillingDraft(draft);

		assert.equal(result.totalAmountRub, 61800);
		assert.equal(result.code02TotalRub, 55000);
		assert.equal(result.code01TotalRub, 6800);
		assert.equal(result.membersCount, 2);

		// Certificates for tax deduction (KND 1151156)
		assert.equal(result.taxDeductionCertificates.length, 2);

		const parentCert = result.taxDeductionCertificates.find((c) => c.patientFnsCode === "1")!;
		assert.equal(parentCert.code02TotalRub, 55000);
		assert.equal(parentCert.code01TotalRub, 0);

		const childCert = result.taxDeductionCertificates.find((c) => c.patientFnsCode === "4")!;
		assert.equal(childCert.code01TotalRub, 6800);
		assert.equal(childCert.code02TotalRub, 0);

		// Split calculation
		assert.equal(result.defaultSplit.familyWalletOffsetRub, 5000);
		assert.equal(result.defaultSplit.remainingDueRub, 56800);
		assert.equal(result.defaultSplit.sbpQr?.sumRub, 56800);
	});
});
