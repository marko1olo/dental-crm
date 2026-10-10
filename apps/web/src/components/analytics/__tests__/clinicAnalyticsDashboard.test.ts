/**
 * apps/web/src/components/analytics/__tests__/clinicAnalyticsDashboard.test.ts
 *
 * ТЕСТОВЫЙ НАБОР ДЕКОМПОЗИЦИИ ДАШБОРДА АНАЛИТИКИ КЛИНИКИ (WAVE 24).
 *
 * Проверяемые инварианты:
 * 1. 100% сохранение публичных экспортов через фасад ClinicAnalyticsDashboard.tsx и clinicDashboard/index.tsx.
 * 2. Интеграция движков (финансы, загрузка кресел, продуктивность врачей).
 * 3. Сохранение всех 11 тестовых якорей (data-testid, aria-label, role).
 * 4. Zero-Mock точность вычислений: копейки, P&L, доходимость, полезная загрузка.
 */

import "../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import type {
	ClinicAnalyticsDashboardProps,
	AnalyticsPeriodChoice,
	AnalyticsTabChoice,
} from "../ClinicAnalyticsDashboard.js";

const {
	ClinicAnalyticsDashboard,
	useClinicAnalyticsData,
	AnalyticsKpiCardsGrid,
	AnalyticsChairUtilizationSection,
	AnalyticsDoctorProductivityTable,
	AnalyticsRevenueChartSection,
} = await import("../ClinicAnalyticsDashboard.js");


import {
	calculateFinancialAnalytics,
	formatMoneyKopecks,
	type RawPaymentItem,
	type RawInvoiceItem,
	type RawVisitFinancialItem,
} from "../financialAnalyticsEngine.js";

import {
	calculateClinicChairUtilization,
	DEFAULT_CLINIC_CHAIRS,
	type RawAppointmentItem,
} from "../chairUtilizationEngine.js";

import {
	calculateDoctorProductivity,
	type RawDoctorVisitItem,
} from "../doctorProductivityEngine.js";

// ============================================================================
// 1. PUBLIC EXPORT & FACADE PARITY TESTS
// ============================================================================

test("ClinicAnalyticsDashboard: exports are correctly defined on facade and module", () => {
	assert.ok(typeof ClinicAnalyticsDashboard === "function", "ClinicAnalyticsDashboard should be a function/component");
	assert.ok(typeof useClinicAnalyticsData === "function", "useClinicAnalyticsData hook should be exported");
	assert.ok(typeof AnalyticsKpiCardsGrid === "function", "AnalyticsKpiCardsGrid should be exported");
	assert.ok(typeof AnalyticsChairUtilizationSection === "function", "AnalyticsChairUtilizationSection should be exported");
	assert.ok(typeof AnalyticsDoctorProductivityTable === "function", "AnalyticsDoctorProductivityTable should be exported");
	assert.ok(typeof AnalyticsRevenueChartSection === "function", "AnalyticsRevenueChartSection should be exported");
});

test("ClinicAnalyticsDashboard: facade file is thin (<= 150 lines) and exports index.js", () => {
	const facadePath = path.resolve(process.cwd(), "apps/web/src/components/analytics/ClinicAnalyticsDashboard.tsx");
	const content = fs.readFileSync(facadePath, "utf8");
	const lineCount = content.split("\n").length;
	assert.ok(lineCount <= 150, `Facade should be <= 150 lines, got ${lineCount}`);
	assert.ok(content.includes('export * from "./clinicDashboard/index.js";'), "Facade must re-export ./clinicDashboard/index.js");
});

// ============================================================================
// 2. TEST ANCHORS PRESERVATION AUDIT (11/11 ANCHORS)
// ============================================================================

test("ClinicAnalyticsDashboard: all 11 mandatory test anchors and aria-labels exist in decomposed dir", () => {
	const decomposedDir = path.resolve(process.cwd(), "apps/web/src/components/analytics/clinicDashboard");
	const files = fs.readdirSync(decomposedDir).filter((f) => /\.(tsx|ts)$/.test(f));
	const combinedCode = files
		.map((f) => fs.readFileSync(path.join(decomposedDir, f), "utf8"))
		.join("\n");

	const requiredAnchors = [
		'aria-label="Дашборд аналитики клиники"',
		'aria-label="Разделы аналитики"',
		'aria-label="Период аналитики"',
		'data-testid="cad-export-excel-btn"',
		'aria-label="Обновить данные аналитики"',
		'data-testid="cad-refresh-btn"',
		'aria-label="Ключевые показатели клиники"',
		'aria-label="Загрузка стоматологических кресел"',
		'aria-label="Продуктивность врачей клиники"',
		'aria-label="Методы оплат"',
		'aria-label="Управленческий отчет PnL"',
	];

	for (const anchor of requiredAnchors) {
		assert.ok(
			combinedCode.includes(anchor),
			`Missing anchor: ${anchor} in decomposed files!`,
		);
	}
});

// ============================================================================
// 3. ZERO-MOCK FINANCIAL & OPERATIONAL CALCULATION INTEGRATION
// ============================================================================

test("ClinicAnalyticsDashboard: financial summary integrates properly with kopecks and P&L", () => {
	const payments: RawPaymentItem[] = [
		{ id: "pay-1", amountKopecks: 1200000, status: "paid", paymentMethod: "card", isPrimaryPatient: true, patientId: "p1" },
		{ id: "pay-2", amountKopecks: 800000, status: "paid", paymentMethod: "sbp", isPrimaryPatient: false, patientId: "p2" },
		{ id: "pay-3", amountKopecks: 200000, status: "refunded", paymentMethod: "card", isPrimaryPatient: false, patientId: "p2" },
	];

	const invoices: RawInvoiceItem[] = [
		{ id: "inv-1", totalAmountKopecks: 2000000, paidAmountKopecks: 1200000, status: "partially_paid", patientId: "p1" },
	];

	const visits: RawVisitFinancialItem[] = [
		{ id: "v-1", status: "completed", patientId: "p1", billedAmountKopecks: 1200000 },
		{ id: "v-2", status: "completed", patientId: "p2", billedAmountKopecks: 800000 },
	];

	const finSummary = calculateFinancialAnalytics({
		payments,
		invoices,
		visits,
		periodLabel: "За текущий месяц",
	});

	// Gross = 20 000 ₽ (2 000 000 коп), Refunds = 2 000 ₽ (200 000 коп), Net = 18 000 ₽ (1 800 000 коп)
	assert.equal(finSummary.totalRevenueKopecks, 2000000);
	assert.equal(finSummary.totalRefundsKopecks, 200000);
	assert.equal(finSummary.netRevenueKopecks, 1800000);
	assert.equal(finSummary.averageCheckKopecks, 900000); // 1 800 000 / 2 визита
	assert.equal(finSummary.accountsReceivable.totalDebtKopecks, 800000); // 20 000 - 12 000 = 8 000 ₽
	assert.equal(finSummary.patientSegmentation.primarySharePercent, 60); // 12 000 из 20 000 = 60%
});

test("ClinicAnalyticsDashboard: chair utilization integrates with SanPiN 15-min buffers", () => {
	const appointments: RawAppointmentItem[] = [
		{
			id: "a-1",
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			startsAt: "2026-10-10T09:00:00Z",
			endsAt: "2026-10-10T10:00:00Z", // 60 мин
			status: "completed",
			revenueKopecks: 500000,
		},
		{
			id: "a-2",
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			startsAt: "2026-10-10T10:30:00Z",
			endsAt: "2026-10-10T11:30:00Z", // 60 мин
			status: "completed",
			revenueKopecks: 700000,
		},
	];

	const chairSummary = calculateClinicChairUtilization({
		appointments,
		chairsConfig: DEFAULT_CLINIC_CHAIRS,
		daysCount: 1,
		periodLabel: "За сегодня",
	});

	assert.equal(chairSummary.totalChairsCount, 3);
	assert.equal(chairSummary.isEmpty, false);
	const chair1 = chairSummary.chairs.find((c) => c.chairId === "chair-1");
	assert.ok(chair1, "chair-1 must exist");
	assert.equal(chair1.completedCount, 2);
	assert.equal(chair1.occupiedMinutes, 120); // 2 * 60 мин
	assert.equal(chair1.sanitationMinutes, 30); // 2 * 15 мин
	assert.equal(chair1.effectiveOccupiedMinutes, 150); // 120 + 30
	assert.equal(chair1.totalRevenueKopecks, 1200000);
});

test("ClinicAnalyticsDashboard: doctor productivity ranks by billed revenue", () => {
	const visits: RawDoctorVisitItem[] = [
		{
			id: "v-1",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов А.А.",
			specialty: "Терапевт",
			status: "completed",
			patientId: "p-1",
			isPrimaryPatient: true,
			billedKopecks: 1500000,
			paidKopecks: 1500000,
		},
		{
			id: "v-2",
			doctorId: "doc-2",
			doctorName: "Д-р Смирнова Е.А.",
			specialty: "Ортопед",
			status: "completed",
			patientId: "p-2",
			isPrimaryPatient: false,
			billedKopecks: 3000000,
			paidKopecks: 3000000,
		},
	];

	const docSummary = calculateDoctorProductivity({
		visits,
		periodLabel: "За сегодня",
	});

	const [doc0, doc1] = docSummary.doctors;
	assert.ok(doc0, "Doctor 0 must exist");
	assert.ok(doc1, "Doctor 1 must exist");

	// Dr. Smirnova has 3M -> Rank 1
	assert.equal(doc0.doctorName, "Д-р Смирнова Е.А.");
	assert.equal(doc0.rank, 1);
	assert.equal(doc0.totalBilledKopecks, 3000000);
	// Dr. Ivanov has 1.5M -> Rank 2
	assert.equal(doc1.doctorName, "Д-р Иванов А.А.");
	assert.equal(doc1.rank, 2);
	assert.equal(doc1.totalBilledKopecks, 1500000);
});
