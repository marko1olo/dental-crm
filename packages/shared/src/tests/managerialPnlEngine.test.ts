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
