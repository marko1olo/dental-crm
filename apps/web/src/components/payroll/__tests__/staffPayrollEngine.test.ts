/**
 * ═══════════════════════════════════════════════════════════════════════════
 * staffPayrollEngine.test.ts — Unit Tests for Statutory Multi-Role Staff Payroll & 1C:ZUP 3.1
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateDoctorStaffPayroll,
	calculateAssistantStaffPayroll,
	calculateAdministratorStaffPayroll,
	calculateRussianNdflTax,
	calculateRussianSfrContributions,
	calculateConsolidatedStaffPayroll,
	generateStaffPayrollT51Csv,
	generate1CZup31Xml,
	generate1CZup31Csv,
	STATUTORY_MROT_2026_KOP,
	PROGRESSIVE_NDFL_THRESHOLD_KOP,
	type DoctorStaffPayrollInput,
	type AssistantStaffPayrollInput,
	type AdministratorStaffPayrollInput,
} from "../staffPayrollEngine";

describe("Staff Multi-Role Payroll & 1C:ZUP 3.1 Engine", () => {
	describe("1. Doctor Piecework & KPI Calculations", () => {
		it("1.1 Computes therapist piecework with material deduction and retail bonus", () => {
			const input: DoctorStaffPayrollInput = {
				employeeId: "doc-1",
				employeeTabNumber: "00101",
				employeeFullName: "Смирнов Алексей Петрович",
				specialtyId: "therapist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				services: [
					{
						id: "s-1",
						dateIso: "2026-08-10",
						patientName: "Иванов И.И.",
						medicalCardNumber: "043/у-101",
						serviceNameRu: "Лечение пульпита",
						category: "therapy",
						grossRevenueKop: 1000000, // 10,000 RUB
						labCostKop: 0,
						materialCostKop: 100000, // 1,000 RUB
					},
					{
						id: "s-2",
						dateIso: "2026-08-15",
						patientName: "Петров П.П.",
						medicalCardNumber: "043/у-102",
						serviceNameRu: "Продажа Curaprox",
						category: "retail_hygiene",
						grossRevenueKop: 200000, // 2,000 RUB
						labCostKop: 0,
						materialCostKop: 0,
					},
				],
			};

			const res = calculateDoctorStaffPayroll(input);
			assert.equal(res.totalGrossRevenueKop, 1200000);
			assert.equal(res.totalMaterialDeductionsKop, 100000);
			assert.equal(res.totalLabDeductionsKop, 0);
			// Total net base = 1,200,000 - 100,000 = 1,100,000 kop
			assert.equal(res.totalNetBaseKop, 1100000);
			// Base commission = 25% of 900,000 (therapy net) = 225,000 kop
			assert.equal(res.earnedBaseCommissionKop, 225000);
			// Retail commission = 10% of 200,000 = 20,000 kop
			assert.equal(res.earnedRetailCommissionKop, 20000);
			// Minimum guarantee floor applies (60,000 RUB = 6,000,000 kop)
			assert.equal(res.minimumGuaranteeApplied, true);
			assert.equal(res.grossPayoutBeforeTaxKop, 6000000);
			// NDFL 13% of 6,000,000 = 780,000 kop
			assert.equal(res.ndflTaxKop, 780000);
			// Net payout = 6,000,000 - 780,000 = 5,220,000 kop
			assert.equal(res.netPayoutKop, 5220000);
		});

		it("1.2 Computes orthopedist piecework with lab deduction, high volume KPI, and comprehensive plans bonus", () => {
			const input: DoctorStaffPayrollInput = {
				employeeId: "doc-2",
				employeeTabNumber: "00102",
				employeeFullName: "Васильев Максим Сергеевич",
				specialtyId: "orthopedist",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				comprehensivePlansCount: 5,
				comprehensivePlanBonusPerUnitKop: 500000, // 5 * 5,000 = 25,000 RUB = 2,500,000 kop
				services: [
					{
						id: "s-3",
						dateIso: "2026-08-12",
						patientName: "Сидорова С.С.",
						medicalCardNumber: "043/у-103",
						serviceNameRu: "Циркониевые коронки CAD/CAM",
						category: "orthopedics",
						grossRevenueKop: 120000000, // 1,200,000 RUB (triggers top revenue KPI 5%)
						labCostKop: 30000000, // 300,000 RUB ЗТЛ
						materialCostKop: 5000000, // ignored for orthopedist preset
					},
				],
			};

			const res = calculateDoctorStaffPayroll(input);
			assert.equal(res.totalGrossRevenueKop, 120000000);
			assert.equal(res.totalLabDeductionsKop, 30000000);
			assert.equal(res.totalMaterialDeductionsKop, 0); // Orthopedist preset deducts lab only
			// Net base = 1,200,000 - 300,000 = 900,000 RUB = 90,000,000 kop
			assert.equal(res.totalNetBaseKop, 90000000);
			// Base commission = 25% of 90,000,000 = 22,500,000 kop (225,000 RUB)
			assert.equal(res.earnedBaseCommissionKop, 22500000);
			// Revenue tier KPI = 5% of 90,000,000 = 4,500,000 kop (45,000 RUB)
			assert.equal(res.revenueKpiPercent, 5);
			assert.equal(res.revenueKpiBonusKop, 4500000);
			// Comprehensive plans bonus = 2,500,000 kop (25,000 RUB)
			assert.equal(res.comprehensivePlanBonusKop, 2500000);
			// Total gross payout = 22,500,000 + 4,500,000 + 2,500,000 = 29,500,000 kop (295,000 RUB)
			assert.equal(res.grossPayoutBeforeTaxKop, 29500000);
			assert.equal(res.minimumGuaranteeApplied, false);
			// NDFL 13% = 3,835,000 kop (38,350 RUB)
			assert.equal(res.ndflTaxKop, Math.round(29500000 * 0.13));
			assert.equal(res.netPayoutKop, 29500000 - res.ndflTaxKop);
		});
	});

	describe("2. Assistant Shift & Category Bonus Calculations", () => {
		it("2.1 Computes assistant shifts with highest category (+20%), sterilization, radiographs, and surgeries", () => {
			const input: AssistantStaffPayrollInput = {
				employeeId: "asst-1",
				employeeTabNumber: "00201",
				employeeFullName: "Иванова Екатерина Сергеевна",
				category: "highest", // +20%
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shifts: [
					{
						id: "sh-1",
						dateIso: "2026-08-03",
						shiftType: "standard_6h",
						hoursWorked: 6.0,
						isSterilizationShift: true,
						radiographsTakenCount: 4,
						surgeriesAssistedCount: 1,
					},
					{
						id: "sh-2",
						dateIso: "2026-08-05",
						shiftType: "full_12h",
						hoursWorked: 12.0,
						isSterilizationShift: false,
						radiographsTakenCount: 6,
						surgeriesAssistedCount: 2,
					},
				],
			};

			const res = calculateAssistantStaffPayroll(input);
			assert.equal(res.totalShiftsCount, 2);
			assert.equal(res.totalHoursWorked, 18.0);
			// Base shifts = 3,500 (standard_6h) + 7,000 (full_12h) = 10,500 RUB = 1,050,000 kop
			assert.equal(res.baseShiftsPayoutKop, 1050000);
			// Category bonus = 20% of 1,050,000 = 210,000 kop
			assert.equal(res.categoryBonusKop, 210000);
			// Sterilization bonus = 1 shift * 500 RUB = 50,000 kop
			assert.equal(res.sterilizationShiftsCount, 1);
			assert.equal(res.sterilizationBonusKop, 50000);
			// Radiographs = 10 * 150 RUB = 150,000 kop
			assert.equal(res.totalRadiographsCount, 10);
			assert.equal(res.radiographsPayoutKop, 150000);
			// Surgeries = 3 * 500 RUB = 150,000 kop
			assert.equal(res.totalSurgeriesCount, 3);
			assert.equal(res.surgeriesPayoutKop, 150000);
			// Total gross = 1,050,000 + 210,000 + 50,000 + 150,000 + 150,000 = 1,610,000 kop (16,100 RUB)
			assert.equal(res.grossPayoutBeforeTaxKop, 1610000);
			assert.equal(res.ndflTaxKop, Math.round(1610000 * 0.13));
			assert.equal(res.netPayoutKop, 1610000 - res.ndflTaxKop);
		});
	});

	describe("3. Administrator Salary, Cash % & Lead Conversion", () => {
		it("3.1 Computes administrator salary with cash revenue % and lead conversion bonus", () => {
			const input: AdministratorStaffPayrollInput = {
				employeeId: "adm-1",
				employeeTabNumber: "00301",
				employeeFullName: "Соколова Елена Викторовна",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shiftsWorked: 15,
				clinicCashRevenueKop: 100000000, // 1,000,000 RUB
				primaryLeadsCount: 50,
				convertedLeadsCount: 40, // 80% conversion (threshold is 70%)
			};

			const res = calculateAdministratorStaffPayroll(input);
			// Base salary = 15 shifts * 3,000 RUB = 45,000 RUB = 4,500,000 kop
			assert.equal(res.baseSalaryPayoutKop, 4500000);
			// Cash revenue 1.0% of 1,000,000 = 10,000 RUB = 1,000,000 kop
			assert.equal(res.cashRevenueCommissionKop, 1000000);
			// Conversion = 80.0% -> meets threshold -> 10,000 RUB bonus = 1,000,000 kop
			assert.equal(res.conversionRatePercent, 80.0);
			assert.equal(res.leadConversionBonusKop, 1000000);
			// Total gross = 4,500,000 + 1,000,000 + 1,000,000 = 6,500,000 kop (65,000 RUB)
			assert.equal(res.grossPayoutBeforeTaxKop, 6500000);
			assert.equal(res.ndflTaxKop, Math.round(6500000 * 0.13));
			assert.equal(res.netPayoutKop, 6500000 - res.ndflTaxKop);
		});

		it("3.2 Denies conversion bonus when conversion rate falls below threshold", () => {
			const input: AdministratorStaffPayrollInput = {
				employeeId: "adm-2",
				employeeTabNumber: "00302",
				employeeFullName: "Морозова Дарья Андреевна",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				shiftsWorked: 10,
				clinicCashRevenueKop: 50000000, // 500,000 RUB
				primaryLeadsCount: 50,
				convertedLeadsCount: 30, // 60% conversion (threshold 70%)
			};

			const res = calculateAdministratorStaffPayroll(input);
			assert.equal(res.conversionRatePercent, 60.0);
			assert.equal(res.leadConversionBonusKop, 0);
			// Total gross = 10 * 3,000 + 1% of 500,000 = 30,000 + 5,000 = 35,000 RUB = 3,500,000 kop
			assert.equal(res.grossPayoutBeforeTaxKop, 3500000);
		});
	});

	describe("4. Progressive Russian NDFL (13% / 15%)", () => {
		it("4.1 Calculates standard 13% NDFL for income below 5M RUB", () => {
			const res = calculateRussianNdflTax(100000000); // 1,000,000 RUB
			assert.equal(res.ndfl13Kop, 13000000);
			assert.equal(res.ndfl15Kop, 0);
			assert.equal(res.ndflTotalKop, 13000000);
			assert.equal(res.effectiveRatePercent, 13.0);
		});

		it("4.2 Correctly splits income spanning across 5M RUB threshold", () => {
			// Previous cumulative = 4,000,000 RUB, current payout = 2,000,000 RUB (spans 4M -> 6M)
			// 1,000,000 taxed at 13% = 130,000 RUB = 13,000,000 kop
			// 1,000,000 taxed at 15% = 150,000 RUB = 15,000,000 kop
			const res = calculateRussianNdflTax(200000000, 400000000);
			assert.equal(res.ndfl13Kop, 13000000);
			assert.equal(res.ndfl15Kop, 15000000);
			assert.equal(res.ndflTotalKop, 28000000);
			assert.equal(res.effectiveRatePercent, 14.0);
		});

		it("4.3 Calculates 15% on payouts fully exceeding 5M RUB threshold", () => {
			const res = calculateRussianNdflTax(100000000, PROGRESSIVE_NDFL_THRESHOLD_KOP + 10000);
			assert.equal(res.ndfl13Kop, 0);
			assert.equal(res.ndfl15Kop, 15000000);
			assert.equal(res.ndflTotalKop, 15000000);
			assert.equal(res.effectiveRatePercent, 15.0);
		});
	});

	describe("5. Social Fund of Russia (СФР) Contributions", () => {
		it("5.1 Calculates SME preferential tariff with MROT boundary and 0.2% injury rate", () => {
			// Gross = 100,000 RUB = 10,000,000 kop. MROT 2026 = 22,440 RUB = 2,244,000 kop
			// Base 30% on MROT = 2,244,000 * 0.30 = 673,200 kop
			// Excess 15% on (10,000,000 - 2,244,000 = 7,756,000) * 0.15 = 1,163,400 kop
			// Unified tariff = 673,200 + 1,163,400 = 1,836,600 kop
			// Injury 0.2% on 10,000,000 = 20,000 kop
			// Total SFR = 1,856,600 kop
			const res = calculateRussianSfrContributions(10000000, true);
			assert.equal(res.injuryKop, 20000);
			assert.equal(res.totalSfrKop, 1856600);
			assert.ok(res.pensionKop > 0);
			assert.ok(res.medicalKop > 0);
			assert.ok(res.socialKop > 0);
		});

		it("5.2 Calculates standard 30% tariff + 0.2% injury when SME is false", () => {
			const res = calculateRussianSfrContributions(10000000, false);
			// 30% of 10,000,000 = 3,000,000 kop + 20,000 injury = 3,020,000 kop
			assert.equal(res.injuryKop, 20000);
			assert.equal(res.totalSfrKop, 3020000);
		});
	});

	describe("6. Consolidated Staff Payroll Summary", () => {
		it("6.1 Aggregates doctors, assistants, and administrators correctly", () => {
			const summary = calculateConsolidatedStaffPayroll({
				clinicName: "ООО «Денте Тест»",
				organizationInn: "7701984512",
				organizationKpp: "770101001",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				doctors: [
					{
						employeeId: "doc-1",
						employeeTabNumber: "00101",
						employeeFullName: "Смирнов А.П.",
						specialtyId: "therapist",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						services: [
							{
								id: "s-1",
								dateIso: "2026-08-10",
								patientName: "Пациент 1",
								medicalCardNumber: "043/у-1",
								serviceNameRu: "Терапия",
								category: "therapy",
								grossRevenueKop: 10000000, // 100,000 RUB
								labCostKop: 0,
								materialCostKop: 1000000, // 10,000 RUB
							},
						],
					},
				],
				assistants: [
					{
						employeeId: "asst-1",
						employeeTabNumber: "00201",
						employeeFullName: "Иванова Е.С.",
						category: "highest",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						shifts: [
							{ id: "sh-1", dateIso: "2026-08-05", shiftType: "standard_6h", hoursWorked: 6.0 },
						],
					},
				],
				administrators: [
					{
						employeeId: "adm-1",
						employeeTabNumber: "00301",
						employeeFullName: "Соколова Е.В.",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						shiftsWorked: 10,
						clinicCashRevenueKop: 50000000,
						primaryLeadsCount: 20,
						convertedLeadsCount: 16,
					},
				],
			});

			assert.equal(summary.totalEmployeesCount, 3);
			assert.equal(summary.records.length, 3);
			assert.equal(summary.roleSummaries.doctor.employeesCount, 1);
			assert.equal(summary.roleSummaries.assistant.employeesCount, 1);
			assert.equal(summary.roleSummaries.administrator.employeesCount, 1);
			assert.equal(
				summary.totalGrossPayoutKop,
				summary.records.reduce((acc, r) => acc + r.grossPayoutBeforeTaxKop, 0)
			);
			assert.equal(
				summary.totalNetPayoutKop,
				summary.records.reduce((acc, r) => acc + r.netPayoutKop, 0)
			);
			assert.equal(
				summary.totalNdflKop,
				summary.records.reduce((acc, r) => acc + r.ndflTaxKop, 0)
			);
			assert.equal(
				summary.totalSfrContributionsKop,
				summary.records.reduce((acc, r) => acc + r.sfrContributionsKop, 0)
			);
		});
	});

	describe("7. Statutory Form T-51 CSV Export", () => {
		it("7.1 Generates compliant Form T-51 CSV with UTF-8 BOM and exact totals", () => {
			const summary = calculateConsolidatedStaffPayroll({
				clinicName: "ООО «Денте Стоматология»",
				organizationInn: "7701984512",
				organizationKpp: "770101001",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				administrators: [
					{
						employeeId: "adm-1",
						employeeTabNumber: "00301",
						employeeFullName: "Соколова Елена Викторовна",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						shiftsWorked: 15,
						clinicCashRevenueKop: 100000000,
						primaryLeadsCount: 30,
						convertedLeadsCount: 25,
					},
				],
			});

			const csv = generateStaffPayrollT51Csv(summary);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Унифицированная форма № Т-51"));
			assert.ok(csv.includes("ООО «Денте Стоматология»"));
			assert.ok(csv.includes("Соколова Елена Викторовна"));
			assert.ok(csv.includes("ИТОГО ПО КЛИНИКЕ"));
		});
	});

	describe("8. 1C:ZUP 3.1 XML and CSV Export", () => {
		it("8.1 Generates compliant 1C:ZUP 3.1 XML document with all accounting sections", () => {
			const summary = calculateConsolidatedStaffPayroll({
				clinicName: "ООО «Денте Стоматология»",
				organizationInn: "7701984512",
				organizationKpp: "770101001",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				doctors: [
					{
						employeeId: "doc-1",
						employeeTabNumber: "00101",
						employeeFullName: "Смирнов Алексей Петрович",
						specialtyId: "therapist",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						comprehensivePlansCount: 2,
						services: [
							{
								id: "s-1",
								dateIso: "2026-08-10",
								patientName: "Пациент",
								medicalCardNumber: "043/у",
								serviceNameRu: "Терапия",
								category: "therapy",
								grossRevenueKop: 50000000, // 500,000 RUB
								labCostKop: 0,
								materialCostKop: 2000000,
							},
						],
					},
				],
			});

			const xml = generate1CZup31Xml(summary, "ЗП-2026-08", "2026-08-31");
			assert.ok(xml.includes("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(xml.includes("<ЗарплатаКадрыДокумент"));
			assert.ok(xml.includes("<Документ ОтражениеЗарплатыВБухучете"));
			assert.ok(xml.includes("<ИНН>7701984512</ИНН>"));
			assert.ok(xml.includes("Сдельная оплата труда (стоматология)"));
			assert.ok(xml.includes("<Начисления>"));
			assert.ok(xml.includes("<Удержания>"));
			assert.ok(xml.includes("<СтраховыеВзносы>"));
			assert.ok(xml.includes("<Выплаты>"));
		});

		it("8.2 Generates compliant 1C:ZUP 3.1 CSV table with UTF-8 BOM", () => {
			const summary = calculateConsolidatedStaffPayroll({
				clinicName: "ООО «Денте Стоматология»",
				periodStartIso: "2026-08-01",
				periodEndIso: "2026-08-31",
				assistants: [
					{
						employeeId: "asst-1",
						employeeTabNumber: "00201",
						employeeFullName: "Иванова Екатерина Сергеевна",
						category: "highest",
						periodStartIso: "2026-08-01",
						periodEndIso: "2026-08-31",
						shifts: [{ id: "sh-1", dateIso: "2026-08-05", shiftType: "standard_6h", hoursWorked: 6.0 }],
					},
				],
			});

			const csv = generate1CZup31Csv(summary);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("ТабельныйНомер;ФИО;Должность;Подразделение;ВидОперации;Сумма;ПериодДействия;КодДоходаНДФЛ"));
			assert.ok(csv.includes("Иванова Екатерина Сергеевна"));
			assert.ok(csv.includes("Начисление"));
			assert.ok(csv.includes("НДФЛ"));
			assert.ok(csv.includes("Выплата"));
		});
	});
});
