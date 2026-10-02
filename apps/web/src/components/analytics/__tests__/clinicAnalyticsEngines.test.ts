/**
 * apps/web/src/components/analytics/__tests__/clinicAnalyticsEngines.test.ts
 *
 * ТЕСТЫ ДВИЖКОВ АНАЛИТИКИ КЛИНИКИ DENTE (ZERO-MOCK ENGINES TEST SUITE).
 *
 * Проверяемые инварианты:
 * 1. Financial Analytics Engine: целочисленная математика копеек, средний чек, дебиторка, P&L.
 * 2. Chair Utilization Engine: СанПиН 3.3686-21 санобработка (15 мин), простои, загрузка кресел.
 * 3. Doctor Productivity Engine: выработка, доходимость %, первичные/повторные, рейтинг врачей.
 * 4. Защита от нулевого деления, дефолтные Fallbacks, корректная изоляция данных.
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateAccountsReceivable,
	calculateClinicPnl,
	calculateFinancialAnalytics,
	formatMoneyKopecks,
	type RawInvoiceItem,
	type RawPaymentItem,
	type RawVisitFinancialItem,
} from "../financialAnalyticsEngine.js";
import {
	calculateClinicChairUtilization,
	DEFAULT_CLINIC_CHAIRS,
	getAppointmentDurationMinutes,
	type ChairDefinition,
	type RawAppointmentItem,
} from "../chairUtilizationEngine.js";
import {
	calculateDoctorProductivity,
	type RawDoctorVisitItem,
} from "../doctorProductivityEngine.js";

// ============================================================================
// 1. FINANCIAL ANALYTICS ENGINE TESTS
// ============================================================================

test("financialAnalyticsEngine: formatMoneyKopecks formats integer kopecks accurately", () => {
	assert.equal(formatMoneyKopecks(0), "0 ₽");
	assert.equal(formatMoneyKopecks(0, true), "0,00 ₽");
	assert.equal(formatMoneyKopecks(1250000), "12 500 ₽");
	assert.equal(formatMoneyKopecks(1250050, true), "12 500,50 ₽");
	assert.equal(formatMoneyKopecks(1250000, true), "12 500 ₽"); // zero kopecks omitted unless kop > 0
	assert.equal(formatMoneyKopecks(-500000), "-5 000 ₽");
	assert.equal(formatMoneyKopecks(Number.NaN), "0 ₽");
});

test("financialAnalyticsEngine: calculateAccountsReceivable handles empty and filtered invoices", () => {
	const emptyRes = calculateAccountsReceivable([]);
	assert.equal(emptyRes.totalDebtKopecks, 0);
	assert.equal(emptyRes.overdueDebtKopecks, 0);
	assert.equal(emptyRes.openInvoicesCount, 0);
	assert.equal(emptyRes.debtorPatientsCount, 0);
	assert.equal(emptyRes.averageDebtPerPatientKopecks, 0);

	const referenceNow = new Date("2026-10-02T12:00:00Z");

	const invoices: RawInvoiceItem[] = [
		// Draft — should be ignored
		{ id: "inv-1", totalAmountKopecks: 1000000, paidAmountKopecks: 0, status: "draft" },
		// Cancelled — should be ignored
		{ id: "inv-2", totalAmountKopecks: 2000000, paidAmountKopecks: 0, status: "cancelled" },
		// Fully paid — debt is 0
		{ id: "inv-3", totalAmountKopecks: 500000, paidAmountKopecks: 500000, status: "paid" },
		// Partially paid, not overdue (due tomorrow)
		{
			id: "inv-4",
			totalAmountKopecks: 1000000,
			paidAmountKopecks: 400000,
			status: "partially_paid",
			patientId: "pat-1",
			dueDate: new Date("2026-10-03T12:00:00Z"),
		},
		// Unpaid and overdue (due yesterday)
		{
			id: "inv-5",
			totalAmountKopecks: 800000,
			paidAmountKopecks: 0,
			status: "issued",
			patientId: "pat-2",
			dueDate: new Date("2026-10-01T12:00:00Z"),
		},
		// Second unpaid invoice for same patient (pat-1)
		{
			id: "inv-6",
			totalAmountKopecks: 400000,
			paidAmountKopecks: 0,
			status: "issued",
			patientId: "pat-1",
			dueDate: new Date("2026-10-05T12:00:00Z"),
		},
	];

	const res = calculateAccountsReceivable(invoices, referenceNow);
	// Total debt = (1000000 - 400000) + 800000 + 400000 = 600000 + 800000 + 400000 = 1 800 000 коп (18 000 ₽)
	assert.equal(res.totalDebtKopecks, 1800000);
	// Overdue debt: inv-5 only = 800 000 коп
	assert.equal(res.overdueDebtKopecks, 800000);
	// Open invoices count: 3
	assert.equal(res.openInvoicesCount, 3);
	// Debtor patients count: 2 (pat-1, pat-2)
	assert.equal(res.debtorPatientsCount, 2);
	// Average debt per patient: 1 800 000 / 2 = 900 000 коп
	assert.equal(res.averageDebtPerPatientKopecks, 900000);
});

test("financialAnalyticsEngine: calculateClinicPnl adheres to clinical dental ratios", () => {
	const revenue = 100000000; // 1 000 000 ₽ (100 млн копеек)
	const marketing = 5000000;  // 50 000 ₽

	const pnl = calculateClinicPnl(revenue, marketing);

	assert.equal(pnl.grossRevenueKopecks, 100000000);
	// COGS = 18% = 18 000 000
	assert.equal(pnl.cogsKopecks, 18000000);
	// Gross Profit = 82% = 82 000 000
	assert.equal(pnl.grossProfitKopecks, 82000000);
	// Marketing = 5 000 000
	assert.equal(pnl.marketingSpendKopecks, 5000000);
	// Payroll = 40% = 40 000 000
	assert.equal(pnl.payrollKopecks, 40000000);
	// Overhead = 15% = 15 000 000
	assert.equal(pnl.overheadKopecks, 15000000);
	// Total OPEX = 5M + 40M + 15M = 60 000 000
	assert.equal(pnl.totalOpexKopecks, 60000000);
	// EBITDA = 82M - 60M = 22 000 000
	assert.equal(pnl.ebitdaKopecks, 22000000);
	// Estimated Tax (USN 6%) = 6 000 000
	assert.equal(pnl.estimatedTaxKopecks, 6000000);
	// Net Profit = 22M - 6M = 16 000 000
	assert.equal(pnl.netProfitKopecks, 16000000);
	// Net Margin = 16.0%
	assert.equal(pnl.netMarginPercent, 16);
});

test("financialAnalyticsEngine: calculateFinancialAnalytics with full zero-mock aggregation", () => {
	// Empty case
	const empty = calculateFinancialAnalytics({ payments: [], invoices: [], visits: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.totalRevenueKopecks, 0);
	assert.equal(empty.averageCheckKopecks, 0);

	// Realistic dataset
	const payments: RawPaymentItem[] = [
		{ id: "p-1", amountKopecks: 500000, status: "paid", paymentMethod: "card", isPrimaryPatient: true, patientId: "p1" },
		{ id: "p-2", amountKopecks: 1000000, status: "paid", paymentMethod: "cash", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-3", amountKopecks: 300000, status: "paid", paymentMethod: "sbp", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-4", amountKopecks: 200000, status: "refunded", paymentMethod: "card", isPrimaryPatient: false, patientId: "p2" },
		{ id: "p-5", amountKopecks: 400000, status: "cancelled", paymentMethod: "cash" }, // Ignored
		{ id: "p-6", amountKopecks: 500000, status: "pending", paymentMethod: "sbp" },   // Ignored
	];

	const visits: RawVisitFinancialItem[] = [
		{ id: "v-1", status: "completed", patientId: "p1", isPrimaryPatient: true },
		{ id: "v-2", status: "completed", patientId: "p2", isPrimaryPatient: false },
		{ id: "v-3", status: "cancelled", patientId: "p3" }, // Ignored for average check
		{ id: "v-4", status: "no_show", patientId: "p4" },   // Ignored for average check
	];

	const invoices: RawInvoiceItem[] = [
		{ id: "inv-1", totalAmountKopecks: 600000, paidAmountKopecks: 200000, status: "partially_paid", patientId: "p1" },
	];

	const result = calculateFinancialAnalytics({
		payments,
		invoices,
		visits,
		periodLabel: "Октябрь 2026",
	});

	assert.equal(result.isEmpty, false);
	assert.equal(result.periodLabel, "Октябрь 2026");
	// Gross Revenue: p-1 (500k) + p-2 (1M) + p-3 (300k) = 1 800 000
	assert.equal(result.totalRevenueKopecks, 1800000);
	// Refunds: p-4 = 200 000
	assert.equal(result.totalRefundsKopecks, 200000);
	// Net Revenue = 1 800 000 - 200 000 = 1 600 000
	assert.equal(result.netRevenueKopecks, 1600000);
	// Completed visits = 2 (v-1, v-2)
	assert.equal(result.completedVisitsCount, 2);
	// Average check = 1 600 000 / 2 = 800 000 коп (8 000 ₽)
	assert.equal(result.averageCheckKopecks, 800000);

	// Patient Segmentation:
	// Primary: p-1 (500k), 1 patient
	// Repeat: p-2 (1M) + p-3 (300k) = 1.3M, 1 patient
	assert.equal(result.patientSegmentation.primaryRevenueKopecks, 500000);
	assert.equal(result.patientSegmentation.repeatRevenueKopecks, 1300000);
	assert.equal(result.patientSegmentation.primaryPayingPatientsCount, 1);
	assert.equal(result.patientSegmentation.repeatPayingPatientsCount, 1);
	assert.equal(result.patientSegmentation.primaryAverageCheckKopecks, 500000);
	assert.equal(result.patientSegmentation.repeatAverageCheckKopecks, 1300000);

	// Accounts receivable:
	assert.equal(result.accountsReceivable.totalDebtKopecks, 400000);
});

// ============================================================================
// 2. CHAIR UTILIZATION ENGINE TESTS
// ============================================================================

test("chairUtilizationEngine: getAppointmentDurationMinutes calculates and clamps accurately", () => {
	// Standard 60 minute appointment
	const d1 = getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T11:00:00Z");
	assert.equal(d1, 60);

	// 90 minute appointment
	const d2 = getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T11:30:00Z");
	assert.equal(d2, 90);

	// Fallback when end <= start
	const d3 = getAppointmentDurationMinutes("2026-10-02T12:00:00Z", "2026-10-02T11:00:00Z");
	assert.equal(d3, 30);

	// Fallback when invalid dates
	const d4 = getAppointmentDurationMinutes("invalid", "invalid");
	assert.equal(d4, 30);

	// Clamping: less than 5 min -> 5 min
	const d5 = getAppointmentDurationMinutes("2026-10-02T10:00:00Z", "2026-10-02T10:02:00Z");
	assert.equal(d5, 5);

	// Clamping: > 720 min -> 720 min
	const d6 = getAppointmentDurationMinutes("2026-10-02T08:00:00Z", "2026-10-02T22:00:00Z"); // 14 hours = 840 min
	assert.equal(d6, 720);
});

test("chairUtilizationEngine: calculateClinicChairUtilization enforces SanPiN 15-min buffers", () => {
	// 1. Empty case
	const empty = calculateClinicChairUtilization({ appointments: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.totalChairsCount, 3);
	assert.equal(empty.overallUtilizationPercent, 0);
	assert.equal(empty.overallPureOccupancyPercent, 0);

	// 2. Controlled single chair test
	const customChairs: readonly ChairDefinition[] = [
		{
			id: "chair-1",
			name: "Кресло 1 (Терапия)",
			cabinet: "Кабинет №1",
			workingHoursPerDay: 10, // 10 часов = 600 минут
			sanitationMinutesPerVisit: 15,
			isActive: true,
		},
	];

	// 2 completed appointments: each 90 minutes. 1 cancelled appointment.
	const appointments: RawAppointmentItem[] = [
		{
			id: "a-1",
			chairId: "chair-1",
			startsAt: "2026-10-02T09:00:00Z",
			endsAt: "2026-10-02T10:30:00Z", // 90 min
			status: "completed",
			revenueKopecks: 600000,
		},
		{
			id: "a-2",
			chairId: "chair-1",
			startsAt: "2026-10-02T11:00:00Z",
			endsAt: "2026-10-02T12:30:00Z", // 90 min
			status: "completed",
			revenueKopecks: 800000,
		},
		{
			id: "a-3",
			chairId: "chair-1",
			startsAt: "2026-10-02T14:00:00Z",
			endsAt: "2026-10-02T15:00:00Z", // 60 min
			status: "cancelled", // Cancelled doesn't consume occupied minutes or sanitation
			revenueKopecks: 0,
		},
	];

	const res = calculateClinicChairUtilization({
		appointments,
		chairsConfig: customChairs,
		daysCount: 1,
	});

	assert.equal(res.isEmpty, false);
	assert.equal(res.chairs.length, 1);

	const ch1 = res.chairs[0]!;
	assert.equal(ch1.totalAppointments, 3);
	assert.equal(ch1.completedCount, 2);
	assert.equal(ch1.cancelledCount, 1);

	// Occupied minutes: 90 + 90 = 180 min (3 часа)
	assert.equal(ch1.occupiedMinutes, 180);
	// Sanitation: 2 valid visits * 15 min = 30 min
	assert.equal(ch1.sanitationMinutes, 30);
	// Effective occupied: 180 + 30 = 210 min (3.5 часа)
	assert.equal(ch1.effectiveOccupiedMinutes, 210);
	// Available: 1 day * 10 hours * 60 min = 600 min
	assert.equal(ch1.availableMinutes, 600);
	// Idle minutes: 600 - 210 = 390 min
	assert.equal(ch1.idleMinutes, 390);

	// Pure occupancy %: (180 / 600) * 100 = 30.0%
	assert.equal(ch1.pureOccupancyPercent, 30.0);
	// Effective utilization %: (210 / 600) * 100 = 35.0%
	assert.equal(ch1.effectiveUtilizationPercent, 35.0);

	// Revenue: 600 000 + 800 000 = 1 400 000 коп
	assert.equal(ch1.totalRevenueKopecks, 1400000);
	// Revenue per occupied hour: 1 400 000 / 3 hours = 466 667 коп/час
	assert.equal(ch1.revenuePerHourKopecks, 466667);
	// Capacity yield per available hour: 1 400 000 / 10 hours = 140 000 коп/час
	assert.equal(ch1.capacityYieldPerHourKopecks, 140000);

	// Cancellation rate: 1 cancelled out of 3 = 33.3%
	assert.equal(ch1.cancellationRatePercent, 33.3);
	// Not overloaded (35% < 90%)
	assert.equal(ch1.isOverloaded, false);
});

test("chairUtilizationEngine: detects overloaded chair and surgery sanitation differential", () => {
	const customChairs: readonly ChairDefinition[] = [
		{
			id: "surg-1",
			name: "Хирургия",
			cabinet: "Операционная",
			workingHoursPerDay: 8, // 480 min
			sanitationMinutesPerVisit: 30, // 30 min per surgical visit
			isActive: true,
		},
	];

	// 4 surgical visits of 100 min each = 400 min occupied + 4 * 30 min sanitation = 120 min => 520 min -> capped at available 480
	const appointments: RawAppointmentItem[] = [
		{ id: "s1", chairId: "surg-1", startsAt: "2026-10-02T08:00:00Z", endsAt: "2026-10-02T09:40:00Z", status: "completed" },
		{ id: "s2", chairId: "surg-1", startsAt: "2026-10-02T10:00:00Z", endsAt: "2026-10-02T11:40:00Z", status: "completed" },
		{ id: "s3", chairId: "surg-1", startsAt: "2026-10-02T12:00:00Z", endsAt: "2026-10-02T13:40:00Z", status: "completed" },
		{ id: "s4", chairId: "surg-1", startsAt: "2026-10-02T14:00:00Z", endsAt: "2026-10-02T15:40:00Z", status: "completed" },
	];

	const res = calculateClinicChairUtilization({
		appointments,
		chairsConfig: customChairs,
		daysCount: 1,
	});

	const surg = res.chairs[0]!;
	assert.equal(surg.occupiedMinutes, 400);
	assert.equal(surg.sanitationMinutes, 120);
	assert.equal(surg.effectiveOccupiedMinutes, 480); // Clamped to availableMinutes (480)
	assert.equal(surg.idleMinutes, 0);
	assert.equal(surg.effectiveUtilizationPercent, 100.0);
	assert.equal(surg.isOverloaded, true); // >= 90%
});

// ============================================================================
// 3. DOCTOR PRODUCTIVITY ENGINE TESTS
// ============================================================================

test("doctorProductivityEngine: calculateDoctorProductivity ranks and computes attendance rate", () => {
	// Empty case
	const empty = calculateDoctorProductivity({ visits: [] });
	assert.equal(empty.isEmpty, true);
	assert.equal(empty.activeDoctorsCount, 0);
	assert.equal(empty.topPerformerDoctorName, null);

	// Realistic visits with 2 doctors
	const visits: RawDoctorVisitItem[] = [
		// Doctor 1: Dr. Ivanov (Therapist)
		{
			id: "dv-1",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "completed",
			patientId: "pat-1",
			isPrimaryPatient: true,
			billedKopecks: 1200000,
			paidKopecks: 1200000,
			durationMinutes: 60,
		},
		{
			id: "dv-2",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "completed",
			patientId: "pat-2",
			isPrimaryPatient: false,
			billedKopecks: 800000,
			paidKopecks: 800000,
			durationMinutes: 60,
		},
		{
			id: "dv-3",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "cancelled", // scheduled, but cancelled
			patientId: "pat-3",
		},
		{
			id: "dv-4",
			doctorId: "doc-1",
			doctorName: "Д-р Иванов И.И.",
			specialty: "Терапевт",
			status: "no_show", // scheduled, but no-show
			patientId: "pat-4",
		},

		// Doctor 2: Dr. Petrov (Orthopedist) — higher billed volume
		{
			id: "dv-5",
			doctorId: "doc-2",
			doctorName: "Д-р Петров П.П.",
			specialty: "Ортопед",
			status: "completed",
			patientId: "pat-5",
			isPrimaryPatient: true,
			billedKopecks: 4500000,
			paidKopecks: 4500000,
			durationMinutes: 120,
		},
		{
			id: "dv-6",
			doctorId: "doc-2",
			doctorName: "Д-р Петров П.П.",
			specialty: "Ортопед",
			status: "completed",
			patientId: "pat-6",
			isPrimaryPatient: false,
			billedKopecks: 2500000,
			paidKopecks: 2000000,
			durationMinutes: 90,
		},
	];

	const summary = calculateDoctorProductivity({ visits, periodLabel: "Неделя" });

	assert.equal(summary.isEmpty, false);
	assert.equal(summary.activeDoctorsCount, 2);
	// Dr. Petrov has 7 000 000 billed, Dr. Ivanov has 2 000 000 billed.
	// Petrov should be rank 1 and top performer.
	assert.equal(summary.topPerformerDoctorName, "Д-р Петров П.П.");

	const petrov = summary.doctors[0]!;
	assert.equal(petrov.doctorId, "doc-2");
	assert.equal(petrov.rank, 1);
	assert.equal(petrov.totalBilledKopecks, 7000000);
	assert.equal(petrov.totalPaidKopecks, 6500000);
	assert.equal(petrov.completedVisitsCount, 2);
	assert.equal(petrov.averageBillKopecks, 3500000); // 7 000 000 / 2 = 35 000 ₽
	assert.equal(petrov.attendanceRatePercent, 100.0); // 2 attended out of 2 scheduled
	assert.equal(petrov.uniquePatientsCount, 2);
	assert.equal(petrov.primaryPatientsCount, 1);
	assert.equal(petrov.repeatPatientsCount, 1);
	assert.equal(petrov.primarySharePercent, 50.0);

	const ivanov = summary.doctors[1]!;
	assert.equal(ivanov.doctorId, "doc-1");
	assert.equal(ivanov.rank, 2);
	assert.equal(ivanov.totalBilledKopecks, 2000000);
	assert.equal(ivanov.completedVisitsCount, 2);
	assert.equal(ivanov.totalScheduledAppointments, 4);
	assert.equal(ivanov.attendedAppointmentsCount, 2);
	assert.equal(ivanov.cancelledCount, 1);
	assert.equal(ivanov.noShowCount, 1);
	// Attendance rate: 2 attended / 4 scheduled * 100 = 50.0%
	assert.equal(ivanov.attendanceRatePercent, 50.0);

	// Overall clinic totals
	assert.equal(summary.totalClinicBilledKopecks, 9000000);
	assert.equal(summary.totalCompletedVisitsCount, 4);
	// Clinic average bill = 9 000 000 / 4 = 2 250 000 коп (22 500 ₽)
	assert.equal(summary.averageDoctorBillKopecks, 2250000);
	// Overall attendance: (2 + 2) / (4 + 2) = 4 / 6 = 66.7%
	assert.equal(summary.overallAttendanceRatePercent, 66.7);
});
