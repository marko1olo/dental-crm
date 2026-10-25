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
import { DoctorPayrollModal } from "../../finance/payroll/DoctorPayrollModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Red Team: Solo Doctor Autonomy & Piece-Rate Sovereignty (Mandates 8e, 8n)", () => {
	it("1.1 Doctor specialty presets provide robust piecework rates across all clinical directions", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist, "therapist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.orthopedist, "orthopedist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon, "surgeon must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.orthodontist, "orthodontist must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner, "solo_practitioner must exist");

		// Therapist has standard 30% piecework rate
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.therapist.defaultPercentage, 30);
		// Orthopedist has 30% and deducts lab costs
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.orthopedist.defaultPercentage, 30);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.orthopedist.deductsLabCosts, true);
	});

	it("1.2 Solo practitioner operates on 100% net margin piecework after clinic expenses", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner, "solo_practitioner config must exist");
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.defaultPercentage, 100);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsLabCosts, true);
		assert.equal(DOCTOR_SPECIALTY_CONFIGS.solo_practitioner.deductsMaterialCosts, true);
	});

	it("1.3 Minimum monthly guarantee floors apply correctly when doctor has attendance", () => {
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist, "general_dentist config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist, "therapist config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon, "surgeon config must exist");
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.general_dentist.minGuaranteeMonthlyKop > 0);
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.therapist.minGuaranteeMonthlyKop > 0);
		assert.ok(DOCTOR_SPECIALTY_CONFIGS.surgeon.minGuaranteeMonthlyKop > 0);
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
		// 30% of 800,000 = 240,000 kop (2,400 RUB)
		assert.equal(res.earnedBaseCommissionKop, 240000);
		// Guarantee top-up to 70,000 RUB (7,000,000 kop) applies because daysWorked = 21
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.guaranteeTopUpKop, 6760000);
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
	it("3.1 DoctorPayrollModal.tsx contains 0 nested modals and exports cleanly", () => {
		assert.ok(DoctorPayrollModal, "DoctorPayrollModal must be exported");

		const filePath = path.resolve(__dirname, "../DoctorPayrollModal.tsx");
		const content = fs.readFileSync(filePath, "utf8");

		// Check for nested modal tags inside DoctorPayrollModal
		const modalTagMatches = content.match(/<Modal\b|<Dialog\b/g);
		assert.equal(modalTagMatches, null, "DoctorPayrollModal must not contain nested <Modal> or <Dialog> elements");

		// Check overlay depth: exactly 1 level
		const overlayCount = (content.match(/payroll-modal-overlay/g) || []).length;
		assert.ok(overlayCount <= 1, "DoctorPayrollModal overlay must not be nested");
	});

	it("3.2 Zero cartoon emojis exist in DoctorPayrollModal.tsx, DoctorPayrollModalContent.tsx, or staffPayrollEngine.ts", () => {
		const files = [
			path.resolve(__dirname, "../DoctorPayrollModal.tsx"),
			path.resolve(__dirname, "../DoctorPayrollModalContent.tsx"),
			path.resolve(__dirname, "../staffPayrollEngine.ts"),
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

	it("3.3 doctorPayrollModal.css contains zero hardcoded hex colors (#xxx or #xxxxxx)", () => {
		const cssPath = path.resolve(__dirname, "../styles/doctorPayrollModal.css");
		const css = fs.readFileSync(cssPath, "utf8");

		const hexMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g);
		assert.equal(
			hexMatches,
			null,
			`doctorPayrollModal.css must not contain hardcoded hex colors, found: ${JSON.stringify(hexMatches)}`,
		);
	});
});

describe("Red Team: Clinical Category Commission Invariants & ZTL Pre-Commission Deductions", () => {
	it("4.1 Verifies clinical statutory commission rates: Therapy 30%, Orthopedics 30%, Surgery 22%, Orthodontics 25%, Hygiene 30%, Retail 10%", () => {
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.therapy, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthopedics, 30);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.surgery, 22);
		assert.equal(CLINICAL_CATEGORY_COMMISSION_PERCENT.orthodontics, 25);
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
		// Clinical rate for orthopedics = 30%: 30% of 3,500,000 = 1,050,000 kop (10,500 RUB)
		// NOT 30% of 50,000 (which would be 15,000 RUB)
		assert.equal(res.earnedBaseCommissionKop, 1050000);
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

	describe("5. Red Team: Net Revenue 54-FZ, Chair Rental Shift Economics & Decomposition", () => {
		it("5.1 Commission accrued strictly from 54-FZ paid cash; zero commission on unpaid patient debts", () => {
			const res = calculateDoctorPeriodPayroll({
				doctorId: "doc-net-rev",
				doctorName: "Д-р Иванов С.И.",
				specialtyId: "orthopedist",
				periodStartIso: "2026-10-01",
				periodEndIso: "2026-10-31",
				services: [
					{
						id: "srv-paid",
						dateIso: "2026-10-05",
						patientName: "Оплаченный Пациент",
						medicalCardNumber: "101",
						serviceNameRu: "Керамическая коронка E.max",
						category: "orthopedics",
						grossRevenueKop: 4000000, // 40,000 RUB
						labCostKop: 1000000, // 10,000 RUB ЗТЛ
						materialCostKop: 0,
						isPaid: true,
						paidAmountKop: 4000000,
					},
					{
						id: "srv-debt",
						dateIso: "2026-10-10",
						patientName: "Должник с долгом",
						medicalCardNumber: "102",
						serviceNameRu: "Циркониевый мостовидный протез",
						category: "orthopedics",
						grossRevenueKop: 9000000, // 90,000 RUB
						labCostKop: 2500000, // 25,000 RUB ЗТЛ
						materialCostKop: 0,
						isPaid: false, // НЕ ОПЛАЧЕНО — ДОЛГ!
						paidAmountKop: 0,
					},
				],
			});

			// Only the 40,000 RUB paid service enters Net Revenue!
			// Unpaid 90,000 RUB service does NOT generate commission!
			assert.equal(res.totalGrossRevenueKop, 4000000, "Gross revenue must reflect only 54-FZ paid cash");
			// Net base = 40,000 - 10,000 (lab for paid item) = 30,000 RUB = 3,000,000 kop
			assert.equal(res.totalNetBaseKop, 3000000, "Net base must deduct ZTL strictly from collected cash");
			// Orthopedist 30% of 30,000 RUB = 9,000 RUB = 900,000 kop
			assert.equal(res.earnedBaseCommissionKop, 900000, "Doctor must receive commission strictly from paid cash");
		});

		it("5.2 Partially paid services generate commission strictly from the paid portion minus lab costs", () => {
			const res = calculateDoctorPeriodPayroll({
				doctorId: "doc-partial",
				doctorName: "Д-р Сидоров А.П.",
				specialtyId: "orthopedist",
				periodStartIso: "2026-10-01",
				periodEndIso: "2026-10-31",
				services: [
					{
						id: "srv-partial",
						dateIso: "2026-10-12",
						patientName: "Пациент с рассрочкой",
						medicalCardNumber: "103",
						serviceNameRu: "Протезирование all-on-4",
						category: "orthopedics",
						grossRevenueKop: 20000000, // 200,000 RUB billed
						labCostKop: 4000000, // 40,000 RUB ЗТЛ
						materialCostKop: 0,
						paidAmountKop: 10000000, // Only 100,000 RUB actually paid in cashbox!
					},
				],
			});

			// Cash collected = 100,000 RUB (10,000,000 kop)
			assert.equal(res.totalGrossRevenueKop, 10000000, "Gross must be capped at cash collected");
			// Net base = 100,000 - 40,000 = 60,000 RUB (6,000,000 kop)
			assert.equal(res.totalNetBaseKop, 6000000, "Net base must deduct ZTL from collected cash");
			// 30% of 60,000 RUB = 18,000 RUB (1,800,000 kop)
			assert.equal(res.earnedBaseCommissionKop, 1800000);
		});

		it("5.3 Chair rental shift economics: shiftsCount * shiftRateRub correctly computes rent and net profit", () => {
			const shiftsCount = 15;
			const shiftRateRub = 3500;
			const chairRentalRub = shiftsCount * shiftRateRub; // 52,500 RUB

			const res = calculateDoctorPeriodPayroll({
				doctorId: "solo-doc-rent",
				doctorName: "Д-р Кузнецов М.М.",
				specialtyId: "solo_practitioner",
				periodStartIso: "2026-10-01",
				periodEndIso: "2026-10-31",
				payoutModel: "chair_rental",
				chairRentalKop: chairRentalRub * 100,
				services: [
					{
						id: "srv-rent-1",
						dateIso: "2026-10-15",
						patientName: "Пациент Соло",
						medicalCardNumber: "201",
						serviceNameRu: "Комплексная реабилитация",
						category: "therapy",
						grossRevenueKop: 30000000, // 300,000 RUB
						labCostKop: 3000000, // 30,000 RUB ЗТЛ
						materialCostKop: 2000000, // 20,000 RUB материалы
						isPaid: true,
					},
				],
			});

			assert.equal(chairRentalRub, 52500, "15 shifts * 3500 RUB = 52,500 RUB");
			assert.equal(res.chairRentalKop, 5250000);
			// Net Profit = 300,000 - 52,500 (rent) - 30,000 (lab) - 20,000 (materials) = 197,500 RUB = 19,750,000 kop
			assert.equal(res.totalNetBaseKop, 19750000, "Solo net profit must equal Gross - Rent - Lab - Materials");
			assert.equal(res.earnedBaseCommissionKop, 19750000, "Solo doctor receives 100% of net margin");
			assert.equal(res.baseCommissionPercent, 100);
		});

		it("5.4 Printable payslip includes Accountant, Head of Clinic, and Doctor signature blocks", () => {
			const res = calculateDoctorPeriodPayroll({
				doctorId: "doc-sig",
				doctorName: "Д-р Соколова А.Н.",
				specialtyId: "therapist",
				periodStartIso: "2026-10-01",
				periodEndIso: "2026-10-31",
				services: [
					{
						id: "srv-sig",
						dateIso: "2026-10-10",
						patientName: "Пациент С",
						medicalCardNumber: "301",
						serviceNameRu: "Лечение кариеса",
						category: "therapy",
						grossRevenueKop: 10000000, // 100,000 RUB
						labCostKop: 0,
						materialCostKop: 1000000,
						isPaid: true,
					},
				],
			});

			const html = generateDoctorPayslipHtml(res, "ООО «Денте Стоматология»");
			assert.ok(html.includes("Главный бухгалтер:"), "Payslip must include Accountant signature line");
			assert.ok(html.includes("Руководитель клиники / Главврач:"), "Payslip must include Head of Clinic signature line");
			assert.ok(html.includes("Врач-специалист (подпись):"), "Payslip must include Doctor signature line");
		});

		it("5.5 DoctorPayrollModal and all decomposed submodules strictly adhere to <= 400 lines limit", () => {
			const payrollDir = path.resolve(__dirname, "..");
			const modulesDir = path.join(payrollDir, "payrollModules");

			const filesToCheck = [
				path.join(payrollDir, "DoctorPayrollModal.tsx"),
				path.join(modulesDir, "PayrollHeader.tsx"),
				path.join(modulesDir, "PayrollRentalSection.tsx"),
				path.join(modulesDir, "PayrollServicesTable.tsx"),
				path.join(modulesDir, "PayrollTotalsBar.tsx"),
			];

			for (const file of filesToCheck) {
				assert.ok(fs.existsSync(file), `File ${file} must exist`);
				const content = fs.readFileSync(file, "utf8");
				const lines = content.split("\n").length;
				assert.ok(
					lines <= 400,
					`File ${path.basename(file)} has ${lines} lines, exceeding the 400 lines limit!`,
				);
			}
		});
	});
});


