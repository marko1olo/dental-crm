import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	generatePayrollT51Csv,
	DOCTOR_SPECIALTY_PAYROLL_PRESETS,
	ASSISTANT_SHIFT_RULE,
	KPI_BONUS_TIERS,
	type DoctorCompletedServiceItem,
} from "../finance/doctorPayrollT51.js";

describe("Doctor & Staff Piece-Rate Payroll Engine (Form T-51)", () => {
	it("1.1 Calculates therapist commission with material deductions, min guarantee, and NDFL 13%", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-101",
				dateIso: "2026-08-01",
				patientName: "Иванова Мария Петровна",
				medicalCardNumber: "043/у-101",
				serviceNameRu: "Эстетическая реставрация зуба 1.1 (Filtek Supreme)",
				category: "therapy",
				grossRevenueKop: 1000000, // 10,000.00 RUB
				labCostKop: 0,
				materialCostKop: 200000, // 2,000.00 RUB (materials deducted)
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов А. В.",
			specialtyId: "therapist", // 25% default
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.totalGrossRevenueKop, 1000000);
		assert.equal(res.totalMaterialDeductionsKop, 200000);
		assert.equal(res.totalNetBaseKop, 800000); // 8,000.00 RUB
		assert.equal(res.baseCommissionPercent, 25);
		// Pre-guarantee earned: 25% of 8,000 = 2,000 RUB (200,000 kop)
		// Min guarantee for therapist is 60,000 RUB (6,000,000 kop)
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
		assert.equal(res.ndfl13TaxKop, 780000); // 13% of 60,000 = 7,800 RUB
		assert.equal(res.netPayoutToDoctorKop, 5220000); // 52,200 RUB
	});

	it("1.2 Calculates orthopedist commission with dental lab (ЗТЛ) deductions", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-201",
				dateIso: "2026-08-10",
				patientName: "Кузнецов Петр Сергеевич",
				medicalCardNumber: "043/у-201",
				serviceNameRu: "Коронка из диоксида циркония на имплантате Straumann",
				category: "orthopedics",
				grossRevenueKop: 45000000, // 450,000.00 RUB
				labCostKop: 12000000, // 120,000.00 RUB (dental lab bill deducted)
				materialCostKop: 0,
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-2",
			doctorName: "Д-р Ортопедов К. М.",
			specialtyId: "orthopedist", // 25% default, deducts lab
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.totalGrossRevenueKop, 45000000);
		assert.equal(res.totalLabDeductionsKop, 12000000);
		assert.equal(res.totalMaterialDeductionsKop, 0);
		assert.equal(res.totalNetBaseKop, 33000000); // 330,000.00 RUB
		// 25% of 330,000 = 82,500 RUB (8,250,000 kop)
		// Min guarantee for orthopedist is 80,000 RUB -> 82,500 > 80,000 so guaranteeApplied = false
		assert.equal(res.minimumGuaranteeApplied, false);
		assert.equal(res.grossPayoutBeforeTaxKop, 8250000);
		assert.equal(res.ndfl13TaxKop, 1072500); // 13% of 82,500 = 10,725.00 RUB
		assert.equal(res.netPayoutToDoctorKop, 7177500); // 71,775.00 RUB
	});

	it("1.3 Calculates high revenue doctor with KPI Tier 1 (+5% bonus)", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-301",
				dateIso: "2026-08-15",
				patientName: "Вип Клиент",
				medicalCardNumber: "043/у-301",
				serviceNameRu: "Тотальная реабилитация All-on-4 / All-on-6",
				category: "therapy",
				grossRevenueKop: 120000000, // 1,200,000.00 RUB (triggers Tier 1: min 1,000,000 -> +5%)
				labCostKop: 0,
				materialCostKop: 20000000, // 200,000.00 RUB
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-3",
			doctorName: "Д-р Топмастер В. В.",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.kpiBonusPercent, 5);
		assert.equal(res.minimumGuaranteeApplied, false);
		// Net base: 1,000,000 RUB (100,000,000 kop)
		// 25% base = 250,000 RUB (25,000,000 kop)
		// 5% KPI = 50,000 RUB (5,000,000 kop)
		// Gross = 300,000 RUB (30,000,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 25000000);
		assert.equal(res.kpiBonusEarnedKop, 5000000);
		assert.equal(res.grossPayoutBeforeTaxKop, 30000000);
		// NDFL 13% = 39,000 RUB (3,900,000 kop)
		assert.equal(res.ndfl13TaxKop, 3900000);
		// Net = 261,000 RUB (26,100,000 kop)
		assert.equal(res.netPayoutToDoctorKop, 26100000);
	});

	it("1.4 Calculates retail home hygiene sales commission (Curaprox / Oral-B)", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-401",
				dateIso: "2026-08-05",
				patientName: "Пациент Гигиены",
				medicalCardNumber: "043/у-401",
				serviceNameRu: "Комплексная профессиональная гигиена Air-Flow",
				category: "hygiene",
				grossRevenueKop: 800000, // 8,000.00 RUB
				labCostKop: 0,
				materialCostKop: 0,
			},
			{
				id: "srv-402",
				dateIso: "2026-08-05",
				patientName: "Пациент Гигиены",
				medicalCardNumber: "043/у-401",
				serviceNameRu: "Набор зубных щеток Curaprox 5460 Ultra Soft + Enzycal",
				category: "retail_hygiene",
				grossRevenueKop: 250000, // 2,500.00 RUB (15% commission for hygienist preset)
				labCostKop: 0,
				materialCostKop: 0,
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-4",
			doctorName: "Гигиенист Чистова Е. А.",
			specialtyId: "hygienist", // 30% base, 15% retail
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// 30% of 8,000 = 2,400 RUB (240,000 kop)
		// 15% of 2,500 = 375 RUB (37,500 kop)
		assert.equal(res.earnedBaseCommissionKop, 240000);
		assert.equal(res.earnedRetailCommissionKop, 37500);
		// Min guarantee for hygienist is 45,000 RUB -> 4,500,000 kop
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 4500000);
	});

	it("1.5 Calculates assistant shift rate + radiograph & surgery bonuses", () => {
		const res = calculateAssistantPeriodPayroll(
			"asst-1",
			"Ассистент Анна Иванова",
			"Август 2026",
			[
				{
					id: "shift-1",
					dateIso: "2026-08-01",
					shiftType: "standard_6h",
					hoursWorked: 6,
					radiographsTakenCount: 4, // 4 * 150 = 600 RUB (60,000 kop)
					surgeriesAssistedCount: 1, // 1 * 200 = 200 RUB (20,000 kop)
				},
				{
					id: "shift-2",
					dateIso: "2026-08-02",
					shiftType: "full_12h",
					hoursWorked: 12,
					radiographsTakenCount: 6, // 6 * 150 = 900 RUB (90,000 kop)
					surgeriesAssistedCount: 2, // 2 * 200 = 400 RUB (40,000 kop)
				},
			],
		);

		// Shift 1: 3,500 RUB (350,000 kop)
		// Shift 2: 7,000 RUB (700,000 kop)
		// Base shifts total: 10,500 RUB (1,050,000 kop)
		assert.equal(res.baseShiftPayoutKop, 1050000);
		// Total radiographs: 10 * 150 = 1,500 RUB (150,000 kop)
		assert.equal(res.radiographPayoutKop, 150000);
		// Total surgeries: 3 * 200 = 600 RUB (60,000 kop)
		assert.equal(res.surgeryPayoutKop, 60000);
		// Gross total: 10,500 + 1,500 + 600 = 12,600 RUB (1,260,000 kop)
		assert.equal(res.totalGrossPayoutKop, 1260000);
		// NDFL 13%: 13% of 12,600 = 1,638 RUB (163,800 kop)
		assert.equal(res.ndfl13TaxKop, 163800);
		// Net to assistant: 12,600 - 1,638 = 10,962 RUB (1,096,200 kop)
		assert.equal(res.netPayoutToAssistantKop, 1096200);
	});

	it("1.6 Generates valid Russian Form T-51 CSV with UTF-8 BOM", () => {
		const resWithServices = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов А. В.",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [
				{
					id: "srv-1",
					dateIso: "2026-08-01",
					patientName: "Пациент",
					medicalCardNumber: "043/у-01",
					serviceNameRu: "Консультация врача-стоматолога",
					category: "therapy",
					grossRevenueKop: 100000,
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		});
		const csv = generatePayrollT51Csv([resWithServices]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Табельный ID;Врач;Специальность;Период"));
		assert.ok(csv.includes("Д-р Смирнов А. В."));
		assert.ok(csv.includes("52200.00")); // Net payout rub "На руки"
		assert.ok(csv.includes("7800.00"));  // NDFL 13% tax rub
	});
});
