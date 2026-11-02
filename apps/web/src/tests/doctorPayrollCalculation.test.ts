/**
 * apps/web/src/tests/doctorPayrollCalculation.test.ts
 *
 * Doctor & Staff Piece-Rate Payroll Calculation Engine Tests.
 *
 * Focus:
 * 1. Piece-rate therapist calculations with material deductions & 13% NDFL.
 * 2. KPI bonuses & tiered high-revenue calculations.
 * 3. Assistant shifts, radiograph & surgery bonuses.
 * 4. Payroll reporting & CSV export with UTF-8 BOM.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	generateDoctorPayrollCsv,
	type DoctorCompletedServiceItem,
} from "../components/payroll/staffPayrollEngine";

describe("Doctor & Staff Piece-Rate Payroll Calculation Engine", () => {
	it("should calculate therapist commission with material deductions and NDFL 13%", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "1",
				dateIso: "2026-08-01",
				patientName: "Тестовый Пациент",
				medicalCardNumber: "043/у-01",
				serviceNameRu: "Пломбирование",
				category: "therapy",
				grossRevenueKop: 1000000, // 10,000 RUB
				labCostKop: 0,
				materialCostKop: 200000, // 2,000 RUB (materials deducted)
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Тестов",
			specialtyId: "therapist", // 30% default
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.totalGrossRevenueKop, 1000000);
		assert.equal(res.totalMaterialDeductionsKop, 200000);
		assert.equal(res.totalNetBaseKop, 800000); // 8,000 RUB
		assert.equal(res.baseCommissionPercent, 30);
		// Pre-guarantee earned: 30% of 8,000 = 2,400 RUB (240,000 kop)
		// Min guarantee for therapist is 60,000 RUB (6,000,000 kop)
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
		assert.equal(res.ndfl13TaxKop, 780000); // 13% of 60,000 = 7,800 RUB
		assert.equal(res.netPayoutToDoctorKop, 5220000); // 52,200 RUB
	});

	it("should calculate high revenue therapist with KPI bonus tier and no guarantee needed", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "1",
				dateIso: "2026-08-01",
				patientName: "Тестовый Пациент",
				medicalCardNumber: "043/у-01",
				serviceNameRu: "Тотальная терапия",
				category: "therapy",
				grossRevenueKop: 120000000, // 1,200,000 RUB (triggers Tier 1: +5%)
				labCostKop: 0,
				materialCostKop: 20000000, // 200,000 RUB
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Топовый",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.kpiBonusPercent, 5);
		assert.equal(res.minimumGuaranteeApplied, false);
		// Net base: 1,000,000 RUB (100,000,000 kop)
		// 30% = 300,000 RUB (30,000,000 kop)
		// 5% KPI = 50,000 RUB (5,000,000 kop)
		// Gross = 350,000 RUB (35,000,000 kop)
		assert.equal(res.grossPayoutBeforeTaxKop, 35000000);
		// NDFL 13% = 45,500 RUB (4,550,000 kop)
		assert.equal(res.ndfl13TaxKop, 4550000);
		// Net = 304,500 RUB (30,450,000 kop)
		assert.equal(res.netPayoutToDoctorKop, 30450000);
	});

	it("should calculate assistant shifts and radiograph bonuses", () => {
		const res = calculateAssistantPeriodPayroll("asst-1", "Ассистент Анна", "Август 2026", [
			{
				id: "s-1",
				dateIso: "2026-08-01",
				shiftType: "standard_6h",
				hoursWorked: 6,
				radiographsTakenCount: 4, // 4 * 150 = 600 RUB
				surgeriesAssistedCount: 1, // 1 * 200 = 200 RUB
			},
		]);

		// Base shift = 3,500 RUB (350,000 kop)
		// Radiograph = 60,000 kop
		// Surgery = 20,000 kop
		// Gross = 430,000 kop (4,300 RUB)
		// NDFL 13% = 55,900 kop (559 RUB)
		// Net = 374,100 kop (3,741 RUB)
		assert.equal(res.totalGrossPayoutKop, 430000);
		assert.equal(res.ndfl13TaxKop, 55900);
		assert.equal(res.netPayoutToAssistantKop, 374100);
	});

	it("should generate CSV with UTF-8 BOM", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [],
		});
		const csv = generateDoctorPayrollCsv([res]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Д-р Смирнов"));
	});
});
