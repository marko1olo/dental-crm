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
import { DoctorPayrollModal } from "../../finance/payroll/DoctorPayrollModal.js";

describe("Wave 14: Advanced Doctor Piece-Rate Payroll & Net Revenue", () => {
	it("1.1 Re-exports all required payroll modals and engines from canonical modules", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal must be exported");
		assert.ok(calculateDoctorStaffPayroll, "calculateDoctorStaffPayroll must be exported");
		assert.ok(calculateAssistantStaffPayroll, "calculateAssistantStaffPayroll must be exported");
		assert.ok(calculateConsolidatedStaffPayroll, "calculateConsolidatedStaffPayroll must be exported");
		assert.ok(generate1CZup31Xml, "generate1CZup31Xml must be exported");
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
		assert.equal(res.totalLabDeductionsKop, 800000); // Orthopedics CAD/CAM crown deducts 8,000 RUB ZTL lab
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

	it("1.5 Computes Net Revenue piece-rate payroll deducting lab and surgical implants", () => {
		const docInput: DoctorStaffPayrollInput = {
			employeeId: "doc-net-1",
			employeeTabNumber: "00105",
			employeeFullName: "Смирнов Алексей Петрович",
			specialtyId: "surgeon",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [
				{
					id: "srv-imp-test",
					dateIso: "2026-10-05",
					patientName: "Пациент Тестовый",
					medicalCardNumber: "001",
					serviceNameRu: "Имплантация Nobel Biocare",
					category: "surgery",
					grossRevenueKop: 12000000, // 120,000 RUB
					labCostKop: 0,
					materialCostKop: 4000000, // 40,000 RUB имплант + мембрана
					isPaid: true,
					paidAmountKop: 12000000,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(docInput);
		// Net base = 120,000 - 40,000 = 80,000 RUB = 8,000,000 kop
		assert.equal(res.totalGrossRevenueKop, 12000000);
		assert.equal(res.totalMaterialDeductionsKop, 4000000);
		assert.equal(res.totalNetBaseKop, 8000000);
		assert.ok(res.earnedBaseCommissionKop > 0);
	});
});
