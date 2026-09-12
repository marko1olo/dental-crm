/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Advanced Doctor Payroll, Assistant KPI & Form T-13 Tests (Wave 14)
 * Comprehensive verification of integer kopecks, ZTL lab deductions,
 * assistant piece-rate, 1C:ZUP 3.1 XML/CSV exports, and Form T-13 timesheet.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	calculateAdvancedDoctorPayroll,
	calculateAssistantPayroll,
	buildOneCZupAccrualsList,
	exportOneCZup31Xml,
	exportOneCZup31Csv,
	ADVANCED_DOCTOR_SPECIALTY_PRESETS,
	DEFAULT_ASSISTANT_PAYROLL_RULES,
	DEFAULT_DOCTOR_KPI_TIERS,
	advancedDoctorServiceItemSchema,
	advancedDoctorPayrollInputSchema,
	type AdvancedDoctorServiceItem,
	type AdvancedDoctorPayrollInput,
	type AssistantWorkShiftItem,
	type AssistantPayrollInput,
} from "../payroll/advancedDoctorPayrollEngine.js";

import {
	calculateEmployeeTimesheetT13,
	aggregateTimesheetDays,
	getDaysInMonth,
	renderFormT13Html,
	generateTimesheetT13Csv,
	TIMESHEET_STATUTORY_CODES,
	timesheetDayRecordSchema,
	employeeTimesheetInputSchema,
	formT13DocumentPayloadSchema,
	type EmployeeTimesheetInput,
	type TimesheetDayRecord,
} from "../payroll/formT13TimesheetEngine.js";

describe("Wave 14: Advanced Doctor Payroll & KPI Engine", () => {
	it("1.1 Differentiated piece-rate commission: Therapy (25%) with direct material deduction", () => {
		const services: AdvancedDoctorServiceItem[] = [
			{
				id: "srv-th-1",
				dateIso: "2026-08-05",
				patientId: "pat-101",
				patientName: "Барабаш Сергей Владимирович",
				medicalCardNumber: "043/у-101",
				serviceCode804n: "A16.07.002.001",
				serviceNameRu: "Наложение пломбы Ceram.x Spectra ST (Кариес дентина 1.6)",
				category: "therapy",
				grossRevenueKop: 1200000, // 12,000.00 RUB
				labCostKop: 0,
				materialCostKop: 200000, // 2,000.00 RUB (materials deducted)
			},
			{
				id: "srv-th-2",
				dateIso: "2026-08-06",
				patientId: "pat-102",
				patientName: "Смирнова Елена Александровна",
				medicalCardNumber: "043/у-102",
				serviceCode804n: "A16.07.030.002",
				serviceNameRu: "Эндодонтическое лечение 3-канального зуба 2.6",
				category: "therapy",
				grossRevenueKop: 2800000, // 28,000.00 RUB
				labCostKop: 0,
				materialCostKop: 400000, // 4,000.00 RUB (materials deducted)
			},
		];

		const input: AdvancedDoctorPayrollInput = {
			doctorId: "doc-th-1",
			tabNumber: "ВР-001",
			doctorName: "Д-р Барабаш С. В.",
			specialtyId: "therapy",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			departmentRu: "Терапевтическое отделение",
			services,
		};

		const res = calculateAdvancedDoctorPayroll(input);

		// Total Gross: 12,000 + 28,000 = 40,000 RUB (4,000,000 kop)
		assert.equal(res.totalGrossRevenueKop, 4000000);
		// Material deductions: 2,000 + 4,000 = 6,000 RUB (600,000 kop)
		assert.equal(res.totalMaterialDeductionsKop, 600000);
		// Lab deductions: 0
		assert.equal(res.totalLabDeductionsKop, 0);
		// Net Deal Base: 40,000 - 6,000 = 34,000 RUB (3,400,000 kop)
		assert.equal(res.totalNetDealBaseKop, 3400000);
		// Commission: 25% of 34,000 = 8,500 RUB (850,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 850000);
		assert.equal(res.baseCommissionPercent, 25);

		// Pre-guarantee earned: 8,500 RUB (850,000 kop)
		// Min guarantee for therapist is 60,000 RUB (6,000,000 kop)
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 6000000); // 60,000.00 RUB clean gross
		assert.equal(res.totalServicesCount, 2);
	});

	it("1.2 Differentiated piece-rate commission: Orthopedics (15%) with dynamic ZTL lab deduction BEFORE %", () => {
		const services: AdvancedDoctorServiceItem[] = [
			{
				id: "srv-ortho-1",
				dateIso: "2026-08-10",
				patientId: "pat-201",
				patientName: "Кузнецов Петр Сергеевич",
				medicalCardNumber: "043/у-201",
				serviceCode804n: "A16.07.004.001",
				serviceNameRu: "Коронка из диоксида циркония Prettau на имплантате",
				category: "orthopedics",
				grossRevenueKop: 65000000, // 650,000.00 RUB
				labCostKop: 15000000, // 150,000.00 RUB (ZTL Lab bill deducted BEFORE doctor %)
				materialCostKop: 0,
			},
			{
				id: "srv-ortho-2",
				dateIso: "2026-08-12",
				patientId: "pat-202",
				patientName: "Морозова Ольга Николаевна",
				medicalCardNumber: "043/у-202",
				serviceCode804n: "A16.07.003.002",
				serviceNameRu: "Керамический винир E.max CAD",
				category: "orthopedics",
				grossRevenueKop: 35000000, // 350,000.00 RUB
				labCostKop: 10000000, // 100,000.00 RUB (ZTL Lab bill deducted)
				materialCostKop: 0,
			},
		];

		const input: AdvancedDoctorPayrollInput = {
			doctorId: "doc-ortho-1",
			tabNumber: "ВР-002",
			doctorName: "Д-р Ортопедов К. М.",
			specialtyId: "orthopedics",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			departmentRu: "Ортопедическое отделение",
			services,
		};

		const res = calculateAdvancedDoctorPayroll(input);

		// Total Gross: 650,000 + 350,000 = 1,000,000 RUB (100,000,000 kop)
		assert.equal(res.totalGrossRevenueKop, 100000000);
		// Total ZTL Lab deductions: 150,000 + 100,000 = 250,000 RUB (25,000,000 kop)
		assert.equal(res.totalLabDeductionsKop, 25000000);
		// Net Deal Base: 1,000,000 - 250,000 = 750,000 RUB (75,000,000 kop)
		assert.equal(res.totalNetDealBaseKop, 75000000);
		// 15% doctor commission on Net Deal Base: 15% of 750,000 = 112,500 RUB (11,250,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 11250000);
		assert.equal(res.baseCommissionPercent, 15);

		// KPI Tier: Total Gross is 1,000,000 RUB -> triggers Tier 1 (min 1,000,000 RUB -> 5% KPI bonus)
		assert.equal(res.kpiBonusPercent, 5);
		// KPI bonus on Net Deal Base: 5% of 750,000 = 37,500 RUB (3,750,000 kop)
		assert.equal(res.kpiBonusEarnedKop, 3750000);

		// Pre-guarantee gross total: 112,500 + 37,500 = 150,000 RUB (15,000,000 kop)
		// Min guarantee for orthopedist is 80,000 RUB -> 150,000 >= 80,000 so min guarantee is false
		assert.equal(res.minimumGuaranteeApplied, false);
		assert.equal(res.grossPayoutBeforeTaxKop, 15000000);
	});

	it("1.3 Differentiated piece-rate commission: Surgery / Implantology (20%) with material deductions", () => {
		const services: AdvancedDoctorServiceItem[] = [
			{
				id: "srv-surg-1",
				dateIso: "2026-08-15",
				patientId: "pat-301",
				patientName: "Александров Игорь Павлович",
				medicalCardNumber: "043/у-301",
				serviceCode804n: "A16.07.054",
				serviceNameRu: "Дентальная имплантация системы Straumann BLX",
				category: "surgery",
				grossRevenueKop: 8000000, // 80,000.00 RUB
				labCostKop: 0,
				materialCostKop: 2500000, // 25,000.00 RUB (implant fixture + membrane cost)
			},
		];

		const res = calculateAdvancedDoctorPayroll({
			doctorId: "doc-surg-1",
			tabNumber: "ВР-003",
			doctorName: "Д-р Хирургов А. В.",
			specialtyId: "surgery",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// Gross: 80,000 RUB (8,000,000 kop)
		assert.equal(res.totalGrossRevenueKop, 8000000);
		// Material deductions: 25,000 RUB (2,500,000 kop)
		assert.equal(res.totalMaterialDeductionsKop, 2500000);
		// Net base: 55,000 RUB (5,500,000 kop)
		assert.equal(res.totalNetDealBaseKop, 5500000);
		// 20% of 55,000 = 11,000 RUB (1,100,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 1100000);
		assert.equal(res.baseCommissionPercent, 20);
		// Min guarantee for surgeon is 100,000 RUB (10,000,000 kop) -> applied
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 10000000);
	});

	it("1.4 Differentiated piece-rate commission: Orthodontics (20%) with aligner setup ZTL lab deduction", () => {
		const services: AdvancedDoctorServiceItem[] = [
			{
				id: "srv-orthodont-1",
				dateIso: "2026-08-18",
				patientId: "pat-401",
				patientName: "Васильева Татьяна Сергеевна",
				medicalCardNumber: "043/у-401",
				serviceCode804n: "A16.07.048",
				serviceNameRu: "Ортодонтическое лечение элайнерами Spark (полный курс)",
				category: "orthodontics",
				grossRevenueKop: 32000000, // 320,000.00 RUB
				labCostKop: 12000000, // 120,000.00 RUB (Spark 3D setup lab bill)
				materialCostKop: 0,
			},
		];

		const res = calculateAdvancedDoctorPayroll({
			doctorId: "doc-orthodont-1",
			tabNumber: "ВР-004",
			doctorName: "Д-р Ортодонтов В. С.",
			specialtyId: "orthodontics",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		// Net base: 320,000 - 120,000 = 200,000 RUB (20,000,000 kop)
		assert.equal(res.totalNetDealBaseKop, 20000000);
		// 20% of 200,000 = 40,000 RUB (4,000,000 kop)
		assert.equal(res.earnedBaseCommissionKop, 4000000);
		assert.equal(res.baseCommissionPercent, 20);
		// Min guarantee for orthodontist is 75,000 RUB -> applied
		assert.equal(res.minimumGuaranteeApplied, true);
		assert.equal(res.grossPayoutBeforeTaxKop, 7500000);
	});

	it("1.5 Professional Hygiene (30%) and Retail Hygiene Products (10%)", () => {
		const services: AdvancedDoctorServiceItem[] = [
			{
				id: "srv-hyg-1",
				dateIso: "2026-08-20",
				patientId: "pat-501",
				patientName: "Чистов Николай Ильич",
				medicalCardNumber: "043/у-501",
				serviceCode804n: "A16.07.051",
				serviceNameRu: "Комплексная профгигиена полости рта Air-Flow + УЗ",
				category: "hygiene",
				grossRevenueKop: 900000, // 9,000.00 RUB (30% = 2,700 RUB = 270,000 kop)
				labCostKop: 0,
				materialCostKop: 0,
			},
			{
				id: "srv-ret-1",
				dateIso: "2026-08-20",
				patientId: "pat-501",
				patientName: "Чистов Николай Ильич",
				medicalCardNumber: "043/у-501",
				serviceNameRu: "Зубная щетка Curaprox CS 5460 + Паста Biorepair Plus",
				category: "retail_hygiene",
				grossRevenueKop: 350000, // 3,500.00 RUB (15% for hygienist = 525.00 RUB = 52,500 kop)
				labCostKop: 0,
				materialCostKop: 0,
			},
		];

		const res = calculateAdvancedDoctorPayroll({
			doctorId: "doc-hyg-1",
			tabNumber: "ВР-005",
			doctorName: "Гигиенист Чистова Е. А.",
			specialtyId: "hygiene",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services,
		});

		assert.equal(res.earnedBaseCommissionKop, 270000); // 2,700.00 RUB (30% of 9,000)
		assert.equal(res.earnedRetailCommissionKop, 35000); // 350.00 RUB (10% of 3,500)
		assert.equal(res.specialtyBreakdowns.length, 2);
	});

	it("1.6 Assistant piece-rate: Shifts + CBCT/OPTG imaging percentage + per-shot & surgery bonuses", () => {
		const shifts: AssistantWorkShiftItem[] = [
			{
				id: "sh-1",
				dateIso: "2026-08-01",
				shiftType: "standard_6h",
				hoursWorked: 6,
				radiographsTakenCount: 8, // 8 * 150 = 1,200 RUB
				imagingRevenueKop: 2400000, // 24,000.00 RUB from CBCT/OPTG (10% = 2,400 RUB)
				surgeriesAssistedCount: 2, // 2 * 200 = 400 RUB
			},
			{
				id: "sh-2",
				dateIso: "2026-08-02",
				shiftType: "full_12h",
				hoursWorked: 12,
				radiographsTakenCount: 12, // 12 * 150 = 1,800 RUB
				imagingRevenueKop: 3600000, // 36,000.00 RUB (10% = 3,600 RUB)
				surgeriesAssistedCount: 3, // 3 * 200 = 600 RUB
			},
		];

		const input: AssistantPayrollInput = {
			assistantId: "asst-101",
			tabNumber: "АС-001",
			assistantName: "Иванова Анна Сергеевна",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			departmentRu: "Ассистентский состав",
			shifts,
			manualAdjustmentKop: 50000, // 500.00 RUB bonus
			manualAdjustmentReasonRu: "Премия за наставничество",
		};

		const res = calculateAssistantPayroll(input);

		// Shifts payout: Standard 6h (3,500 RUB) + Full 12h (7,000 RUB) = 10,500 RUB (1,050,000 kop)
		assert.equal(res.baseShiftPayoutKop, 1050000);
		// Imaging revenue: 24,000 + 36,000 = 60,000 RUB (6,000,000 kop). 10% commission = 6,000 RUB (600,000 kop)
		assert.equal(res.imagingPercentagePayoutKop, 600000);
		// Total shots: 8 + 12 = 20 shots * 150 RUB = 3,000 RUB (300,000 kop)
		assert.equal(res.radiographBonusPayoutKop, 300000);
		// Surgeries: 2 + 3 = 5 surgeries * 200 RUB = 1,000 RUB (100,000 kop)
		assert.equal(res.surgeryAssistancePayoutKop, 100000);
		// Manual adjustment: 500 RUB (50,000 kop)
		assert.equal(res.manualAdjustmentKop, 50000);

		// Gross Total = 10,500 + 6,000 + 3,000 + 1,000 + 500 = 21,000 RUB (2,100,000 kop)
		assert.equal(res.grossPayoutBeforeTaxKop, 2100000);
		assert.equal(res.totalShiftsCount, 2);
		assert.equal(res.totalHoursWorked, 18);
	});

	it("1.7 Statutory 1C:ZUP 3.1 XML and CSV export (clean gross base, zero NDFL)", () => {
		const docRes = calculateAdvancedDoctorPayroll({
			doctorId: "doc-1",
			tabNumber: "ВР-001",
			doctorName: "Д-р Барабаш С. В.",
			specialtyId: "therapy",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			departmentRu: "Терапевтическое отделение",
			services: [
				{
					id: "s1",
					dateIso: "2026-08-01",
					patientId: "p1",
					patientName: "Пациент",
					medicalCardNumber: "043-1",
					serviceNameRu: "Пломба",
					category: "therapy",
					grossRevenueKop: 100000000, // 1,000,000 RUB -> triggers KPI Tier 1
					labCostKop: 0,
					materialCostKop: 0,
				},
			],
		});

		const asstRes = calculateAssistantPayroll({
			assistantId: "asst-1",
			tabNumber: "АС-001",
			assistantName: "Иванова А. С.",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			shifts: [
				{
					id: "sh1",
					dateIso: "2026-08-01",
					shiftType: "standard_6h",
					hoursWorked: 6,
					radiographsTakenCount: 10,
					imagingRevenueKop: 1000000,
					surgeriesAssistedCount: 1,
				},
			],
		});

		const accruals = buildOneCZupAccrualsList([docRes], [asstRes], "2026-08");

		// Doctor piece rate + KPI bonus, Assistant shifts + imaging + shots + surgery
		assert.ok(accruals.length >= 5);

		const xml = exportOneCZup31Xml(accruals, "ООО «Денте»", "7701234567", "DOC-001", "2026-08-31");
		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<ДанныеОбмена_1СЗУП31'));
		assert.ok(xml.includes('<ТабельныйНомер>ВР-001</ТабельныйНомер>'));
		assert.ok(xml.includes('<ТабельныйНомер>АС-001</ТабельныйНомер>'));
		assert.ok(xml.includes('<ВидРасчета>Сдельная оплата труда врача</ВидРасчета>'));
		assert.ok(xml.includes('<ВидРасчета>Премия за выполнение KPI выручки</ВидРасчета>'));
		assert.ok(xml.includes('<КодНачисления1С>DOCTOR_PIECE_RATE</КодНачисления1С>'));

		const csv = exportOneCZup31Csv(accruals);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("ТабельныйНомер;ФИО;Должность;Подразделение"));
		assert.ok(csv.includes("ВР-001;"));
		assert.ok(csv.includes("АС-001;"));
	});

	it("1.8 Error handling: asserts integer kopecks on invalid inputs", () => {
		assert.throws(
			() => {
				calculateAdvancedDoctorPayroll({
					doctorId: "doc-err",
					tabNumber: "ERR",
					doctorName: "Err",
					specialtyId: "therapy",
					periodStartIso: "2026-08-01",
					periodEndIso: "2026-08-31",
					services: [
						{
							id: "e1",
							dateIso: "2026-08-01",
							patientId: "p1",
							patientName: "P",
							medicalCardNumber: "M",
							serviceNameRu: "S",
							category: "therapy",
							grossRevenueKop: 1234.56, // Float forbidden!
							labCostKop: 0,
							materialCostKop: 0,
						},
					],
				});
			},
			{ message: /должно быть целым числом копеек/ },
		);
	});
});

describe("Wave 14: Form T-13 Timesheet Engine (Госкомстат РФ № 1)", () => {
	it("2.1 Calculates daily shifts, night hours, overtime, weekend and absences for full month", () => {
		const days: TimesheetDayRecord[] = [
			// Day 1: Regular 6.6h shift + 2.0h overtime
			{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.6, secondaryCode: "С", secondaryHours: 2.0 },
			// Day 2: Regular 6.6h shift
			{ dayNumber: 2, primaryCode: "Я", primaryHours: 6.6 },
			// Day 3: Night shift 6.0h
			{ dayNumber: 3, primaryCode: "Н", primaryHours: 6.0 },
			// Day 4: Weekend work (РВ) 6.6h
			{ dayNumber: 4, primaryCode: "РВ", primaryHours: 6.6 },
			// Day 5: Weekend (В)
			{ dayNumber: 5, primaryCode: "В", primaryHours: 0 },
			// Day 6: Sick leave (Б)
			{ dayNumber: 6, primaryCode: "Б", primaryHours: 0 },
			// Day 7: Vacation (ОТ)
			{ dayNumber: 7, primaryCode: "ОТ", primaryHours: 0 },
			// Day 8: Unpaid leave (ДО)
			{ dayNumber: 8, primaryCode: "ДО", primaryHours: 0 },
		];

		const input: EmployeeTimesheetInput = {
			employeeId: "emp-1",
			employeeTabNumber: "ТБ-001",
			employeeFullName: "Смирнов Алексей Владимирович",
			positionRu: "Врач-стоматолог-терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8, // August (31 days)
			days,
		};

		const res = calculateEmployeeTimesheetT13(input);

		assert.equal(res.daysInMonth, 31);
		assert.equal(res.dailyRecords.length, 31);

		// First half summary:
		// Days worked: Day 1 (Я), Day 2 (Я), Day 3 (Н), Day 4 (РВ) = 4 days
		assert.equal(res.firstHalfSummary.daysWorked, 4);
		assert.equal(res.firstHalfSummary.regularHoursWorked, 13.2); // 6.6 + 6.6
		assert.equal(res.firstHalfSummary.nightHoursWorked, 6.0);
		assert.equal(res.firstHalfSummary.overtimeHoursWorked, 2.0);
		assert.equal(res.firstHalfSummary.weekendHoursWorked, 6.6);
		// Total hours worked = 13.2 + 6.0 + 2.0 + 6.6 = 27.8
		assert.equal(res.firstHalfSummary.totalHoursWorked, 27.8);

		assert.equal(res.firstHalfSummary.sickLeaveDays, 1);
		assert.equal(res.firstHalfSummary.vacationDays, 1);
		assert.equal(res.firstHalfSummary.unpaidLeaveDays, 1);

		// Total month summary
		assert.equal(res.monthTotalSummary.daysWorked, 4);
		assert.equal(res.monthTotalSummary.totalHoursWorked, 27.8);
	});

	it("2.2 Computes correct days in month for February in leap vs non-leap years", () => {
		assert.equal(getDaysInMonth(2024, 2), 29); // 2024 leap year
		assert.equal(getDaysInMonth(2025, 2), 28); // 2025 non-leap
		assert.equal(getDaysInMonth(2026, 8), 31); // August 31
		assert.equal(getDaysInMonth(2026, 9), 30); // September 30
	});

	it("2.3 Generates official Form T-13 A4 Landscape printable HTML with statutory headers", () => {
		const emp1 = calculateEmployeeTimesheetT13({
			employeeId: "emp-1",
			employeeTabNumber: "ТБ-001",
			employeeFullName: "Д-р Смирнов А. В.",
			positionRu: "Врач-стоматолог-терапевт",
			departmentRu: "Терапевтическое отделение",
			year: 2026,
			month: 8,
			days: [
				{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.6 },
				{ dayNumber: 2, primaryCode: "Я", primaryHours: 6.6 },
				{ dayNumber: 3, primaryCode: "В", primaryHours: 0 },
			],
		});

		const html = renderFormT13Html({
			organizationLegalName: "ООО «Денте Стоматология»",
			organizationOkpo: "12345678",
			departmentName: "Лечебное отделение",
			documentNumber: "Т13-2026-08",
			compilationDate: "31.08.2026",
			reportingPeriodStart: "01.08.2026",
			reportingPeriodEnd: "31.08.2026",
			year: 2026,
			month: 8,
			employees: [emp1],
			responsiblePersonPosition: "Заведующий отделением",
			responsiblePersonFullName: "Барабаш С. В.",
			hrOfficerFullName: "Петрова Е. А.",
		});

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("Унифицированная форма № Т-13"));
		assert.ok(html.includes("0301008")); // OKUD code
		assert.ok(html.includes("ТАБЕЛЬ УЧЕТА РАБОЧЕГО ВРЕМЕНИ"));
		assert.ok(html.includes("ООО «Денте Стоматология»"));
		assert.ok(html.includes("Т13-2026-08"));
		assert.ok(html.includes("Д-р Смирнов А. В."));
		assert.ok(html.includes("Барабаш С. В."));
		assert.ok(html.includes("size: A4 landscape"));
		assert.ok(html.includes("✔ ДОКУМЕНТ ПОДПИСАН УСИЛЕННОЙ КВАЛИФИЦИРОВАННОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ"));
	});

	it("2.4 Generates Form T-13 CSV with UTF-8 BOM", () => {
		const emp1 = calculateEmployeeTimesheetT13({
			employeeId: "emp-1",
			employeeTabNumber: "ТБ-001",
			employeeFullName: "Смирнов А. В.",
			positionRu: "Врач-стоматолог",
			departmentRu: "Терапия",
			year: 2026,
			month: 8,
			days: [{ dayNumber: 1, primaryCode: "Я", primaryHours: 6.6 }],
		});

		const csv = generateTimesheetT13Csv([emp1], "ООО «Денте»", 2026, 8);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Унифицированная форма № Т-13"));
		assert.ok(csv.includes("Смирнов А. В."));
		assert.ok(csv.includes("ТБ-001"));
	});

	it("2.5 Zod schemas validation for Form T-13", () => {
		const validRecord = timesheetDayRecordSchema.parse({
			dayNumber: 15,
			primaryCode: "Я",
			primaryHours: 6.6,
			secondaryCode: "С",
			secondaryHours: 2.0,
		});
		assert.equal(validRecord.dayNumber, 15);
		assert.equal(validRecord.primaryCode, "Я");

		const validDoc = advancedDoctorPayrollInputSchema.parse({
			doctorId: "d1",
			tabNumber: "001",
			doctorName: "Д-р Тест",
			specialtyId: "therapy",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
			services: [],
		});
		assert.equal(validDoc.doctorId, "d1");
	});
});
