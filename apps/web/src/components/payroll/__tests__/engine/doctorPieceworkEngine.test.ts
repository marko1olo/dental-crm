/**
 * doctorPieceworkEngine.test.ts — Doctor Piecework, Deductions & Revenue KPIs
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	type DoctorStaffPayrollInput,
} from "../../staffPayrollEngine";

describe("Staff Multi-Role: Doctor Piecework & KPI Calculations", () => {
	it("1.1 Computes therapist piecework with material deduction and retail bonus", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-1",
			employeeTabNumber: "00101",
			employeeFullName: "Смирнов Алексей Петрович",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "s-1",
					dateIso: "2026-08-10",
					patientName: "Иванов И.И.",
					medicalCardNumber: "043/у-101",
					serviceNameRu: "Лечение пульпита",
					category: "therapy",
					grossRevenueKop: 1000000,
					labCostKop: 0,
					materialCostKop: 100000,
				},
				{
					id: "s-2",
					dateIso: "2026-08-15",
					patientName: "Петров П.П.",
					medicalCardNumber: "043/у-102",
					serviceNameRu: "Продажа Curaprox",
					category: "retail_hygiene",
					grossRevenueKop: 200000,
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalGrossRevenueKop, 1200000);
		assert.equal(res.totalMaterialDeductionsKop, 100000);
		assert.equal(res.totalLabDeductionsKop, 0);
		assert.equal(res.totalNetBaseKop, 1100000);
		assert.equal(res.earnedBaseCommissionKop, 270000);
		assert.equal(res.earnedRetailCommissionKop, 20000);
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
	});

	it("1.2 Computes orthopedist piecework with lab deduction, high volume KPI, and plans bonus", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-2",
			employeeTabNumber: "00102",
			employeeFullName: "Васильев Максим Сергеевич",
			specialtyId: "orthopedist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			comprehensivePlansCount: 5,
			comprehensivePlanBonusPerUnitKop: 500000,
			services: [
				{
					id: "s-3",
					dateIso: "2026-08-12",
					patientName: "Сидорова С.С.",
					medicalCardNumber: "043/у-103",
					serviceNameRu: "Циркониевые коронки CAD/CAM",
					category: "orthopedics",
					grossRevenueKop: 120000000,
					labCostKop: 30000000,
					materialCostKop: 5000000,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalGrossRevenueKop, 120000000);
		assert.equal(res.totalLabDeductionsKop, 30000000);
		assert.equal(res.totalMaterialDeductionsKop, 0);
		assert.equal(res.totalNetBaseKop, 90000000);
		assert.equal(res.earnedBaseCommissionKop, 27000000);
		assert.equal(res.revenueKpiPercent, 5);
		assert.equal(res.revenueKpiBonusKop, 4500000);
		assert.equal(res.comprehensivePlanBonusKop, 2500000);
		assert.equal(res.grossPayoutBeforeTaxKop, 34000000);
		assert.equal(res.minimumGuaranteeApplied, false);
	});
});
