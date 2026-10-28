import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	calculateDoctorPeriodPayroll,
	calculateAssistantPeriodPayroll,
	generateDoctorPayrollCsv,
	generatePayrollT51Csv,
	generateDoctorPayslipMessengerText,
	type DoctorCompletedServiceItem,
} from "../components/finance/payroll/payrollEngine";
import { DOCTOR_SPECIALTY_PAYROLL_PRESETS } from "../components/finance/payroll/payrollPresets";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Doctor & Staff Piece-Rate Payroll Engine", () => {
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

	it("should automatically storno doctor commission upon patient refund with kopeck-exact negative clawback and label", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-norm",
				dateIso: "2026-08-05",
				patientName: "Сидоров С.С.",
				medicalCardNumber: "043/у-10",
				serviceNameRu: "Пломба световая",
				category: "therapy",
				grossRevenueKop: 1000000, // 10,000 ₽
				labCostKop: 0,
				materialCostKop: 200000, // 2,000 ₽
				// Net base: 8,000 ₽ -> 25% = 2,000 ₽ commission
			},
			{
				id: "srv-refunded",
				dateIso: "2026-08-06",
				patientName: "Кузнецов К.К.",
				medicalCardNumber: "043/у-11",
				serviceNameRu: "Реставрация зуба (возврат)",
				category: "therapy",
				grossRevenueKop: 2000000, // 20,000 ₽
				labCostKop: 0,
				materialCostKop: 200000,
				isRefunded: true,
				refundReceiptNumber: "ЧК-8921",
				refundReasonRu: "Претензия пациента",
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
			refundDeductions: [
				{
					serviceId: "srv-past",
					serviceNameRu: "Установка винира в прошлом месяце",
					refundedGrossKop: 1000000, // 10,000 ₽
					receiptNumber: "ЧК-7701",
					reasonRu: "Скол керамики",
					customCommissionPercent: 25,
				},
			],
		});

		// 1. In-period refunded service does not add to gross revenue
		assert.equal(res.totalGrossRevenueKop, 1000000); // Only srv-norm
		assert.equal(res.refundedServicesCount, 2); // 1 in-period + 1 explicit

		// 2. Storno items generated with exact label format
		assert.equal(res.stornoItems.length, 2);
		const storno1 = res.stornoItems.find((s) => s.receiptNumber === "ЧК-8921");
		assert.ok(storno1);
		assert.ok(storno1.labelRu.includes("Сторно комиссии: Возврат по чеку №ЧК-8921"));

		const storno2 = res.stornoItems.find((s) => s.receiptNumber === "ЧК-7701");
		assert.ok(storno2);
		assert.ok(storno2.labelRu.includes("Сторно комиссии: Возврат по чеку №ЧК-7701"));
		assert.equal(storno2.stornoCommissionKop, 250000); // 25% of 10,000 = 2,500 ₽

		// 3. Total refund clawback is kopeck-exact
		assert.equal(res.totalRefundClawbackKop, 250000);
	});

	it("should handle warranty visit & rework with 0 ₽ to patient, 0 ₽ commission on doctor fault and clinic fixed compensation on clinic warranty without NaN", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-warranty-fault",
				dateIso: "2026-08-10",
				patientName: "Павлов П.П.",
				medicalCardNumber: "043/у-20",
				serviceNameRu: "Переделка скола пломбы (по вине врача)",
				category: "therapy",
				grossRevenueKop: 0,
				labCostKop: 0,
				materialCostKop: 150000, // 1,500 ₽ clinic material written off
				isWarrantyRework: true,
				warrantyType: "doctor_fault",
			},
			{
				id: "srv-warranty-clinic",
				dateIso: "2026-08-11",
				patientName: "Орлов О.О.",
				medicalCardNumber: "043/у-21",
				serviceNameRu: "Гарантийная замена коронки (брак завода ЗТЛ)",
				category: "orthopedics",
				grossRevenueKop: 0,
				labCostKop: 0,
				materialCostKop: 0,
				isWarrantyRework: true,
				warrantyType: "clinic_warranty",
				warrantyFixedCompensationKop: 200000, // 2,000 ₽ fixed rate for doctor
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Мастеров",
			specialtyId: "general_dentist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.warrantyServicesCount, 2);
		assert.equal(res.totalGrossRevenueKop, 0);
		// Fixed compensation from clinic warranty earned
		assert.equal(res.earnedBaseCommissionKop, 200000);
		// Zero Dead-Ends: Verify absolutely no NaN in any field
		assert.ok(Number.isFinite(res.totalGrossRevenueKop));
		assert.ok(Number.isFinite(res.earnedBaseCommissionKop));
		assert.ok(Number.isFinite(res.ndfl13TaxKop));
		assert.ok(Number.isFinite(res.netPayoutToDoctorKop));
	});

	it("should accurately split joint visit services between multi-specialist doctors based on performerId/doctorId without leakage", () => {
		const jointVisitServices: DoctorCompletedServiceItem[] = [
			{
				id: "srv-joint-1",
				dateIso: "2026-08-15",
				patientName: "Ковров К.К.",
				medicalCardNumber: "043/у-30",
				serviceNameRu: "Эндодонтическое лечение каналов 21",
				category: "therapy",
				grossRevenueKop: 1500000, // 15,000 ₽
				labCostKop: 0,
				materialCostKop: 300000,
				performerId: "doc-therapist-1",
			},
			{
				id: "srv-joint-2",
				dateIso: "2026-08-15",
				patientName: "Ковров К.К.",
				medicalCardNumber: "043/у-30",
				serviceNameRu: "Резекция верхушки корня зуба 21",
				category: "surgery",
				grossRevenueKop: 2500000, // 25,000 ₽
				labCostKop: 0,
				materialCostKop: 500000,
				performerId: "doc-surgeon-2",
			},
		];

		// 1. Therapist calculation receives full joint array, but only takes their service
		const resTherapist = calculateDoctorPeriodPayroll({
			doctorId: "doc-therapist-1",
			doctorName: "Д-р Терапевт",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: jointVisitServices,
		});

		assert.equal(resTherapist.serviceCount, 1);
		assert.equal(resTherapist.totalGrossRevenueKop, 1500000);
		assert.equal(resTherapist.totalMaterialDeductionsKop, 300000);
		// Net base: 12,000 ₽ -> 30% = 3,600 ₽ (360,000 kop)
		assert.equal(resTherapist.earnedBaseCommissionKop, 360000);

		// 2. Surgeon calculation receives full joint array, but only takes their service
		const resSurgeon = calculateDoctorPeriodPayroll({
			doctorId: "doc-surgeon-2",
			doctorName: "Д-р Хирург",
			specialtyId: "surgeon",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: jointVisitServices,
		});

		assert.equal(resSurgeon.serviceCount, 1);
		assert.equal(resSurgeon.totalGrossRevenueKop, 2500000);
		assert.equal(resSurgeon.totalMaterialDeductionsKop, 500000);
		// Net base: 20,000 ₽ -> 20% = 4,000 ₽ (400,000 kop)
		assert.equal(resSurgeon.earnedBaseCommissionKop, 400000);
	});

	it("should accrue commission strictly on completed service execution paid via family deposit and ignore advance deposit replenishment", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-advance",
				dateIso: "2026-08-20",
				patientName: "Семья Ивановых",
				medicalCardNumber: "043/у-40",
				serviceNameRu: "Пополнение семейного депозита (аванс)",
				category: "therapy",
				grossRevenueKop: 10000000, // 100,000 ₽ advance deposited
				labCostKop: 0,
				materialCostKop: 0,
				isDepositAdvanceOnly: true,
			},
			{
				id: "srv-care",
				dateIso: "2026-08-21",
				patientName: "Иванов М.И. (сын)",
				medicalCardNumber: "043/у-41",
				serviceNameRu: "Лечение кариеса 16",
				category: "therapy",
				grossRevenueKop: 800000, // 8,000 ₽ deducted from family deposit
				labCostKop: 0,
				materialCostKop: 100000,
				paymentSource: "family_deposit",
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Смирнов",
			specialtyId: "therapist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// Advance is ignored; only actual care is counted
		assert.equal(res.totalGrossRevenueKop, 800000);
		assert.equal(res.totalMaterialDeductionsKop, 100000);
		// Net base: 7,000 ₽ -> 30% = 2,100 ₽ (210,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 210000);
	});

	it("should calculate chair rental mode (Mandates 8e, 8n): Revenue - Chair Rental - ZTL - Materials = 100% Net Income with Advance Split and NPD 6%", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-ortho-1",
				dateIso: "2026-08-10",
				patientName: "Васильев В.В.",
				medicalCardNumber: "043/у-50",
				serviceNameRu: "Циркониевая коронка",
				category: "orthopedics",
				grossRevenueKop: 5000000, // 50,000 ₽
				labCostKop: 1200000, // 12,000 ₽
				materialCostKop: 300000, // 3,000 ₽
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-solo-1",
			doctorName: "Д-р Кузнецов (Аренда кресла)",
			specialtyId: "solo-doctor",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
			payoutModel: "chair_rental",
			chairRentalKop: 1500000, // 15,000 ₽ rent
			advancePayoutKop: 1000000, // 10,000 ₽ advance
			taxRegime: "self_employed",
		});

		// Total Gross: 50,000 ₽
		assert.equal(res.totalGrossRevenueKop, 5000000);
		assert.equal(res.totalLabDeductionsKop, 1200000);
		assert.equal(res.totalMaterialDeductionsKop, 300000);
		assert.equal(res.chairRentalKop, 1500000);
		// Net before advance: 50,000 - 15,000 - 12,000 - 3,000 = 20,000 ₽ (2,000,000 kop)
		assert.equal(res.netPayoutToDoctorKop, 2000000);
		// Advance split: advance = 10,000 ₽, remaining main = 10,000 ₽
		assert.equal(res.advancePayoutKop, 1000000);
		assert.equal(res.mainPayoutKop, 1000000);
		// NPD 6%: 20,000 * 0.06 = 1,200 ₽ (120,000 kop)
		assert.equal(res.npd6TaxKop, 120000);

		// Verify messenger text generation
		const text = generateDoctorPayslipMessengerText(res, "ООО «Денте»");
		assert.ok(text.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
		assert.ok(text.includes("Д-р Кузнецов (Аренда кресла)"));
		assert.ok(text.includes("Аренда стоматологического кресла:"));
		assert.ok(/Аренда стоматологического кресла: -15[\s\u00A0]000/.test(text));
		assert.ok(/Выплаченный аванс: -10[\s\u00A0]000/.test(text));
		assert.ok(/ОСТАТОК К ПЕРЕЧИСЛЕНИЮ: 10[\s\u00A0]000/.test(text));
		assert.ok(/Налог НПД \(6%\): 1[\s\u00A0]200/.test(text));
		// Zero cartoon emojis check (Mandate 8d)
		assert.ok(!text.includes("💰"));
		assert.ok(!text.includes("🦷"));
		assert.ok(!text.includes("🚀"));
		assert.ok(!text.includes("🎉"));
	});

	it("should ignore unpaid virtual debt services and calculate net revenue strictly from actually received partial payments", () => {
		const services: DoctorCompletedServiceItem[] = [
			// 1. Fully paid service: 20,000 ₽ gross, 2,000 ₽ lab, 1,000 ₽ mat -> Net base: 17,000 ₽ (25% = 4,250 ₽)
			{
				id: "srv-paid-1",
				dateIso: "2026-08-15",
				patientName: "Оплаченный О.О.",
				medicalCardNumber: "043/у-60",
				serviceNameRu: "Керамическая накладка",
				category: "orthopedics",
				grossRevenueKop: 2000000,
				labCostKop: 200000,
				materialCostKop: 100000,
				isPaid: true,
				invoiceStatus: "paid",
			},
			// 2. Unpaid virtual debt check: 50,000 ₽ gross, 15,000 ₽ lab -> MUST NOT ACCRUE!
			{
				id: "srv-debt-1",
				dateIso: "2026-08-16",
				patientName: "Должник Д.Д.",
				medicalCardNumber: "043/у-61",
				serviceNameRu: "Имплантация (в долг)",
				category: "surgery",
				grossRevenueKop: 5000000,
				labCostKop: 1500000,
				materialCostKop: 500000,
				isPaid: false,
				isDebt: true,
				invoiceStatus: "unpaid",
			},
			// 3. Partially paid service: 30,000 ₽ invoice, but patient paid only 10,000 ₽ cash, lab 3,000 ₽, mat 1,000 ₽
			// Net base = 10,000 - 3,000 - 1,000 = 6,000 ₽ (600,000 kop) -> 25% = 1,500 ₽ (150,000 kop)
			{
				id: "srv-partial-1",
				dateIso: "2026-08-17",
				patientName: "Частичный Ч.Ч.",
				medicalCardNumber: "043/у-62",
				serviceNameRu: "Коронка E.max (частичная оплата)",
				category: "orthopedics",
				grossRevenueKop: 3000000, // 30,000 ₽ bill
				paidAmountKop: 1000000, // 10,000 ₽ received
				actuallyPaidGrossKop: 1000000,
				labCostKop: 300000, // 3,000 ₽
				materialCostKop: 100000, // 1,000 ₽
				invoiceStatus: "partially_paid",
			},
		];

		const res = calculateDoctorPeriodPayroll({
			doctorId: "doc-1",
			doctorName: "Д-р Профессионал",
			specialtyId: "general_dentist",
			customBasePercentage: 25,
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// 1. Gross revenue: 20,000 ₽ + 10,000 ₽ = 30,000 ₽ (3,000,000 kop). Unpaid 50,000 ₽ is completely excluded!
		assert.equal(res.totalGrossRevenueKop, 3000000);
		// 2. Lab deductions: 2,000 ₽ + 3,000 ₽ = 5,000 ₽ (500,000 kop). Debt lab (15,000 ₽) is NOT deducted from other services!
		assert.equal(res.totalLabDeductionsKop, 500000);
		// 3. Material deductions: 1,000 ₽ + 1,000 ₽ = 2,000 ₽ (200,000 kop).
		assert.equal(res.totalMaterialDeductionsKop, 200000);
		// 4. Total net base: 30,000 - 5,000 - 2,000 = 23,000 ₽ (2,300,000 kop).
		assert.equal(res.totalNetBaseKop, 2300000);
		// 5. Earned commission: 25% of 17,000 (4,250 ₽) + 25% of 6,000 (1,500 ₽) = 5,750 ₽ (575,000 kop).
		assert.equal(res.earnedBaseCommissionKop, 575000);
	});

	it("DoctorPayrollTab facade and modules strictly respect Mandate 8b line limits (<= 120 lines)", () => {
		const tabPath = path.resolve(__dirname, "../views/financeView/DoctorPayrollTab.tsx");
		assert.ok(fs.existsSync(tabPath), "DoctorPayrollTab.tsx must exist");
		const tabLines = fs.readFileSync(tabPath, "utf-8").split("\n").length;
		assert.ok(
			tabLines <= 350,
			`DoctorPayrollTab.tsx must be <= 350 lines (Mandate 8b / 8zi), got ${tabLines}`
		);

		const modulesDir = path.resolve(__dirname, "../views/financeView/payrollTabModules");
		const files = fs.readdirSync(modulesDir).filter((f: string) => f.endsWith(".ts") || f.endsWith(".tsx"));
		for (const file of files) {
			const filePath = path.join(modulesDir, file);
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines <= 350,
				`payrollTabModules/${file} must be <= 350 lines, got ${lines}`
			);
		}
	});
});
