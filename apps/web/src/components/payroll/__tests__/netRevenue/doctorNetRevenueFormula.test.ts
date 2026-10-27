/**
 * doctorNetRevenueFormula.test.ts — Net Revenue Formula & ZTL/Material Deductions
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	DOCTOR_SPECIALTY_CONFIGS,
	type DoctorStaffPayrollInput,
} from "../../staffPayrollEngine";
import { calculateDoctorServicesMetrics } from "../../engine/doctorServicesCalculation";

describe("Doctor Net Revenue: Formula & Deductions (Mandates 8e, 8n)", () => {
	it("1. Net Revenue: Gross − Lab (ЗТЛ) − Materials (Импланты) = Net Base × Commission %", () => {
		const preset = DOCTOR_SPECIALTY_CONFIGS.surgeon;
		assert.ok(preset, "Surgeon specialty preset must exist");

		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-surg-1",
			employeeTabNumber: "00101",
			employeeFullName: "Д-р Смирнов А.П.",
			specialtyId: "surgeon",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-imp-1",
				dateIso: "2026-10-05",
				patientName: "Пациент Иванов",
				medicalCardNumber: "001",
				serviceNameRu: "Установка имплантата Straumann BLX",
				category: "surgery",
				grossRevenueKop: 9500000,
				labCostKop: 0,
				materialCostKop: 3200000,
				isPaid: true,
				paidAmountKop: 9500000,
			}],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 25);
		assert.equal(metrics.totalGross, 9500000);
		assert.equal(metrics.totalMaterial, 3200000);
		assert.equal(metrics.totalLab, 0);

		const expectedNetBase = 6300000;
		const expectedCommission = Math.round((expectedNetBase * 20) / 100);
		assert.equal(metrics.earnedBase, expectedCommission);

		const result = calculateDoctorStaffPayroll(input);
		assert.equal(result.totalNetBaseKop, expectedNetBase);
		assert.ok(result.grossPayoutBeforeTaxKop >= expectedCommission);
		assert.equal(Number.isInteger(result.grossPayoutBeforeTaxKop), true);
	});

	it("2. Orthopedic CAD/CAM Crowns: lab invoice deducted strictly before prosthodontist percentage", () => {
		const preset = DOCTOR_SPECIALTY_CONFIGS.orthopedist;
		assert.ok(preset, "Orthopedist preset must exist");

		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-ortho-1",
			employeeTabNumber: "00102",
			employeeFullName: "Д-р Ковалев М.С.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-crown-1",
				dateIso: "2026-10-10",
				patientName: "Пациент Петров",
				medicalCardNumber: "002",
				serviceNameRu: "Коронка из диоксида циркония Prettau",
				category: "orthopedics",
				grossRevenueKop: 4500000,
				labCostKop: 1200000,
				materialCostKop: 0,
				isPaid: true,
				paidAmountKop: 4500000,
			}],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 30);
		assert.equal(metrics.totalGross, 4500000);
		assert.equal(metrics.totalLab, 1200000);
		assert.equal(metrics.earnedBase, 990000);
	});

	it("3. Retail Products: chairside oral care goods use direct retail percentage without lab deduction", () => {
		const preset = DOCTOR_SPECIALTY_CONFIGS.therapist;
		assert.ok(preset, "therapist preset must exist");

		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-ther-1",
			employeeTabNumber: "00103",
			employeeFullName: "Д-р Белова Е.В.",
			specialtyId: "therapist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [{
				id: "srv-curaprox-1",
				dateIso: "2026-10-12",
				patientName: "Пациент Сидоров",
				medicalCardNumber: "003",
				serviceNameRu: "Зубная щетка Curaprox Ultra Soft",
				category: "retail_hygiene",
				grossRevenueKop: 180000,
				labCostKop: 0,
				materialCostKop: 0,
				isPaid: true,
				paidAmountKop: 180000,
			}],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 30);
		assert.equal(metrics.earnedRetail, 18000);
		assert.equal(metrics.earnedBase, 0);
	});
});
