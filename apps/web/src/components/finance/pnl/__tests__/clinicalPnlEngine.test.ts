/**
 * clinicalPnlEngine.test.ts — Comprehensive Unit Tests for Clinical P&L Engine
 * Tests kopeck-exact math, net profit per appointment, department margins,
 * doctor and chair profitability rankings, RFC 4180 CSV with UTF-8 BOM, and A4 print generator.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateAppointmentPnl,
	calculateClinicalPnlReport,
	filterPnlAppointments,
	formatKopecksToRubles,
	generateClinicalPnlCsv,
	generateClinicalPnlAppointmentsCsv,
	renderClinicalPnlPrintA4Html,
	DEPARTMENT_TITLES_RU,
	SAMPLE_CLINICAL_PNL_APPOINTMENTS,
	type ClinicalAppointmentPnlItem,
} from "../clinicalPnlEngine";

describe("Clinical P&L & Margin Engine (Kopeck-Exact Math / BOM / ZTL / ФОТ)", () => {
	it("1.1 Single appointment P&L calculation (Revenue - BOM - ZTL - DoctorPay = NetProfit)", () => {
		const item: ClinicalAppointmentPnlItem = {
			id: "app-test-1",
			dateIso: "2026-08-15",
			patientName: "Барабаш Сергей Владимирович",
			medicalCardNumber: "043/у-2026/102",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев И.О.",
			chairId: "chair-1",
			chairName: "Кабинет 1",
			department: "surgery",
			serviceName: "Установка имплантата Straumann BLX",
			order804nCode: "A16.07.054.001",
			toothCode: "36",
			durationMinutes: 60,
			revenueKop: 6500000, // 65,000.00 ₽
			materialCostKop: 1950000, // 19,500.00 ₽ (BOM)
			labCostKop: 0, // 0.00 ₽ (No ZTL for stage 1)
			doctorPayKop: 1300000, // 13,000.00 ₽ (20% piece-rate)
		};

		const result = calculateAppointmentPnl(item);

		// Direct costs: 1950000 + 0 + 1300000 = 3250000 kop (32,500.00 ₽)
		// Net profit: 6500000 - 3250000 = 3250000 kop (32,500.00 ₽)
		// Margin: (3250000 / 6500000) * 100 = 50.00%
		// Profit per minute: 3250000 / 60 = 54167 kop/min (~541.67 ₽/min)
		assert.equal(result.totalDirectCostsKop, 3250000);
		assert.equal(result.netProfitKop, 3250000);
		assert.equal(result.marginPercent, 50);
		assert.equal(result.profitPerMinuteKop, 54167);
		assert.equal(result.isProfitable, true);
	});

	it("1.2 Orthopedic appointment P&L with CAD/CAM ZTL and BOM deductions", () => {
		const item: ClinicalAppointmentPnlItem = {
			id: "app-test-2",
			dateIso: "2026-08-16",
			patientName: "Смирнова Е.В.",
			medicalCardNumber: "043/у-2026/891",
			doctorId: "doc-2",
			doctorName: "Д-р Васильев М.С.",
			chairId: "chair-2",
			chairName: "Кабинет 2",
			department: "orthopedics",
			serviceName: "Циркониевая коронка CAD/CAM",
			order804nCode: "A16.07.004.002",
			toothCode: "24",
			durationMinutes: 90,
			revenueKop: 3200000, // 32,000.00 ₽
			materialCostKop: 240000, // 2,400.00 ₽ (BOM)
			labCostKop: 850000, // 8,500.00 ₽ (ZTL)
			doctorPayKop: 640000, // 6,400.00 ₽ (Doctor wage)
		};

		const result = calculateAppointmentPnl(item);

		// Direct costs: 240000 + 850000 + 640000 = 1730000 kop (17,300.00 ₽)
		// Net profit: 3200000 - 1730000 = 1470000 kop (14,700.00 ₽)
		// Margin: (1470000 / 3200000) * 100 = 45.94%
		// Profit per minute: 1470000 / 90 = 16333 kop/min (~163.33 ₽/min)
		assert.equal(result.totalDirectCostsKop, 1730000);
		assert.equal(result.netProfitKop, 1470000);
		assert.equal(result.marginPercent, 45.94);
		assert.equal(result.profitPerMinuteKop, 16333);
		assert.equal(result.isProfitable, true);
	});

	it("1.3 Negative profit and zero revenue edge cases", () => {
		// Scenario: Warranty rework (0 revenue, incurred BOM and lab costs)
		const warrantyItem: ClinicalAppointmentPnlItem = {
			id: "app-warranty",
			dateIso: "2026-08-17",
			patientName: "Петров П.П.",
			medicalCardNumber: "043/у-2026/050",
			doctorId: "doc-2",
			doctorName: "Д-р Васильев М.С.",
			chairId: "chair-2",
			chairName: "Кабинет 2",
			department: "orthopedics",
			serviceName: "Гарантийная переделка коронки",
			durationMinutes: 45,
			revenueKop: 0,
			materialCostKop: 150000, // 1,500.00 ₽
			labCostKop: 500000, // 5,000.00 ₽
			doctorPayKop: 0,
		};

		const result = calculateAppointmentPnl(warrantyItem);
		assert.equal(result.totalDirectCostsKop, 650000);
		assert.equal(result.netProfitKop, -650000);
		assert.equal(result.marginPercent, -100);
		assert.equal(result.isProfitable, false);
	});

	it("2.1 Filtering appointments by department, doctor, chair, dates, and search text", () => {
		const items = SAMPLE_CLINICAL_PNL_APPOINTMENTS;

		// Filter by Department "surgery"
		const surgeryOnly = filterPnlAppointments(items, { department: "surgery" });
		assert.equal(surgeryOnly.length, 2);
		assert.ok(surgeryOnly.every((a) => a.department === "surgery"));

		// Filter by Doctor "doc-smirnov"
		const smirnovOnly = filterPnlAppointments(items, { doctorId: "doc-smirnov" });
		assert.equal(smirnovOnly.length, 2);
		assert.ok(smirnovOnly.every((a) => a.doctorId === "doc-smirnov"));

		// Filter by Chair "chair-2"
		const chair2Only = filterPnlAppointments(items, { chairId: "chair-2" });
		assert.equal(chair2Only.length, 2);
		assert.ok(chair2Only.every((a) => a.chairId === "chair-2"));

		// Filter by Date Range (2026-08-04 to 2026-08-07)
		const dateFiltered = filterPnlAppointments(items, {
			startDateIso: "2026-08-04",
			endDateIso: "2026-08-07",
		});
		assert.equal(dateFiltered.length, 4);

		// Filter by Search Query "Damon"
		const damonSearch = filterPnlAppointments(items, { searchQuery: "Damon" });
		assert.equal(damonSearch.length, 1);
		assert.equal(damonSearch[0]?.id, "pnl-app-004");

		// Filter by Tooth "48"
		const tooth48Search = filterPnlAppointments(items, { searchQuery: "48" });
		assert.ok(tooth48Search.length >= 1);
	});

	it("3.1 Complete Clinical P&L Report aggregation across all sample appointments", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
			clinicName: "Стоматологический Центр Денте",
			periodStartIso: "2026-08-01",
			periodEndIso: "2026-08-31",
		});

		assert.equal(report.totalAppointments, 8);
		assert.equal(report.clinicName, "Стоматологический Центр Денте");

		// Verify total sums match individual items sum
		let expectedRevenue = 0;
		let expectedBOM = 0;
		let expectedZTL = 0;
		let expectedPay = 0;

		for (const a of SAMPLE_CLINICAL_PNL_APPOINTMENTS) {
			expectedRevenue += a.revenueKop;
			expectedBOM += a.materialCostKop;
			expectedZTL += a.labCostKop;
			expectedPay += a.doctorPayKop;
		}

		const expectedDirectCosts = expectedBOM + expectedZTL + expectedPay;
		const expectedNetProfit = expectedRevenue - expectedDirectCosts;

		assert.equal(report.totalRevenueKop, expectedRevenue);
		assert.equal(report.totalMaterialCostKop, expectedBOM);
		assert.equal(report.totalLabCostKop, expectedZTL);
		assert.equal(report.totalDoctorPayKop, expectedPay);
		assert.equal(report.totalDirectCostsKop, expectedDirectCosts);
		assert.equal(report.totalNetProfitKop, expectedNetProfit);

		// Overall margin
		const expectedMargin = Math.round((expectedNetProfit / expectedRevenue) * 10000) / 100;
		assert.equal(report.overallMarginPercent, expectedMargin);

		// Cost structure percentages
		assert.equal(
			report.costStructure.materialSharePercent,
			Math.round((expectedBOM / expectedRevenue) * 10000) / 100
		);
		assert.equal(
			report.costStructure.labSharePercent,
			Math.round((expectedZTL / expectedRevenue) * 10000) / 100
		);
		assert.equal(
			report.costStructure.doctorPaySharePercent,
			Math.round((expectedPay / expectedRevenue) * 10000) / 100
		);
		assert.equal(
			report.costStructure.netProfitSharePercent,
			Math.round((expectedNetProfit / expectedRevenue) * 10000) / 100
		);
	});

	it("3.2 Department P&L breakdown and validation", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
		});

		// Check that all 6 standard departments are present
		assert.equal(report.departments.length, 6);

		const surgeryDep = report.departments.find((d) => d.department === "surgery")!;
		assert.ok(surgeryDep);
		assert.equal(surgeryDep.appointmentCount, 2);
		assert.equal(surgeryDep.departmentTitleRu, DEPARTMENT_TITLES_RU.surgery);

		const orthoDep = report.departments.find((d) => d.department === "orthopedics")!;
		assert.ok(orthoDep);
		assert.equal(orthoDep.appointmentCount, 2);
		assert.ok(orthoDep.totalLabCostKop > 0); // Orthopedics has ZTL lab costs
	});

	it("3.3 Doctor Profitability Ranking validation", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
		});

		// 5 unique doctors in sample
		assert.equal(report.doctorRankings.length, 5);

		// Ranked strictly by net profit descending
		for (let i = 0; i < report.doctorRankings.length - 1; i++) {
			const current = report.doctorRankings[i]!;
			const next = report.doctorRankings[i + 1]!;
			assert.ok(
				current.totalNetProfitKop >= next.totalNetProfitKop,
				`Doctor rank order failed at index ${i}`
			);
			assert.equal(current.rank, i + 1);
		}

		// Rank 1 doctor check
		const rank1Doc = report.doctorRankings[0]!;
		assert.equal(rank1Doc.rank, 1);
		assert.ok(rank1Doc.hourlyNetProfitKop > 0);
	});

	it("3.4 Chair Profitability Ranking validation", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
		});

		// 4 unique chairs in sample
		assert.equal(report.chairRankings.length, 4);

		// Ranked strictly by net profit descending
		for (let i = 0; i < report.chairRankings.length - 1; i++) {
			const current = report.chairRankings[i]!;
			const next = report.chairRankings[i + 1]!;
			assert.ok(
				current.totalNetProfitKop >= next.totalNetProfitKop,
				`Chair rank order failed at index ${i}`
			);
			assert.equal(current.rank, i + 1);
		}
	});

	it("4.1 formatKopecksToRubles formatting rules", () => {
		assert.equal(formatKopecksToRubles(100000), "1 000 ₽");
		assert.equal(formatKopecksToRubles(6500000), "65 000 ₽");
		assert.equal(formatKopecksToRubles(-50000), "−500 ₽");
		assert.equal(formatKopecksToRubles(123456, { showKopecks: true }), "1 234,56 ₽");
		assert.equal(formatKopecksToRubles(-123456, { showKopecks: true }), "−1 234,56 ₽");
	});

	it("5.1 generateClinicalPnlCsv contains RFC 4180 formatting and UTF-8 BOM", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
			clinicName: 'ООО "Денте; Премиум"',
		});

		const csv = generateClinicalPnlCsv(report);

		// Must start with UTF-8 BOM
		assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");

		// Header markers
		assert.ok(csv.includes("ОТЧЕТ КЛИНИЧЕСКОЙ МАРЖИНАЛЬНОСТИ"));
		assert.ok(csv.includes("МАРЖИНАЛЬНОСТЬ ПО НАПРАВЛЕНИЯМ"));
		assert.ok(csv.includes("РЕЙТИНГ РЕНТАБЕЛЬНОСТИ ВРАЧЕЙ"));
		assert.ok(csv.includes("РЕЙТИНГ РЕНТАБЕЛЬНОСТИ КРЕСЕЛ И УСТАНОВОК"));

		// RFC 4180 double-quoting for clinic name with quotes and semicolons
		assert.ok(csv.includes('""Денте; Премиум""'));
	});

	it("5.2 generateClinicalPnlAppointmentsCsv generates exact appointment register", () => {
		const calculated = SAMPLE_CLINICAL_PNL_APPOINTMENTS.map(calculateAppointmentPnl);
		const csv = generateClinicalPnlAppointmentsCsv(calculated);

		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes('"ID";"Дата";"Пациент";"Медкарта";"Врач";"Кресло";"Направление";"Услуга"'));
		assert.ok(csv.includes("pnl-app-001"));
		assert.ok(csv.includes("Барабаш Сергей Владимирович"));
		assert.ok(csv.includes("65000.00")); // 65,000 rubles
		assert.ok(csv.includes("32500.00")); // 32,500 rubles profit
	});

	it("6.1 renderClinicalPnlPrintA4Html generates valid A4 print form", () => {
		const report = calculateClinicalPnlReport({
			appointments: SAMPLE_CLINICAL_PNL_APPOINTMENTS,
			clinicName: "ООО «Денте Стоматология»",
		});

		const html = renderClinicalPnlPrintA4Html(report);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("<html lang=\"ru\">"));
		assert.ok(html.includes("@page {"));
		assert.ok(html.includes("size: A4 portrait;"));
		assert.ok(html.includes("КЛИНИЧЕСКИЙ P&L И МАРЖИНАЛЬНОСТЬ ПРИЕМОВ"));
		assert.ok(html.includes("ООО «Денте Стоматология»"));
		assert.ok(html.includes("Главный врач"));
		assert.ok(html.includes("Главный бухгалтер"));
	});
});
