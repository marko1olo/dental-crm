import test from "node:test";
import assert from "node:assert/strict";
import {
	calculateManagerialPnl,
	type CalculateManagerialPnlInput,
} from "../finance/managerialPnlEngine.js";

test("managerialPnlEngine: правильно агрегирует выручку по 4 направлениям и рассчитывает маржинальность", () => {
	const input: CalculateManagerialPnlInput = {
		period: { from: "2026-08-01", to: "2026-08-31" },
		payments: [
			// Терапия 100 000 ₽ (наличные в основную кассу)
			{ amountRub: 100000, department: "therapy", cashBoxType: "main" },
			// Ортопедия 250 000 ₽ (безналичный эквайринг)
			{ amountRub: 250000, department: "orthopedics", cashBoxType: "cashless" },
			// Хирургия 150 000 ₽ (безнал)
			{ amountRub: 150000, department: "surgery", cashBoxType: "cashless" },
			// Ортодонтия 100 000 ₽ (расчетный счет юрлиц)
			{ amountRub: 100000, department: "orthodontics", cashBoxType: "account" },
		],
		expenses: [
			// Статья 1: Зарплата врачей 150 000 ₽ (Direct COGS)
			{ reasonId: 1, amountRub: 150000 },
			// Статья 11: ЗТЛ 60 000 ₽ (Direct COGS)
			{ reasonId: 11, amountRub: 60000 },
			// Статья 4: Стоматологические расходники 40 000 ₽ (Direct COGS)
			{ reasonId: 4, amountRub: 40000 },
			// Статья 12: Аренда 100 000 ₽ (OPEX)
			{ reasonId: 12, amountRub: 100000 },
			// Статья 6: Маркетинг и реклама 30 000 ₽ (OPEX)
			{ reasonId: 6, amountRub: 30000 },
			// Статья 7: Телефония и интернет 10 000 ₽ (OPEX)
			{ reasonId: 7, amountRub: 10000 },
			// Статья 2: Налоги 20 000 ₽ (Taxes)
			{ reasonId: 2, amountRub: 20000 },
		],
	};

	const pnl = calculateManagerialPnl(input);

	// Валовая выручка = 100k + 250k + 150k + 100k = 600 000 ₽
	assert.equal(pnl.grossRevenueRub, 600000);

	// Проверяем выручку по направлениям
	const ortho = pnl.departmentRevenue.find((d) => d.department === "orthopedics");
	assert.equal(ortho?.revenueRub, 250000);
	assert.equal(ortho?.sharePct, 41.7); // 250k / 600k = ~41.67%

	// COGS = ФОТ (150k) + ЗТЛ (60k) + Материалы (40k) = 250 000 ₽
	assert.equal(pnl.directLabCostRub, 60000);
	assert.equal(pnl.directMaterialsCostRub, 40000);
	assert.equal(pnl.directDoctorPieceRateRub, 150000);
	assert.equal(pnl.totalCogsRub, 250000);

	// Валовая прибыль = 600k - 250k = 350 000 ₽
	assert.equal(pnl.grossProfitRub, 350000);
	assert.equal(pnl.grossMarginPct, 58.3); // 350k / 600k = 58.3%

	// OPEX = Аренда (100k) + Маркетинг (30k) + Связь (10k) = 140 000 ₽
	assert.equal(pnl.totalOpexRub, 140000);

	// EBITDA = Gross Profit (350k) - OPEX (140k) = 210 000 ₽
	assert.equal(pnl.ebitdaRub, 210000);
	assert.equal(pnl.ebitdaMarginPct, 35); // 210k / 600k = 35%

	// Налоги = 20 000 ₽
	assert.equal(pnl.taxesRub, 20000);

	// Чистая прибыль (Net Profit) = 210k - 20k = 190 000 ₽
	assert.equal(pnl.netProfitRub, 190000);
	assert.equal(pnl.netMarginPct, 31.7); // 190k / 600k = 31.67%
	assert.equal(pnl.isProfitable, true);
});

test("managerialPnlEngine: расчет точки безубыточности (Break-Even CVP)", () => {
	const input: CalculateManagerialPnlInput = {
		period: { from: "2026-09-01", to: "2026-09-30" },
		payments: [
			{ amountRub: 500000, department: "therapy", cashBoxType: "cashless" },
			{ amountRub: 500000, department: "surgery", cashBoxType: "cashless" },
		],
		expenses: [
			// Переменные (COGS): 400 000 ₽
			{ reasonId: 1, amountRub: 300000 }, // Зарплата
			{ reasonId: 4, amountRub: 100000 }, // Материалы
			// Постоянные (OPEX + Налоги): 300 000 ₽ + 60 000 ₽ = 360 000 ₽
			{ reasonId: 12, amountRub: 200000 }, // Аренда
			{ reasonId: 6, amountRub: 100000 }, // Маркетинг
			{ reasonId: 2, amountRub: 60000 },  // Налоги
		],
	};

	const pnl = calculateManagerialPnl(input);

	// Выручка = 1 000 000 ₽
	assert.equal(pnl.grossRevenueRub, 1000000);
	// Fixed Costs = 200k + 100k + 60k = 360 000 ₽
	assert.equal(pnl.breakEven.fixedCostsRub, 360000);
	// Variable Costs = 300k + 100k = 400 000 ₽
	assert.equal(pnl.breakEven.variableCostsRub, 400000);
	// Contribution Margin = 1 000 000 - 400 000 = 600 000 ₽
	assert.equal(pnl.breakEven.contributionMarginRub, 600000);
	// CMRatio = 600 000 / 1 000 000 = 0.6
	assert.equal(pnl.breakEven.contributionMarginRatio, 0.6);
	// Break-Even Revenue = 360 000 / 0.6 = 600 000 ₽
	assert.equal(pnl.breakEven.breakEvenRevenueRub, 600000);
	// 2 payments = avg bill 500 000 ₽ -> visits needed = ceil(600k / 500k) = 2
	assert.equal(pnl.breakEven.breakEvenVisitsCount, 2);
	// Margin of Safety = 1 000 000 - 600 000 = 400 000 ₽ (40%)
	assert.equal(pnl.breakEven.marginOfSafetyRub, 400000);
	assert.equal(pnl.breakEven.marginOfSafetyPct, 40);
	assert.equal(pnl.breakEven.isBreakEvenReached, true);
});

test("managerialPnlEngine: юнит-экономика кресел клиники", () => {
	const input: CalculateManagerialPnlInput = {
		period: { from: "2026-09-01", to: "2026-09-30" },
		payments: [
			{ amountRub: 400000, department: "therapy" },
			{ amountRub: 600000, department: "orthopedics" },
		],
		expenses: [
			{ reasonId: 1, amountRub: 300000 },
			{ reasonId: 12, amountRub: 150000 },
			{ reasonId: 6, amountRub: 50000 },
		],
		chairEconomics: {
			activeChairsCount: 2,
			operatingDays: 25,
			operatingHoursPerDay: 10,
			chairs: [
				{ chairId: "c-1", chairName: "Кресло 1 (Терапия)", operatingHours: 250, occupiedHours: 150, revenueRub: 400000 },
				{ chairId: "c-2", chairName: "Кресло 2 (Ортопедия)", operatingHours: 250, occupiedHours: 200, revenueRub: 600000 },
			],
		},
	};

	const pnl = calculateManagerialPnl(input);

	assert.equal(pnl.chairEconomics.activeChairsCount, 2);
	assert.equal(pnl.chairEconomics.totalOperatingHours, 500); // 2 * 25 * 10
	assert.equal(pnl.chairEconomics.totalOccupiedHours, 350); // 150 + 200
	assert.equal(pnl.chairEconomics.chairOccupancyRatePct, 70); // 350 / 500 = 70%

	// Total expenses = 300k + 150k + 50k = 500 000 ₽
	// Available hour cost = 500 000 / 500 = 1 000 ₽/ч
	assert.equal(pnl.chairEconomics.costPerAvailableChairHourRub, 1000);
	// Occupied hour cost = 500 000 / 350 = ~1429 ₽/ч
	assert.equal(pnl.chairEconomics.costPerOccupiedChairHourRub, 1429);
	// Revenue per chair = 1 000 000 / 2 = 500 000 ₽
	assert.equal(pnl.chairEconomics.revenuePerChairRub, 500000);

	// Individual chair checks
	assert.equal(pnl.chairEconomics.chairs.length, 2);
	assert.equal(pnl.chairEconomics.chairs[0]?.chairName, "Кресло 1 (Терапия)");
	assert.equal(pnl.chairEconomics.chairs[0]?.occupancyRatePct, 60); // 150/250 = 60%
});

test("managerialPnlEngine: расчет маржинальности направлений с точными затратами", () => {
	const input: CalculateManagerialPnlInput = {
		period: { from: "2026-09-01", to: "2026-09-30" },
		payments: [
			{ amountRub: 300000, department: "therapy" },
			{ amountRub: 700000, department: "orthopedics" },
		],
		expenses: [
			{ reasonId: 11, amountRub: 200000 }, // ЗТЛ ортопедии
			{ reasonId: 4, amountRub: 100000 },  // Материалы
			{ reasonId: 1, amountRub: 300000 },  // ФОТ
		],
		departmentDirectCosts: {
			therapy: 120000,     // 300k выручка - 120k затрат = 180k маржа (60%)
			orthopedics: 480000, // 700k выручка - 480k затрат = 220k маржа (31.4%)
		},
	};

	const pnl = calculateManagerialPnl(input);

	const therapy = pnl.departmentRevenue.find((d) => d.department === "therapy");
	assert.equal(therapy?.directCostsRub, 120000);
	assert.equal(therapy?.marginRub, 180000);
	assert.equal(therapy?.marginPct, 60);

	const ortho = pnl.departmentRevenue.find((d) => d.department === "orthopedics");
	assert.equal(ortho?.directCostsRub, 480000);
	assert.equal(ortho?.marginRub, 220000);
	assert.equal(ortho?.marginPct, 31.4);
});

test("managerialPnlEngine: целочисленная арифметика копеек без потери точности (zero float drift)", () => {
	const input: CalculateManagerialPnlInput = {
		period: { from: "2026-09-01", to: "2026-09-30" },
		payments: [
			{ amountRub: 100.10, department: "therapy" },
			{ amountRub: 200.20, department: "therapy" },
			{ amountRub: 300.30, department: "therapy" },
		],
		expenses: [
			{ reasonId: 4, amountRub: 50.15 },
			{ reasonId: 12, amountRub: 150.25 },
		],
	};

	const pnl = calculateManagerialPnl(input);

	// 100.10 + 200.20 + 300.30 = 600.60 exact
	assert.equal(pnl.grossRevenueRub, 600.60);
	// COGS = 50.15
	assert.equal(pnl.totalCogsRub, 50.15);
	// Gross Profit = 600.60 - 50.15 = 550.45
	assert.equal(pnl.grossProfitRub, 550.45);
	// OPEX = 150.25
	assert.equal(pnl.totalOpexRub, 150.25);
	// EBITDA = 550.45 - 150.25 = 400.20
	assert.equal(pnl.ebitdaRub, 400.20);
	assert.equal(pnl.netProfitRub, 400.20);
});
