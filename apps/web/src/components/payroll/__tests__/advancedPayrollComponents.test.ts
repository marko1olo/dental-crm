/**
 * advancedPayrollComponents.test.ts — Unit tests for Wave 14 Advanced Doctor Payroll & Form T-13 Timesheet Components
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	calculateAssistantStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generate1CZup31Xml,
	generate1CZup31Csv,
	generateStaffPayrollT51Csv,
	type StaffDoctorCompletedServiceItem,
	type DoctorStaffPayrollInput,
	type AssistantStaffPayrollInput,
} from "../staffPayrollEngine.js";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	type TimesheetDayRecord,
	type EmployeeTimesheetInput,
} from "@dental/shared";
import * as PayrollExports from "../index.js";

describe("Wave 14: Advanced Doctor Payroll & Form T-13 Timesheet", () => {
	it("1.1 Re-exports all required payroll modals and engines from index.ts", () => {
		assert.ok(PayrollExports.AdvancedDoctorPayrollModal, "AdvancedDoctorPayrollModal must be exported");
		assert.ok(PayrollExports.FormT13TimesheetModal, "FormT13TimesheetModal must be exported");
		assert.ok(PayrollExports.DoctorPayrollModal, "DoctorPayrollModal must be exported");
		assert.ok(PayrollExports.TimesheetT13Modal, "TimesheetT13Modal must be exported");
		assert.ok(PayrollExports.StaffPayrollLedgerModal, "StaffPayrollLedgerModal must be exported");
		assert.ok(PayrollExports.calculateDoctorStaffPayroll, "calculateDoctorStaffPayroll must be exported");
		assert.ok(PayrollExports.calculateAssistantStaffPayroll, "calculateAssistantStaffPayroll must be exported");
		assert.ok(PayrollExports.calculateConsolidatedStaffPayroll, "calculateConsolidatedStaffPayroll must be exported");
		assert.ok(PayrollExports.generate1CZup31Xml, "generate1CZup31Xml must be exported");
	});

	it("1.2 Computes doctor piecework with automatic lab/material deduction and clinical directions", () => {
		const services: StaffDoctorCompletedServiceItem[] = [
			{
				id: "srv-1",
				dateIso: "2026-08-05",
				patientName: "Смирнова Екатерина Васильевна",
				medicalCardNumber: "043/у-2026/891",
				serviceNameRu: "Лечение пульпита 3-канального моляра",
				order804nCode: "A16.07.002.001",
				toothCode: "16",
				category: "therapy",
				grossRevenueKop: 2500000, // 25,000 RUB
				labCostKop: 0,
				materialCostKop: 200000, // 2,000 RUB
			},
			{
				id: "srv-2",
				dateIso: "2026-08-10",
				patientName: "Сидорова Светлана Сергеевна",
				medicalCardNumber: "043/у-2026/512",
				serviceNameRu: "Циркониевая коронка CAD/CAM",
				order804nCode: "A16.07.004.002",
				toothCode: "24",
				category: "orthopedics",
				grossRevenueKop: 3500000, // 35,000 RUB
				labCostKop: 800000, // 8,000 RUB ЗТЛ
				materialCostKop: 150000,
			},
			{
				id: "srv-3",
				dateIso: "2026-08-15",
				patientName: "Попов Артем Сергеевич",
				medicalCardNumber: "043/у-2026/651",
				serviceNameRu: "Набор Curaprox 5460",
				category: "retail_hygiene",
				grossRevenueKop: 300000, // 3,000 RUB
				labCostKop: 0,
				materialCostKop: 0,
			},
		];

		const docInput: DoctorStaffPayrollInput = {
			employeeId: "doc-1",
			employeeTabNumber: "00101",
			employeeFullName: "Смирнов Алексей Петрович",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			daysWorked: 21,
			hoursWorked: 126.0,
			comprehensivePlansCount: 4,
			comprehensivePlanBonusPerUnitKop: 500000, // 5,000 RUB
			services,
		};

		const res = calculateDoctorStaffPayroll(docInput);

		assert.equal(res.totalGrossRevenueKop, 6300000); // 63,000 RUB
		assert.equal(res.totalMaterialDeductionsKop, 350000); // Therapist deducts materials (2,000 + 1,500 = 3,500 RUB)
		assert.equal(res.totalLabDeductionsKop, 0); // Therapist does not deduct lab by default config
		assert.equal(res.comprehensivePlanBonusKop, 2000000); // 4 * 5,000 = 20,000 RUB
		assert.equal(res.earnedRetailCommissionKop, 30000); // 10% of 3,000 RUB = 300 RUB = 30,000 kop
		assert.ok(res.grossPayoutBeforeTaxKop > 0);
	});

	it("1.3 Calculates assistant shifts, radiographs and surgery assistances", () => {
		const asstInput: AssistantStaffPayrollInput = {
			employeeId: "asst-1",
			employeeTabNumber: "00201",
			employeeFullName: "Иванова Екатерина Сергеевна",
			category: "highest", // +20% bonus
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
		assert.equal(res.radiographsPayoutKop, 150000); // 10 * 150 RUB = 1,500 RUB = 150,000 kop
		assert.equal(res.totalSurgeriesCount, 3);
		assert.equal(res.surgeriesPayoutKop, 150000); // 3 * 500 RUB = 1,500 RUB = 150,000 kop
		assert.equal(res.sterilizationBonusKop, 50000); // 1 * 500 RUB = 50,000 kop
		assert.ok(res.grossPayoutBeforeTaxKop > 0);
	});

	it("1.4 Generates compliant 1C:ZUP 3.1 XML and CSV documents for doctor payroll", () => {
		const summary = calculateConsolidatedStaffPayroll({
			clinicName: "ООО «Денте Стоматология»",
			organizationInn: "7701984512",
			organizationKpp: "770101001",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			doctors: [
				{
					employeeId: "doc-1",
					employeeTabNumber: "00101",
					employeeFullName: "Смирнов Алексей Петрович",
					specialtyId: "therapist",
					periodStartIso: "2026-08-01",
					periodEndIso: "2026-08-31",
					services: [
						{
							id: "srv-1",
							dateIso: "2026-08-15",
							patientName: "Смирнова Екатерина Васильевна",
							medicalCardNumber: "043/у-2026/891",
							serviceNameRu: "Лечение пульпита",
							category: "therapy",
							grossRevenueKop: 2000000,
							labCostKop: 0,
							materialCostKop: 100000,
						},
					],
				},
			],
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

	it("1.5 Computes Form T-13 statutory timesheet with proper split halves and codes", () => {
		const days: TimesheetDayRecord[] = [
			{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 2, primaryCode: "Я", primaryHours: 6.0 },
			{ dayNumber: 3, primaryCode: "В", primaryHours: 0 },
			{ dayNumber: 16, primaryCode: "ОТ", primaryHours: 0 },
			{ dayNumber: 17, primaryCode: "Б", primaryHours: 0 },
			{ dayNumber: 18, primaryCode: "С", primaryHours: 8.0 },
		];

		const input: EmployeeTimesheetInput = {
			employeeId: "emp-t13-1",
			employeeTabNumber: "00101",
			employeeFullName: "Смирнов Алексей Петрович",
			positionRu: "Врач-стоматолог терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8,
			days,
		};

		const res = calculateEmployeeTimesheetT13(input);

		assert.equal(res.firstHalfSummary.daysWorked, 2);
		assert.equal(res.firstHalfSummary.regularHoursWorked, 12.0);
		assert.equal(res.secondHalfSummary.vacationDays, 1);
		assert.equal(res.secondHalfSummary.sickLeaveDays, 1);
		assert.equal(res.secondHalfSummary.overtimeHoursWorked, 8.0);
		assert.equal(res.monthTotalSummary.daysWorked, 3);
	});
});
