/**
 * apps/web/src/components/analytics/__tests__/chairEconomicsAndRental.test.ts
 * Mandate 8b: File <= 120 lines. Zero-mock chair hourly cost, procedure margin & rental economics.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateChairHourlyCost,
	calculateChairRentalEconomics,
	calculateProcedureEconomics,
} from "@dental/shared";

describe("Chair Economics and Rental", () => {
	it("calculates chair hourly cost, procedure margin, and chair rental economics via @dental/shared", () => {
		const overheadInput = {
			activeChairsCount: 3,
			workingDaysPerMonth: 26,
			workingHoursPerDay: 12,
			chairUtilizationRate: 0.75,
			monthlyRentRub: 150_000,
			monthlyUtilitiesRub: 30_000,
			monthlyAdministrativePayrollRub: 180_000,
			monthlyEquipmentDepreciationRub: 60_000,
			monthlySanpinSterilizationRub: 45_000,
			monthlyMarketingAndOtherRub: 25_000,
		};

		const chairCost = calculateChairHourlyCost(overheadInput);

		assert.equal(chairCost.totalMonthlyFixedOverheadRub, 490_000);
		assert.ok(chairCost.hourlyCostRealOccupiedRub > chairCost.hourlyCostNominalRub);

		const procEcon = calculateProcedureEconomics(overheadInput, {
			procedureName: "Восстановление зуба пломбой",
			durationMinutes: 60,
			patientPriceRub: 12_500,
			discountRate: 0,
			directConsumablesRub: 1_400,
			labTechnicianCostRub: 0,
			doctorCommissionRate: 0.25,
			deductLabFromDoctorBase: true,
			assistantFeeRub: 400,
			acquiringRate: 0.015,
		});

		assert.ok(procEcon.clinicNetProfitRub > 0);
		assert.ok(procEcon.clinicNetMarginPercent > 30);
		assert.equal(procEcon.isLossMaking, false);

		const rental = calculateChairRentalEconomics({
			model: "revenue_percent",
			grossRevenueKopecks: 150_000_000,
			hoursWorked: 120,
			hourlyRateKopecks: 180_000,
			landlordPercent: 35,
			consumablesKopecks: 15_000_000,
		});

		assert.equal(rental.grossRevenueRub, 1_500_000);
		assert.ok(rental.netProfitRub > 0);
		assert.ok(rental.effectiveHourlyIncomeRub > 0);
	});
});
