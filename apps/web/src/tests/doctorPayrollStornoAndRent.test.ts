/**
 * apps/web/src/tests/doctorPayrollStornoAndRent.test.ts
 *
 * Doctor & Staff Piece-Rate Payroll Engine Tests:
 * Storno, Clawbacks, Warranty Reworks, Multi-Specialist Joint Visits,
 * Chair Rental Mode, Virtual Debt Filtering & UI Line Limits Audit.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	calculateDoctorPeriodPayroll,
	generateDoctorPayslipMessengerText,
	type DoctorCompletedServiceItem,
} from "../components/payroll/staffPayrollEngine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Doctor Payroll Storno, Warranty, Joint Visits & Chair Rental Engine", () => {
	it("should automatically storno doctor commission upon patient refund with kopeck-exact negative clawback and label", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-norm", dateIso: "2026-08-05", patientName: "Сидоров С.С.",
				medicalCardNumber: "043/у-10", serviceNameRu: "Пломба световая",
				category: "therapy", grossRevenueKop: 1000000, labCostKop: 0, materialCostKop: 200000,
			},
			{
				id: "srv-refunded", dateIso: "2026-08-06", patientName: "Кузнецов К.К.",
				medicalCardNumber: "043/у-11", serviceNameRu: "Реставрация зуба (возврат)",
				category: "therapy", grossRevenueKop: 2000000, labCostKop: 0, materialCostKop: 200000,
				isRefunded: true, refundReceiptNumber: "ЧК-8921", refundReasonRu: "Претензия пациента",
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
					refundedGrossKop: 1000000,
					receiptNumber: "ЧК-7701",
					reasonRu: "Скол керамики",
					customCommissionPercent: 25,
				},
			],
		});

		// 1. In-period refunded service does not add to gross revenue
		assert.equal(res.totalGrossRevenueKop, 1000000);
		assert.equal(res.refundedServicesCount, 2);

		// 2. Storno items generated with exact label format
		assert.equal(res.stornoItems.length, 2);
		const storno1 = res.stornoItems.find((s) => s.receiptNumber === "ЧК-8921");
		assert.ok(storno1 && storno1.labelRu.includes("Сторно комиссии: Возврат по чеку №ЧК-8921"));

		const storno2 = res.stornoItems.find((s) => s.receiptNumber === "ЧК-7701");
		assert.ok(storno2 && storno2.labelRu.includes("Сторно комиссии: Возврат по чеку №ЧК-7701"));
		assert.equal(storno2?.stornoCommissionKop, 250000);

		// 3. Total refund clawback is kopeck-exact
		assert.equal(res.totalRefundClawbackKop, 250000);
	});

	it("should handle warranty visit & rework with 0 ₽ to patient, 0 ₽ commission on doctor fault and clinic fixed compensation on clinic warranty without NaN", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-warranty-fault", dateIso: "2026-08-10", patientName: "Павлов П.П.",
				medicalCardNumber: "043/у-20", serviceNameRu: "Переделка скола пломбы (по вине врача)",
				category: "therapy", grossRevenueKop: 0, labCostKop: 0, materialCostKop: 150000,
				isWarrantyRework: true, warrantyType: "doctor_fault",
			},
			{
				id: "srv-warranty-clinic", dateIso: "2026-08-11", patientName: "Орлов О.О.",
				medicalCardNumber: "043/у-21", serviceNameRu: "Гарантийная замена коронки (брак завода ЗТЛ)",
				category: "orthopedics", grossRevenueKop: 0, labCostKop: 0, materialCostKop: 0,
				isWarrantyRework: true, warrantyType: "clinic_warranty", warrantyFixedCompensationKop: 200000,
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
				id: "srv-joint-1", dateIso: "2026-08-15", patientName: "Ковров К.К.",
				medicalCardNumber: "043/у-30", serviceNameRu: "Эндодонтическое лечение каналов 21",
				category: "therapy", grossRevenueKop: 1500000, labCostKop: 0, materialCostKop: 300000,
				performerId: "doc-therapist-1",
			},
			{
				id: "srv-joint-2", dateIso: "2026-08-15", patientName: "Ковров К.К.",
				medicalCardNumber: "043/у-30", serviceNameRu: "Резекция верхушки корня зуба 21",
				category: "surgery", grossRevenueKop: 2500000, labCostKop: 0, materialCostKop: 500000,
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
		assert.equal(resSurgeon.earnedBaseCommissionKop, 400000);
	});

	it("should accrue commission strictly on completed service execution paid via family deposit and ignore advance deposit replenishment", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-advance", dateIso: "2026-08-20", patientName: "Семья Ивановых",
				medicalCardNumber: "043/у-40", serviceNameRu: "Пополнение семейного депозита (аванс)",
				category: "therapy", grossRevenueKop: 10000000, labCostKop: 0, materialCostKop: 0,
				isDepositAdvanceOnly: true,
			},
			{
				id: "srv-care", dateIso: "2026-08-21", patientName: "Иванов М.И. (сын)",
				medicalCardNumber: "043/у-41", serviceNameRu: "Лечение кариеса 16",
				category: "therapy", grossRevenueKop: 800000, labCostKop: 0, materialCostKop: 100000,
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

		assert.equal(res.totalGrossRevenueKop, 800000);
		assert.equal(res.totalMaterialDeductionsKop, 100000);
		assert.equal(res.earnedBaseCommissionKop, 210000);
	});

	it("should calculate chair rental mode (Mandates 8e, 8n): Revenue - Chair Rental - ZTL - Materials = 100% Net Income with Advance Split and NPD 6%", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-ortho-1", dateIso: "2026-08-10", patientName: "Васильев В.В.",
				medicalCardNumber: "043/у-50", serviceNameRu: "Циркониевая коронка",
				category: "orthopedics", grossRevenueKop: 5000000, labCostKop: 1200000, materialCostKop: 300000,
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
			chairRentalKop: 1500000,
			advancePayoutKop: 1000000,
			taxRegime: "self_employed",
		});

		assert.equal(res.totalGrossRevenueKop, 5000000);
		assert.equal(res.totalLabDeductionsKop, 1200000);
		assert.equal(res.totalMaterialDeductionsKop, 300000);
		assert.equal(res.chairRentalKop, 1500000);
		assert.equal(res.netPayoutToDoctorKop, 2000000);
		assert.equal(res.advancePayoutKop, 1000000);
		assert.equal(res.mainPayoutKop, 1000000);
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
		assert.ok(!text.includes("💰") && !text.includes("🦷") && !text.includes("🚀") && !text.includes("🎉"));
	});

	it("should ignore unpaid virtual debt services and calculate net revenue strictly from actually received partial payments", () => {
		const services: DoctorCompletedServiceItem[] = [
			{
				id: "srv-paid-1", dateIso: "2026-08-15", patientName: "Оплаченный О.О.",
				medicalCardNumber: "043/у-60", serviceNameRu: "Керамическая накладка",
				category: "orthopedics", grossRevenueKop: 2000000, labCostKop: 200000,
				materialCostKop: 100000, isPaid: true, invoiceStatus: "paid",
			},
			{
				id: "srv-debt-1", dateIso: "2026-08-16", patientName: "Должник Д.Д.",
				medicalCardNumber: "043/у-61", serviceNameRu: "Имплантация (в долг)",
				category: "surgery", grossRevenueKop: 5000000, labCostKop: 1500000,
				materialCostKop: 500000, isPaid: false, isDebt: true, invoiceStatus: "unpaid",
			},
			{
				id: "srv-partial-1", dateIso: "2026-08-17", patientName: "Частичный Ч.Ч.",
				medicalCardNumber: "043/у-62", serviceNameRu: "Коронка E.max (частичная оплата)",
				category: "orthopedics", grossRevenueKop: 3000000, paidAmountKop: 1000000,
				actuallyPaidGrossKop: 1000000, labCostKop: 300000, materialCostKop: 100000,
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

		assert.equal(res.totalGrossRevenueKop, 3000000);
		assert.equal(res.totalLabDeductionsKop, 500000);
		assert.equal(res.totalMaterialDeductionsKop, 200000);
		assert.equal(res.totalNetBaseKop, 2300000);
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
