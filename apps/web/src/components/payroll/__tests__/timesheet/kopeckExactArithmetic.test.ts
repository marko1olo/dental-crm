/**
 * kopeckExactArithmetic.test.ts — Integer Kopeck Arithmetic & Minimum Guarantees
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	DOCTOR_SPECIALTY_CONFIGS,
	type DoctorStaffPayrollInput,
} from "../../staffPayrollEngine";

describe("Red Team: Kopeck-Exact Arithmetic & Zero Rounding Drift (Mandate 8b)", () => {
	it("2.1 Solo practitioner specialty computes 100% net margin piecework without rounding drift", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "solo-doc",
			employeeTabNumber: "00001",
			employeeFullName: "Д-р Смирнов А.П.",
			specialtyId: "solo_practitioner",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "s-1",
					dateIso: "2026-08-05",
					patientName: "Пациент 1",
					medicalCardNumber: "001",
					serviceNameRu: "Керамическая накладка",
					category: "orthopedics",
					grossRevenueKop: 3500000,
					labCostKop: 850050,
					materialCostKop: 120025,
				},
				{
					id: "s-2",
					dateIso: "2026-08-10",
					patientName: "Пациент 2",
					medicalCardNumber: "002",
					serviceNameRu: "Продажа пасты",
					category: "retail_hygiene",
					grossRevenueKop: 150000,
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalGrossRevenueKop, 3650000);
		assert.equal(res.totalLabDeductionsKop, 850050);
		assert.equal(res.totalMaterialDeductionsKop, 120025);
		assert.equal(res.totalNetBaseKop, 2679925);
		assert.equal(res.earnedBaseCommissionKop, 2529925);
		assert.equal(res.earnedRetailCommissionKop, 150000);
		assert.equal(res.grossPayoutBeforeTaxKop, 2679925);
		assert.equal(Number.isInteger(res.grossPayoutBeforeTaxKop), true);
	});

	it("2.2 General dentist specialty deducts both lab and material costs and enforces minimum guarantee", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist config must exist");
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.general_dentist.defaultPercentage, 25);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.general_dentist.minGuaranteeMonthlyKop, 7000000);

		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-gen",
			employeeTabNumber: "00003",
			employeeFullName: "Д-р Новикова О.И.",
			specialtyId: "general_dentist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			daysWorked: 21,
			services: [{
				id: "s-1",
				dateIso: "2026-08-12",
				patientName: "Пациент",
				medicalCardNumber: "003",
				serviceNameRu: "Консультация",
				category: "therapy",
				grossRevenueKop: 1000000,
				labCostKop: 100000,
				materialCostKop: 100000,
			}],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalNetBaseKop, 800000);
		assert.equal(res.earnedBaseCommissionKop, 240000);
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.guaranteeTopUpKop, 6760000);
		assert.equal(res.grossPayoutBeforeTaxKop, 7000000);
	});

	it("2.3 Doctor with active attendance but zero billed services qualifies for minimum guarantee floor", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-duty",
			employeeTabNumber: "00004",
			employeeFullName: "Д-р Дежурный А.А.",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			daysWorked: 21,
			services: [],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.guaranteeTopUpKop, 6000000);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
	});
});
