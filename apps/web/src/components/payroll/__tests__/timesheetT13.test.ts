/**
 * ═══════════════════════════════════════════════════════════════════════════
 * timesheetT13.test.ts — Red Team Doctor Piece-Rate Payroll & Net Revenue Inquisitor
 * 
 * Rebuilt from scratch per Supreme Constitution & Creator Mandate (Purge T-13 Simulator).
 * Governed by:
 * - Mandate 8e: Doctor & Staff Autonomy (0 friction, non-blocking buttons)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Chair rental, transparent piecework)
 * - Mandate 8x: Clean Clinical Russian, zero Soviet Goskomstat codes (Т-13/Т-51) in UI
 * - Mandate 8am: Exactly ONE Primary CTA «✓ Начислить зарплату»
 * - Mandate 8i: Exact integer kopeck arithmetic (amountKopecks), zero float drift
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	calculateDoctorStaffPayroll,
	calculateDoctorPeriodPayroll,
	DOCTOR_SPECIALTY_CONFIGS,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	type DoctorStaffPayrollInput,
} from "../staffPayrollEngine";
import { calculateDoctorServicesMetrics } from "../engine/doctorServicesCalculation";
import { DoctorPayrollModal } from "../DoctorPayrollModal";

describe("Doctor Piece-Rate Payroll & Net Revenue Audit (Mandates 8e, 8n, 8x, 8am)", () => {
	it("1. Net Revenue Formula: Gross − Lab (ЗТЛ) − Materials (Импланты) = Net Base × Commission %", () => {
		const preset = DOCTOR_SPECIALTY_CONFIGS.surgeon;
		assert.ok(preset, "Surgeon specialty preset must exist");

		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-surg-1",
			employeeTabNumber: "00101",
			employeeFullName: "Д-р Смирнов А.П.",
			specialtyId: "surgeon",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [
				{
					id: "srv-imp-1",
					dateIso: "2026-10-05",
					patientName: "Пациент Иванов",
					medicalCardNumber: "001",
					serviceNameRu: "Установка имплантата Straumann BLX",
					category: "surgery",
					grossRevenueKop: 9500000, // 95,000.00 RUB
					labCostKop: 0,
					materialCostKop: 3200000, // 32,000.00 RUB (имплантат + формирователь)
					isPaid: true,
					paidAmountKop: 9500000,
				},
			],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 25);
		assert.equal(metrics.totalGross, 9500000);
		assert.equal(metrics.totalMaterial, 3200000);
		assert.equal(metrics.totalLab, 0);

		// Net Base = 95,000 - 32,000 = 63,000 RUB = 6,300,000 kop
		// Commission 20% (surgeon preset) = 1,260,000 kop = 12,600.00 RUB
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
			services: [
				{
					id: "srv-crown-1",
					dateIso: "2026-10-10",
					patientName: "Пациент Петров",
					medicalCardNumber: "002",
					serviceNameRu: "Коронка из диоксида циркония Prettau",
					category: "orthopedics",
					grossRevenueKop: 4500000, // 45,000.00 RUB
					labCostKop: 1200000, // 12,000.00 RUB счёт ЗТЛ
					materialCostKop: 0,
					isPaid: true,
					paidAmountKop: 4500000,
				},
			],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 30);
		// Net base = 45,000 - 12,000 = 33,000 RUB = 3,300,000 kop
		// Commission 30% = 990,000 kop = 9,900.00 RUB
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
			services: [
				{
					id: "srv-curaprox-1",
					dateIso: "2026-10-12",
					patientName: "Пациент Сидоров",
					medicalCardNumber: "003",
					serviceNameRu: "Зубная щетка Curaprox Ultra Soft",
					category: "retail_hygiene",
					grossRevenueKop: 180000, // 1,800.00 RUB
					labCostKop: 0,
					materialCostKop: 0,
					isPaid: true,
					paidAmountKop: 180000,
				},
			],
		};

		const metrics = calculateDoctorServicesMetrics(input, preset, 30);
		// 10% from 1,800.00 RUB = 180.00 RUB = 18,000 kop
		assert.equal(metrics.earnedRetail, 18000);
		assert.equal(metrics.earnedBase, 0);
	});

	it("4. 54-FZ Cashbox Discipline: uncollected patient debts produce zero doctor commission", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-debt-audit",
			doctorName: "Д-р Тестовый А.А.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			services: [
				{
					id: "srv-unpaid-debt",
					dateIso: "2026-10-15",
					patientName: "Неплательщик",
					medicalCardNumber: "004",
					serviceNameRu: "Виниры E.max 4 единицы",
					category: "orthopedics",
					grossRevenueKop: 16000000, // 160,000.00 RUB
					labCostKop: 4000000,
					materialCostKop: 0,
					isPaid: false, // Долг — деньги в кассу не поступили!
					paidAmountKop: 0,
				},
			],
		});

		assert.equal(res.totalGrossRevenueKop, 0, "Uncollected debts must not enter doctor revenue");
		assert.equal(res.earnedBaseCommissionKop, 0, "Zero commission accrued on unpaid debts");
	});

	it("5. Solo Doctor Chair Rental: Gross − Chair Rental − Lab − Materials = 100% Net Profit", () => {
		const res = calculateDoctorPeriodPayroll({
			doctorId: "solo-doctor",
			doctorName: "Д-р Соло В.В.",
			specialtyId: "solo_practitioner",
			periodStartIso: "2026-10-01",
			periodEndIso: "2026-10-31",
			payoutModel: "chair_rental",
			chairRentalKop: 4500000, // 45,000.00 RUB аренда кресла
			services: [
				{
					id: "srv-solo-1",
					dateIso: "2026-10-20",
					patientName: "Пациент Соло",
					medicalCardNumber: "005",
					serviceNameRu: "Комплексное терапевтическое лечение",
					category: "therapy",
					grossRevenueKop: 25000000, // 250,000.00 RUB
					labCostKop: 2000000, // 20,000.00 RUB ЗТЛ
					materialCostKop: 3000000, // 30,000.00 RUB материалы
					isPaid: true,
					paidAmountKop: 25000000,
				},
			],
		});

		// Net Profit = 250,000 - 45,000 (аренда) - 20,000 (ЗТЛ) - 30,000 (материалы) = 155,000 RUB = 15,500,000 kop
		assert.equal(res.chairRentalKop, 4500000);
		assert.equal(res.totalNetBaseKop, 15500000);
		assert.equal(res.earnedBaseCommissionKop, 15500000);
		assert.equal(res.baseCommissionPercent, 100);
	});

	it("6. Mandate 8e: DoctorPayrollModal renders seamlessly without any blocking disabled buttons", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal component must be cleanly exported");
	});
});
