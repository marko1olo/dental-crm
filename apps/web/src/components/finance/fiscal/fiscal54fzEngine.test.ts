import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFiscalIdempotencyKey,
	calculateAdvanceStagePrepayment,
	calculateCashChange,
	calculateFinalSettlementWithAdvanceOffset,
	calculateIncomeReturnDraft,
	calculateInstallmentPlanSchedule,
	combineFamilyInvoicesIntoFiscalDraft,
	compile54FzFiscalTags,
	compile54FzShiftCloseZReport,
	compileFiscalDraftSummary,
	type FiscalItemDraft,
	getCashPresetSuggestions,
	type SplitTenderState,
	validateDataMatrixBarcode,
} from "./fiscal54fzEngine";

describe("Frontend 54-FZ (FFD 1.2) Fiscal Engine Tests", () => {
	it("1.1 compileFiscalDraftSummary — Exact kopeck arithmetic and tender balancing", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Консультация стоматолога-терапевта",
				priceRub: 1500.5,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "item-2",
				name: "Ультракаин Д-С форте 1.7 мл",
				priceRub: 800.0,
				quantity: 2,
				subject: "goods_with_marking",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
				markingCode: "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ",
			},
		];

		// Total: 1500.50 + 1600.00 = 3100.50 RUB = 310,050 kopecks
		const balancedTenders: SplitTenderState = {
			cashRub: 1000.0,
			cardRub: 1100.5,
			sbpRub: 1000.0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};

		const summary = compileFiscalDraftSummary(items, balancedTenders);

		assert.equal(summary.totalKopecks, 310050);
		assert.equal(summary.totalRub, 3100.5);
		assert.equal(summary.totalRubFormatted, "3100.50");
		assert.equal(summary.allocatedKopecks, 310050);
		assert.equal(summary.remainingKopecks, 0);
		assert.equal(summary.isFullyAllocated, true);
		assert.equal(summary.isOverallocated, false);
		assert.equal(summary.markedItemsCount, 1);
		assert.equal(summary.itemsCount, 2);
	});

	it("1.2 compileFiscalDraftSummary — Detects remaining due and overallocation", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Лечение кариеса",
				priceRub: 5000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		// Under-allocated: 3000 < 5000
		const underTenders: SplitTenderState = {
			cashRub: 3000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		const underSummary = compileFiscalDraftSummary(items, underTenders);
		assert.equal(underSummary.isFullyAllocated, false);
		assert.equal(underSummary.remainingRub, 2000.0);
		assert.equal(underSummary.isOverallocated, false);

		// Over-allocated: 6000 > 5000
		const overTenders: SplitTenderState = {
			cashRub: 6000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		};
		const overSummary = compileFiscalDraftSummary(items, overTenders);
		assert.equal(overSummary.isFullyAllocated, false);
		assert.equal(overSummary.isOverallocated, true);
		assert.equal(overSummary.remainingRub, -1000.0);
	});

	it("1.3 compileFiscalDraftSummary — Identifies Code 02 expensive treatment for dental implants", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-1",
				name: "Установка дентального имплантата Nobel Biocare",
				priceRub: 45000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const summary = compileFiscalDraftSummary(items, {
			cashRub: 45000.0,
			cardRub: 0,
			sbpRub: 0,
			advanceOffsetRub: 0,
			certificateRub: 0,
		});

		assert.equal(summary.overallTaxDeductionCategory, "2");
	});

	it("1.4 validateDataMatrixBarcode — Validates and parses GS1 DataMatrix barcodes", () => {
		const validBarcode = "(01)03664798000016(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const result = validateDataMatrixBarcode(validBarcode);

		assert.equal(result.isValid, true);
		assert.equal(result.gtin, "03664798000016");
		assert.equal(result.serialNumber, "1A2B3C4D5E6F7");
		assert.ok(result.matchedProduct);
		assert.ok(result.matchedProduct?.tradeName.includes("Ультракаин"));

		// Bad check digit
		const invalidGtinBarcode = "(01)03664798000019(21)1A2B3C4D5E6F7(91)ABCD(92)XYZ";
		const invalidResult = validateDataMatrixBarcode(invalidGtinBarcode);
		assert.equal(invalidResult.isValid, false);
		assert.ok(invalidResult.errorMessage?.includes("контрольная сумма"));
	});

	it("1.5 calculateCashChange & getCashPresetSuggestions — Fast Cashier change calculation", () => {
		// Change calculation: Required 2350 ₽, Patient tendered 3000 ₽ -> Change 650 ₽
		const changeResult = calculateCashChange(2350, 3000);
		assert.equal(changeResult.changeRub, 650);
		assert.equal(changeResult.changeKopecks, 65000);
		assert.equal(changeResult.isShortage, false);

		// Shortage calculation: Required 2350 ₽, Patient tendered 2000 ₽ -> Shortage 350 ₽
		const shortageResult = calculateCashChange(2350, 2000);
		assert.equal(shortageResult.changeRub, 0);
		assert.equal(shortageResult.isShortage, true);
		assert.equal(shortageResult.shortageRub, 350);

		// Cash preset suggestions
		const presets = getCashPresetSuggestions(2350);
		assert.ok(presets.includes(2350)); // Exact
		assert.ok(presets.includes(5000)); // Standard bill
		assert.ok(presets.includes(2500)); // Round to next 500
		assert.ok(presets.includes(3000)); // Round to next 1000

		// Composite Idempotency-Key
		const key = buildFiscalIdempotencyKey("uuid-123", { amount: 2350 });
		assert.ok(key.startsWith("uuid-123#"));
		assert.equal(key.split("#").length, 2);
	});

	it("1.6 calculateAdvanceStagePrepayment — FFD 1.2 Tag 1214=2 partial prepayment calculation", () => {
		const result = calculateAdvanceStagePrepayment({
			stageName: "Аванс за ортопедический этап: Циркониевая коронка",
			stageTotalRub: 35000.0,
			prepaymentAmountRub: 15000.0,
			paymentMethod: "prepayment",
			tender: "card",
			taxDeductionCategory: "1",
		});

		assert.equal(result.itemDraft.priceRub, 15000.0);
		assert.equal(result.itemDraft.method, "prepayment");
		assert.equal(result.tenders.cardRub, 15000.0);
		assert.equal(result.tenders.advanceOffsetRub, 0);
		assert.equal(result.tag1215AdvanceOffsetKopecks, 0);
		assert.equal(result.remainingStageRub, 20000.0);
		assert.equal(result.remainingStageKopecks, 2000000);
	});

	it("1.7 calculateFinalSettlementWithAdvanceOffset — FFD 1.2 Tag 1214=4 with Tag 1215 Advance Offset", () => {
		const stageItems: FiscalItemDraft[] = [
			{
				id: "item-crown",
				name: "Установка коронки из диоксида циркония",
				priceRub: 35000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		// Previously paid advance: 15,000 ₽. Total due: 35,000 ₽.
		// Result: Advance offset (Tag 1215) = 15,000 ₽, Additional cash/card = 20,000 ₽.
		const settlement = calculateFinalSettlementWithAdvanceOffset({
			stageItems,
			previouslyPaidAdvanceRub: 15000.0,
			additionalPaymentTender: "sbp",
		});

		assert.equal(settlement.items[0]?.method, "full_payment");
		assert.equal(settlement.tag1215AdvanceOffsetKopecks, 1500000);
		assert.equal(settlement.tenders.advanceOffsetRub, 15000.0);
		assert.equal(settlement.tenders.sbpRub, 20000.0);
		assert.equal(settlement.additionalPaymentRub, 20000.0);
	});

	it("1.8 compile54FzFiscalTags — Family balance offset (Tag 1215) and Card/SBP surcharge (Tag 1081)", () => {
		// Example: Treatment total = 12,450.75 ₽
		// Patient uses Family Wallet = 5,000.00 ₽ (Tag 1215)
		// Patient pays with SBP QR = 4,000.75 ₽ (Tag 1081)
		// Patient pays with Bank Card = 2,450.00 ₽ (Tag 1081)
		// Patient pays Cash = 1,000.00 ₽ (Tag 1031)
		// Total tender = 5000 + 4000.75 + 2450 + 1000 = 12,450.75 ₽ = 1,245,075 kopecks
		const mixedTenders: SplitTenderState = {
			cashRub: 1000.0,
			cardRub: 2450.0,
			sbpRub: 4000.75,
			advanceOffsetRub: 0,
			familyWalletRub: 5000.0,
			certificateRub: 0,
		};

		const expectedTotalKopecks = 1245075;
		const tags = compile54FzFiscalTags(mixedTenders, expectedTotalKopecks);

		// Tag 1031: Cash = 100,000 kopecks (1,000.00 ₽)
		assert.equal(tags.tag1031CashKopecks, 100000);
		assert.equal(tags.tag1031CashRub, 1000.0);

		// Tag 1081: Electronic (Card + SBP) = 245,000 + 400,075 = 645,075 kopecks (6,450.75 ₽)
		assert.equal(tags.tag1081ElectronicKopecks, 645075);
		assert.equal(tags.tag1081ElectronicRub, 6450.75);

		// Tag 1215: Advance/Family balance offset = 500,000 kopecks (5,000.00 ₽)
		assert.equal(tags.tag1215PrepaidKopecks, 500000);
		assert.equal(tags.tag1215PrepaidRub, 5000.0);

		// Total & Parity
		assert.equal(tags.totalTenderKopecks, 1245075);
		assert.equal(tags.totalTenderRub, 12450.75);
		assert.equal(tags.isBalanced, true);
	});

	it("1.9 compileFiscalDraftSummary — Mixed Family Balance and SBP QR allocation parity", () => {
		const items: FiscalItemDraft[] = [
			{
				id: "item-composite-1",
				name: "Профессиональная гигиена полости рта и AirFlow",
				priceRub: 7500.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "item-composite-2",
				name: "Лечение глубокого кариеса с реставрацией Estelite Asteria",
				priceRub: 8500.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		// Total: 7,500 + 8,500 = 16,000.00 ₽ = 1,600,000 kopecks
		// Split: Family balance = 10,000 ₽ (Tag 1215), SBP surcharge = 6,000 ₽ (Tag 1081)
		const tenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 0,
			sbpRub: 6000.0,
			advanceOffsetRub: 0,
			familyWalletRub: 10000.0,
			certificateRub: 0,
		};

		const summary = compileFiscalDraftSummary(items, tenders);

		assert.equal(summary.totalKopecks, 1600000);
		assert.equal(summary.totalRub, 16000.0);
		assert.equal(summary.allocatedKopecks, 1600000);
		assert.equal(summary.remainingKopecks, 0);
		assert.equal(summary.isFullyAllocated, true);
		assert.equal(summary.isOverallocated, false);
	});

	it("1.10 combineFamilyInvoicesIntoFiscalDraft — Combines multi-child/family invoices with separate patient itemization", () => {
		const payer = {
			patientId: "pat-parent-1",
			payerFullName: "Иванов Иван Петрович",
			payerPhone: "+7 (999) 111-22-33",
		};

		const child1Items: FiscalItemDraft[] = [
			{
				id: "child1-tooth-fill",
				name: "Лечение кариеса временного зуба",
				code804n: "A16.07.002.001",
				toothFdiNumber: 54,
				priceRub: 4500.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const child2Items: FiscalItemDraft[] = [
			{
				id: "child2-hygiene",
				name: "Комплексная гигиена полости рта детская",
				code804n: "A16.07.051",
				priceRub: 3200.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
			{
				id: "child2-fluoride",
				name: "Глубокое фторирование эмали (все зубы)",
				code804n: "A11.07.024",
				priceRub: 1800.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const familyGroups = [
			{
				patientId: "pat-child-1",
				patientFullName: "Иванова Анна Ивановна",
				relationshipRu: "Дочь",
				items: child1Items,
			},
			{
				patientId: "pat-child-2",
				patientFullName: "Иванов Михаил Иванович",
				relationshipRu: "Сын",
				items: child2Items,
			},
		];

		const result = combineFamilyInvoicesIntoFiscalDraft(payer, familyGroups);

		// Verification:
		// Child 1 total = 4,500.00 ₽ (450,000 kop)
		// Child 2 total = 3,200 + 1,800 = 5,000.00 ₽ (500,000 kop)
		// Total combined = 9,500.00 ₽ (950,000 kop)
		assert.equal(result.patientsCount, 2);
		assert.equal(result.combinedItems.length, 3);
		assert.equal(result.totalKopecks, 950000);
		assert.equal(result.totalRub, 9500.0);
		assert.equal(result.totalRubFormatted, "9500.00");

		// Check item 1 patient attribution
		assert.equal(result.combinedItems[0]?.patientFullName, "Иванова Анна Ивановна");
		assert.equal(result.combinedItems[0]?.familyMemberRole, "Дочь");
		assert.equal(result.combinedItems[0]?.toothFdiNumber, 54);

		// Check item 2 & 3 patient attribution
		assert.equal(result.combinedItems[1]?.patientFullName, "Иванов Михаил Иванович");
		assert.equal(result.combinedItems[1]?.familyMemberRole, "Сын");
		assert.equal(result.combinedItems[2]?.patientFullName, "Иванов Михаил Иванович");

		// Check summaries by patient
		assert.equal(result.summaryByPatient.length, 2);
		assert.equal(result.summaryByPatient[0]?.patientFullName, "Иванова Анна Ивановна");
		assert.equal(result.summaryByPatient[0]?.subtotalRub, 4500.0);
		assert.equal(result.summaryByPatient[1]?.patientFullName, "Иванов Михаил Иванович");
		assert.equal(result.summaryByPatient[1]?.subtotalRub, 5000.0);

		// Check compiled receipt with family tenders
		const tenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 4500.0, // Parent pays 4,500 ₽ by Card (Tag 1081)
			sbpRub: 0,
			advanceOffsetRub: 0,
			familyWalletRub: 5000.0, // Parent covers 5,000 ₽ from Family Deposit (Tag 1215)
			certificateRub: 0,
		};

		const receiptSummary = compileFiscalDraftSummary(result.combinedItems, tenders);
		assert.equal(receiptSummary.totalKopecks, 950000);
		assert.equal(receiptSummary.isFullyAllocated, true);
		assert.equal(receiptSummary.isOverallocated, false);
		assert.equal(receiptSummary.itemsCount, 3);
	});

	it("1.11 compile54FzShiftCloseZReport — Daily Shift Close balancing with Cash (Tag 1031), Electronic (Tag 1081), Advance Offset (Tag 1215), and Returns (Tag 1054=2)", () => {
		// Daily receipts journal:
		// 1. Receipt 1 (Income): Cash = 5,000 ₽ (Tag 1031)
		// 2. Receipt 2 (Income): Card = 12,000 ₽ + SBP = 8,000 ₽ = 20,000 ₽ (Tag 1081)
		// 3. Receipt 3 (Income): Deposit/Advance = 15,000 ₽ (Tag 1215) + SBP = 5,000 ₽ (Tag 1081) = 20,000 ₽
		// 4. Receipt 4 (Income): Mixed Cash = 3,000 ₽ + Family Balance = 7,000 ₽ = 10,000 ₽
		// 5. Receipt 5 (Income Return): Cash = 2,000 ₽ returned to patient
		// 6. Receipt 6 (Income Return): Card = 4,000 ₽ returned to patient
		const shiftReceipts = [
			{
				id: "rec-1",
				operationType: "income" as const,
				totalRub: 5000.0,
				tenders: { cashRub: 5000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-2",
				operationType: "income" as const,
				totalRub: 20000.0,
				tenders: { cashRub: 0, cardRub: 12000.0, sbpRub: 8000.0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-3",
				operationType: "income" as const,
				totalRub: 20000.0,
				tenders: { cashRub: 0, cardRub: 0, sbpRub: 5000.0, advanceOffsetRub: 15000.0, certificateRub: 0 },
			},
			{
				id: "rec-4",
				operationType: "income" as const,
				totalRub: 10000.0,
				tenders: { cashRub: 3000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, familyWalletRub: 7000.0, certificateRub: 0 },
			},
			{
				id: "rec-5",
				operationType: "income_return" as const,
				totalRub: 2000.0,
				tenders: { cashRub: 2000.0, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
			{
				id: "rec-6",
				operationType: "income_return" as const,
				totalRub: 4000.0,
				tenders: { cashRub: 0, cardRub: 4000.0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
			},
		];

		const zReport = compile54FzShiftCloseZReport(shiftReceipts, 42);

		// Verification of Income Counters (Тег 1054 = 1)
		assert.equal(zReport.shiftNumber, 42);
		assert.equal(zReport.incomeCount, 4);
		// Cash = 5,000 + 3,000 = 8,000.00 ₽ (800,000 kop)
		assert.equal(zReport.incomeCashRub, 8000.0);
		assert.equal(zReport.incomeCashKopecks, 800000);
		// Electronic (Card + SBP) = 20,000 + 5,000 = 25,000.00 ₽ (2,500,000 kop)
		assert.equal(zReport.incomeElectronicRub, 25000.0);
		assert.equal(zReport.incomeElectronicKopecks, 2500000);
		// Advance Offset = 15,000 + 7,000 = 22,000.00 ₽ (2,200,000 kop)
		assert.equal(zReport.incomeAdvanceOffsetRub, 22000.0);
		assert.equal(zReport.incomeAdvanceOffsetKopecks, 2200000);
		// Total Income = 8,000 + 25,000 + 22,000 = 55,000.00 ₽ (5,500,000 kop)
		assert.equal(zReport.incomeTotalRub, 55000.0);
		assert.equal(zReport.incomeTotalKopecks, 5500000);

		// Verification of Return Counters (Тег 1054 = 2)
		assert.equal(zReport.incomeReturnCount, 2);
		assert.equal(zReport.incomeReturnCashRub, 2000.0);
		assert.equal(zReport.incomeReturnElectronicRub, 4000.0);
		assert.equal(zReport.incomeReturnTotalRub, 6000.0);
		assert.equal(zReport.incomeReturnTotalKopecks, 600000);

		// Verification of Net Revenue & Drawer Balancing
		// Net revenue = 55,000 - 6,000 = 49,000.00 ₽ (4,900,000 kop)
		assert.equal(zReport.netRevenueRub, 49000.0);
		assert.equal(zReport.netRevenueKopecks, 4900000);
		// Cash in drawer = 8,000 - 2,000 = 6,000.00 ₽ (600,000 kop)
		assert.equal(zReport.cashInDrawerRub, 6000.0);
		assert.equal(zReport.cashInDrawerKopecks, 600000);
		assert.equal(zReport.isBalanced, true);
	});

	it("1.12 calculateIncomeReturnDraft — 1-Click Income Return (Tag 1054=2) with Deposit Reversal (Tag 1215) and Card Refund (Tag 1081)", () => {
		// Original treatment invoice: Total 50,000 ₽
		// Paid by: Card = 30,000 ₽ (Tag 1081) + Patient Personal Advance Offset = 20,000 ₽ (Tag 1215)
		const originalTenders: SplitTenderState = {
			cashRub: 0,
			cardRub: 30000.0,
			sbpRub: 0,
			advanceOffsetRub: 20000.0,
			familyWalletRub: 0,
			certificateRub: 0,
		};

		// Patient cancels 1 treatment stage: 25,000 ₽ returned
		const returnedItems: FiscalItemDraft[] = [
			{
				id: "ret-item-1",
				name: "Керамическая коронка E-max (Возврат)",
				priceRub: 25000.0,
				quantity: 1,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		];

		const returnDraft = calculateIncomeReturnDraft({
			returnedItems,
			originalTenders,
			originalTotalKopecks: 5000000,
		});

		assert.equal(returnDraft.operationType, "income_return");
		assert.equal(returnDraft.totalReturnRub, 25000.0);
		assert.equal(returnDraft.totalReturnKopecks, 2500000);
		assert.equal(returnDraft.isPartialRefund, true);

		// Proportional restoration: 50% refund ratio
		// Card refund (Tag 1081) = 30,000 * 0.5 = 15,000.00 ₽ (1,500,000 kop)
		assert.equal(returnDraft.refundToCardRub, 15000.0);
		assert.equal(returnDraft.refundToCardKopecks, 1500000);
		// Deposit reversal to patient balance (Tag 1215) = 20,000 * 0.5 = 10,000.00 ₽ (1,000,000 kop)
		assert.equal(returnDraft.restoredDepositRub, 10000.0);
		assert.equal(returnDraft.restoredDepositKopecks, 1000000);

		// Verification of 54-FZ Return Tags
		assert.equal(returnDraft.fiscalTags.tag1081ElectronicKopecks, 1500000);
		assert.equal(returnDraft.fiscalTags.tag1215PrepaidKopecks, 1000000);
		assert.equal(returnDraft.fiscalTags.tag1031CashKopecks, 0);
		assert.equal(returnDraft.fiscalTags.isBalanced, true);
	});

	it("1.13 calculateInstallmentPlanSchedule — Zero-interest installment plan calculation with 30% down payment (Tag 1214=2) and 3 monthly milestones", () => {
		// Total treatment cost: 100,000.50 ₽ (10,000,050 kop)
		// 30% down payment today = 30,000.15 ₽ (3,000,015 kop)
		// Remaining debt = 70,000.35 ₽ (7,000,035 kop)
		// 3 monthly installments: 23,333.45 ₽ each
		const result = calculateInstallmentPlanSchedule({
			totalRub: 100000.5,
			downPaymentPercent: 30,
			monthsCount: 3,
			startDateIso: "2026-09-01T10:00:00.000Z",
			planTitle: "Тотальная реабилитация All-on-4",
		});

		assert.equal(result.totalPlanRub, 100000.5);
		assert.equal(result.totalPlanKopecks, 10000050);
		assert.equal(result.downPaymentPercent, 30);
		assert.equal(result.downPaymentRub, 30000.15);
		assert.equal(result.downPaymentKopecks, 3000015);
		assert.equal(result.remainingDebtRub, 70000.35);
		assert.equal(result.remainingDebtKopecks, 7000035);
		assert.equal(result.monthsCount, 3);
		assert.equal(result.isBalanced, true);

		// Check stages breakdown
		assert.equal(result.stages.length, 4); // Stage 0 (Down payment) + 3 monthly installments

		// Stage 0: Initial down payment today (Tag 1214 = 2 / prepayment)
		assert.equal(result.stages[0]?.stageIndex, 0);
		assert.equal(result.stages[0]?.isInitialDownPayment, true);
		assert.equal(result.stages[0]?.amountRub, 30000.15);
		assert.equal(result.stages[0]?.paymentMethod, "prepayment");
		assert.equal(result.stages[0]?.status, "pending");

		// Stage 1: Month 1
		assert.equal(result.stages[1]?.stageIndex, 1);
		assert.equal(result.stages[1]?.amountRub, 23333.45);
		assert.equal(result.stages[1]?.paymentMethod, "prepayment");
		assert.equal(result.stages[1]?.status, "scheduled");

		// Stage 2: Month 2
		assert.equal(result.stages[2]?.stageIndex, 2);
		assert.equal(result.stages[2]?.amountRub, 23333.45);
		assert.equal(result.stages[2]?.paymentMethod, "prepayment");

		// Stage 3: Month 3 (Final closure / full payment)
		assert.equal(result.stages[3]?.stageIndex, 3);
		assert.equal(result.stages[3]?.amountRub, 23333.45);
		assert.equal(result.stages[3]?.paymentMethod, "full_payment");

		// Verify total of all stages equals 100,000.50 ₽ exactly
		const sumKop = result.stages.reduce((acc, s) => acc + s.amountKopecks, 0);
		assert.equal(sumKop, 10000050);
	});
});

