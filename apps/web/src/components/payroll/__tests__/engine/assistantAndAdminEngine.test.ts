/**
 * assistantAndAdminEngine.test.ts — Assistant and Administrator Payroll Calculations
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAssistantStaffPayroll,
	calculateAdministratorStaffPayroll,
	type AssistantStaffPayrollInput,
	type AdministratorStaffPayrollInput,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: Assistant & Administrator Engine", () => {
	it("2.1 Computes assistant shifts with highest category (+20%), sterilization, radiographs, and surgeries", () => {
		const input: AssistantStaffPayrollInput = {
			employeeId: "asst-1",
			employeeTabNumber: "00201",
			employeeFullName: "Иванова Екатерина Сергеевна",
			category: "highest",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			shifts: [
				{
					id: "sh-1",
					dateIso: "2026-08-03",
					shiftType: "standard_6h",
					hoursWorked: 6.0,
					isSterilizationShift: true,
					radiographsTakenCount: 4,
					surgeriesAssistedCount: 1,
				},
				{
					id: "sh-2",
					dateIso: "2026-08-05",
					shiftType: "full_12h",
					hoursWorked: 12.0,
					isSterilizationShift: false,
					radiographsTakenCount: 6,
					surgeriesAssistedCount: 2,
				},
			],
		};

		const res = calculateAssistantStaffPayroll(input);
		assert.equal(res.totalShiftsCount, 2);
		assert.equal(res.totalHoursWorked, 18.0);
		assert.equal(res.baseShiftsPayoutKop, 1050000);
		assert.equal(res.categoryBonusKop, 210000);
		assert.equal(res.sterilizationShiftsCount, 1);
		assert.equal(res.sterilizationBonusKop, 50000);
		assert.equal(res.totalRadiographsCount, 10);
		assert.equal(res.radiographsPayoutKop, 150000);
		assert.equal(res.totalSurgeriesCount, 3);
		assert.equal(res.surgeriesPayoutKop, 150000);
		assert.equal(res.grossPayoutBeforeTaxKop, 1610000);
	});

	it("3.1 Computes administrator salary with cash revenue % and lead conversion bonus", () => {
		const input: AdministratorStaffPayrollInput = {
			employeeId: "adm-1",
			employeeTabNumber: "00301",
			employeeFullName: "Соколова Елена Викторовна",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			shiftsWorked: 15,
			clinicCashRevenueKop: 100000000,
			primaryLeadsCount: 50,
			convertedLeadsCount: 40,
		};

		const res = calculateAdministratorStaffPayroll(input);
		assert.equal(res.baseSalaryPayoutKop, 4500000);
		assert.equal(res.cashRevenueCommissionKop, 1000000);
		assert.equal(res.conversionRatePercent, 80.0);
		assert.equal(res.leadConversionBonusKop, 1000000);
		assert.equal(res.grossPayoutBeforeTaxKop, 6500000);
	});

	it("3.2 Denies conversion bonus when conversion rate falls below threshold", () => {
		const input: AdministratorStaffPayrollInput = {
			employeeId: "adm-2",
			employeeTabNumber: "00302",
			employeeFullName: "Морозова Дарья Андреевна",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			shiftsWorked: 10,
			clinicCashRevenueKop: 50000000,
			primaryLeadsCount: 50,
			convertedLeadsCount: 30,
		};

		const res = calculateAdministratorStaffPayroll(input);
		assert.equal(res.conversionRatePercent, 60.0);
		assert.equal(res.leadConversionBonusKop, 0);
		assert.equal(res.grossPayoutBeforeTaxKop, 3500000);
	});
});
