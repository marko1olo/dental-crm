import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateCrc16Ccitt,
	generateDynamicSbpQrPayload,
	calculateSbpMultiTenderSplit,
	resolveDentalTaxDeductionCategory,
	compileFamilyBillingDraft,
	type CombinedFamilyBillingDraft,
} from "./index.js";

describe("54-FZ & SBP QR: Family Combined Billing & Dynamic SBP QR Split", () => {
	it("1.1 calculateCrc16Ccitt — Computes exact CRC16-CCITT checksum for NSPK QR payloads", () => {
		const samplePayload = "https://qr.nspk.ru/AD100004B97214049102830000000001?type=02&bank=100000000111&sum=150000&cur=RUB";
		const crc = calculateCrc16Ccitt(samplePayload);

		assert.equal(typeof crc, "string");
		assert.equal(crc.length, 4);
		assert.match(crc, /^[0-9A-F]{4}$/);

		// Consistency check: same input always yields identical CRC
		assert.equal(calculateCrc16Ccitt(samplePayload), crc);
	});

	it("1.2 generateDynamicSbpQrPayload — Generates valid dynamic SBP QR with EMVCo payload", () => {
		const result = generateDynamicSbpQrPayload({
			sumRub: 28500.50,
			orderId: "ORD-9912",
			clinicName: "ДЕНТЕ",
			purpose: "Лечение кариеса и гигиена",
		});

		assert.equal(result.sumRub, 28500.50);
		assert.equal(result.sumKopecks, 2850050);
		assert.equal(result.orderId, "ORD-9912");
		assert.ok(result.nspkUrl.includes("https://qr.nspk.ru/SBP-ORD-9912"));
		assert.ok(result.nspkUrl.includes("sum=2850050"));
		assert.ok(result.nspkUrl.includes("&crc="));
		assert.ok(result.emvPayload.includes("ru.nspk.sbp"));
		assert.ok(result.emvPayload.includes("8011")); // Doctors MCC
		assert.ok(result.deepLinkAppUrl.startsWith("bank100000000111://"));
	});

	it("1.3 calculateSbpMultiTenderSplit — Splits Family Deposit (Tag 1215) and SBP Dynamic QR (Tag 1081)", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 45000,
			depositAvailableRub: 15000,
			orderId: "FAM-101",
			clinicName: "ООО ДЕНТЕ",
		});

		assert.equal(split.totalAmountRub, 45000);
		assert.equal(split.totalAmountKopecks, 4500000);

		// Tag 1215 (Deposit offset): 15 000 ₽
		assert.equal(split.depositOffsetRub, 15000);
		assert.equal(split.depositOffsetKopecks, 1500000);
		assert.equal(split.tag1215PrepaidKopecks, 1500000);

		// Tag 1081 (SBP charge): 30 000 ₽
		assert.equal(split.sbpChargeRub, 30000);
		assert.equal(split.sbpChargeKopecks, 3000000);
		assert.equal(split.tag1081ElectronicKopecks, 3000000);

		assert.equal(split.isFullyCoveredByDeposit, false);
		assert.ok(split.sbpQr !== null);
		assert.equal(split.sbpQr?.sumRub, 30000);
		assert.equal(split.sbpQr?.sumKopecks, 3000000);
	});

	it("1.4 calculateSbpMultiTenderSplit — Fully covered by deposit results in 0 SBP charge", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 12000,
			depositAvailableRub: 20000,
			orderId: "FAM-102",
		});

		assert.equal(split.depositOffsetRub, 12000);
		assert.equal(split.sbpChargeRub, 0);
		assert.equal(split.isFullyCoveredByDeposit, true);
		assert.equal(split.sbpQr, null);
	});

	it("1.5 resolveDentalTaxDeductionCategory — Distinguishes Code 02 (Implants/Surgery) from Code 01 (Therapy/Hygiene)", () => {
		// Code 02 (Expensive treatment - unlimited deduction)
		assert.equal(
			resolveDentalTaxDeductionCategory("Установка дентального имплантата Straumann", "A16.07.054.001"),
			"2",
		);
		assert.equal(
			resolveDentalTaxDeductionCategory("Костная пластика челюсти с мембраной", "A16.07.041.002"),
			"2",
		);
		assert.equal(
			resolveDentalTaxDeductionCategory("Открытый синус-лифтинг с остеопластикой", "A16.07.055"),
			"2",
		);

		// Code 01 (Standard treatment - 150 000 ₽ / year limit)
		assert.equal(
			resolveDentalTaxDeductionCategory("Лечение глубокого кариеса зуба 16", "A16.07.002.001"),
			"1",
		);
		assert.equal(
			resolveDentalTaxDeductionCategory("Профессиональная гигиена AirFlow", "A16.07.051"),
			"1",
		);
		assert.equal(
			resolveDentalTaxDeductionCategory("Эндодонтическое лечение пульпита 3 каналов", "A16.07.008.002"),
			"1",
		);
	});

	it("1.6 compileFamilyBillingDraft — Combines parent and children invoices with tax categories and SBP QR", () => {
		const sampleFamilyDraft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "pat-father-1",
				payerFullName: "Иванов Иван Иванович",
				payerInn: "770123456789",
				payerPhone: "+7 (999) 111-22-33",
			},
			familyGroupName: "Семья Ивановых",
			availableFamilyWalletRub: 10000,
			items: [
				// Father (Self): Implant (Code 02)
				{
					id: "item-1",
					patientId: "pat-father-1",
					patientFullName: "Иванов Иван Иванович",
					relationship: "self",
					serviceName: "Установка дентального имплантата Straumann",
					code804n: "A16.07.054",
					toothNumber: 36,
					priceRub: 45000,
					quantity: 1,
					taxDeductionCategory: "2",
				},
				// Mother (Spouse): Crown (Code 01)
				{
					id: "item-2",
					patientId: "pat-mother-1",
					patientFullName: "Иванова Ольга Сергеевна",
					relationship: "spouse",
					serviceName: "Установка циркониевой коронки",
					code804n: "A16.07.004",
					toothNumber: 21,
					priceRub: 22000,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				// Child 1 (Daughter): Pediatric Caries (Code 01)
				{
					id: "item-3",
					patientId: "pat-child-1",
					patientFullName: "Иванова Мария Ивановна",
					relationship: "child",
					serviceName: "Лечение кариеса молочного зуба",
					code804n: "A16.07.002",
					toothNumber: 54,
					priceRub: 4500,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				// Child 2 (Son): Hygiene (Code 01)
				{
					id: "item-4",
					patientId: "pat-child-2",
					patientFullName: "Иванов Артем Иванович",
					relationship: "child",
					serviceName: "Детская гигиена и фторирование",
					code804n: "A16.07.051",
					priceRub: 3500,
					quantity: 1,
					taxDeductionCategory: "1",
				},
			],
		};

		const result = compileFamilyBillingDraft(sampleFamilyDraft);

		// Total: 45000 + 22000 + 4500 + 3500 = 75 000 ₽ (7 500 000 kop)
		assert.equal(result.totalAmountRub, 75000);
		assert.equal(result.totalAmountKopecks, 7500000);

		// Code 02 Total (Implant): 45 000 ₽
		assert.equal(result.code02TotalRub, 45000);
		assert.equal(result.code02TotalKopecks, 4500000);

		// Code 01 Total (Crown + Caries + Hygiene): 22000 + 4500 + 3500 = 30 000 ₽
		assert.equal(result.code01TotalRub, 30000);
		assert.equal(result.code01TotalKopecks, 3000000);

		// 4 Family members
		assert.equal(result.membersCount, 4);
		assert.equal(result.membersSummary.length, 4);

		// Tax deduction certificates count = 4
		assert.equal(result.taxDeductionCertificates.length, 4);
		const fatherCert = result.taxDeductionCertificates.find((c) => c.patientFullName === "Иванов Иван Иванович")!;
		assert.equal(fatherCert.patientFnsCode, "1");
		assert.equal(fatherCert.code02TotalRub, 45000);

		const daughterCert = result.taxDeductionCertificates.find((c) => c.patientFullName === "Иванова Мария Ивановна")!;
		assert.equal(daughterCert.patientFnsCode, "4");
		assert.equal(daughterCert.code01TotalRub, 4500);

		// Multi-tender split: 10 000 ₽ from Family Wallet + 65 000 ₽ via SBP Dynamic QR
		assert.equal(result.defaultSplit.familyWalletOffsetRub, 10000);
		assert.equal(result.defaultSplit.remainingDueRub, 65000);
		assert.ok(result.defaultSplit.sbpQr !== null);
		assert.equal(result.defaultSplit.sbpQr?.sumRub, 65000);
		assert.ok(result.defaultSplit.sbpQr?.nspkUrl.includes("sum=6500000"));
	});
});
