import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFiscalIdempotencyKey,
	calculateAdvanceStagePrepayment,
	calculateCashChange,
	calculateFinalSettlementWithAdvanceOffset,
	combineFamilyInvoicesIntoFiscalDraft,
	compile54FzFiscalTags,
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
});

