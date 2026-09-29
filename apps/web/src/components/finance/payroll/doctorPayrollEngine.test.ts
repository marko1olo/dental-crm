/**
 * doctorPayrollEngine.test.ts — Unit tests for Doctor & Staff Piece-Rate Payroll Calculation Engine.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAssistantPeriodPayroll,
	calculateDoctorPeriodPayroll,
	generatePayrollT51Csv,
	type AssistantShiftLogItem,
	type DoctorCompletedServiceItem,
} from "./payrollEngine";
import { DOCTOR_SPECIALTY_PAYROLL_PRESETS } from "./payrollPresets";

describe("Doctor & Staff Payroll Calculation Engine (Т-51 / НДФЛ 13%)", () => {
	it("1.1 Therapist piece-rate calculation with direct material deduction", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-1",
				dateIso: "2026-08-10",
				patientName: "Иванов И.И.",
				medicalCardNumber: "043/у-101",
				serviceNameRu: "Лечение глубокого кариеса (Estelite)",
				category: "therapy",
				grossRevenueKop: 600000, // 6,000 ₽
				labCostKop: 0,
				materialCostKop: 100000, // 1,000 ₽ (deducted)
			},
			{
				id: "srv-2",
				dateIso: "2026-08-11",
				patientName: "Петров П.П.",
				medicalCardNumber: "043/у-102",
				serviceNameRu: "Зубная щетка Curaprox 5460",
				category: "retail_hygiene",
				grossRevenueKop: 100000, // 1,000 ₽
				labCostKop: 0,
				materialCostKop: 0,
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-therapist-1",
			doctorName: "Д-р Смирнов А.П.",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// Net base for therapy = 6000 - 1000 = 5000 ₽ = 500,000 kop
		// Commission for therapist = 25% of 500,000 = 125,000 kop (1,250 ₽)
		// Retail commission = 10% of 100,000 = 10,000 kop (100 ₽)
		// Total before tax = 125,000 + 10,000 = 135,000 kop (1,350 ₽)
		// Minimum guarantee for therapist is 60,000 ₽ (6,000,000 kop), so guarantee kicks in
		assert.equal(result.totalGrossRevenueKop, 700000);
		assert.equal(result.totalMaterialDeductionsKop, 100000);
		assert.equal(result.totalLabDeductionsKop, 0);
		assert.equal(result.earnedBaseCommissionKop, 125000);
		assert.equal(result.earnedRetailCommissionKop, 10000);
		assert.equal(result.minimumGuaranteeApplied, true);
		assert.equal(result.grossPayoutBeforeTaxKop, 6000000); // 60,000 ₽ guarantee
		assert.equal(result.ndfl13TaxKop, 780000); // 13% of 60,000 = 7,800 ₽
		assert.equal(result.netPayoutToDoctorKop, 5220000); // 52,200 ₽ on hand
	});

	it("1.2 Orthopedist piece-rate calculation with CAD/CAM lab deductions and KPI bonus tier", () => {
		// Large revenue exceeding 500,000 ₽ to trigger KPI bonus (+2%)
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-ortho-1",
				dateIso: "2026-08-15",
				patientName: "Сидорова С.С.",
				medicalCardNumber: "043/у-201",
				serviceNameRu: "Циркониевые коронки CAD/CAM (4 единицы)",
				category: "orthopedics",
				grossRevenueKop: 12000000, // 120,000 ₽
				labCostKop: 3600000, // 36,000 ₽ lab invoice (deducted)
				materialCostKop: 0,
			},
			{
				id: "srv-ortho-2",
				dateIso: "2026-08-16",
				patientName: "Козлов К.К.",
				medicalCardNumber: "043/у-202",
				serviceNameRu: "Тотальное протезирование E.max All-on-4",
				category: "orthopedics",
				grossRevenueKop: 48000000, // 480,000 ₽
				labCostKop: 14400000, // 144,000 ₽ lab invoice (deducted)
				materialCostKop: 0,
			},
		];

		// Total Gross = 600,000 ₽ = 60,000,000 kop (triggers Tier 2: +2% KPI bonus)
		// Total Lab = 180,000 ₽ = 18,000,000 kop
		// Total Net Base = 420,000 ₽ = 42,000,000 kop
		// Base commission (orthopedist = 25%) = 25% of 42,000,000 = 10,500,000 kop (105,000 ₽)
		// KPI bonus = 2% of 42,000,000 = 840,000 kop (8,400 ₽)
		// Gross payout before tax = 10,500,000 + 840,000 = 11,340,000 kop (113,400 ₽)
		// NDFL 13% = 11,340,000 * 0.13 = 1,474,200 kop (14,742 ₽)
		// Net to doctor = 11,340,000 - 1,474,200 = 9,865,800 kop (98,658 ₽)

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-ortho-1",
			doctorName: "Д-р Васильев М.С.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(result.totalGrossRevenueKop, 60000000);
		assert.equal(result.totalLabDeductionsKop, 18000000);
		assert.equal(result.totalNetBaseKop, 42000000);
		assert.equal(result.baseCommissionPercent, 25);
		assert.equal(result.earnedBaseCommissionKop, 10500000);
		assert.equal(result.kpiBonusPercent, 2);
		assert.equal(result.kpiBonusEarnedKop, 840000);
		assert.equal(result.grossPayoutBeforeTaxKop, 11340000);
		assert.equal(result.ndfl13TaxKop, 1474200);
		assert.equal(result.netPayoutToDoctorKop, 9865800);
		assert.equal(result.minimumGuaranteeApplied, false);
	});

	it("1.3 Surgeon-Implantologist piece-rate calculation with Top KPI bonus (+5%)", () => {
		// Gross revenue >= 1,000,000 ₽ triggers Top tier (+5%)
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-surg-1",
				dateIso: "2026-08-20",
				patientName: "Алексеев А.А.",
				medicalCardNumber: "043/у-301",
				serviceNameRu: "Имплантация 6 имплантатов Straumann BLX + синус-лифтинг",
				category: "surgery",
				grossRevenueKop: 120000000, // 1,200,000 ₽
				labCostKop: 0,
				materialCostKop: 40000000, // 400,000 ₽ (implants, membranes, bone graft)
			},
		];

		// Net base = 1,200,000 - 400,000 = 800,000 ₽ = 80,000,000 kop
		// Base commission (surgeon = 20%) = 20% of 80,000,000 = 16,000,000 kop (160,000 ₽)
		// KPI bonus = 5% of 80,000,000 = 4,000,000 kop (40,000 ₽)
		// Total gross before tax = 20,000,000 kop (200,000 ₽)
		// NDFL 13% = 2,600,000 kop (26,000 ₽)
		// Net to surgeon = 17,400,000 kop (174,000 ₽)

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-surg-1",
			doctorName: "Д-р Ковалев И.О.",
			specialtyId: "surgeon_implantologist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(result.totalGrossRevenueKop, 120000000);
		assert.equal(result.totalMaterialDeductionsKop, 40000000);
		assert.equal(result.totalNetBaseKop, 80000000);
		assert.equal(result.baseCommissionPercent, 20);
		assert.equal(result.earnedBaseCommissionKop, 16000000);
		assert.equal(result.kpiBonusPercent, 5);
		assert.equal(result.kpiBonusEarnedKop, 4000000);
		assert.equal(result.grossPayoutBeforeTaxKop, 20000000);
		assert.equal(result.ndfl13TaxKop, 2600000);
		assert.equal(result.netPayoutToDoctorKop, 17400000);
	});

	it("1.4 Assistant shift payroll calculation with x-ray and surgery assistance piece bonuses", () => {
		const shifts: AssistantShiftLogItem[] = [
			{
				id: "shift-1",
				dateIso: "2026-08-01",
				shiftType: "standard_6h",
				hoursWorked: 6,
				radiographsTakenCount: 4, // 4 * 150 ₽ = 600 ₽ (60,000 kop)
				surgeriesAssistedCount: 2, // 2 * 200 ₽ = 400 ₽ (40,000 kop)
			},
			{
				id: "shift-2",
				dateIso: "2026-08-02",
				shiftType: "full_12h", // 2 standard shifts = 7,000 ₽ (700,000 kop)
				hoursWorked: 12,
				radiographsTakenCount: 6, // 6 * 150 ₽ = 900 ₽ (90,000 kop)
				surgeriesAssistedCount: 1, // 1 * 200 ₽ = 200 ₽ (20,000 kop)
			},
		];

		// Base shift pay = 3,500 + 7,000 = 10,500 ₽ (1,050,000 kop)
		// Radiographs total = 10 * 150 = 1,500 ₽ (150,000 kop)
		// Surgeries total = 3 * 200 = 600 ₽ (60,000 kop)
		// Total gross = 10,500 + 1,500 + 600 = 12,600 ₽ (1,260,000 kop)
		// NDFL 13% = 12,600 * 0.13 = 1,638 ₽ (163,800 kop)
		// Net to assistant = 12,600 - 1,638 = 10,962 ₽ (1,096,200 kop)

		const result = calculateAssistantPeriodPayroll(
			"ast-1",
			"Ассистент Белова Е.С.",
			"2026-08-01 — 2026-08-02",
			shifts
		);

		assert.equal(result.totalShifts, 2);
		assert.equal(result.totalRadiographs, 10);
		assert.equal(result.totalSurgeries, 3);
		assert.equal(result.baseShiftPayoutKop, 1050000);
		assert.equal(result.radiographPayoutKop, 150000);
		assert.equal(result.surgeryPayoutKop, 60000);
		assert.equal(result.totalGrossPayoutKop, 1260000);
		assert.equal(result.ndfl13TaxKop, 163800);
		assert.equal(result.netPayoutToAssistantKop, 1096200);
	});

	it("1.5 Generates valid Russian T-51 summary CSV with UTF-8 BOM", () => {
		const docResult = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов Алексей Петрович",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "srv-1",
					dateIso: "2026-08-10",
					patientName: "Иванов И.И.",
					medicalCardNumber: "043/у-101",
					serviceNameRu: "Лечение кариеса",
					category: "therapy",
					grossRevenueKop: 1000000,
					labCostKop: 0,
					materialCostKop: 200000,
				},
			],
		});

		const csv = generatePayrollT51Csv([docResult]);
		assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel compatibility");
		assert.ok(csv.includes("Табельный ID;Врач;Специальность;Период;Выручка (руб)"));
		assert.ok(csv.includes("Д-р Смирнов Алексей Петрович"));
	});

	it("1.6 Doctor commission refund reversal and kopeck-exact storno line item formatting", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-active-1",
				dateIso: "2026-08-12",
				patientName: "Васильева Е.А.",
				medicalCardNumber: "043/у-501",
				serviceNameRu: "Профессиональная гигиена полости рта",
				category: "hygiene",
				grossRevenueKop: 500000, // 5,000 ₽ (30% = 1,500 ₽)
				labCostKop: 0,
				materialCostKop: 0,
			},
			{
				id: "srv-refunded-1",
				dateIso: "2026-08-13",
				patientName: "Григорьев Г.Г.",
				medicalCardNumber: "043/у-502",
				serviceNameRu: "Отбеливание Zoom 4 (полный возврат)",
				category: "hygiene",
				grossRevenueKop: 3000000, // 30,000 ₽
				labCostKop: 0,
				materialCostKop: 0,
				isRefunded: true,
				refundReceiptNumber: "ФД-9902",
				refundReasonRu: "Гиперестезия эмали",
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-hyg-1",
			doctorName: "Гигиенист Соколова",
			specialtyId: "hygienist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
			refundDeductions: [
				{
					serviceId: "srv-prior-1",
					serviceNameRu: "AirFlow в июле",
					refundedGrossKop: 400000, // 4,000 ₽ refund
					receiptNumber: "ФД-8801",
					reasonRu: "Возврат по заявлению",
					customCommissionPercent: 30,
				},
			],
		});

		// Refunded in-period service is not part of total gross
		assert.equal(result.totalGrossRevenueKop, 500000);
		assert.equal(result.refundedServicesCount, 2);

		// Verify storno items
		assert.equal(result.stornoItems.length, 2);
		const stornoRefunded = result.stornoItems.find((s) => s.receiptNumber === "ФД-9902");
		assert.ok(stornoRefunded);
		assert.ok(stornoRefunded.labelRu.includes("Сторно комиссии: Возврат по чеку №ФД-9902"));

		const stornoPrior = result.stornoItems.find((s) => s.receiptNumber === "ФД-8801");
		assert.ok(stornoPrior);
		assert.ok(stornoPrior.labelRu.includes("Сторно комиссии: Возврат по чеку №ФД-8801"));
		assert.equal(stornoPrior.stornoCommissionKop, 120000); // 30% of 4,000 = 1,200 ₽
		assert.equal(result.totalRefundClawbackKop, 120000);
	});

	it("1.7 Clinical warranty rework (0 ₽ patient charge, 0 ₽ commission for doctor fault vs fixed rate for clinic warranty)", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-w1",
				dateIso: "2026-08-14",
				patientName: "Морозов М.М.",
				medicalCardNumber: "043/у-601",
				serviceNameRu: "Переделка эндодонтии (вина врача)",
				category: "therapy",
				grossRevenueKop: 0,
				labCostKop: 0,
				materialCostKop: 250000, // 2,500 ₽ materials
				isWarrantyRework: true,
				warrantyType: "doctor_fault",
			},
			{
				id: "srv-w2",
				dateIso: "2026-08-15",
				patientName: "Никитин Н.Н.",
				medicalCardNumber: "043/у-602",
				serviceNameRu: "Замена коронки (гарантия лаборатории)",
				category: "orthopedics",
				grossRevenueKop: 0,
				labCostKop: 0,
				materialCostKop: 0,
				isWarrantyRework: true,
				warrantyType: "lab_warranty",
				warrantyFixedCompensationKop: 350000, // 3,500 ₽ fixed fee to doctor
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-gen-1",
			doctorName: "Д-р Кузнецов",
			specialtyId: "general_dentist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(result.warrantyServicesCount, 2);
		assert.equal(result.totalGrossRevenueKop, 0);
		// Fixed compensation for lab warranty is accrued
		assert.equal(result.earnedBaseCommissionKop, 350000);
		// Guarantee of 60,000 ₽ applies
		assert.equal(result.minimumGuaranteeApplied, true);
		assert.equal(result.grossPayoutBeforeTaxKop, 6000000);
		// Zero Dead-Ends: Verify zero NaN
		assert.ok(Number.isFinite(result.ndfl13TaxKop));
		assert.ok(Number.isFinite(result.netPayoutToDoctorKop));
	});

	it("1.8 Multi-Doctor joint visit split strictly by performerId/doctorId without whole-visit dump", () => {
		const jointServices: DoctorCompletedServiceItem[] = [
			{
				id: "srv-j1",
				dateIso: "2026-08-16",
				patientName: "Смирнов С.С.",
				medicalCardNumber: "043/у-701",
				serviceNameRu: "Терапевтическая подготовка культи зуба",
				category: "therapy",
				grossRevenueKop: 800000, // 8,000 ₽
				labCostKop: 0,
				materialCostKop: 100000,
				performerId: "doc-therapist-id",
			},
			{
				id: "srv-j2",
				dateIso: "2026-08-16",
				patientName: "Смирнов С.С.",
				medicalCardNumber: "043/у-701",
				serviceNameRu: "Снятие слепков и сканирование 3Shape",
				category: "orthopedics",
				grossRevenueKop: 1200000, // 12,000 ₽
				labCostKop: 0,
				materialCostKop: 200000,
				performerId: "doc-ortho-id",
			},
		];

		const therapistResult = calculateDoctorPeriodPayroll({
			doctorId: "doc-therapist-id",
			doctorName: "Д-р Терапевт",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: jointServices,
		});

		const orthoResult = calculateDoctorPeriodPayroll({
			doctorId: "doc-ortho-id",
			doctorName: "Д-р Ортопед",
			specialtyId: "orthopedist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: jointServices,
		});

		assert.equal(therapistResult.serviceCount, 1);
		assert.equal(therapistResult.totalGrossRevenueKop, 800000);
		assert.equal(therapistResult.earnedBaseCommissionKop, 175000); // 25% of (8,000 - 1,000)

		assert.equal(orthoResult.serviceCount, 1);
		assert.equal(orthoResult.totalGrossRevenueKop, 1200000);
		assert.equal(orthoResult.earnedBaseCommissionKop, 300000); // 25% of 12,000 (ortho doesn't deduct materials by default)
	});

	it("1.9 Family deposit payment accrual on actual service vs advance deposit funding", () => {
		const mixedServices: DoctorCompletedServiceItem[] = [
			{
				id: "dep-adv-1",
				dateIso: "2026-08-18",
				patientName: "Семья Петровых",
				medicalCardNumber: "043/у-801",
				serviceNameRu: "Пополнение баланса семьи (авансовый чек)",
				category: "therapy",
				grossRevenueKop: 5000000, // 50,000 ₽
				labCostKop: 0,
				materialCostKop: 0,
				isDepositAdvanceOnly: true,
			},
			{
				id: "srv-dep-paid-1",
				dateIso: "2026-08-19",
				patientName: "Петрова А.В. (дочь)",
				medicalCardNumber: "043/у-802",
				serviceNameRu: "Пломбирование зуба 36 светокомпозитом",
				category: "therapy",
				grossRevenueKop: 600000, // 6,000 ₽
				labCostKop: 0,
				materialCostKop: 100000, // 1,000 ₽
				paymentSource: "family_deposit",
			},
		];

		const result = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Терапевт",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: mixedServices,
		});

		// Advance is ignored from piece-rate; actual service rendered is credited
		assert.equal(result.totalGrossRevenueKop, 600000);
		assert.equal(result.totalNetBaseKop, 500000);
		assert.equal(result.earnedBaseCommissionKop, 125000); // 25% of 5,000 = 1,250 ₽
	});
});
