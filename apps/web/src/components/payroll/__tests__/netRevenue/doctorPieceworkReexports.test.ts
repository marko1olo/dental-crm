/**
 * doctorPieceworkReexports.test.ts — Piecework Modals & Surgical Implant Deductions
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	calculateAssistantStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generateDoctorPayrollCsv,
	type StaffDoctorCompletedServiceItem,
	type DoctorStaffPayrollInput,
} from "../../staffPayrollEngine";
import { DoctorPayrollModal } from "../../DoctorPayrollModal";

describe("Doctor Piecework Re-exports & Implant Deductions (Mandate 8e, 8n)", () => {
	it("1.1 Re-exports all required payroll modals and engines from canonical modules", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal must be exported");
		assert.ok(calculateDoctorStaffPayroll, "calculateDoctorStaffPayroll must be exported");
		assert.ok(calculateAssistantStaffPayroll, "calculateAssistantStaffPayroll must be exported");
		assert.ok(calculateConsolidatedStaffPayroll, "calculateConsolidatedStaffPayroll must be exported");
		assert.ok(generateDoctorPayrollCsv, "generateDoctorPayrollCsv must be exported");
	});

	it("1.2 Computes doctor piecework with automatic lab/material deduction and clinical directions", () => {
		const services: StaffDoctorCompletedServiceItem[] = [
			{
				id: "srv-1", dateIso: "2026-08-05", patientName: "Смирнова Екатерина Васильевна",
				medicalCardNumber: "2026/891", serviceNameRu: "Лечение пульпита",
				toothCode: "16", category: "therapy",
				grossRevenueKop: 2500000, labCostKop: 0, materialCostKop: 200000,
			},
			{
				id: "srv-2", dateIso: "2026-08-10", patientName: "Сидорова Светлана Сергеевна",
				medicalCardNumber: "2026/512", serviceNameRu: "Циркониевая коронка CAD/CAM",
				toothCode: "24", category: "orthopedics",
				grossRevenueKop: 3500000, labCostKop: 800000, materialCostKop: 150000,
			},
			{
				id: "srv-3", dateIso: "2026-08-15", patientName: "Попов Артем Сергеевич",
				medicalCardNumber: "2026/651", serviceNameRu: "Набор Curaprox 5460",
				category: "retail_hygiene", grossRevenueKop: 300000, labCostKop: 0, materialCostKop: 0,
			},
		];

		const docInput: DoctorStaffPayrollInput = {
			employeeId: "doc-1", employeeTabNumber: "00101", employeeFullName: "Смирнов Алексей Петрович",
			specialtyId: "therapist", periodStartIso: "2026-08-01", periodEndIso: "2026-08-31",
			daysWorked: 21, hoursWorked: 126.0, comprehensivePlansCount: 4,
			comprehensivePlanBonusPerUnitKop: 500000, services,
		};

		const res = calculateDoctorStaffPayroll(docInput);
		assert.equal(res.totalGrossRevenueKop, 6300000);
		assert.equal(res.totalMaterialDeductionsKop, 350000);
		assert.equal(res.totalLabDeductionsKop, 800000);
		assert.equal(res.comprehensivePlanBonusKop, 2000000);
		assert.equal(res.earnedRetailCommissionKop, 30000);
		assert.ok(res.grossPayoutBeforeTaxKop > 0);
	});

	it("1.3 Computes Net Revenue piece-rate payroll deducting lab and surgical implants", () => {
		const docInput: DoctorStaffPayrollInput = {
			employeeId: "doc-net-1", employeeTabNumber: "00105", employeeFullName: "Смирнов Алексей Петрович",
			specialtyId: "surgeon", periodStartIso: "2026-10-01", periodEndIso: "2026-10-31",
			services: [{
				id: "srv-imp-test", dateIso: "2026-10-05", patientName: "Пациент Тестовый",
				medicalCardNumber: "001", serviceNameRu: "Имплантация Nobel Biocare", category: "surgery",
				grossRevenueKop: 12000000, labCostKop: 0, materialCostKop: 4000000, isPaid: true, paidAmountKop: 12000000,
			}],
		};

		const res = calculateDoctorStaffPayroll(docInput);
		assert.equal(res.totalGrossRevenueKop, 12000000);
		assert.equal(res.totalMaterialDeductionsKop, 4000000);
		assert.equal(res.totalNetBaseKop, 8000000);
		assert.ok(res.earnedBaseCommissionKop > 0);
	});
});
