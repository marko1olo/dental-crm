/**
 * assistantAndAccountingExports.test.ts — Assistant Shifts & 1C:ZUP Document Generation
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAssistantStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generate1CZup31Xml,
	generate1CZup31Csv,
	type AssistantStaffPayrollInput,
} from "../../staffPayrollEngine";

describe("Assistant Shifts & 1C:ZUP 3.1 Document Generation", () => {
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
					dateIso: "2026-08-04",
					shiftType: "standard_6h",
					hoursWorked: 6.0,
					isSterilizationShift: true,
					radiographsTakenCount: 6,
					surgeriesAssistedCount: 2,
				},
				{
					id: "sh-2",
					dateIso: "2026-08-08",
					shiftType: "full_12h",
					hoursWorked: 12.0,
					isSterilizationShift: false,
					radiographsTakenCount: 4,
					surgeriesAssistedCount: 1,
				},
			],
		};

		const res = calculateAssistantStaffPayroll(asstInput);
		assert.equal(res.totalShiftsCount, 2);
		assert.equal(res.totalHoursWorked, 18.0);
		assert.equal(res.categoryBonusPercent, 20);
		assert.equal(res.totalRadiographsCount, 10);
		assert.equal(res.radiographsPayoutKop, 150000);
		assert.equal(res.totalSurgeriesCount, 3);
		assert.equal(res.surgeriesPayoutKop, 150000);
		assert.equal(res.sterilizationBonusKop, 50000);
		assert.ok(res.grossPayoutBeforeTaxKop > 0);
	});

	it("1.2 Generates compliant 1C:ZUP 3.1 XML and CSV documents for doctor payroll", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
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
					medicalCardNumber: "043/у-2026/891",
					serviceNameRu: "Лечение пульпита",
					category: "therapy",
					grossRevenueKop: 2000000,
					labCostKop: 0,
					materialCostKop: 100000,
				}],
			}],
		});

		const xml = generate1CZup31Xml(summary, "ЗП-TEST-01", "2026-08-31");
		assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes("<ЗарплатаКадрыДокумент"));
		assert.ok(xml.includes('ТабельныйНомер="00101"'));
		assert.ok(xml.includes('ФИО="Смирнов Алексей Петрович"'));
		assert.ok(xml.includes("<ВидРасчета>Сдельная оплата труда (стоматология)</ВидРасчета>"));

		const csv = generate1CZup31Csv(summary);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("00101"));
		assert.ok(csv.includes("Смирнов Алексей Петрович"));
	});
});
