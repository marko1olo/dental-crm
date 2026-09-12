/**
 * packages/shared/src/finance/__tests__/wave135ClinicExpenses.test.ts
 *
 * WAVE 135: Unit & Integration Tests for Clinic Operating Expenses & Chair-Hour Cost Engine.
 * 100% Zero Mocks. Validates:
 * - Kopeck-exact arithmetic for chair-hour and chair-minute costs.
 * - Solo Doctor (Mandates 8e & 8n) 1-click chair rent setup.
 * - Visit margin analysis integrated with Wave 134 treatment consumables.
 * - Doctor autonomy (Mandate 8e: up to 100% discounts without NaN or system lockouts).
 * - Statutory managerial A4 statement with strictly 0 cartoon emojis (Mandate 8d item 7).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	expenseCategorySchema,
	expenseRecurrenceSchema,
	clinicExpenseRecordSchema,
	chairHourCostInputSchema,
	chairHourCostResultSchema,
	visitMarginInputSchema,
	visitMarginResultSchema,
	normalizeExpenseToMonthlyKopecks,
	aggregateExpensesByCategory,
	calculateTotalMonthlyExpenses,
	calculateChairHourCost,
	createSoloPracticeProfile,
	calculateSoloDoctorChairCost,
	calculateVisitMargin,
	formatClinicExpensesAndChairCostA4Report,
	clinicExpensesEngine,
	EXPENSE_CATEGORY_LABELS_RU,
	EXPENSE_RECURRENCE_LABELS_RU,
	type ClinicExpenseRecord,
	type ChairHourCostInput,
	type VisitMarginInput,
} from "../clinicExpensesEngine.js";

import {
	calculateServiceConsumables,
	type ConsumableItemLink,
	type RenderedServiceItem,
} from "../../warehouse/treatmentConsumablesEngine.js";

describe("Wave 135: Clinic Expenses & Chair-Hour Cost Allocation Engine", () => {
	// Sample clinic expenses data across multiple categories and recurrences
	const sampleExpenses: ClinicExpenseRecord[] = [
		{
			id: "exp-rent-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "rent",
			amountKopecks: 15_000_000, // 150,000.00 руб./мес
			expenseDate: "2026-09-01",
			description: "Аренда помещения клиники 120 кв.м.",
			recurrence: "monthly",
			isDirectChairCost: false,
		},
		{
			id: "exp-salaries-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "salaries",
			amountKopecks: 32_000_000, // 320,000.00 руб./мес
			expenseDate: "2026-09-05",
			description: "Окладная часть ФОТ администраторов и санитарок",
			recurrence: "monthly",
			isDirectChairCost: false,
		},
		{
			id: "exp-utilities-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "utilities",
			amountKopecks: 4_500_000, // 45,000.00 руб./мес
			expenseDate: "2026-09-10",
			description: "Коммунальные платежи, электричество, вода, интернет",
			recurrence: "monthly",
			isDirectChairCost: false,
		},
		{
			id: "exp-supplies-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "supplies",
			amountKopecks: 6_000_000, // 60,000.00 руб./мес
			expenseDate: "2026-09-12",
			description: "Общеклинические дезинфектанты, маски, перчатки",
			recurrence: "monthly",
			isDirectChairCost: false,
		},
		{
			id: "exp-equip-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "equipment_lease",
			amountKopecks: 9_000_000, // 90,000.00 руб./мес
			expenseDate: "2026-09-15",
			description: "Лизинг стоматологических установок KaVo (3 шт.)",
			recurrence: "monthly",
			isDirectChairCost: true, // direct operatory cost!
		},
		{
			id: "exp-maint-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "maintenance",
			amountKopecks: 6_000_000, // 60,000.00 руб. в квартал -> 20,000.00 руб./мес
			expenseDate: "2026-09-01",
			description: "Ежеквартальное ТО компрессора и автоклавов",
			recurrence: "quarterly",
			isDirectChairCost: true,
		},
		{
			id: "exp-ins-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "insurance",
			amountKopecks: 12_000_000, // 120,000.00 руб. в год -> 10,000.00 руб./мес
			expenseDate: "2026-01-10",
			description: "Годовой полис страхования ответственности клиники",
			recurrence: "annual",
			isDirectChairCost: false,
		},
		{
			id: "exp-soft-01",
			organizationId: "org-dente-01",
			clinicId: "clinic-main",
			category: "license_software",
			amountKopecks: 1_500_000, // 15,000.00 руб./мес
			expenseDate: "2026-09-01",
			description: "Подписка МИС DENTE, ОФД и Честный Знак",
			recurrence: "monthly",
			isDirectChairCost: false,
		},
	];

	// ─────────────────────────────────────────────────────────────────────────
	// 1. Zod Schemas & Types
	// ─────────────────────────────────────────────────────────────────────────

	it("1. Zod schemas: validates 10 categories, recurrences and expense records", () => {
		// 10 categories
		const validCategories = [
			"rent",
			"utilities",
			"salaries",
			"supplies",
			"equipment_lease",
			"insurance",
			"maintenance",
			"marketing",
			"license_software",
			"other",
		];
		for (const cat of validCategories) {
			assert.equal(expenseCategorySchema.parse(cat), cat);
			assert.ok(typeof EXPENSE_CATEGORY_LABELS_RU[cat as keyof typeof EXPENSE_CATEGORY_LABELS_RU] === "string");
		}

		assert.throws(() => expenseCategorySchema.parse("invalid_category"));

		// 4 recurrences
		for (const rec of ["one_time", "monthly", "quarterly", "annual"]) {
			assert.equal(expenseRecurrenceSchema.parse(rec), rec);
			assert.ok(typeof EXPENSE_RECURRENCE_LABELS_RU[rec as keyof typeof EXPENSE_RECURRENCE_LABELS_RU] === "string");
		}

		// Record validation
		const parsedRecord = clinicExpenseRecordSchema.parse(sampleExpenses[0]);
		assert.equal(parsedRecord.amountKopecks, 15_000_000);
		assert.equal(parsedRecord.category, "rent");
		assert.equal(parsedRecord.recurrence, "monthly");
		assert.equal(parsedRecord.isDirectChairCost, false);

		// Negative amount fails
		assert.throws(() =>
			clinicExpenseRecordSchema.parse({
				...sampleExpenses[0],
				amountKopecks: -100,
			}),
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Expense Normalization & Aggregation
	// ─────────────────────────────────────────────────────────────────────────

	it("2. normalizeExpenseToMonthlyKopecks: accurately converts annual and quarterly expenses to monthly kopecks", () => {
		// Monthly: unchanged
		assert.equal(normalizeExpenseToMonthlyKopecks(300_000, "monthly"), 300_000);

		// Quarterly: divide by 3
		assert.equal(normalizeExpenseToMonthlyKopecks(600_000, "quarterly"), 200_000);
		assert.equal(normalizeExpenseToMonthlyKopecks(100_000, "quarterly"), 33_333); // rounded to nearest kopeck

		// Annual: divide by 12
		assert.equal(normalizeExpenseToMonthlyKopecks(1_200_000, "annual"), 100_000);
		assert.equal(normalizeExpenseToMonthlyKopecks(100_000, "annual"), 8_333);

		// One time: in the month
		assert.equal(normalizeExpenseToMonthlyKopecks(500_000, "one_time"), 500_000);
	});

	it("3. aggregateExpensesByCategory & calculateTotalMonthlyExpenses: aggregates monthly sums with general vs direct split", () => {
		const totals = calculateTotalMonthlyExpenses(sampleExpenses);

		// Monthly expected:
		// rent: 15,000,000 (general)
		// salaries: 32,000,000 (general)
		// utilities: 4,500,000 (general)
		// supplies: 6,000,000 (general)
		// equipment_lease: 9,000,000 (direct)
		// maintenance: 6,000,000 / 3 = 2,000,000 (direct)
		// insurance: 12,000,000 / 12 = 1,000,000 (general)
		// license_software: 1,500,000 (general)

		const expectedGeneral =
			15_000_000 + 32_000_000 + 4_500_000 + 6_000_000 + 1_000_000 + 1_500_000; // 60,000,000 kopecks = 600,000 руб.
		const expectedDirect = 9_000_000 + 2_000_000; // 11,000,000 kopecks = 110,000 руб.
		const expectedTotal = expectedGeneral + expectedDirect; // 71,000,000 kopecks = 710,000 руб.

		assert.equal(totals.generalOverheadMonthlyKopecks, expectedGeneral);
		assert.equal(totals.directOperatoryMonthlyKopecks, expectedDirect);
		assert.equal(totals.totalMonthlyKopecks, expectedTotal);

		const categoryTotals = aggregateExpensesByCategory(sampleExpenses);
		assert.equal(categoryTotals.rent, 15_000_000);
		assert.equal(categoryTotals.salaries, 32_000_000);
		assert.equal(categoryTotals.maintenance, 2_000_000);
		assert.equal(categoryTotals.insurance, 1_000_000);
		assert.equal(categoryTotals.equipment_lease, 9_000_000);
		assert.equal(categoryTotals.marketing, 0);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Chair-Hour Cost Allocation Engine
	// ─────────────────────────────────────────────────────────────────────────

	it("4. calculateChairHourCost: calculates kopeck-exact hourly and minute costs for multi-chair clinic", () => {
		const input: ChairHourCostInput = {
			activeChairsCount: 3,
			operatingDaysPerMonth: 26,
			operatingHoursPerDay: 12,
			targetOccupancyRate: 0.70, // 70%
			monthlyExpenses: sampleExpenses,
		};

		const result = calculateChairHourCost(input);

		// Total available hours: 3 chairs * 26 days * 12 hours = 936 hours
		assert.equal(result.totalAvailableChairHours, 936);

		// Effective occupied hours: 936 * 0.70 = 655.2 hours
		assert.equal(result.effectiveOccupiedChairHours, 655.2);

		// Total expenses: 71,000,000 kopecks
		assert.equal(result.totalMonthlyExpensesKopecks, 71_000_000);

		// Cost per available chair-hour (100% capacity):
		// 71,000,000 / 936 = 75,854.70 -> 75,855 kopecks (758.55 руб./час)
		assert.equal(result.costPerAvailableChairHourKopecks, Math.round(71_000_000 / 936));
		assert.equal(result.costPerAvailableChairHourKopecks, 75_855);

		// Cost per occupied chair-hour (with 70% target occupancy):
		// 71,000,000 / 655.2 = 108,363.858 -> 108,364 kopecks (1,083.64 руб./час)
		assert.equal(result.costPerOccupiedChairHourKopecks, Math.round(71_000_000 / 655.2));
		assert.equal(result.costPerOccupiedChairHourKopecks, 108_364);

		// Cost per occupied minute:
		// 108,364 / 60 = 1,806.06 -> 1,806 kopecks (18.06 руб./мин)
		assert.equal(result.costPerOccupiedMinuteKopecks, Math.round(108_364 / 60));
		assert.equal(result.costPerOccupiedMinuteKopecks, 1_806);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. Solo Doctor & Compact Clinic Profile (Mandates 8e & 8n)
	// ─────────────────────────────────────────────────────────────────────────

	it("5. Solo Doctor Profile (Mandate 8e & 8n): computes chair-minute cost from 1-click chair rent without corporate ledger", () => {
		// Solo practitioner rents 1 chair for 60,000.00 руб./мес (6,000,000 kopecks)
		// Works 22 days, 8 hours/day, 75% target occupancy
		const soloChairRentKopecks = 6_000_000;
		const otherExpensesKopecks = 1_000_000; // 10,000 руб. ПО и связь

		const soloResult = calculateSoloDoctorChairCost(
			soloChairRentKopecks,
			otherExpensesKopecks,
			22,
			8,
			0.75,
		);

		// Total available hours: 1 * 22 * 8 = 176 hours
		assert.equal(soloResult.totalAvailableChairHours, 176);

		// Occupied hours: 176 * 0.75 = 132 hours
		assert.equal(soloResult.effectiveOccupiedChairHours, 132);

		// Total expenses: 7,000,000 kopecks
		assert.equal(soloResult.totalMonthlyExpensesKopecks, 7_000_000);
		assert.equal(soloResult.directOperatoryMonthlyKopecks, 6_000_000);
		assert.equal(soloResult.generalOverheadMonthlyKopecks, 1_000_000);

		// Cost per occupied hour: 7,000,000 / 132 = 53,030.30 -> 53,030 kopecks (530.30 руб./час)
		assert.equal(soloResult.costPerOccupiedChairHourKopecks, 53_030);

		// Cost per occupied minute: 53,030 / 60 = 883.83 -> 884 kopecks (8.84 руб./мин)
		assert.equal(soloResult.costPerOccupiedMinuteKopecks, 884);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. Visit Profitability Integrated with Wave 134 Consumables
	// ─────────────────────────────────────────────────────────────────────────

	it("6. calculateVisitMargin: calculates visit profitability integrated with Wave 134 treatment consumables", () => {
		// Simulate Wave 134 consumables calculation for restorative filling A16.07.002
		const mockLinks: ConsumableItemLink[] = [
			{
				id: "link-comp-01",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой",
				inventoryItemId: "mat-filtek-01",
				itemName: "Композит Filtek Ultimate",
				category: "composite",
				unit: "шприц_гр",
				quantityPerService: 0.25, // 0.25 г
				costPriceKopecks: 120_000, // 1,200.00 руб. за 1 г -> 30,000 коп. (300 руб.)
			},
			{
				id: "link-anes-01",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой",
				inventoryItemId: "mat-ubist-01",
				itemName: "Убистезин форте 1:100000",
				category: "anesthetic",
				unit: "карпула",
				quantityPerService: 1, // 1 карпула
				costPriceKopecks: 15_000, // 150.00 руб.
			},
			{
				id: "link-dam-01",
				service804nCode: "A16.07.002",
				serviceTitle: "Восстановление зуба пломбой",
				inventoryItemId: "mat-dam-01",
				itemName: "Коффердам латексный Sanctuary",
				category: "rubber_dam",
				unit: "шт",
				quantityPerService: 1,
				costPriceKopecks: 8_000, // 80.00 руб.
			},
		];

		const renderedServices: RenderedServiceItem[] = [
			{
				serviceCode: "A16.07.002",
				quantity: 1,
				toothNumber: 46,
			},
		];

		const plannedConsumables = calculateServiceConsumables(renderedServices, mockLinks);
		const totalConsumablesCostKopecks = plannedConsumables.reduce(
			(sum, item) => sum + item.totalCostPriceKopecks,
			0,
		);
		// 30,000 + 15,000 + 8,000 = 53,000 kopecks (530 руб.)
		assert.equal(totalConsumablesCostKopecks, 53_000);

		// Visit parameters: 45 min duration, 6,500.00 руб. billed, 25% doctor commission (1,625.00 руб.),
		// chair cost per minute = 1,806 kopecks (from test 4)
		const visitInput: VisitMarginInput = {
			visitId: "visit-2026-001",
			visitDurationMinutes: 45,
			totalBilledKopecks: 650_000, // 6,500.00 руб.
			discountKopecks: 0,
			consumablesCostKopecks: totalConsumablesCostKopecks, // 53,000 коп.
			doctorCommissionKopecks: 162_500, // 1,625.00 руб.
			labCostKopecks: 0,
			chairCostPerOccupiedMinuteKopecks: 1_806,
			serviceName: "Восстановление зуба 46 светоотверждаемым композитом",
			patientName: "Кузнецов В.П.",
			doctorName: "Д-р Иванов А.А.",
		};

		const margin = calculateVisitMargin(visitInput);

		// Chair cost: 45 * 1,806 = 81,270 kopecks (812.70 руб.)
		assert.equal(margin.chairTimeCostKopecks, 81_270);

		// Direct costs: 81,270 + 53,000 + 162,500 + 0 = 296,770 kopecks (2,967.70 руб.)
		assert.equal(margin.directCostsKopecks, 296_770);

		// Net revenue: 650,000 kopecks
		assert.equal(margin.netRevenueKopecks, 650_000);

		// Gross profit: 650,000 - 53,000 = 597,000 kopecks (5,970.00 руб.)
		assert.equal(margin.grossProfitKopecks, 597_000);
		// Gross margin %: 597,000 / 650,000 * 100 = 91.85%
		assert.equal(margin.grossMarginPercent, 91.85);

		// Net profit: 650,000 - 296,770 = 353,230 kopecks (3,532.30 руб.)
		assert.equal(margin.netProfitKopecks, 353_230);
		// Net margin %: 353,230 / 650,000 * 100 = 54.34%
		assert.equal(margin.netMarginPercent, 54.34);
		assert.equal(margin.isProfitable, true);
		assert.equal(margin.breakEvenBilledKopecks, 296_770); // 2,967.70 руб. needed to break even
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. Doctor Autonomy & 100% Discount (Mandate 8e)
	// ─────────────────────────────────────────────────────────────────────────

	it("7. Mandate 8e: Doctor autonomy with 100% warranty discount computes loss safely without NaN or Infinity", () => {
		// Warranty rework: 100% discount, zero billed revenue
		const warrantyVisit: VisitMarginInput = {
			visitId: "visit-warranty-002",
			visitDurationMinutes: 30,
			totalBilledKopecks: 500_000,
			discountKopecks: 500_000, // 100% discount!
			consumablesCostKopecks: 40_000, // 400 руб.
			doctorCommissionKopecks: 0, // doctor doesn't charge for warranty
			labCostKopecks: 0,
			chairCostPerOccupiedMinuteKopecks: 1_000, // 10 руб./мин
		};

		const result = calculateVisitMargin(warrantyVisit);

		assert.equal(result.netRevenueKopecks, 0);
		assert.equal(result.chairTimeCostKopecks, 30_000); // 300 руб.
		assert.equal(result.directCostsKopecks, 70_000); // 300 + 400 = 700 руб.
		assert.equal(result.grossProfitKopecks, -40_000);
		assert.equal(result.netProfitKopecks, -70_000);
		assert.equal(result.grossMarginPercent, -100);
		assert.equal(result.netMarginPercent, -100);
		assert.equal(result.isProfitable, false);
		// Break even billed includes the discount
		assert.equal(result.breakEvenBilledKopecks, 570_000); // 70k direct + 500k discount

		// Confirm NO NaN or Infinity in any field
		assert.ok(Number.isFinite(result.netRevenueKopecks));
		assert.ok(Number.isFinite(result.grossProfitKopecks));
		assert.ok(Number.isFinite(result.netProfitKopecks));
		assert.ok(Number.isFinite(result.grossMarginPercent));
		assert.ok(Number.isFinite(result.netMarginPercent));
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. Statutory Managerial A4 Report & 0 Cartoon Emojis (Mandate 8d Item 7)
	// ─────────────────────────────────────────────────────────────────────────

	it("8. formatClinicExpensesAndChairCostA4Report: generates clean typographical A4 protocol with STRICTLY 0 cartoon emojis", () => {
		const chairCost = calculateSoloDoctorChairCost(6_000_000, 1_000_000, 22, 8, 0.75);

		const sampleVisitMargin = calculateVisitMargin({
			visitId: "visit-101",
			visitDurationMinutes: 40,
			totalBilledKopecks: 450_000,
			discountKopecks: 50_000,
			consumablesCostKopecks: 35_000,
			doctorCommissionKopecks: 100_000,
			labCostKopecks: 0,
			chairCostPerOccupiedMinuteKopecks: chairCost.costPerOccupiedMinuteKopecks,
		});

		const report = formatClinicExpensesAndChairCostA4Report({
			clinicName: "СТОМАТОЛОГИЧЕСКИЙ КАБИНЕТ ДОКТОРА СМИРНОВА",
			organizationName: "ИП СМИРНОВ А.В.",
			periodMonthYear: "2026-09",
			chairCostResult: chairCost,
			categoryTotalsKopecks: {
				rent: 6_000_000,
				utilities: 500_000,
				salaries: 0,
				supplies: 0,
				equipment_lease: 0,
				insurance: 0,
				maintenance: 0,
				marketing: 300_000,
				license_software: 200_000,
				other: 0,
			},
			sampleVisits: [sampleVisitMargin],
			auditorName: "Смирнов А.В.",
		});

		assert.ok(report.includes("ВЕДОМОСТЬ ОПЕРАЦИОННЫХ РАСХОДОВ И СЕБЕСТОИМОСТИ КРЕСЛО-ЧАСА"));
		assert.ok(report.includes("ИП СМИРНОВ А.В."));
		assert.ok(report.includes("Себестоимость доступного кресло-часа"));
		assert.ok(report.includes("Себестоимость занятого кресло-часа"));
		assert.ok(report.includes("ВЫБОРОЧНЫЙ АНАЛИЗ МАРЖИНАЛЬНОСТИ ПРИЕМОВ"));
		assert.ok(report.includes("visit-101"));

		// STRICT CARTOON EMOJI PROHIBITION CHECK (Mandate 8d item 7)
		// 1. Unicode extended pictographic regex
		const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(
			unicodeEmojiRegex.test(report),
			false,
			"A4 statement must NOT contain any Unicode pictographic emojis per Mandate 8d item 7",
		);

		// 2. Explicit supplementary code block range check
		const generalEmojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
		assert.equal(
			generalEmojiRegex.test(report),
			false,
			"A4 statement must NOT contain any decorative emojis",
		);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. Engine Namespace Export
	// ─────────────────────────────────────────────────────────────────────────

	it("9. clinicExpensesEngine namespace: exports all required schemas and methods", () => {
		assert.ok(clinicExpensesEngine.expenseCategorySchema);
		assert.ok(clinicExpensesEngine.expenseRecurrenceSchema);
		assert.ok(clinicExpensesEngine.clinicExpenseRecordSchema);
		assert.ok(clinicExpensesEngine.chairHourCostInputSchema);
		assert.ok(clinicExpensesEngine.chairHourCostResultSchema);
		assert.ok(clinicExpensesEngine.visitMarginInputSchema);
		assert.ok(clinicExpensesEngine.visitMarginResultSchema);
		assert.equal(typeof clinicExpensesEngine.calculateChairHourCost, "function");
		assert.equal(typeof clinicExpensesEngine.calculateVisitMargin, "function");
		assert.equal(typeof clinicExpensesEngine.createSoloPracticeProfile, "function");
		assert.equal(typeof clinicExpensesEngine.calculateSoloDoctorChairCost, "function");
		assert.equal(typeof clinicExpensesEngine.formatClinicExpensesAndChairCostA4Report, "function");
	});
});
