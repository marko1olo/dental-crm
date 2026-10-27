/**
 * clinicalCategoryDeductions.test.ts — Clinical Category Invariants & Payslip Generation
 * Mandate 8b: File strictly <= 120 lines.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	calculateDoctorPeriodPayroll,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	type DoctorStaffPayrollInput,
} from "../../staffPayrollEngine";
import { generateDoctorPayslipHtml } from "../../staffPayrollExports";

describe("Red Team: Clinical Category Commission & ZTL Deductions", () => {
	it("4.1 Verifies clinical statutory commission rates across all disciplines", () => {
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.therapy, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthopedics, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.surgery, 22);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthodontics, 25);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.hygiene, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.retail_hygiene, 10);
	});

	it("4.2 Pre-commission deduction of ZTL lab costs from orthopedics base", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-ortho-ztl",
			employeeTabNumber: "00005",
			employeeFullName: "Д-р Протезов И.С.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			useClinicalCategoryRates: true,
			services: [{
				id: "srv-ztl-1",
				dateIso: "2026-09-10",
				patientName: "Пациент А",
				medicalCardNumber: "005",
				serviceNameRu: "Коронка E.max циркониевая",
				category: "orthopedics",
				grossRevenueKop: 5000000,
				labCostKop: 1500000,
				materialCostKop: 0,
			}],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalGrossRevenueKop, 5000000);
		assert.equal(res.totalLabDeductionsKop, 1500000);
		assert.equal(res.totalNetBaseKop, 3500000);
		assert.equal(res.earnedBaseCommissionKop, 1050000);
	});

	it("4.3 Pre-commission deduction of costly implants and bone materials from surgery base", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-surg-mat",
			employeeTabNumber: "00006",
			employeeFullName: "Д-р Хирургов М.А.",
			specialtyId: "surgeon",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			useClinicalCategoryRates: true,
			services: [{
				id: "srv-surg-1",
				dateIso: "2026-09-12",
				patientName: "Пациент Б",
				medicalCardNumber: "006",
				serviceNameRu: "Установка дентального имплантата Osstem",
				category: "surgery",
				grossRevenueKop: 8000000,
				labCostKop: 0,
				materialCostKop: 2500000,
			}],
		};

		const res = calculateDoctorStaffPayroll(input);
		assert.equal(res.totalGrossRevenueKop, 8000000);
		assert.equal(res.totalMaterialDeductionsKop, 2500000);
		assert.equal(res.totalNetBaseKop, 5500000);
		assert.equal(res.earnedBaseCommissionKop, 1210000);
	});

	it("4.4 generateDoctorPayslipHtml generates statutory payslip with NDFL 13% rounding", () => {
		const periodRes = calculateDoctorPeriodPayroll({
			doctorId: "doc-payslip",
			doctorName: "Д-р Власова Е.В.",
			specialtyId: "therapist",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			services: [{
				id: "srv-p-1",
				dateIso: "2026-09-15",
				patientName: "Пациент В",
				medicalCardNumber: "007",
				serviceNameRu: "Эндодонтическое лечение 3-канального зуба",
				category: "therapy",
				grossRevenueKop: 4500000,
				labCostKop: 0,
				materialCostKop: 500000,
			}],
		});

		const html = generateDoctorPayslipHtml(periodRes, "Стоматология ДЕНТЕ");
		assert.ok(html.includes("РАСЧЕТНЫЙ ЛИСТОК ЗА ПЕРИОД"));
		assert.ok(html.includes("Д-р Власова Е.В."));
		assert.ok(html.includes("Зуботехническая лаборатория (ЗТЛ)"));
		assert.ok(html.includes("Удержан НДФЛ 13%"));
		assert.equal(periodRes.ndfl13TaxKop % 100, 0);

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false);
	});
});
