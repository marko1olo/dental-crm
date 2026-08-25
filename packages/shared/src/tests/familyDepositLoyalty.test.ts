/**
 * DENTE Dental CRM — Round 47 Tests:
 * Family Deposit Balances, Statutory Loyalty Cashback & Multi-Currency Medical Tourism.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	// 1. Family Deposit
	createFamilyDepositAccount,
	calculateFamilyDepositCredit,
	calculateFamilyDepositDebit,
	calculateFamilyDepositRefund,
	type FamilyDepositAccount,
	// 2. Loyalty & 54-FZ Discount Split
	calculateLoyaltyAccrual,
	calculateLoyaltyRedemption54Fz,
	generateLuhn16Certificate,
	validateLuhn16Certificate,
	getLoyaltyTierDefinition,
	LOYALTY_TIER_PRESETS,
	// 3. Multi-Currency Tourism
	convertRubToForeignCurrency,
	convertForeignCurrencyToRub,
	calculateMedicalTourismQuote,
	formatCurrencyAmount,
	CBR_CURRENCIES,
	type SupportedCurrency,
} from "../finance/index.js";

import {
	rubToKopecks,
	kopecksToRub,
	distributeDiscountProportionally,
} from "../fiscal/kopecksArithmetic.js";

describe("Round 47: Family Deposit Balances, Loyalty & Multi-Currency Engine", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. Family Deposit Shared Balances & Spending Limits
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Family Deposit Shared Balances & Spending Limits", () => {
		it("creates a family deposit account with sponsor and kinship members", () => {
			const account = createFamilyDepositAccount({
				id: "ACC-FAM-001",
				familyGroupId: "GRP-SMIRNOV",
				familyName: "Семья Смирновых",
				sponsorPatientId: "PAT-001",
				sponsorFullName: "Смирнов Алексей Владимирович",
				sponsorInn: "770123456789",
				initialDepositRub: 50000, // 50 000 ₽
				members: [
					{
						patientId: "PAT-002",
						fullName: "Смирнова Елена Сергеевна",
						relationship: "spouse",
						isSpendingAuthorized: true,
					},
					{
						patientId: "PAT-003",
						fullName: "Смирнов Михаил Алексеевич",
						relationship: "child",
						isSpendingAuthorized: true,
						individualLimitRub: 15000, // 15 000 ₽ limit for child
					},
					{
						patientId: "PAT-004",
						fullName: "Смирнова Ольга Дмитриевна",
						relationship: "parent",
						isSpendingAuthorized: false, // spending locked by sponsor
					},
				],
			});

			assert.equal(account.id, "ACC-FAM-001");
			assert.equal(account.familyName, "Семья Смирновых");
			assert.equal(account.balanceKopecks, 5000000); // 50 000.00 ₽
			assert.equal(account.totalDepositedKopecks, 5000000);
			assert.equal(account.totalSpentKopecks, 0);
			assert.equal(account.members.length, 4); // sponsor + 3 members
		});

		it("credits funds into family deposit and records deposit transaction", () => {
			const initialAccount = createFamilyDepositAccount({
				id: "ACC-FAM-002",
				familyGroupId: "GRP-IVANOV",
				familyName: "Семья Ивановых",
				sponsorPatientId: "PAT-101",
				sponsorFullName: "Иванов Иван Иванович",
				initialDepositRub: 0,
			});

			const creditResult = calculateFamilyDepositCredit({
				account: initialAccount,
				amountRub: 35000.5,
				payerPatientId: "PAT-101",
				payerFullName: "Иванов Иван Иванович",
				notes: "Пополнение через СБП",
			});

			assert.equal(creditResult.creditedKopecks, 3500050);
			assert.equal(creditResult.creditedRub, 35000.5);
			assert.equal(creditResult.newBalanceKopecks, 3500050);
			assert.equal(creditResult.newBalanceRub, 35000.5);
			assert.equal(creditResult.transaction.transactionType, "deposit");
			assert.equal(creditResult.transaction.amountKopecks, 3500050);
			assert.equal(creditResult.updatedAccount.balanceKopecks, 3500050);
		});

		it("debits child dental treatment from shared family deposit within spending limit", () => {
			const account = createFamilyDepositAccount({
				id: "ACC-FAM-003",
				familyGroupId: "GRP-PETROV",
				familyName: "Семья Петровых",
				sponsorPatientId: "PAT-201",
				sponsorFullName: "Петров Петр Петрович",
				initialDepositRub: 40000,
				members: [
					{
						patientId: "PAT-202",
						fullName: "Петров Артем Петрович",
						relationship: "child",
						isSpendingAuthorized: true,
						individualLimitRub: 10000,
					},
				],
			});

			// Treatment: Caries restoration 6 500 ₽ for child
			const debitRes1 = calculateFamilyDepositDebit({
				account,
				patientId: "PAT-202",
				amountRub: 6500,
				invoiceId: "INV-2026-001",
				fiscalReceiptNumber: "REC-54FZ-891",
			});

			assert.equal(debitRes1.success, true);
			assert.equal(debitRes1.debitedKopecks, 650000);
			assert.equal(debitRes1.debitedRub, 6500);
			assert.equal(debitRes1.remainingInvoiceDueKopecks, 0);
			assert.equal(debitRes1.newBalanceKopecks, 3350000); // 40 000 - 6 500 = 33 500
			assert.equal(debitRes1.transaction?.transactionType, "debit");

			// Second treatment: 5 000 ₽ (Exceeds remaining 3 500 ₽ child limit)
			const debitRes2 = calculateFamilyDepositDebit({
				account: debitRes1.updatedAccount,
				patientId: "PAT-202",
				amountRub: 5000,
				invoiceId: "INV-2026-002",
			});

			assert.equal(debitRes2.success, true);
			assert.equal(debitRes2.debitedRub, 3500); // Debited up to child limit ceiling
			assert.equal(debitRes2.remainingInvoiceDueRub, 1500); // 1 500 ₽ remaining to pay out of pocket
			assert.equal(debitRes2.newBalanceRub, 30000);
		});

		it("blocks debit when spending authorization is disabled for member", () => {
			const account = createFamilyDepositAccount({
				id: "ACC-FAM-004",
				familyGroupId: "GRP-LOCKED",
				familyName: "Семья Кузнецовых",
				sponsorPatientId: "PAT-301",
				sponsorFullName: "Кузнецов К.К.",
				initialDepositRub: 20000,
				members: [
					{
						patientId: "PAT-302",
						fullName: "Кузнецов Денис",
						relationship: "child",
						isSpendingAuthorized: false, // Locked
					},
				],
			});

			const debitRes = calculateFamilyDepositDebit({
				account,
				patientId: "PAT-302",
				amountRub: 4000,
			});

			assert.equal(debitRes.success, false);
			assert.equal(debitRes.debitedKopecks, 0);
			assert.equal(debitRes.remainingInvoiceDueRub, 4000);
			assert.match(debitRes.errorMessageRu || "", /запрещено главой семьи/i);
		});

		it("refunds cancelled treatment back to family deposit", () => {
			const account = createFamilyDepositAccount({
				id: "ACC-FAM-005",
				familyGroupId: "GRP-REFUND",
				familyName: "Семья Соколовых",
				sponsorPatientId: "PAT-401",
				sponsorFullName: "Соколов С.С.",
				initialDepositRub: 10000,
				members: [
					{
						patientId: "PAT-402",
						fullName: "Соколова Анна",
						relationship: "spouse",
						isSpendingAuthorized: true,
					},
				],
			});

			const debitRes = calculateFamilyDepositDebit({
				account,
				patientId: "PAT-402",
				amountRub: 3000,
			});
			assert.equal(debitRes.newBalanceRub, 7000);

			const refundRes = calculateFamilyDepositRefund({
				account: debitRes.updatedAccount,
				patientId: "PAT-402",
				refundAmountKopecks: 300000,
				notes: "Возврат за отмененную процедуру",
			});

			assert.equal(refundRes.updatedAccount.balanceKopecks, 1000000);
			assert.equal(refundRes.transaction.transactionType, "refund");
			assert.equal(refundRes.transaction.amountRub, 3000);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Loyalty, Cashback & Statutory 54-FZ Discount Split
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Loyalty, Cashback & Statutory 54-FZ Discount Split", () => {
		it("calculates cashback points on eligible out-of-pocket payment across all tiers", () => {
			// Silver Tier (3% cashback)
			const silverAccrual = calculateLoyaltyAccrual({
				grossInvoiceKop: 1000000, // 10 000 ₽
				discountKop: 100000, // 1 000 ₽ discount
				pointsRedeemedKop: 0,
				tierId: "silver",
			});
			assert.equal(silverAccrual.paidOutOfPocketKop, 900000); // 9 000 ₽ paid
			assert.equal(silverAccrual.accruedPointsRub, 270); // 9000 * 3% = 270 pts

			// Gold Tier (5% cashback)
			const goldAccrual = calculateLoyaltyAccrual({
				grossInvoiceKop: 2000000, // 20 000 ₽
				tierId: "gold",
			});
			assert.equal(goldAccrual.accruedPointsRub, 1000); // 20000 * 5% = 1000 pts

			// Platinum Tier (10% cashback)
			const platAccrual = calculateLoyaltyAccrual({
				grossInvoiceKop: 5000000, // 50 000 ₽
				tierId: "platinum",
			});
			assert.equal(platAccrual.accruedPointsRub, 5000); // 50000 * 10% = 5000 pts

			// Family Pool Tier (7% cashback)
			const famAccrual = calculateLoyaltyAccrual({
				grossInvoiceKop: 1500000, // 15 000 ₽
				tierId: "family",
			});
			assert.equal(famAccrual.accruedPointsRub, 1050); // 15000 * 7% = 1050 pts
		});

		it("distributes bonus redemption discount proportionally across 54-FZ receipt items using Hamilton largest remainder method", () => {
			const items = [
				{
					id: "ITM-1",
					name: "Лечение глубокого кариеса",
					priceKop: 450000, // 4 500.00 ₽
					quantity: 1,
				},
				{
					id: "ITM-2",
					name: "Профессиональная гигиена AirFlow",
					priceKop: 350000, // 3 500.00 ₽
					quantity: 1,
				},
				{
					id: "ITM-3",
					name: "Прицельная радиовизиография",
					priceKop: 80000, // 800.00 ₽
					quantity: 1,
				},
			];

			// Total gross = 8 800.00 ₽. Patient requests to redeem 2 000 bonus points (Gold tier allows up to 50%)
			const redemption = calculateLoyaltyRedemption54Fz({
				items,
				availablePointsBalanceRub: 5000,
				requestedPointsRub: 2000,
				tierId: "gold",
			});

			assert.equal(redemption.grossInvoiceKop, 880000); // 8 800.00 ₽
			assert.equal(redemption.actualRedeemedPointsRub, 2000);
			assert.equal(redemption.actualRedeemedPointsKop, 200000);
			assert.equal(redemption.netPayableKop, 680000); // 6 800.00 ₽

			// Verify that sum of item discounts EXACTLY equals 200000 kopecks (2 000.00 ₽)
			const sumLineDiscountsKop = redemption.lineItemsDiscounts.reduce(
				(sum, d) => sum + d.discountKop,
				0,
			);
			assert.equal(sumLineDiscountsKop, 200000);

			// Verify that sum of net payable per item EXACTLY equals net payable 680 000 kop
			const sumNetPayableKop = redemption.lineItemsDiscounts.reduce(
				(sum, d) => sum + d.netPayableKop,
				0,
			);
			assert.equal(sumNetPayableKop, 680000);

			// 54-FZ Tag 1043 total discount matches exactly
			assert.equal(
				redemption.fiscal54FzSplit.tag1043LineDiscountsTotalKop,
				200000,
			);
			assert.equal(redemption.fiscal54FzSplit.tag1081ElectronicKop, 680000);
		});

		it("generates and validates 16-digit gift certificate serial numbers with Luhn check digit", () => {
			for (let seed = 1; seed <= 10; seed++) {
				const serial = generateLuhn16Certificate(seed * 42);
				assert.equal(serial.length, 19); // "XXXX-XXXX-XXXX-XXXX" = 16 digits + 3 hyphens
				assert.equal(serial.startsWith("7701-"), true);
				assert.equal(validateLuhn16Certificate(serial), true);

				// Test tamper detection: alter last digit
				const tampered =
					serial.slice(0, 18) +
					((parseInt(serial[18]!, 10) + 1) % 10).toString();
				assert.equal(validateLuhn16Certificate(tampered), false);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Multi-Currency Medical Tourism Calculator
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Multi-Currency Medical Tourism Calculator", () => {
		it("converts Russian Rubles into USD, EUR, KZT, BYN, CNY, AED with zero kopeck drift", () => {
			const rubKop = 10000000; // 100 000.00 ₽

			// 1. USD: CBR rate = 91.50 ₽
			const usd = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "USD",
				bankSpreadPercent: 0,
			});
			assert.equal(usd.targetCurrency, "USD");
			assert.equal(usd.targetSymbol, "$");
			assert.equal(usd.targetAmountDecimal, 1092.9); // 100 000 / 91.5 = 1092.896... -> 1092.90
			assert.equal(usd.targetFormatted, "$1,092.90");

			// 2. EUR: CBR rate = 99.80 ₽
			const eur = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "EUR",
				bankSpreadPercent: 0,
			});
			assert.equal(eur.targetFormatted, "€1,002.00");

			// 3. KZT: CBR rate = 19.50 ₽ per 100 KZT (Nominal 100)
			const kzt = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "KZT",
				bankSpreadPercent: 0,
			});
			// 100 000 / (19.50 / 100) = 512 820.512... -> 512 820.51 ₸
			assert.equal(kzt.targetAmountDecimal, 512820.51);
			assert.match(kzt.targetFormatted, /512 820\.51 ₸/);

			// 4. BYN: CBR rate = 28.20 ₽
			const byn = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "BYN",
				bankSpreadPercent: 0,
			});
			assert.equal(byn.targetAmountDecimal, 3546.1);
			assert.match(byn.targetFormatted, /3 546\.10 Br/);

			// 5. CNY: CBR rate = 12.80 ₽
			const cny = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "CNY",
				bankSpreadPercent: 0,
			});
			assert.equal(cny.targetFormatted, "¥7,812.50");

			// 6. AED: CBR rate = 24.90 ₽
			const aed = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "AED",
				bankSpreadPercent: 0,
			});
			assert.equal(aed.targetFormatted, "4,016.06 AED");
		});

		it("applies bank acquisition spread (e.g. +2.0%) correctly to cross-border conversions", () => {
			const rubKop = 9150000; // 91 500.00 ₽ (At 91.50 rate = exactly $1,000.00 without spread)

			const withSpread = convertRubToForeignCurrency({
				amountRubKopecks: rubKop,
				targetCurrency: "USD",
				bankSpreadPercent: 2.0, // +2.0% bank conversion markup
			});

			assert.equal(withSpread.officialCbrRateRub, 91.5);
			assert.equal(withSpread.effectiveRateRub, 93.33); // 91.5 * 1.02 = 93.33
			assert.equal(withSpread.targetAmountDecimal, 980.39); // 91 500 / 93.33 = $980.39
		});

		it("converts foreign currency amounts back to Ruble kopecks accurately", () => {
			const backConv = convertForeignCurrencyToRub({
				foreignAmountMinor: 100000, // $1,000.00 (100,000 cents)
				currency: "USD",
			});

			assert.equal(backConv.rubKopecks, 9150000); // 91 500.00 ₽
			assert.equal(backConv.rubDecimal, 91500);
			assert.match(backConv.formattedRub, /91 500,00 ₽|91 500\.00 ₽/);
		});

		it("generates a complete dual-language Medical Tourism Treatment Plan Quote", () => {
			const quote = calculateMedicalTourismQuote({
				patientFullName: "Dr. John H. Watson",
				countryRu: "Великобритания",
				countryEn: "United Kingdom",
				targetCurrency: "USD",
				discountRub: 10000, // 10 000 ₽ promo discount
				bankSpreadPercent: 1.5,
				items: [
					{
						serviceNameRu: "Комплексная имплантация All-on-4 (Nobel Biocare)",
						serviceNameEn: "All-on-4 Full Arch Dental Implantation (Nobel Biocare)",
						code804n: "A16.07.054",
						quantity: 1,
						priceRub: 280000, // 280 000 ₽
					},
					{
						serviceNameRu: "Керамическая коронка E-max (CAD/CAM фрезерование)",
						serviceNameEn: "E-max All-Ceramic Crown (CAD/CAM Milled)",
						code804n: "A16.07.004",
						quantity: 4,
						priceRub: 35000, // 4 * 35 000 = 140 000 ₽
					},
				],
			});

			assert.equal(quote.patientFullName, "Dr. John H. Watson");
			assert.equal(quote.targetCurrency, "USD");
			assert.equal(quote.targetSymbol, "$");
			assert.equal(quote.totalGrossRub, 420000); // 280k + 140k = 420 000 ₽
			assert.equal(quote.discountRub, 10000);
			assert.equal(quote.totalNetRub, 410000); // 410 000 ₽
			assert.equal(quote.items.length, 2);

			// Check currency formatting
			assert.equal(quote.totalNetForeignFormatted.startsWith("$"), true);
			assert.equal(quote.recommendedPaymentChannelsRu.length > 0, true);
			assert.equal(quote.recommendedPaymentChannelsEn.length > 0, true);
		});
	});
});
