/**
 * assistantAndAccountingExports.test.ts — Assistant Shifts & Staff Payroll Accounting Exports
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAssistantStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollAccountingCsv,
	type AssistantStaffPayrollInput,
} from "../../staffPayrollEngine";

describe("Assistant Shifts & Staff Payroll Accounting Document Generation", () => {
	it("1.1 Calculates assistant shifts, radiographs and surgery assistances", () => {
		const asstInput: AssistantStaffPayrollInput = {
			employeeId: "asst-1",
			employeeTabNumber: "00201",
			employeeFullName: "Иванова Екатерина Сергеевна",
			category: "highest",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			shifts: [
				{
					id: "sh-1",
					dateIso: "2026-08-05",
					shiftType: "standard_6h",
					hoursWorked: 6.0,
					isSterilizationShift: true,
					radiographsTakenCount: 4,
					surgeriesAssistedCount: 1,
				},
				{
					id: "sh-2",
					dateIso: "2026-08-10",
					shiftType: "full_12h",
					hoursWorked: 12.0,
					isSterilizationShift: true,
					radiographsTakenCount: 6,
					surgeriesAssistedCount: 3,
				},
				{
					id: "sh-3",
					dateIso: "2026-08-15",
					shiftType: "overtime_custom",
					hoursWorked: 4.5,
				},
			],
		};

		const res = calculateAssistantStaffPayroll(asstInput);
		assert.equal(res.totalShiftsCount, 3);
		assert.equal(res.totalHoursWorked, 22.5);
		assert.equal(res.sterilizationBonusKop, 100000);
		assert.equal(res.radiographsPayoutKop, 150000);
		assert.equal(res.surgeriesPayoutKop, 200000);
		assert.ok(res.grossPayoutBeforeTaxKop > 0);
	});

	it("1.2 Generates clean staff payroll accounting CSV with UTF-8 BOM", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "Стоматологическая клиника ДЕНТЕ",
			organizationInn: "7701984512",
			organizationKpp: "770101001",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [{
				employeeId: "doc-1",
				employeeTabNumber: "00101",
				employeeFullName: "Смирнов Алексей Петрович",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				services: [{
					id: "srv-1",
					dateIso: "2026-08-15",
					patientName: "Смирнова Екатерина Васильевна",
					medicalCardNumber: "2026/891",
					serviceNameRu: "Лечение пульпита",
					category: "therapy",
					grossRevenueKop: 2000000,
					labCostKop: 0,
					materialCostKop: 100000,
				}],
			}],
		});

		const csv = generateStaffPayrollAccountingCsv(summary);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("00101"));
		assert.ok(csv.includes("Смирнов Алексей Петрович"));
		assert.ok(csv.includes("Начисление"));
	});
});
