import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateChairRentalEconomics,
	type ChairRentalParams,
} from "./chairRentalCalculator.js";

describe("chairRentalCalculator (Суверенная экономика субаренды кресла и смены врача)", () => {
	it("1. Почасовая аренда (Hourly rental): точный расчет в копейках без плавающей запятой", () => {
		// 1 500 ₽/час (150 000 коп) * 5.5 часов = 8 250 ₽ (825 000 коп)
		// Выручка: 45 000 ₽ (4 500 000 коп)
		// ЗТЛ: 6 000 ₽ (600 000 коп)
		// Расходники: 2 500 ₽ (250 000 коп)
		const params: ChairRentalParams = {
			model: "hourly",
			hourlyRateKopecks: 150_000,
			hoursWorked: 5.5,
			grossRevenueKopecks: 4_500_000,
			labExpensesKopecks: 600_000,
			consumablesKopecks: 250_000,
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.model, "hourly");
		assert.equal(res.rentExpenseKopecks, 825_000);
		assert.equal(res.rentExpenseRub, 8_250);
		assert.equal(res.grossRevenueKopecks, 4_500_000);
		assert.equal(res.grossRevenueRub, 45_000);
		assert.equal(res.labExpensesKopecks, 600_000);
		assert.equal(res.labExpensesRub, 6_000);
		assert.equal(res.consumablesKopecks, 250_000);
		assert.equal(res.consumablesRub, 2_500);

		// Расходы: 8 250 + 6 000 + 2 500 = 16 750 ₽ (1 675 000 коп)
		assert.equal(res.totalExpensesKopecks, 1_675_000);
		assert.equal(res.totalExpensesRub, 16_750);

		// Чистый доход врача: 45 000 - 16 750 = 28 250 ₽ (2 825 000 коп)
		assert.equal(res.netProfitKopecks, 2_825_000);
		assert.equal(res.netProfitRub, 28_250);

		// Рентабельность: (28 250 / 45 000) * 100 = 62.777...% -> 62.8%
		assert.equal(res.profitMarginPercent, 62.8);

		// Эффективная ставка в час: 28 250 / 5.5 ≈ 5 136.36 ₽/час
		assert.equal(res.effectiveHourlyIncomeRub, 5136.36);
	});

	it("2. Посменная аренда (Per-shift rental): фиксированная ставка за смену", () => {
		// 4 000 ₽/смена * 2 смены = 8 000 ₽ (800 000 коп)
		// Выручка: 60 000 ₽ (6 000 000 коп)
		// ЗТЛ: 10 000 ₽ (1 000 000 коп)
		// Расходники: 3 000 ₽ (300 000 коп)
		const params: ChairRentalParams = {
			model: "per_shift",
			shiftRateKopecks: 400_000,
			shiftsCount: 2,
			hoursWorked: 12,
			grossRevenueKopecks: 6_000_000,
			labExpensesKopecks: 1_000_000,
			consumablesKopecks: 300_000,
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.model, "per_shift");
		assert.equal(res.rentExpenseKopecks, 800_000);
		assert.equal(res.rentExpenseRub, 8_000);
		assert.equal(res.totalExpensesKopecks, 2_100_000);
		assert.equal(res.totalExpensesRub, 21_000);
		assert.equal(res.netProfitKopecks, 3_900_000);
		assert.equal(res.netProfitRub, 39_000);
		assert.equal(res.profitMarginPercent, 65.0);
		assert.equal(res.effectiveHourlyIncomeRub, 3250.0);
	});

	it("3. Процент от выручки (Revenue percent): доля клиники-арендодателя", () => {
		// 25% клинике от выручки 80 000 ₽ = 20 000 ₽ аренда (2 000 000 коп)
		// ЗТЛ: 15 000 ₽ (1 500 000 коп)
		// Расходники: 5 000 ₽ (500 000 коп)
		const params: ChairRentalParams = {
			model: "revenue_percent",
			landlordPercent: 25,
			hoursWorked: 8,
			grossRevenueKopecks: 8_000_000,
			labExpensesKopecks: 1_500_000,
			consumablesKopecks: 500_000,
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.model, "revenue_percent");
		assert.equal(res.rentExpenseKopecks, 2_000_000);
		assert.equal(res.rentExpenseRub, 20_000);
		assert.equal(res.totalExpensesKopecks, 4_000_000);
		assert.equal(res.totalExpensesRub, 40_000);
		assert.equal(res.netProfitKopecks, 4_000_000);
		assert.equal(res.netProfitRub, 40_000);
		assert.equal(res.profitMarginPercent, 50.0);
		assert.equal(res.effectiveHourlyIncomeRub, 5000.0);
	});

	it("4. Фиксированная аренда за месяц с пропорциональным распределением на смену (Fixed monthly)", () => {
		// 66 000 ₽/мес при 22 рабочих днях = 3 000 ₽/смена * 1 смена = 3 000 ₽ (300 000 коп)
		const params: ChairRentalParams = {
			model: "fixed_monthly",
			monthlyRateKopecks: 6_600_000,
			workingDaysInMonth: 22,
			shiftsCount: 1,
			hoursWorked: 6,
			grossRevenueKopecks: 30_000_000, // 300 000 ₽
			labExpensesKopecks: 50_000_00,  // 50 000 ₽
			consumablesKopecks: 10_000_00,  // 10 000 ₽
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.model, "fixed_monthly");
		assert.equal(res.rentExpenseKopecks, 300_000);
		assert.equal(res.rentExpenseRub, 3_000);
		assert.equal(res.totalExpensesKopecks, 6_300_000);
		assert.equal(res.totalExpensesRub, 63_000);
		assert.equal(res.netProfitKopecks, 23_700_000);
		assert.equal(res.netProfitRub, 237_000);
		assert.equal(res.profitMarginPercent, 79.0);
		assert.equal(res.effectiveHourlyIncomeRub, 39500.0);
	});

	it("5. Граничные случаи: нулевая выручка, отрицательные значения, нулевые часы", () => {
		const zeroParams: ChairRentalParams = {
			model: "hourly",
			hourlyRateKopecks: 100_000,
			hoursWorked: 0,
			grossRevenueKopecks: 0,
			labExpensesKopecks: -500, // Отрицательное должно быть отсечено в 0
		};

		const res = calculateChairRentalEconomics(zeroParams);

		assert.equal(res.rentExpenseKopecks, 0);
		assert.equal(res.grossRevenueKopecks, 0);
		assert.equal(res.labExpensesKopecks, 0);
		assert.equal(res.consumablesKopecks, 0);
		assert.equal(res.sterilizationExpensesKopecks, 0);
		assert.equal(res.netProfitKopecks, 0);
		assert.equal(res.profitMarginPercent, 0);
		assert.equal(res.effectiveHourlyIncomeRub, 0);
	});

	it("6. Вычет расходов на стерилизацию и крафт-пакеты (СанПиН 3.3686-21)", () => {
		// 4 пациента: 4 * 250 ₽ = 1 000 ₽ (100 000 коп) стерилизация
		// 1 500 ₽/час * 4 ч = 6 000 ₽ (600 000 коп) аренда
		// Выручка: 40 000 ₽ (4 000 000 коп)
		// Расходники: 2 000 ₽ (200 000 коп)
		// ЗТЛ: 0 ₽
		const params: ChairRentalParams = {
			model: "hourly",
			hourlyRateKopecks: 150_000,
			hoursWorked: 4,
			grossRevenueKopecks: 4_000_000,
			consumablesKopecks: 200_000,
			sterilizationExpensesKopecks: 100_000,
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.rentExpenseRub, 6_000);
		assert.equal(res.consumablesRub, 2_000);
		assert.equal(res.sterilizationExpensesRub, 1_000);
		assert.equal(res.sterilizationExpensesKopecks, 100_000);
		// Расходы: 6 000 + 2 000 + 1 000 = 9 000 ₽
		assert.equal(res.totalExpensesRub, 9_000);
		// Чистый доход: 40 000 - 9 000 = 31 000 ₽
		assert.equal(res.netProfitRub, 31_000);
		assert.equal(res.profitMarginPercent, 77.5);
	});

	it("7. Точность до 1 копейки без потерь округления (Мандаты 8e, 8i)", () => {
		// 1 500.50 ₽/час (150 050 коп) * 3 часа = 450 150 коп = 4 501.50 ₽
		const params: ChairRentalParams = {
			model: "hourly",
			hourlyRateKopecks: 150_050,
			hoursWorked: 3,
			grossRevenueKopecks: 1_000_050, // 10 000.50 ₽
			consumablesKopecks: 50_025, // 500.25 ₽
		};

		const res = calculateChairRentalEconomics(params);

		assert.equal(res.rentExpenseKopecks, 450_150);
		assert.equal(res.rentExpenseRub, 4501.5);
		assert.equal(res.grossRevenueRub, 10000.5);
		assert.equal(res.consumablesRub, 500.25);
		assert.equal(res.totalExpensesKopecks, 500_175);
		assert.equal(res.totalExpensesRub, 5001.75);
		assert.equal(res.netProfitKopecks, 499_875);
		assert.equal(res.netProfitRub, 4998.75);
	});
});
