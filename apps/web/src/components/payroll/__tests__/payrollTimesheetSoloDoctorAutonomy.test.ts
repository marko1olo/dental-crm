/**
 * ═══════════════════════════════════════════════════════════════════════════
 * payrollTimesheetSoloDoctorAutonomy.test.ts
 *
 * Red Team Inquisitor Test Suite:
 * - Solo Doctor & Small Clinic Sovereignty (Mandate 8s)
 * - 1-Click Monthly Fill (Я/6.6 ТК РФ Art. 350 and Я/8.0 Standard)
 * - Kopeck-Exact Arithmetic & Zero Float Rounding Drift (Mandate 8b)
 * - Anti-Matryoshka (Mandate 8d pt 6: Depth strictly 1, 0 nested modals)
 * - Anti-Cartoon Emoji Ban (Mandate 8d pt 7)
 * - Zero Hardcoded Hex Colors in CSS
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	calculateEmployeeTimesheetT13,
	generateTimesheetT13Csv,
	getDaysInMonth,
	type TimesheetDayRecord,
	type EmployeeTimesheetInput,
} from "@dental/shared";
import {
	calculateDoctorStaffPayroll,
	calculateAssistantStaffPayroll,
	calculateAdministratorStaffPayroll,
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
	generate1CZup31Xml,
	DOCTOR_SPECIALTY_CONFIGS,
	CLINICAL_CATEGORY_COMMISSION_PERCENT,
	calculateDoctorPeriodPayroll,
	type DoctorStaffPayrollInput,
} from "../staffPayrollEngine";
import {
	generateDoctorPayslipHtml,
} from "../staffPayrollExports";
import {
	staffToEmployeeInfo,
	generateDefaultMonthSchedule,
	TimesheetT13Modal,
} from "../TimesheetT13Modal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team: Solo Doctor & Small Clinic Timesheet T-13 Autonomy (Mandate 8s)", () => {
	it("1.1 staffToEmployeeInfo assigns Labor Code RF hours: 6.6h for doctor (ст. 350 ТК РФ), 7.8h for assistant, 8.0h for admin", () => {
		const rawStaff = [
			{ id: "doc-solo", role: "doctor", fullName: "Д-р Смирнов А.П.", specialties: ["general_dentist"] },
			{ id: "owner-1", role: "owner", fullName: "Д-р Кузнецов В.В." },
			{ id: "asst-1", role: "assistant", fullName: "Семенова Е.А." },
			{ id: "adm-1", role: "admin", fullName: "Васильева М.С." },
		];

		const converted = staffToEmployeeInfo(rawStaff);
		assert.equal(converted.length, 4);

		// Doctor & Owner: 33h week = 6.6h/day per Art. 350 Labor Code RF
		assert.equal(converted[0]!.defaultShiftHours, 6.6);
		assert.equal(converted[0]!.positionRu, "Врач-стоматолог общей практики");
		assert.equal(converted[1]!.defaultShiftHours, 6.6);

		// Assistant: 39h week = 7.8h/day
		assert.equal(converted[2]!.defaultShiftHours, 7.8);
		assert.equal(converted[2]!.positionRu, "Ассистент врача-стоматолога");

		// Administrator: 40h week = 8.0h/day
		assert.equal(converted[3]!.defaultShiftHours, 8.0);
		assert.equal(converted[3]!.positionRu, "Администратор клиники");
	});

	it("1.2 1-click monthly fill with doctor statutory hours (Я/6.6 per ст. 350 ТК РФ) computes exact totals and split halves", () => {
		// August 2026 has 31 days (21 working days, 10 weekend days)
		const schedule66 = generateDefaultMonthSchedule(2026, 8, 6.6);
		assert.equal(schedule66.length, 31);

		const workDays = schedule66.filter((d) => d.primaryCode === "Я");
		const weekendDays = schedule66.filter((d) => d.primaryCode === "В");

		assert.equal(workDays.length, 21);
		assert.equal(weekendDays.length, 10);
		workDays.forEach((d) => assert.equal(d.primaryHours, 6.6));
		weekendDays.forEach((d) => assert.equal(d.primaryHours, 0));

		const input: EmployeeTimesheetInput = {
			employeeId: "solo-1",
			employeeTabNumber: "00001",
			employeeFullName: "Смирнов Алексей Петрович",
			positionRu: "Врач-стоматолог / Руководитель",
			departmentRu: "Клинический прием",
			year: 2026,
			month: 8,
			days: schedule66,
		};

		const res = calculateEmployeeTimesheetT13(input);
		assert.equal(res.daysInMonth, 31);
		assert.equal(res.monthTotalSummary.daysWorked, 21);
		// 21 days * 6.6 hours = 138.6 hours
		assert.equal(Number(res.monthTotalSummary.totalHoursWorked.toFixed(1)), 138.6);
		assert.equal(res.monthTotalSummary.vacationDays, 0);
		assert.equal(res.monthTotalSummary.sickLeaveDays, 0);

		// Half months split
		assert.equal(
			res.firstHalfSummary.daysWorked + res.secondHalfSummary.daysWorked,
			21,
		);
		assert.equal(
			Number((res.firstHalfSummary.totalHoursWorked + res.secondHalfSummary.totalHoursWorked).toFixed(1)),
			138.6,
		);

		// CSV export verification
		const csv = generateTimesheetT13Csv([res], "Стоматологический кабинет д-ра Смирнова", 2026, 8);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Унифицированная форма № Т-13"));
		assert.ok(csv.includes("Смирнов Алексей Петрович"));
		assert.ok(csv.includes("138.6"));
	});

	it("1.3 1-click monthly fill with standard 8-hour shift (Я/8.0) computes standard 40h workweek totals", () => {
		const schedule80 = generateDefaultMonthSchedule(2026, 8, 8.0);
		assert.equal(schedule80.length, 31);

		const workDays = schedule80.filter((d) => d.primaryCode === "Я");
		assert.equal(workDays.length, 21);
		workDays.forEach((d) => assert.equal(d.primaryHours, 8.0));

		const input: EmployeeTimesheetInput = {
			employeeId: "solo-admin",
			employeeTabNumber: "00002",
			employeeFullName: "Петрова Анна Сергеевна",
			positionRu: "Администратор клиники",
			departmentRu: "Ресепшен",
			year: 2026,
			month: 8,
			days: schedule80,
		};

		const res = calculateEmployeeTimesheetT13(input);
		assert.equal(res.monthTotalSummary.daysWorked, 21);
		// 21 days * 8.0 hours = 168.0 hours
		assert.equal(res.monthTotalSummary.totalHoursWorked, 168.0);
	});
});

describe("Red Team: Kopeck-Exact Arithmetic & Zero Rounding Drift (Mandate 8b)", () => {
	it("2.1 Solo practitioner specialty computes 100% net margin piecework without rounding drift", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner, "solo_practitioner config must exist");
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.defaultPercentage, 100);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsLabCosts, true);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsMaterialCosts, true);

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
					grossRevenueKop: 3500000, // 35,000.00 RUB
					labCostKop: 850050, // 8,500.50 RUB
					materialCostKop: 120025, // 1,200.25 RUB
				},
				{
					id: "s-2",
					dateIso: "2026-08-10",
					patientName: "Пациент 2",
					medicalCardNumber: "002",
					serviceNameRu: "Продажа пасты",
					category: "retail_hygiene",
					grossRevenueKop: 150000, // 1,500.00 RUB
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		// Gross = 3,500,000 + 150,000 = 3,650,000 kop
		assert.equal(res.totalGrossRevenueKop, 3650000);
		assert.equal(res.totalLabDeductionsKop, 850050);
		assert.equal(res.totalMaterialDeductionsKop, 120025);
		// Net base = 3,650,000 - 850,050 - 120,025 = 2,679,925 kop
		assert.equal(res.totalNetBaseKop, 2679925);
		// 100% of ortho service net base (2,529,925) = 2,529,925 kop
		assert.equal(res.earnedBaseCommissionKop, 2529925);
		// 100% of retail hygiene (150,000) = 150,000 kop
		assert.equal(res.earnedRetailCommissionKop, 150000);
		// Gross payout = 2,529,925 + 150,000 = 2,679,925 kop (26,799.25 RUB)
		assert.equal(res.grossPayoutBeforeTaxKop, 2679925);
		// Must be strictly integer kopecks
		assert.equal(Number.isInteger(res.grossPayoutBeforeTaxKop), true);
	});

	it("2.2 General dentist specialty deducts both lab and material costs and enforces minimum guarantee on active attendance", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist config must exist");
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.general_dentist.defaultPercentage, 25);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.general_dentist.minGuaranteeMonthlyKop, 7000000); // 70,000 RUB

		// Doctor worked full month (21 days) in newly opened chair with low service revenue
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-gen",
			employeeTabNumber: "00003",
			employeeFullName: "Д-р Новикова О.И.",
			specialtyId: "general_dentist",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			daysWorked: 21,
			services: [
				{
					id: "s-1",
					dateIso: "2026-08-12",
					patientName: "Пациент",
					medicalCardNumber: "003",
					serviceNameRu: "Консультация",
					category: "therapy",
					grossRevenueKop: 1000000, // 10,000 RUB
					labCostKop: 100000, // 1,000 RUB
					materialCostKop: 100000, // 1,000 RUB
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		// Net base = 1,000,000 - 100,000 - 100,000 = 800,000 kop
		assert.equal(res.totalNetBaseKop, 800000);
		// 25% of 800,000 = 200,000 kop (2,000 RUB)
		assert.equal(res.earnedBaseCommissionKop, 200000);
		// Guarantee top-up to 70,000 RUB (7,000,000 kop) applies because daysWorked = 21
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.guaranteeTopUpKop, 6800000);
		assert.equal(res.grossPayoutBeforeTaxKop, 7000000);
	});

	it("2.3 Doctor with active attendance (daysWorked > 0) but zero billed services qualifies for minimum guarantee floor", () => {
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
		// Guarantee applies: 60,000 RUB (6,000,000 kop)
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.guaranteeTopUpKop, 6000000);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
	});
});

describe("Red Team: Anti-Matryoshka, Anti-Cartoon Emojis & CSS Tokens (Mandates 8d, 8s)", () => {
	it("3.1 TimesheetT13Modal.tsx contains 0 nested modals and exports cleanly", () => {
		assert.ok(TimesheetT13Modal, "TimesheetT13Modal must be exported");

		const filePath = path.resolve(__dirname, "../TimesheetT13Modal.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		// Check for nested modal tags inside TimesheetT13Modal
		const modalTagMatches = content.match(/<Modal\b|<Dialog\b/g);
		assert.equal(modalTagMatches, null, "TimesheetT13Modal must not contain nested <Modal> or <Dialog> elements");

		// Check overlay depth: exactly 1 level
		const overlayCount = (content.match(/timesheet-modal-overlay/g) || []).length;
		assert.ok(overlayCount >= 1 && overlayCount <= 2, "Timesheet modal overlay must not be nested");
	});

	it("3.2 Zero cartoon emojis exist in TimesheetT13Modal.tsx, staffPayrollEngine.ts, or timesheetT13.css", () => {
		const files = [
			path.resolve(__dirname, "../TimesheetT13Modal.tsx"),
			path.resolve(__dirname, "../staffPayrollEngine.ts"),
			path.resolve(__dirname, "../timesheetT13.css"),
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

		files.forEach((file) => {
			const text = fs.readFileSync(file, "utf8");
			const lines = text.split("\n");
			lines.forEach((line, idx) => {
				assert.equal(
					emojiRegex.test(line),
					false,
					`Found prohibited cartoon emoji in ${path.basename(file)} at line ${idx + 1}: ${line}`,
				);
			});
		});
	});

	it("3.3 timesheetT13.css contains zero hardcoded hex colors (#xxx or #xxxxxx)", () => {
		const cssPath = path.resolve(__dirname, "../timesheetT13.css");
		const css = fs.readFileSync(cssPath, "utf8");

		const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.equal(
			hexMatches,
			null,
			`timesheetT13.css must not contain hardcoded hex colors, found: ${JSON.stringify(hexMatches)}`,
		);
	});
});

describe("Red Team: Clinical Category Commission Invariants & ZTL Pre-Commission Deductions", () => {
	it("4.1 Verifies clinical statutory commission rates: Therapy 25%, Orthopedics 20%, Surgery 22%, Orthodontics 22%, Hygiene 30%, Retail 10%", () => {
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.therapy, 25);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthopedics, 20);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.surgery, 22);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthodontics, 22);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.hygiene, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.retail_hygiene, 10);
	});

	it("4.2 Pre-commission deduction of ZTL lab costs from orthopedics/orthodontics base before piece-rate calculation", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-ortho-ztl",
			employeeTabNumber: "00005",
			employeeFullName: "Д-р Протезов И.С.",
			specialtyId: "orthopedist",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			useClinicalCategoryRates: true,
			services: [
				{
					id: "srv-ztl-1",
					dateIso: "2026-09-10",
					patientName: "Пациент А",
					medicalCardNumber: "005",
					serviceNameRu: "Коронка E.max циркониевая",
					category: "orthopedics",
					grossRevenueKop: 5000000, // 50,000 RUB
					labCostKop: 1500000, // 15,000 RUB ZTL lab invoice
					materialCostKop: 0,
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		// Net base = 50,000 - 15,000 = 35,000 RUB = 3,500,000 kop
		assert.equal(res.totalGrossRevenueKop, 5000000);
		assert.equal(res.totalLabDeductionsKop, 1500000);
		assert.equal(res.totalNetBaseKop, 3500000);
		// Clinical rate for orthopedics = 20%: 20% of 3,500,000 = 700,000 kop (7,000 RUB)
		// NOT 20% of 50,000 (which would be 10,000 RUB)
		assert.equal(res.earnedBaseCommissionKop, 700000);
	});

	it("4.3 Pre-commission deduction of costly implants and bone materials from surgery piecework base", () => {
		const input: DoctorStaffPayrollInput = {
			employeeId: "doc-surg-mat",
			employeeTabNumber: "00006",
			employeeFullName: "Д-р Хирургов М.А.",
			specialtyId: "surgeon",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			useClinicalCategoryRates: true,
			services: [
				{
					id: "srv-surg-1",
					dateIso: "2026-09-12",
					patientName: "Пациент Б",
					medicalCardNumber: "006",
					serviceNameRu: "Установка дентального имплантата Osstem + костная пластика",
					category: "surgery",
					grossRevenueKop: 8000000, // 80,000 RUB
					labCostKop: 0,
					materialCostKop: 2500000, // 25,000 RUB (имплантат + мембрана + биоматериал)
				},
			],
		};

		const res = calculateDoctorStaffPayroll(input);
		// Net base = 80,000 - 25,000 = 55,000 RUB = 5,500,000 kop
		assert.equal(res.totalGrossRevenueKop, 8000000);
		assert.equal(res.totalMaterialDeductionsKop, 2500000);
		assert.equal(res.totalNetBaseKop, 5500000);
		// Clinical rate for surgery = 22%: 22% of 5,500,000 = 1,210,000 kop (12,100 RUB)
		assert.equal(res.earnedBaseCommissionKop, 1210000);
	});

	it("4.4 generateDoctorPayslipHtml generates statutory A4 payslip with NDFL 13% rounding per Art. 225 p. 6 Tax Code RF and zero cartoon emojis", () => {
		const periodRes = calculateDoctorPeriodPayroll({
			doctorId: "doc-payslip",
			doctorName: "Д-р Власова Е.В.",
			specialtyId: "therapist",
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			services: [
				{
					id: "srv-p-1",
					dateIso: "2026-09-15",
					patientName: "Пациент В",
					medicalCardNumber: "007",
					serviceNameRu: "Эндодонтическое лечение 3-канального зуба",
					category: "therapy",
					grossRevenueKop: 4500000, // 45,000 RUB
					labCostKop: 0,
					materialCostKop: 500000, // 5,000 RUB
				},
			],
		});

		const html = generateDoctorPayslipHtml(periodRes, "Стоматология ДЕНТЕ");
		assert.ok(html.includes("РАСЧЕТНЫЙ ЛИСТОК ЗА ПЕРИОД"), "Must include payslip title");
		assert.ok(html.includes("Ст. 136 ТК РФ"), "Must include Art. 136 LC RF reference");
		assert.ok(html.includes("Д-р Власова Е.В."), "Must display doctor name");
		assert.ok(html.includes("Зуботехническая лаборатория (ЗТЛ)"), "Must display ZTL lab line item");
		assert.ok(html.includes("Удержан НДФЛ 13%"), "Must display NDFL 13% line item");

		// NDFL 13% rounding check: grossPayout is minGuarantee (60,000 RUB = 6,000,000 kop)
		// 13% of 6,000,000 kop = 780,000 kop (7,800.00 RUB)
		assert.equal(periodRes.ndfl13TaxKop % 100, 0, "NDFL must round strictly to whole rubles (Art. 225 p. 6 TC RF)");

		// Zero cartoon emojis in generated payslip HTML
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Payslip HTML must contain zero cartoon emojis");
	});
});

