import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateClinicLostRevenue,
	CLOSER_BENCHMARKS,
} from "./clinicLostRevenueCalculator.js";

describe("clinicLostRevenueCalculator (Unit Economics & ROI Engine)", () => {
	it("calculates realistic losses and returns for default clinic parameters", () => {
		const result = calculateClinicLostRevenue({
			monthlyNewConsultations: 100,
			abandonedEstimateRate: 0.65,
			averageEstimateSum: 90_000,
			cancelledVisitsPerDay: 1.8,
			averageSlotValue: 5_000,
			workingDaysPerMonth: 26,
			totalActivePatientBase: 2_400,
			annualRecallRateWithoutBot: 0.2,
			averageRecallTicket: 6_000,
			trojanBotMonthlyCost: 20_000,
		});

		// 1. Проверяем брошенные сметы: 100 * 0.65 = 65 шт. По 90 000 руб = 5 850 000 руб.
		assert.equal(result.monthlyLosses.abandonedEstimatesCount, 65);
		assert.equal(result.monthlyLosses.abandonedEstimatesRub, 5_850_000);

		// 2. Проверяем пустые окна: 1.8 * 26 = 47 окон. 47 * 5 000 = 235 000 руб.
		assert.equal(result.monthlyLosses.emptySlotsCount, 47);
		assert.equal(result.monthlyLosses.emptySlotsRub, 235_000);

		// 3. Проверяем возврат по ожидаемому сценарию (32% дожима смет, 72% окон)
		const exp = result.scenarios.expected;
		assert.ok(exp.abandonedEstimatesRecovered > 1_800_000);
		assert.ok(exp.emptySlotsRecovered > 150_000);
		assert.ok(exp.totalMonthlyRecovered > 2_000_000);

		// 4. Окупаемость и ROI
		assert.ok(exp.netMonthlyGain > 2_000_000);
		assert.ok(exp.roiPercentage > 5_000); // 20k инвестиций при возврате 2M+
		assert.ok(exp.paybackPeriodDays < 1.0); // окупается меньше чем за 1 рабочий день!
		assert.ok(exp.returnOnEveryRuble > 50);

		// 5. Проверяем консервативный сценарий
		const cons = result.scenarios.conservative;
		assert.ok(cons.totalMonthlyRecovered < exp.totalMonthlyRecovered);
		assert.ok(cons.abandonedEstimatesRecovered > 1_000_000); // даже 22% от 5.85M = 1.28M

		// 6. Проверяем, что в резюме есть ключевые цифры и нет undefined
		assert.ok(!result.executiveSummaryRu.includes("undefined"));
		assert.ok(!result.executiveSummaryRu.includes("NaN"));
		assert.ok(result.executiveSummaryRu.includes("ЭКСПРЕСС-АУДИТ УПУЩЕННОЙ ВЫРУЧКИ"));
	});

	it("handles small solo doctor practice with low overhead and single chair", () => {
		const result = calculateClinicLostRevenue({
			monthlyNewConsultations: 25,
			abandonedEstimateRate: 0.5,
			averageEstimateSum: 50_000,
			cancelledVisitsPerDay: 0.5,
			averageSlotValue: 4_000,
			workingDaysPerMonth: 22,
			totalActivePatientBase: 600,
			annualRecallRateWithoutBot: 0.25,
			trojanBotMonthlyCost: 9_900,
		});

		// 25 * 0.5 = 13 (Math.round 12.5) смет = 650 000 руб
		assert.equal(result.monthlyLosses.abandonedEstimatesCount, 13);
		assert.equal(result.monthlyLosses.abandonedEstimatesRub, 650_000);

		const exp = result.scenarios.expected;
		assert.ok(exp.totalMonthlyRecovered > 200_000);
		assert.ok(exp.roiPercentage > 1_000);
		assert.ok(exp.paybackPeriodDays < 3);
	});
});
