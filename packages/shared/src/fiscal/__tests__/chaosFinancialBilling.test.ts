import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	rubToKopecks,
	kopecksToRub,
	roundHalfEven,
	distributeDiscountProportionally,
	calculateMultiTenderAllocation,
	calculateAdvanceDepositOffset,
	calculateProportionalMultiTenderRefund,
	calculateVatKopecks,
	calculateCrc16Ccitt,
	generateDynamicSbpQrPayload,
	calculateSbpMultiTenderSplit,
	resolveDentalTaxDeductionCategory,
	compileFamilyBillingDraft,
	calculateTaxDeductionSummary,
	amountToWordsRu,
	type CombinedFamilyBillingDraft,
	type FamilyMemberBillingItem,
	type TaxDeductionPaymentItem,
} from "../index.js";

describe("CHAOS AUDIT & DEFENSE: Financial Core, Split Payments & 54-FZ / SBP QR Stress Testing", () => {
	// =========================================================================
	// ATTACK VECTOR 1: Fractional percentages and floating-point drift (IEEE-754)
	// =========================================================================
	it("Chaos 1.1: Fractional discount (33.33333333%) across 3 non-multiple positions eliminates penny drift", () => {
		// 3 positions: 33.33 ₽ each = 3333 kop each -> Total gross = 9999 kop (99.99 ₽)
		const items = [
			{ priceKopecks: 3333, quantity: 1 },
			{ priceKopecks: 3333, quantity: 1 },
			{ priceKopecks: 3333, quantity: 1 },
		];
		// 33.333333% discount of 9999 kop = 3333 kop
		const totalDiscountKop = 3333;

		const discounts = distributeDiscountProportionally(items, totalDiscountKop);

		assert.equal(discounts.length, 3);
		// Sum of discounts must exactly equal requested total discount
		const sumDiscounts = discounts.reduce((sum, d) => sum + d, 0);
		assert.equal(sumDiscounts, totalDiscountKop, "Sum of line discounts must match requested discount to 1 kop");

		// Net prices: [3333-1111, 3333-1111, 3333-1111] = [2222, 2222, 2222] = 6666 kop
		const netPrices = items.map((item, idx) => (item.priceKopecks * item.quantity) - (discounts[idx] ?? 0));
		const sumNet = netPrices.reduce((sum, p) => sum + p, 0);
		assert.equal(sumNet, 9999 - totalDiscountKop);
	});

	it("Chaos 1.2: 100.00 ₽ split across 3 positions (33.33 ₽ + 33.33 ₽ + 33.34 ₽) with 1/3 discount", () => {
		const items = [
			{ priceKopecks: 3333, quantity: 1 },
			{ priceKopecks: 3333, quantity: 1 },
			{ priceKopecks: 3334, quantity: 1 },
		];
		const totalGross = 10000; // 100.00 ₽
		const discountKop = 3333; // 33.33 ₽

		const discounts = distributeDiscountProportionally(items, discountKop);

		assert.equal(discounts.reduce((sum, d) => sum + d, 0), discountKop);
		const netLineItems = items.map((item, idx) => item.priceKopecks - (discounts[idx] ?? 0));
		assert.equal(netLineItems.reduce((sum, p) => sum + p, 0), totalGross - discountKop);
	});

	// =========================================================================
	// ATTACK VECTOR 2: 54-FZ FFD 1.2 strict receipt balancing invariant
	// =========================================================================
	it("Chaos 2.1: 54-FZ FFD 1.2 Invariant — Combined receipt total strictly equals sum of lines down to 1 kopeck", () => {
		const complexDraft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "payer-1",
				payerFullName: "Кузнецов Александр Викторович",
				payerInn: "770198765432",
			},
			availableFamilyWalletRub: 15432.75,
			items: [
				{
					id: "item-1",
					patientId: "pat-1",
					patientFullName: "Кузнецов Александр Викторович",
					relationship: "self",
					serviceName: "Первичный осмотр и план лечения",
					code804n: "A01.07.001",
					priceRub: 1500.55,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				{
					id: "item-2",
					patientId: "pat-1",
					patientFullName: "Кузнецов Александр Викторович",
					relationship: "self",
					serviceName: "Установка имплантата Nobel Biocare",
					code804n: "A16.07.054.001",
					priceRub: 55432.45,
					discountRub: 5432.45, // Net 50000.00
					quantity: 1,
					taxDeductionCategory: "2",
				},
				{
					id: "item-3",
					patientId: "pat-2",
					patientFullName: "Кузнецова Елена Павловна",
					relationship: "spouse",
					serviceName: "Профессиональная чистка зубов AirFlow",
					code804n: "A16.07.051",
					priceRub: 6789.99,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				{
					id: "item-4",
					patientId: "pat-3",
					patientFullName: "Кузнецов Денис Александрович",
					relationship: "child",
					serviceName: "Лечение кариеса с фотополимерной пломбой",
					code804n: "A16.07.002",
					priceRub: 4321.01,
					discountRub: 321.01, // Net 4000.00
					quantity: 2, // 2 teeth = 8000.00
					taxDeductionCategory: "1",
				},
			],
		};

		const result = compileFamilyBillingDraft(complexDraft);

		// Line 1: 1500.55 * 1 = 150055 kop
		// Line 2: (55432.45 - 5432.45) * 1 = 5000000 kop
		// Line 3: 6789.99 * 1 = 678999 kop
		// Line 4: (4321.01 - 321.01) * 2 = 400000 * 2 = 800000 kop
		// Total: 150055 + 5000000 + 678999 + 800000 = 6629054 kop (66290.54 ₽)
		assert.equal(result.totalAmountKopecks, 6629054);
		assert.equal(result.totalAmountRub, 66290.54);

		// Code 02 total: 50000.00 ₽ (5000000 kop)
		assert.equal(result.code02TotalKopecks, 5000000);
		assert.equal(result.code02TotalRub, 50000.00);

		// Code 01 total: 150055 + 678999 + 800000 = 1629054 kop (16290.54 ₽)
		assert.equal(result.code01TotalKopecks, 1629054);
		assert.equal(result.code01TotalRub, 16290.54);

		// Invariant: code01 + code02 === total
		assert.equal(result.code01TotalKopecks + result.code02TotalKopecks, result.totalAmountKopecks);

		// Invariant: sum of member totalKopecks === totalAmountKopecks
		const sumMembersKop = result.membersSummary.reduce((sum, m) => sum + m.totalKopecks, 0);
		assert.equal(sumMembersKop, result.totalAmountKopecks);

		// Invariant: defaultSplit (Wallet offset + SBP remainder === total)
		assert.equal(
			result.defaultSplit.familyWalletOffsetKopecks + result.defaultSplit.remainingDueKopecks,
			result.totalAmountKopecks,
		);
		// Wallet was 15432.75 ₽ -> offset 15432.75 ₽ (1543275 kop)
		// Remainder due via SBP: 66290.54 - 15432.75 = 50857.79 ₽ (5085779 kop)
		assert.equal(result.defaultSplit.familyWalletOffsetKopecks, 1543275);
		assert.equal(result.defaultSplit.remainingDueKopecks, 5085779);
		assert.equal(result.defaultSplit.remainingDueRub, 50857.79);
		assert.ok(result.defaultSplit.sbpQr !== null);
		assert.equal(result.defaultSplit.sbpQr?.sumKopecks, 5085779);
	});

	// =========================================================================
	// ATTACK VECTOR 3: Split payment & family deposit boundary conditions
	// =========================================================================
	it("Chaos 3.1: Family deposit = 0 results in 0 offset and 100% SBP QR charge", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 25000.50,
			depositAvailableRub: 0,
			orderId: "FAM-ZERO-DEP",
		});

		assert.equal(split.totalAmountKopecks, 2500050);
		assert.equal(split.depositOffsetKopecks, 0);
		assert.equal(split.depositOffsetRub, 0);
		assert.equal(split.sbpChargeKopecks, 2500050);
		assert.equal(split.sbpChargeRub, 25000.50);
		assert.equal(split.isFullyCoveredByDeposit, false);
		assert.ok(split.sbpQr !== null);
		assert.equal(split.sbpQr?.sumRub, 25000.50);
	});

	it("Chaos 3.2: Family deposit is exactly 1 kopeck less than invoice total", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 100.00,
			depositAvailableRub: 99.99,
			orderId: "FAM-1KOP-DUE",
		});

		assert.equal(split.totalAmountKopecks, 10000);
		assert.equal(split.depositOffsetKopecks, 9999);
		assert.equal(split.depositOffsetRub, 99.99);
		assert.equal(split.sbpChargeKopecks, 1);
		assert.equal(split.sbpChargeRub, 0.01);
		assert.equal(split.isFullyCoveredByDeposit, false);
		assert.ok(split.sbpQr !== null);
		assert.equal(split.sbpQr?.sumRub, 0.01);
		assert.equal(split.sbpQr?.sumKopecks, 1);
		assert.ok(split.sbpQr?.nspkUrl.includes("sum=1"));
		assert.ok(split.sbpQr?.emvPayload.includes("54040.01"));
	});

	it("Chaos 3.3: Family deposit exceeds invoice by 100x results in 0 SBP charge and null QR", () => {
		const split = calculateSbpMultiTenderSplit({
			totalAmountRub: 10000.00,
			depositAvailableRub: 1000000.00, // 1M deposit
			orderId: "FAM-OVERFLOW-DEP",
		});

		assert.equal(split.totalAmountKopecks, 1000000);
		assert.equal(split.depositOffsetKopecks, 1000000);
		assert.equal(split.depositOffsetRub, 10000.00);
		assert.equal(split.sbpChargeKopecks, 0);
		assert.equal(split.sbpChargeRub, 0);
		assert.equal(split.isFullyCoveredByDeposit, true);
		assert.equal(split.sbpQr, null);
	});

	it("Chaos 3.4: Negative amounts, negative discounts, and negative wallet balances are sanitized to 0", () => {
		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "p-neg",
				payerFullName: "Тестов Тест Тестович",
			},
			availableFamilyWalletRub: -5000,
			items: [
				{
					id: "item-neg-1",
					patientId: "p-neg",
					patientFullName: "Тестов Тест Тестович",
					relationship: "self",
					serviceName: "Услуга с отрицательной скидкой",
					code804n: "A01.07.001",
					priceRub: 1000,
					discountRub: -500, // Negative discount must NOT increase price
					quantity: 1,
					taxDeductionCategory: "1",
				},
			],
		};

		const result = compileFamilyBillingDraft(draft);

		// Price is 1000 ₽ (100000 kop). Negative discount is clamped to 0 -> Net price 1000 ₽
		assert.equal(result.totalAmountKopecks, 100000);
		assert.equal(result.defaultSplit.familyWalletOffsetKopecks, 0);
		assert.equal(result.defaultSplit.remainingDueKopecks, 100000);
	});

	it("Chaos 3.5: 0-price item and 100% discount item handle zero balances gracefully", () => {
		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "p-free",
				payerFullName: "Бесплатный Пациент",
			},
			items: [
				{
					id: "item-free",
					patientId: "p-free",
					patientFullName: "Бесплатный Пациент",
					relationship: "self",
					serviceName: "Бесплатный профосмотр",
					code804n: "A01.07.001",
					priceRub: 0,
					quantity: 1,
					taxDeductionCategory: "1",
				},
				{
					id: "item-100disc",
					patientId: "p-free",
					patientFullName: "Бесплатный Пациент",
					relationship: "self",
					serviceName: "Акция 100% скидка на гигиену",
					code804n: "A16.07.051",
					priceRub: 5000,
					discountRub: 5000,
					quantity: 1,
					taxDeductionCategory: "1",
				},
			],
		};

		const result = compileFamilyBillingDraft(draft);

		assert.equal(result.totalAmountKopecks, 0);
		assert.equal(result.totalAmountRub, 0);
		assert.equal(result.membersSummary[0]?.itemsCount, 2);
		assert.equal(result.defaultSplit.familyWalletOffsetKopecks, 0);
		assert.equal(result.defaultSplit.remainingDueKopecks, 0);
		assert.equal(result.defaultSplit.sbpQr, null);
	});

	// =========================================================================
	// ATTACK VECTOR 4: SBP Dynamic QR Boundary & CRC16 Collisions
	// =========================================================================
	it("Chaos 4.1: SBP Dynamic QR strictly throws on 0.00 ₽ or negative sum", () => {
		assert.throws(
			() => generateDynamicSbpQrPayload({ sumRub: 0, orderId: "ORD-ZERO" }),
			/Сумма динамического QR-кода СБП должна быть строго больше 0/,
		);

		assert.throws(
			() => generateDynamicSbpQrPayload({ sumRub: -1500, orderId: "ORD-NEG" }),
			/Сумма динамического QR-кода СБП должна быть строго больше 0/,
		);
	});

	it("Chaos 4.2: CRC16-CCITT on empty string, Cyrillic UTF-8 strings, and 100KB long payload", () => {
		// Empty string
		const crcEmpty = calculateCrc16Ccitt("");
		assert.equal(crcEmpty, "FFFF");

		// ASCII standard string
		const crcAscii = calculateCrc16Ccitt("https://qr.nspk.ru/TEST?type=02&bank=100000000111&sum=10000&cur=RUB");
		assert.equal(typeof crcAscii, "string");
		assert.equal(crcAscii.length, 4);
		assert.match(crcAscii, /^[0-9A-F]{4}$/);

		// Cyrillic UTF-8 string: must compute deterministically without character truncation
		const cyrillicData = "Оплата стоматологических услуг ООО ДЕНТЕ за лечение кариеса и синус-лифтинг";
		const crcCyrillic1 = calculateCrc16Ccitt(cyrillicData);
		const crcCyrillic2 = calculateCrc16Ccitt(cyrillicData);
		assert.equal(crcCyrillic1, crcCyrillic2);
		assert.equal(crcCyrillic1.length, 4);

		// Massive 100,000 character string stress test
		const massiveString = "DENTE-TEST-PAYLOAD-".repeat(5000);
		const crcMassive = calculateCrc16Ccitt(massiveString);
		assert.equal(crcMassive.length, 4);
		assert.match(crcMassive, /^[0-9A-F]{4}$/);
	});

	// =========================================================================
	// ATTACK VECTOR 5: Mixed FNS Tax Deduction Categories (10 Code 01 + 5 Code 02)
	// =========================================================================
	it("Chaos 5.1: 15 mixed items (10 Code 01 + 5 Code 02) with intricate discounts and multi-member hierarchy", () => {
		const items: FamilyMemberBillingItem[] = [];

		// 10 Code 01 items across 2 members
		for (let i = 1; i <= 10; i++) {
			items.push({
				id: `item-c1-${i}`,
				patientId: i <= 5 ? "pat-mother" : "pat-child",
				patientFullName: i <= 5 ? "Смирнова Анна Ивановна" : "Смирнов Михаил Сергеевич",
				relationship: i <= 5 ? "spouse" : "child",
				serviceName: `Терапевтическая процедура ${i}`,
				code804n: `A16.07.002.00${(i % 9) + 1}`,
				priceRub: 2345.67 + i * 100, // Fractional prices
				discountRub: i * 50, // Line discount
				quantity: i % 2 === 0 ? 2 : 1,
				taxDeductionCategory: "1",
			});
		}

		// 5 Code 02 items (Implants/Bone surgery) for father
		for (let j = 1; j <= 5; j++) {
			items.push({
				id: `item-c2-${j}`,
				patientId: "pat-father",
				patientFullName: "Смирнов Сергей Петрович",
				relationship: "self",
				serviceName: `Хирургический протокол имплантации ${j}`,
				code804n: "A16.07.054",
				priceRub: 34567.89 + j * 1000,
				discountRub: j * 200,
				quantity: 1,
				taxDeductionCategory: "2",
			});
		}

		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "pat-father",
				payerFullName: "Смирнов Сергей Петрович",
				payerInn: "770112345678",
			},
			availableFamilyWalletRub: 25000.00,
			items,
		};

		const result = compileFamilyBillingDraft(draft);

		// Verify that sum of each line item's kopecks exactly matches totalAmountKopecks
		let computedTotalKop = 0;
		let computedCode01Kop = 0;
		let computedCode02Kop = 0;

		for (const it of items) {
			const unitKop = Math.max(0, rubToKopecks(it.priceRub));
			const discKop = it.discountRub ? Math.max(0, rubToKopecks(it.discountRub)) : 0;
			const effKop = Math.max(0, unitKop - discKop);
			const lineKop = Math.round(effKop * it.quantity);
			computedTotalKop += lineKop;
			if (it.taxDeductionCategory === "2") {
				computedCode02Kop += lineKop;
			} else {
				computedCode01Kop += lineKop;
			}
		}

		assert.equal(result.totalAmountKopecks, computedTotalKop);
		assert.equal(result.code01TotalKopecks, computedCode01Kop);
		assert.equal(result.code02TotalKopecks, computedCode02Kop);
		assert.equal(result.code01TotalKopecks + result.code02TotalKopecks, result.totalAmountKopecks);

		// Members count = 3 (Father, Mother, Child)
		assert.equal(result.membersCount, 3);
		assert.equal(result.taxDeductionCertificates.length, 3);

		// Certificates grand totals must equal member totals
		for (const cert of result.taxDeductionCertificates) {
			const member = result.membersSummary.find((m) => m.patientFullName === cert.patientFullName)!;
			assert.equal(cert.grandTotalRub, member.totalRub);
			assert.equal(cert.code01TotalRub, member.code01Rub);
			assert.equal(cert.code02TotalRub, member.code02Rub);
		}
	});

	// =========================================================================
	// ATTACK VECTOR 6: Banker's Rounding (Round Half to Even) algorithm
	// =========================================================================
	it("Chaos 6.1: Banker's Rounding correctly rounds half-way values to nearest even integer", () => {
		// Half-way cases: must round to even
		assert.equal(roundHalfEven(0.5), 0, "0.5 -> 0 (0 is even)");
		assert.equal(roundHalfEven(1.5), 2, "1.5 -> 2 (2 is even)");
		assert.equal(roundHalfEven(2.5), 2, "2.5 -> 2 (2 is even)");
		assert.equal(roundHalfEven(3.5), 4, "3.5 -> 4 (4 is even)");
		assert.equal(roundHalfEven(4.5), 4, "4.5 -> 4 (4 is even)");

		// Slight deviations from half
		assert.equal(roundHalfEven(2.5001), 3);
		assert.equal(roundHalfEven(2.4999), 2);
		assert.equal(roundHalfEven(3.5001), 4);
		assert.equal(roundHalfEven(3.4999), 3);

		// Negative half-way values
		assert.equal(roundHalfEven(-0.5), 0);
		assert.equal(roundHalfEven(-1.5), -2);
		assert.equal(roundHalfEven(-2.5), -2);
		assert.equal(roundHalfEven(-3.5), -4);
	});

	// =========================================================================
	// ATTACK VECTOR 7: Proportional 54-FZ Multi-Tender Refund Calculator
	// =========================================================================
	it("Chaos 7.1: Proportional multi-tender partial refund maintains exact kopeck balance", () => {
		// Original payment: Cash 1000 kop (10 ₽), Card 2000 kop (20 ₽), SBP 3000 kop (30 ₽), Advance 4000 kop (40 ₽)
		// Total = 10000 kop (100.00 ₽)
		const originalTenders = {
			cashKopecks: 1000,
			cardKopecks: 2000,
			sbpKopecks: 3000,
			advanceOffsetKopecks: 4000,
			totalPaidKopecks: 10000,
		};

		// Partial refund of 3333 kop (33.33 ₽)
		const refund = calculateProportionalMultiTenderRefund(originalTenders, 3333);

		assert.equal(refund.totalRefundKopecks, 3333);
		assert.equal(
			refund.refundCashKopecks +
				refund.refundCardKopecks +
				refund.refundSbpKopecks +
				refund.refundAdvanceOffsetKopecks,
			3333,
		);
		assert.equal(refund.isFullRefund, false);
		assert.equal(refund.isPartialRefund, true);

		// Full refund of 10000 kop (100.00 ₽)
		const fullRefund = calculateProportionalMultiTenderRefund(originalTenders, 10000);
		assert.equal(fullRefund.totalRefundKopecks, 10000);
		assert.equal(fullRefund.refundCashKopecks, 1000);
		assert.equal(fullRefund.refundCardKopecks, 2000);
		assert.equal(fullRefund.refundSbpKopecks, 3000);
		assert.equal(fullRefund.refundAdvanceOffsetKopecks, 4000);
		assert.equal(fullRefund.isFullRefund, true);

		// Over-refund request: 20000 kop -> clamped to 10000 kop
		const overRefund = calculateProportionalMultiTenderRefund(originalTenders, 20000);
		assert.equal(overRefund.totalRefundKopecks, 10000);
	});

	// =========================================================================
	// ATTACK VECTOR 8: Multi-year tax deduction summary & statutory limits
	// =========================================================================
	it("Chaos 8.1: Multi-year tax deduction summary enforces statutory limits (120k in 2023 vs 150k in 2024)", () => {
		const payments: TaxDeductionPaymentItem[] = [
			// 2023: Code 01 exceeding 120 000 ₽ limit
			{
				id: "pay-2023-1",
				dateIso: "2023-05-10T12:00:00Z",
				receiptNumber: "CHK-23-1",
				fiscalDocumentNumber: "101",
				fiscalSign: "12345678",
				serviceName: "Терапевтическое лечение",
				code804n: "A16.07.002",
				amountRub: 200000.00,
				taxCode: "1",
			},
			// 2023: Code 02 expensive treatment (unlimited)
			{
				id: "pay-2023-2",
				dateIso: "2023-08-15T14:00:00Z",
				receiptNumber: "CHK-23-2",
				fiscalDocumentNumber: "102",
				fiscalSign: "87654321",
				serviceName: "Имплантация Straumann",
				code804n: "A16.07.054",
				amountRub: 100000.00,
				taxCode: "2",
			},
			// 2024: Code 01 exceeding 150 000 ₽ limit
			{
				id: "pay-2024-1",
				dateIso: "2024-03-20T10:00:00Z",
				receiptNumber: "CHK-24-1",
				fiscalDocumentNumber: "201",
				fiscalSign: "11223344",
				serviceName: "Ортодонтическое лечение",
				code804n: "A16.07.048",
				amountRub: 250000.00,
				taxCode: "1",
			},
		];

		const summary = calculateTaxDeductionSummary(payments);

		assert.equal(summary.yearsSummary.length, 2);

		const year2023 = summary.yearsSummary.find((y) => y.taxYear === 2023)!;
		assert.equal(year2023.code01StatutoryLimitRub, 120000);
		assert.equal(year2023.code01EligibleRub, 120000);
		assert.equal(year2023.code02Rub, 100000);
		// Estimated 13% refund for 2023: (120 000 + 100 000) * 0.13 = 28 600 ₽
		assert.equal(year2023.refund13EstimateRub, 28600);

		const year2024 = summary.yearsSummary.find((y) => y.taxYear === 2024)!;
		assert.equal(year2024.code01StatutoryLimitRub, 150000);
		assert.equal(year2024.code01EligibleRub, 150000);
		assert.equal(year2024.code02Rub, 0);
		// Estimated 13% refund for 2024: 150 000 * 0.13 = 19 500 ₽
		assert.equal(year2024.refund13EstimateRub, 19500);
	});

	// =========================================================================
	// ATTACK VECTOR 9: Russian amount to words declensions & boundary values
	// =========================================================================
	it("Chaos 9.1: Russian amount to words (amountToWordsRu) handles all declension boundaries", () => {
		assert.equal(amountToWordsRu(0), "Ноль рублей 00 копеек");
		assert.equal(amountToWordsRu(-100), "Ноль рублей 00 копеек");
		assert.equal(amountToWordsRu(1), "Ноль рублей 01 копейка");
		assert.equal(amountToWordsRu(2), "Ноль рублей 02 копейки");
		assert.equal(amountToWordsRu(5), "Ноль рублей 05 копеек");
		assert.equal(amountToWordsRu(21), "Ноль рублей 21 копейка");

		// Rubles declensions
		assert.equal(amountToWordsRu(100), "Один рубль 00 копеек");
		assert.equal(amountToWordsRu(200), "Два рубля 00 копеек");
		assert.equal(amountToWordsRu(500), "Пять рублей 00 копеек");
		assert.equal(amountToWordsRu(2100), "Двадцать один рубль 00 копеек");
		assert.equal(amountToWordsRu(2200), "Двадцать два рубля 00 копеек");
		assert.equal(amountToWordsRu(2500), "Двадцать пять рублей 00 копеек");

		// Thousands & Millions
		assert.equal(amountToWordsRu(100000), "Одна тысяча рублей 00 копеек");
		assert.equal(amountToWordsRu(200000), "Две тысячи рублей 00 копеек");
		assert.equal(amountToWordsRu(500000), "Пять тысяч рублей 00 копеек");
		assert.equal(amountToWordsRu(100000000), "Один миллион рублей 00 копеек");

		// Complex amount: 154 320.50 ₽ (15432050 kop)
		assert.equal(
			amountToWordsRu(15432050),
			"Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек",
		);
	});

	// =========================================================================
	// ATTACK VECTOR 10: Multi-tender allocation & overallocation safeguards
	// =========================================================================
	it("Chaos 10.1: Multi-tender payment allocation detects exact match, underallocation, and overallocation", () => {
		const totalReceiptKop = 1000000; // 10,000.00 ₽

		// Exact match across 3 tenders
		const exact = calculateMultiTenderAllocation(totalReceiptKop, {
			cashRub: 2000,
			cardRub: 5000,
			sbpRub: 3000,
		});
		assert.equal(exact.isFullyAllocated, true);
		assert.equal(exact.isOverallocated, false);
		assert.equal(exact.remainingKopecks, 0);
		assert.equal(exact.totalElectronicRub, 8000); // Card + SBP

		// Underallocated
		const under = calculateMultiTenderAllocation(totalReceiptKop, {
			cashRub: 2000,
			cardRub: 5000,
		});
		assert.equal(under.isFullyAllocated, false);
		assert.equal(under.isOverallocated, false);
		assert.equal(under.remainingKopecks, 300000); // 3000 ₽ left

		// Overallocated
		const over = calculateMultiTenderAllocation(totalReceiptKop, {
			cashRub: 6000,
			cardRub: 6000,
		});
		assert.equal(over.isFullyAllocated, false);
		assert.equal(over.isOverallocated, true);
		assert.equal(over.remainingKopecks, -200000);
	});

	// =========================================================================
	// ATTACK VECTOR 11: VAT calculation for included rates under 54-FZ
	// =========================================================================
	it("Chaos 11.1: VAT included calculation eliminates fractional drift", () => {
		// 20% included (20/120): 120.00 ₽ (12000 kop) -> 20.00 ₽ (2000 kop)
		assert.equal(calculateVatKopecks(12000, "vat_20_120"), 2000);
		assert.equal(calculateVatKopecks(12000, "vat_20"), 2000);

		// 10% included (10/110): 110.00 ₽ (11000 kop) -> 10.00 ₽ (1000 kop)
		assert.equal(calculateVatKopecks(11000, "vat_10_110"), 1000);
		assert.equal(calculateVatKopecks(11000, "vat_10"), 1000);

		// 0% / None
		assert.equal(calculateVatKopecks(50000, "vat_0"), 0);
		assert.equal(calculateVatKopecks(50000, "vat_none"), 0);
	});

	// =========================================================================
	// ATTACK VECTOR 12: Advance deposit offset calculation
	// =========================================================================
	it("Chaos 12.1: calculateAdvanceDepositOffset respects boundaries and calculates exact balances", () => {
		// Deposit covers partial invoice
		const partial = calculateAdvanceDepositOffset({
			invoiceTotalKopecks: 100000, // 1000 ₽
			availableDepositKopecks: 40000, // 400 ₽
		});
		assert.equal(partial.advanceOffsetKopecks, 40000);
		assert.equal(partial.remainingDueKopecks, 60000);
		assert.equal(partial.isFullyCoveredByDeposit, false);

		// Deposit covers full invoice exactly
		const exact = calculateAdvanceDepositOffset({
			invoiceTotalKopecks: 100000,
			availableDepositKopecks: 100000,
		});
		assert.equal(exact.advanceOffsetKopecks, 100000);
		assert.equal(exact.remainingDueKopecks, 0);
		assert.equal(exact.isFullyCoveredByDeposit, true);
	});

	// =========================================================================
	// ATTACK VECTOR 13: Large Family Draft (5 members) with multi-tender split
	// =========================================================================
	it("Chaos 13.1: Large Family Draft (5 members) verifies consistency of total kopecks and SBP split", () => {
		const members = [
			{ id: "m-1", name: "Отец", rel: "self" as const, cat: "2" as const, price: 45000.50, disc: 5000.50 },
			{ id: "m-2", name: "Мать", rel: "spouse" as const, cat: "1" as const, price: 23000.00, disc: 0 },
			{ id: "m-3", name: "Дочь", rel: "child" as const, cat: "1" as const, price: 8500.25, disc: 500.25 },
			{ id: "m-4", name: "Сын", rel: "child" as const, cat: "1" as const, price: 4200.75, disc: 200.75 },
			{ id: "m-5", name: "Бабушка", rel: "parent" as const, cat: "1" as const, price: 15000.00, disc: 1000.00 },
		];

		const items: FamilyMemberBillingItem[] = members.map((m, idx) => ({
			id: `item-${idx + 1}`,
			patientId: m.id,
			patientFullName: m.name,
			relationship: m.rel,
			serviceName: `Услуга ${idx + 1}`,
			code804n: m.cat === "2" ? "A16.07.054" : "A16.07.002",
			priceRub: m.price,
			discountRub: m.disc,
			quantity: 1,
			taxDeductionCategory: m.cat,
		}));

		const draft: CombinedFamilyBillingDraft = {
			payer: {
				payerId: "m-1",
				payerFullName: "Отец",
				payerInn: "770155566677",
			},
			availableFamilyWalletRub: 30000.00,
			items,
		};

		const result = compileFamilyBillingDraft(draft);

		// Net prices:
		// m-1: 40000.00
		// m-2: 23000.00
		// m-3: 8000.00
		// m-4: 4000.00
		// m-5: 14000.00
		// Grand Total: 89000.00 ₽ (8900000 kop)
		assert.equal(result.totalAmountRub, 89000.00);
		assert.equal(result.totalAmountKopecks, 8900000);
		assert.equal(result.code02TotalRub, 40000.00);
		assert.equal(result.code01TotalRub, 49000.00);
		assert.equal(result.membersCount, 5);

		// Multi-tender split: 30 000 ₽ from wallet + 59 000 ₽ via SBP
		assert.equal(result.defaultSplit.familyWalletOffsetRub, 30000.00);
		assert.equal(result.defaultSplit.remainingDueRub, 59000.00);
		assert.ok(result.defaultSplit.sbpQr !== null);
		assert.equal(result.defaultSplit.sbpQr?.sumRub, 59000.00);
		assert.equal(result.defaultSplit.sbpQr?.sumKopecks, 5900000);
	});
});
