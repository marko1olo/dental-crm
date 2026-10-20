import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateChairHourlyCost,
	calculateProcedureEconomics,
	type ClinicOverheadInput,
	type ProcedureEconomicsInput,
} from "./chairCostMarginCalculator.js";

describe("chairCostMarginCalculator (Честная себестоимость кресла и маржа врача)", () => {
	const clinicStandard: ClinicOverheadInput = {
		activeChairsCount: 3,
		workingDaysPerMonth: 30,
		workingHoursPerDay: 12,
		chairUtilizationRate: 0.65, // 65% загрузка кресел
		monthlyRentRub: 350_000,
		monthlyUtilitiesRub: 45_000,
		monthlyAdministrativePayrollRub: 280_000,
		monthlyEquipmentDepreciationRub: 120_000,
		monthlySanpinSterilizationRub: 60_000,
		monthlyMarketingAndOtherRub: 150_000,
	};

	it("рассчитывает честную номинальную и фактическую себестоимость часа кресла", () => {
		const result = calculateChairHourlyCost(clinicStandard);

		// Общий оверхед: 350 + 45 + 280 + 120 + 60 + 150 = 1 005 000 ₽
		assert.equal(result.totalMonthlyFixedOverheadRub, 1_005_000);
		// Всего часов: 3 кресла * 30 дн * 12 ч = 1080 часов
		assert.equal(result.totalAvailableChairHoursPerMonth, 1080);
		// Занятых часов: 1080 * 0.65 = 702 часа
		assert.equal(result.actualOccupiedChairHoursPerMonth, 702);

		// Номинальная стоимость 1 часа (если бы кресла были заняты 100% времени): ~931 ₽
		assert.equal(result.hourlyCostNominalRub, 931);
		// ФАКТИЧЕСКАЯ себестоимость 1 часа с учетом реалистичной 65% загрузки: 1005000 / 702 = 1 432 ₽/час!
		assert.equal(result.hourlyCostRealOccupiedRub, 1432);
		assert.equal(result.minuteCostRealOccupiedRub, 23.87);
	});

	it("рассчитывает здоровую юнит-экономику реставрации зуба с прибылью", () => {
		const procedure: ProcedureEconomicsInput = {
			procedureName: "Световая пломба (реставрация) 1.6",
			durationMinutes: 60,
			patientPriceRub: 7_500,
			discountRate: 0,
			directConsumablesRub: 1_200,
			labTechnicianCostRub: 0,
			doctorCommissionRate: 0.25, // 25% врачу
			deductLabFromDoctorBase: true,
			assistantFeeRub: 400,
			acquiringRate: 0.015, // 1.5%
		};

		const eco = calculateProcedureEconomics(clinicStandard, procedure);

		// Доход: 7 500 ₽
		assert.equal(eco.actualPatientPriceRub, 7_500);
		// Накладные расходы кресла за 60 мин: 23.87 * 60 ≈ 1 432 ₽
		assert.equal(eco.chairOverheadCostRub, 1432);
		// Врач: 25% от 7 500 = 1 875 ₽
		assert.equal(eco.doctorEarningsRub, 1875);
		// Эквайринг: 1.5% от 7500 = 113 ₽
		assert.equal(eco.acquiringFeeRub, 113);
		// Ассистент: 400 ₽, расходники: 1 200 ₽
		// Сумма издержек клиники: 1200 + 0 + 1432 + 113 + 400 + 1875 = 5 020 ₽
		assert.equal(eco.totalProcedureCostRub, 5020);
		// Чистая прибыль клиники: 7500 - 5020 = 2 480 ₽
		assert.equal(eco.clinicNetProfitRub, 2480);
		assert.equal(eco.isLossMaking, false);
		assert.ok(eco.clinicNetMarginPercent > 30);
	});

	it("вскрывает ловушку скидки: 10% скидка пациенту уничтожает почти 40% чистой маржи", () => {
		const fullPriceProc: ProcedureEconomicsInput = {
			procedureName: "Лечение кариеса",
			durationMinutes: 60,
			patientPriceRub: 6_000,
			discountRate: 0,
			directConsumablesRub: 1_000,
			labTechnicianCostRub: 0,
			doctorCommissionRate: 0.25,
			deductLabFromDoctorBase: true,
			assistantFeeRub: 350,
			acquiringRate: 0.015,
		};

		const discountedProc: ProcedureEconomicsInput = {
			...fullPriceProc,
			discountRate: 0.1, // Скидка всего 10% (600 ₽)
		};

		const ecoFull = calculateProcedureEconomics(clinicStandard, fullPriceProc);
		const ecoDiscount = calculateProcedureEconomics(clinicStandard, discountedProc);

		// Без скидки чистая прибыль
		assert.ok(ecoFull.clinicNetProfitRub > 1600);
		// Со скидкой чистая прибыль падает непропорционально сильнее!
		assert.ok(ecoDiscount.discountProfitErosionPercent >= 25);
		assert.ok(ecoDiscount.clinicNetProfitRub < ecoFull.clinicNetProfitRub);
	});

	it("корректно вычитает себестоимость ЗТЛ из сдельной базы врача (Mandate 8e)", () => {
		const crownProc: ProcedureEconomicsInput = {
			procedureName: "Коронка циркон 2.6",
			durationMinutes: 45,
			patientPriceRub: 35_000,
			discountRate: 0,
			directConsumablesRub: 1_500,
			labTechnicianCostRub: 9_000, // ЗТЛ взяла 9 000 ₽
			doctorCommissionRate: 0.25,
			deductLabFromDoctorBase: true, // Врач получает с базы 35000 - 9000 = 26000
			assistantFeeRub: 500,
			acquiringRate: 0.015,
		};

		const eco = calculateProcedureEconomics(clinicStandard, crownProc);

		// База врача: 35000 - 9000 = 26 000 ₽
		assert.equal(eco.doctorWageBaseRub, 26_000);
		// Заработок врача: 25% от 26000 = 6 500 ₽ (а не 8 750 ₽!)
		assert.equal(eco.doctorEarningsRub, 6_500);
		// Чистая прибыль клиники остается высокой
		assert.ok(eco.clinicNetProfitRub > 15_000);
		assert.ok(eco.clinicNetMarginPercent > 45);
	});

	it("детектирует убыточные процедуры и рассчитывает порог безубыточности (Break-Even)", () => {
		const cheapProcedure: ProcedureEconomicsInput = {
			procedureName: "Демпинговая профгигиена по купону",
			durationMinutes: 90, // Затянули на 1.5 часа
			patientPriceRub: 2_500, // Продали за 2 500 ₽
			discountRate: 0,
			directConsumablesRub: 1_200,
			labTechnicianCostRub: 0,
			doctorCommissionRate: 0.3,
			deductLabFromDoctorBase: true,
			assistantFeeRub: 500,
			acquiringRate: 0.015,
		};

		const eco = calculateProcedureEconomics(clinicStandard, cheapProcedure);

		// 90 мин кресла стоят 23.87 * 90 ≈ 2 148 ₽
		// Издержки превышают выручку 2500 ₽!
		assert.equal(eco.isLossMaking, true);
		assert.ok(eco.clinicNetProfitRub < 0);
		assert.ok(eco.executiveDiagnosticRu.includes("ВНИМАНИЕ: Процедура убыточна"));
		assert.ok(eco.breakEvenMinimumPriceRub > 2500);
	});
});
