/**
 * packages/shared/src/fiscal/__tests__/tenderTypes.test.ts
 *
 * Test suite for Canonical Payment Tender SSOT, FFD 1.2 Fiscal Tags,
 * VAT calculations & multi-tender split kopeck arithmetic.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	canonicalTenderTypeSchema,
	extendedTenderTypeSchema,
	CANONICAL_TENDER_LABELS_RU,
	CANONICAL_TENDER_FFD12_TAGS,
	normalizeTenderType,
	normalizeVatRate,
	calculateVatKopecksFromTotal,
	normalizeCalculationMethod,
	normalizeCalculationSubject,
	calculateCanonicalSplit,
} from "../tenderTypes.js";
import {
	validateTenderParity,
	canonicalCashierCheckoutPayloadSchema,
} from "../fiscalValidation.js";

describe("Canonical Tender Types & Normalization SSOT", () => {
	it("parses valid canonical tender types through Zod schema", () => {
		const validTenders = [
			"cash",
			"card",
			"sbp",
			"bank_transfer",
			"deposit",
			"family_wallet",
			"credit",
			"insurance",
			"certificate",
			"loyalty_points",
			"other",
		];
		for (const tender of validTenders) {
			const parsed = canonicalTenderTypeSchema.parse(tender);
			assert.equal(parsed, tender);
		}
	});

	it("parses composite extended tender types ('split', 'mixed')", () => {
		assert.equal(extendedTenderTypeSchema.parse("split"), "split");
		assert.equal(extendedTenderTypeSchema.parse("mixed"), "mixed");
	});

	it("maps each canonical tender to the statutory 54-FZ (FFD 1.2) tag", () => {
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.cash, 1031);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.card, 1081);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.sbp, 1081);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.bank_transfer, 1081);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.other, 1081);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.deposit, 1215);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.family_wallet, 1215);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.credit, 1216);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.insurance, 1217);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.certificate, 1217);
		assert.equal(CANONICAL_TENDER_FFD12_TAGS.loyalty_points, 1217);
	});

	it("normalizes legacy aliases and Russian UI labels to canonical tender types", () => {
		// Cash
		assert.equal(normalizeTenderType("cash"), "cash");
		assert.equal(normalizeTenderType("нал"), "cash");
		assert.equal(normalizeTenderType("наличные"), "cash");
		assert.equal(normalizeTenderType(undefined), "cash");

		// Card / POS
		assert.equal(normalizeTenderType("card"), "card");
		assert.equal(normalizeTenderType("bank_card"), "card");
		assert.equal(normalizeTenderType("card_terminal"), "card");
		assert.equal(normalizeTenderType("терминал"), "card");
		assert.equal(normalizeTenderType("эквайринг"), "card");

		// SBP QR
		assert.equal(normalizeTenderType("sbp"), "sbp");
		assert.equal(normalizeTenderType("sbp_qr"), "sbp");
		assert.equal(normalizeTenderType("qr"), "sbp");
		assert.equal(normalizeTenderType("сбп"), "sbp");

		// Deposits & Advances
		assert.equal(normalizeTenderType("deposit"), "deposit");
		assert.equal(normalizeTenderType("patient_deposit"), "deposit");
		assert.equal(normalizeTenderType("advance"), "deposit");
		assert.equal(normalizeTenderType("депозит"), "deposit");
		assert.equal(normalizeTenderType("аванс"), "deposit");

		// Family Wallet
		assert.equal(normalizeTenderType("family_wallet"), "family_wallet");
		assert.equal(normalizeTenderType("family_deposit"), "family_wallet");
		assert.equal(normalizeTenderType("family_balance"), "family_wallet");
		assert.equal(normalizeTenderType("семейный"), "family_wallet");

		// Insurance / DMS
		assert.equal(normalizeTenderType("insurance"), "insurance");
		assert.equal(normalizeTenderType("dms_insurance"), "insurance");
		assert.equal(normalizeTenderType("dms"), "insurance");
		assert.equal(normalizeTenderType("страховая"), "insurance");

		// Credit
		assert.equal(normalizeTenderType("credit"), "credit");
		assert.equal(normalizeTenderType("рассрочка"), "credit");

		// Certificate & Loyalty
		assert.equal(normalizeTenderType("certificate"), "certificate");
		assert.equal(normalizeTenderType("loyalty_points"), "loyalty_points");
		assert.equal(normalizeTenderType("бонусы"), "loyalty_points");
	});
});

describe("VAT Normalization & Integer Kopeck Calculation", () => {
	it("normalizes VAT rate strings and percentages", () => {
		assert.equal(normalizeVatRate("20%"), "vat_20");
		assert.equal(normalizeVatRate("20"), "vat_20");
		assert.equal(normalizeVatRate("vat_20"), "vat_20");
		assert.equal(normalizeVatRate("10%"), "vat_10");
		assert.equal(normalizeVatRate("0%"), "vat_0");
		assert.equal(normalizeVatRate("none"), "vat_none");
		assert.equal(normalizeVatRate("без ндс"), "vat_none");
		assert.equal(normalizeVatRate(undefined), "vat_none");
	});

	it("calculates statutory VAT kopecks from gross total with integer precision", () => {
		// 12 000.00 ₽ (1 200 000 kop) at 20% VAT: VAT is 12000 * 20 / 120 = 2 000.00 ₽ (200 000 kop)
		assert.equal(calculateVatKopecksFromTotal(1_200_000, "vat_20"), 200_000);

		// 11 000.00 ₽ (1 100 000 kop) at 10% VAT: VAT is 11000 * 10 / 110 = 1 000.00 ₽ (100 000 kop)
		assert.equal(calculateVatKopecksFromTotal(1_100_000, "vat_10"), 100_000);

		// Medical services exempt from VAT (vat_none) or 0% (vat_0)
		assert.equal(calculateVatKopecksFromTotal(500_000, "vat_none"), 0);
		assert.equal(calculateVatKopecksFromTotal(500_000, "vat_0"), 0);
	});
});

describe("calculateCanonicalSplit — Multi-Tender Kopecks Arithmetic", () => {
	it("handles 100% Cash payment with cash change calculation", () => {
		const totalDueKop = 850_000; // 8 500.00 ₽
		const receivedCashKop = 1_000_000; // 10 000.00 ₽

		const split = calculateCanonicalSplit({
			totalDueKopecks: totalDueKop,
			cashKopecks: totalDueKop,
			receivedCashKopecks: receivedCashKop,
		});

		assert.equal(split.isBalanced, true);
		assert.equal(split.isFullyAllocated, true);
		assert.equal(split.remainingKopecks, 0);
		assert.equal(split.cashKopecks, 850_000);
		assert.equal(split.cashRub, 8500);
		assert.equal(split.tag1031_cashKopecks, 850_000);
		assert.equal(split.tag1081_electronicKopecks, 0);
		assert.equal(split.changeKopecks, 150_000); // 1 500.00 ₽ change
		assert.equal(split.changeRub, 1500);
		assert.equal(split.isCashShortage, false);
		assert.equal(split.activeTenders.length, 1);
		assert.equal(split.activeTenders[0]?.kind, "cash");
		assert.equal(split.activeTenders[0]?.ffd12Tag, 1031);
	});

	it("detects cash shortage when received cash is less than allocated cash", () => {
		const totalDueKop = 500_000; // 5 000.00 ₽
		const receivedCashKop = 400_000; // 4 000.00 ₽

		const split = calculateCanonicalSplit({
			totalDueKopecks: totalDueKop,
			cashKopecks: totalDueKop,
			receivedCashKopecks: receivedCashKop,
		});

		assert.equal(split.isBalanced, false);
		assert.equal(split.isCashShortage, true);
		assert.equal(split.cashShortageKopecks, 100_000);
		assert.equal(split.cashShortageRub, 1000);
		assert.equal(split.changeKopecks, 0);
	});

	it("calculates 50/50 Cash + SBP split correctly", () => {
		const totalDueKop = 100_000; // 1 000.00 ₽
		const half = 50_000;

		const split = calculateCanonicalSplit({
			totalDueKopecks: totalDueKop,
			cashKopecks: half,
			sbpKopecks: half,
		});

		assert.equal(split.isBalanced, true);
		assert.equal(split.tag1031_cashKopecks, 50_000);
		assert.equal(split.tag1081_electronicKopecks, 50_000);
		assert.equal(split.activeTenders.length, 2);
		assert.equal(split.remainingKopecks, 0);
	});

	it("calculates complex 4-way split (Deposit + Card + SBP + Cash)", () => {
		const totalDueKop = 250_000; // 2 500.00 ₽
		const depositKop = 100_000; // 1 000.00 ₽ (Tag 1215)
		const cardKop = 80_000; // 800.00 ₽ (Tag 1081)
		const sbpKop = 40_000; // 400.00 ₽ (Tag 1081)
		const cashKop = 30_000; // 300.00 ₽ (Tag 1031)

		const split = calculateCanonicalSplit({
			totalDueKopecks: totalDueKop,
			depositKopecks: depositKop,
			cardKopecks: cardKop,
			sbpKopecks: sbpKop,
			cashKopecks: cashKop,
		});

		assert.equal(split.isBalanced, true);
		assert.equal(split.tag1031_cashKopecks, 30_000);
		assert.equal(split.tag1081_electronicKopecks, 120_000); // 80_000 + 40_000
		assert.equal(split.tag1215_advanceOffsetKopecks, 100_000);
		assert.equal(split.activeTenders.length, 4);
	});

	it("handles DMS insurance (Tag 1217) with patient co-pay", () => {
		const totalDueKop = 200_000; // 2 000.00 ₽
		const insuranceKop = 150_000; // 1 500.00 ₽ (Tag 1217)
		const cardKop = 50_000; // 500.00 ₽ (Tag 1081 co-pay)

		const split = calculateCanonicalSplit({
			totalDueKopecks: totalDueKop,
			insuranceKopecks: insuranceKop,
			cardKopecks: cardKop,
		});

		assert.equal(split.isBalanced, true);
		assert.equal(split.tag1217_counterProvisionKopecks, 150_000);
		assert.equal(split.tag1081_electronicKopecks, 50_000);
		assert.equal(split.patientCoPayKopecks, 50_000);
		assert.equal(split.patientCoPayRub, 500);
	});

	it("detects overallocation correctly", () => {
		const split = calculateCanonicalSplit({
			totalDueKopecks: 100_000,
			cardKopecks: 80_000,
			cashKopecks: 50_000, // Total 130 000 > 100 000
		});

		assert.equal(split.isBalanced, false);
		assert.equal(split.isOverallocated, true);
		assert.equal(split.totalAllocatedKopecks, 130_000);
		assert.equal(split.remainingKopecks, 0);
	});
});

describe("validateTenderParity — Statutory Parity & Guidance (Mandate 8e)", () => {
	it("returns valid result for perfectly balanced tender amounts", () => {
		const result = validateTenderParity({
			totalDueKopecks: 150_000,
			cardKopecks: 100_000,
			cashKopecks: 50_000,
			receivedCashKopecks: 50_000,
		});

		assert.equal(result.isValid, true);
		assert.equal(result.diffKopecks, 0);
		assert.equal(result.remainingKopecks, 0);
		assert.equal(result.warningsRu.length, 0);
		assert.equal(result.messageRu, undefined);
	});

	it("returns non-blocking warning when balance remains unallocated", () => {
		const result = validateTenderParity({
			totalDueKopecks: 150_000,
			cardKopecks: 100_000,
		});

		assert.equal(result.isValid, false);
		assert.equal(result.remainingKopecks, 50_000);
		assert.equal(result.isOverallocated, false);
		assert.ok(result.warningsRu.some((w) => w.includes("Осталось распределить")));
	});

	it("returns non-blocking warning when overallocated", () => {
		const result = validateTenderParity({
			totalDueKopecks: 100_000,
			cardKopecks: 120_000,
		});

		assert.equal(result.isValid, false);
		assert.equal(result.isOverallocated, true);
		assert.ok(result.warningsRu.some((w) => w.includes("превышает")));
	});
});

describe("canonicalCashierCheckoutPayloadSchema — Submission Validation", () => {
	it("validates successful multi-tender payload with optional citizen INN", () => {
		const validPayload = {
			patientId: "a0000000-0000-0000-0000-000000000001",
			customerContact: "+79991234567",
			totalAmountKopecks: 100_000,
			tenders: [
				{ tenderType: "card" as const, amountKopecks: 60_000 },
				{ tenderType: "sbp" as const, amountKopecks: 40_000 },
			],
			// customerInn is omitted — Mandate 8e: physical person INN is strictly optional
		};

		const parsed = canonicalCashierCheckoutPayloadSchema.parse(validPayload);
		assert.equal(parsed.totalAmountKopecks, 100_000);
		assert.equal(parsed.tenders.length, 2);
	});

	it("allows physical person checkout with empty string or whitespace customerInn (Mandate 8e)", () => {
		const payloadEmptyInn = {
			patientId: "a0000000-0000-0000-0000-000000000001",
			customerContact: "+79991234567",
			totalAmountKopecks: 50_000,
			customerInn: "",
			payerType: "physical_person" as const,
			tenders: [{ tenderType: "cash" as const, amountKopecks: 50_000 }],
		};

		const parsedEmpty = canonicalCashierCheckoutPayloadSchema.parse(payloadEmptyInn);
		assert.equal(parsedEmpty.customerInn, null);

		const payloadWhitespaceInn = {
			...payloadEmptyInn,
			customerInn: "   ",
		};
		const parsedWhitespace = canonicalCashierCheckoutPayloadSchema.parse(payloadWhitespaceInn);
		assert.equal(parsedWhitespace.customerInn, null);
	});

	it("enforces 10-digit INN for legal entity and 12-digit for IP (Tag 1228)", () => {
		const basePayload = {
			patientId: "a0000000-0000-0000-0000-000000000001",
			customerContact: "+79991234567",
			totalAmountKopecks: 50_000,
			tenders: [{ tenderType: "card" as const, amountKopecks: 50_000 }],
		};

		// Legal entity missing INN -> throws
		assert.throws(() => {
			canonicalCashierCheckoutPayloadSchema.parse({
				...basePayload,
				payerType: "legal_entity",
				customerInn: "",
			});
		}, /Для юридического лица обязателен ИНН/);

		// Legal entity wrong length (12 digits instead of 10) -> throws
		assert.throws(() => {
			canonicalCashierCheckoutPayloadSchema.parse({
				...basePayload,
				payerType: "legal_entity",
				customerInn: "770123456789",
			});
		}, /ИНН юридического лица должен содержать ровно 10 цифр/);

		// Legal entity valid 10 digits -> passes
		const validLe = canonicalCashierCheckoutPayloadSchema.parse({
			...basePayload,
			payerType: "legal_entity",
			customerInn: "7701234567",
		});
		assert.equal(validLe.customerInn, "7701234567");

		// IP missing INN -> throws
		assert.throws(() => {
			canonicalCashierCheckoutPayloadSchema.parse({
				...basePayload,
				payerType: "individual_entrepreneur",
				customerInn: "",
			});
		}, /Для ИП обязателен ИНН/);

		// IP wrong length (10 digits instead of 12) -> throws
		assert.throws(() => {
			canonicalCashierCheckoutPayloadSchema.parse({
				...basePayload,
				payerType: "individual_entrepreneur",
				customerInn: "7701234567",
			});
		}, /ИНН индивидуального предпринимателя должен содержать ровно 12 цифр/);

		// IP valid 12 digits -> passes
		const validIp = canonicalCashierCheckoutPayloadSchema.parse({
			...basePayload,
			payerType: "individual_entrepreneur",
			customerInn: "770123456789",
		});
		assert.equal(validIp.customerInn, "770123456789");
	});

	it("rejects payload when tenders sum does not match totalAmountKopecks", () => {
		const invalidPayload = {
			patientId: "a0000000-0000-0000-0000-000000000001",
			customerContact: "+79991234567",
			totalAmountKopecks: 100_000,
			tenders: [
				{ tenderType: "card" as const, amountKopecks: 60_000 },
				{ tenderType: "cash" as const, amountKopecks: 30_000 }, // sum 90_000 !== 100_000
			],
		};

		assert.throws(() => {
			canonicalCashierCheckoutPayloadSchema.parse(invalidPayload);
		}, /Сумма способов оплаты.*не равна общей сумме чека/);
	});
});
