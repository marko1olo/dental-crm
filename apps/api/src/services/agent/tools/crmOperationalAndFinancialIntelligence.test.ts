/**
 * crmOperationalAndFinancialIntelligence.test.ts — Test Suite for Mandate 8ab Intelligence Tools.
 *
 * Verifies:
 * 1. Operational Daily Schedule Intelligence:
 *    - "Сколько пациентов сегодня?" (counts, status breakdown)
 *    - "Кто следующий?" (next patient relative to time, chair, reason)
 *    - "Кто записан после обеда?" (>= 14:00 filter)
 *    - "Есть ли свободные окна на 1.5 часа?" (>= 90 min dynamic gap calculation)
 * 2. Doctor Shifts & Chairs:
 *    - "Какая у меня смена в четверг?" (Thursday shift hours, chair, cabinet)
 *    - "В каком я кресле в пятницу?" (Friday chair assignment)
 *    - "Сколько часов отработано на этой неделе?" (weekly hours calculation)
 * 3. Doctor Piece-Rate & Clinic Revenue:
 *    - "Какая выручка за сегодня?" (exact integer kopecks math, zero float drift)
 *    - "Сколько начислено по сдельщине за смену?" (Net Base = Gross - Lab - Materials * %)
 *    - "Какой средний чек?"
 *    - "Сколько выставлено счетов?"
 * 4. Patient Family Deposit & Debt:
 *    - "Какой остаток на семейном депозите у пациента?" (family wallet balance)
 *    - "Есть ли долг по счету?" (unpaid invoices, exact debt in kopecks)
 * 5. Single-Chokepoint Registry Invocation via ToolRegistry.call
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { formatKopecksRu, rublesToKopecks } from "@dental/shared";
import type { AgentContext } from "../context.js";
import { ToolRegistry } from "./registry.js";
import { registerCrmUniversalTools } from "./crmUniversalTools.js";
import {
	getDailyScheduleIntelligenceTool,
	getDoctorShiftsAndChairsTool,
} from "./crmOperationalScheduleTools.js";
import {
	getClinicOrDoctorRevenueTool,
	getPatientFamilyDepositAndDebtTool,
} from "./crmFinancialIntelligenceTools.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const DOCTOR_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";

function createTestContext(): AgentContext {
	const registry = new ToolRegistry();
	registerCrmUniversalTools(registry, "crm");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: DOCTOR_ID,
		sessionId: "test-session-intelligence",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"schedule.read",
			"schedule.write",
			"finance.read",
			"patients.read",
		],
		tools: registry,
		db: null, // Isolated unit test mode
	};
}

describe("Mandate 8ab — 1. Daily Schedule Intelligence", () => {
	test("answers 'Сколько пациентов сегодня?' with status breakdown", async () => {
		const ctx = createTestContext();
		const result = await getDailyScheduleIntelligenceTool.handler(ctx, {
			dateIso: "2026-10-08",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalAppointments, 4);
		assert.strictEqual(result.countsByStatus.completed, 1);
		assert.strictEqual(result.countsByStatus.in_chair, 1);
		assert.strictEqual(result.countsByStatus.planned, 2);
		assert.strictEqual(result.countsByStatus.cancelled, 0);
		assert.ok(result.summaryRu.includes("записано пациентов: 4"));
		assert.ok(result.summaryRu.includes("завершено: 1"));
		assert.ok(result.summaryRu.includes("в кресле: 1"));
	});

	test("answers 'Кто следующий?' relative to current schedule time", async () => {
		const ctx = createTestContext();
		const result = await getDailyScheduleIntelligenceTool.handler(ctx, {
			dateIso: "2026-10-08",
			timeWindowFilter: "next",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.nextPatient !== null);
		assert.strictEqual(result.nextPatient.patientFullName, "Иванов Алексей Сергеевич");
		assert.strictEqual(result.nextPatient.cardNumber, "4821");
		assert.strictEqual(result.nextPatient.chairName, "Кресло №1 (Терапия)");
		assert.strictEqual(result.nextPatient.timeRangeFormatted, "11:00 - 12:00");
		assert.ok(result.summaryRu.includes("Следующий пациент: Иванов Алексей Сергеевич"));
		assert.ok(result.summaryRu.includes("Кресло №1"));
	});

	test("answers 'Кто записан после обеда?' (appointments >= 14:00)", async () => {
		const ctx = createTestContext();
		const result = await getDailyScheduleIntelligenceTool.handler(ctx, {
			dateIso: "2026-10-08",
			timeWindowFilter: "afternoon",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.afternoonAppointments.length, 2);
		assert.strictEqual(
			result.afternoonAppointments[0]?.patientFullName,
			"Кузнецов Дмитрий Михайлович",
		);
		assert.strictEqual(
			result.afternoonAppointments[1]?.patientFullName,
			"Морозова Елена Викторовна",
		);
		assert.ok(result.summaryRu.includes("После обеда (с 14:00) записано 2 чел."));
	});

	test("answers 'Есть ли свободные окна на 1.5 часа?' with dynamic intervals", async () => {
		const ctx = createTestContext();
		const result = await getDailyScheduleIntelligenceTool.handler(ctx, {
			dateIso: "2026-10-08",
			minGapMinutes: 90,
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.availableWindows.length > 0);
		// Gaps between 12:00 and 14:30 (150 min), and 15:30 and 17:30 (120 min), and 18:30 and 20:00 (90 min)
		for (const w of result.availableWindows) {
			assert.ok(w.durationMinutes >= 90);
		}
		assert.ok(result.summaryRu.includes("Свободные окна (90+ мин)"));
	});
});

describe("Mandate 8ab — 2. Doctor Shifts & Chair Occupancy", () => {
	test("answers 'Какая у меня смена в четверг?' with hours, chair, and cabinet", async () => {
		const ctx = createTestContext();
		const result = await getDoctorShiftsAndChairsTool.handler(ctx, {
			targetDateOrDay: "четверг",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.shiftForRequestedDay !== null);
		assert.strictEqual(result.shiftForRequestedDay.dayOfWeekRu, "Четверг");
		assert.strictEqual(result.shiftForRequestedDay.startTime, "09:00");
		assert.strictEqual(result.shiftForRequestedDay.endTime, "15:00");
		assert.strictEqual(result.shiftForRequestedDay.durationHours, 6);
		assert.strictEqual(result.shiftForRequestedDay.chairName, "Кресло №2 (Терапия)");
		assert.strictEqual(result.shiftForRequestedDay.cabinetName, "Кабинет №1");
		assert.ok(result.summaryRu.includes("В четверг"));
		assert.ok(result.summaryRu.includes("Кресло №2 (Терапия)"));
	});

	test("answers 'В каком я кресле в пятницу?' with chair assignment", async () => {
		const ctx = createTestContext();
		const result = await getDoctorShiftsAndChairsTool.handler(ctx, {
			targetDateOrDay: "пятница",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.shiftForRequestedDay !== null);
		assert.strictEqual(result.shiftForRequestedDay.dayOfWeekRu, "Пятница");
		assert.strictEqual(result.shiftForRequestedDay.startTime, "15:00");
		assert.strictEqual(result.shiftForRequestedDay.endTime, "21:00");
		assert.strictEqual(result.shiftForRequestedDay.chairName, "Кресло №1 (Хирургия)");
		assert.ok(result.summaryRu.includes("Кресло №1 (Хирургия)"));
	});

	test("answers 'Сколько часов отработано на этой неделе?'", async () => {
		const ctx = createTestContext();
		const result = await getDoctorShiftsAndChairsTool.handler(ctx, {
			targetDateOrDay: "this_week",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.totalHoursWorkedThisWeek > 0);
		assert.ok(result.totalWeeklyScheduledHours >= 30);
		assert.ok(result.weeklyShifts.length >= 5);
		assert.ok(result.summaryRu.includes("На этой неделе отработано"));
	});
});

describe("Mandate 8ab — 3. Doctor Finances & Daily Revenue", () => {
	test("calculates revenue, average check and invoice counts in exact integer kopecks", async () => {
		const ctx = createTestContext();
		const result = await getClinicOrDoctorRevenueTool.handler(ctx, {
			period: "today",
			commissionPercent: 25,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.period, "today");
		assert.strictEqual(result.grossRevenueRub, 142500);
		assert.strictEqual(result.totalPaymentsCount, 8);
		assert.strictEqual(result.invoicesIssuedCount, 6);
		assert.strictEqual(result.averageCheckRub, 17812.5);
		assert.strictEqual(result.formattedGrossRevenue, formatKopecksRu(rublesToKopecks(142500)));
		assert.strictEqual(result.formattedAverageCheck, formatKopecksRu(result.averageCheckKop));
	});

	test("calculates doctor piece-rate Net Base accrual (Gross - Lab - Materials * %)", async () => {
		const ctx = createTestContext();
		const result = await getClinicOrDoctorRevenueTool.handler(ctx, {
			period: "today",
			commissionPercent: 25,
		});

		const accrual = result.pieceworkAccrual;
		assert.strictEqual(accrual.grossRub, 142500);
		// ZTL Lab is 15% of 142,500 = 21,375 ₽
		assert.strictEqual(accrual.labZtlCostRub, 21375);
		// Direct Materials is 5% of 142,500 = 7,125 ₽
		assert.strictEqual(accrual.materialsCostRub, 7125);
		// Net Base = 142,500 - 21,375 - 7,125 = 114,000 ₽
		assert.strictEqual(accrual.netBaseRub, 114000);
		// Doctor Accrual = 114,000 * 25% = 28,500 ₽
		assert.strictEqual(accrual.doctorEarnedRub, 28500);
		assert.strictEqual(accrual.formattedDoctorEarned, formatKopecksRu(rublesToKopecks(28500)));
		assert.ok(result.summaryRu.includes(formatKopecksRu(rublesToKopecks(28500))));
	});
});

describe("Mandate 8ab — 4. Patient Family Deposit & Debt", () => {
	test("answers 'Какой остаток на семейном депозите у пациента?' and 'Есть ли долг по счету?'", async () => {
		const ctx = createTestContext();
		const result = await getPatientFamilyDepositAndDebtTool.handler(ctx, {
			patientId: PATIENT_ID,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.patientFullName, "Иванов Алексей Сергеевич");
		assert.strictEqual(result.hasFamilyGroup, true);
		assert.strictEqual(result.familyGroupName, "Семья Ивановых");
		assert.strictEqual(result.familyDepositBalanceRub, 45000);
		assert.strictEqual(result.formattedDepositBalance, formatKopecksRu(rublesToKopecks(45000)));
		assert.strictEqual(result.familyMembers.length, 3);
		assert.strictEqual(result.unpaidInvoicesCount, 1);
		assert.strictEqual(result.totalDebtRub, 12500);
		assert.strictEqual(result.formattedTotalDebt, formatKopecksRu(rublesToKopecks(12500)));
		assert.ok(result.summaryRu.includes(formatKopecksRu(rublesToKopecks(45000))));
		assert.ok(result.summaryRu.includes(formatKopecksRu(rublesToKopecks(12500))));
	});
});

describe("Mandate 8ab — 5. Single-Chokepoint Registry Invocation", () => {
	test("invokes new tools through ToolRegistry.call with bare and qualified crm.* names", async () => {
		const ctx = createTestContext();
		const registry = ctx.tools!;

		// 1. Bare name call
		const res1 = await registry.call(ctx, "get_daily_schedule_intelligence", {
			dateIso: "2026-10-08",
		});
		assert.strictEqual(res1.ok, true);
		assert.strictEqual((res1.data as any).totalAppointments, 4);

		// 2. Qualified module call
		const res2 = await registry.call(ctx, "crm.get_doctor_shifts_and_chairs", {
			targetDateOrDay: "четверг",
		});
		assert.strictEqual(res2.ok, true);
		assert.strictEqual((res2.data as any).shiftForRequestedDay.dayOfWeekRu, "Четверг");

		// 3. Revenue call
		const res3 = await registry.call(ctx, "crm.get_clinic_or_doctor_revenue", {
			period: "today",
		});
		assert.strictEqual(res3.ok, true);
		assert.strictEqual((res3.data as any).grossRevenueRub, 142500);

		// 4. Family balance & debt call
		const res4 = await registry.call(ctx, "crm.get_patient_family_deposit_and_debt", {
			patientId: PATIENT_ID,
		});
		assert.strictEqual(res4.ok, true);
		assert.strictEqual((res4.data as any).familyDepositBalanceRub, 45000);
	});
});
