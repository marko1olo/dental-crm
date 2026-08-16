import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
	addCalendarDays,
	addCalendarMonths,
	buildRecallDedupeKey,
	checkFrequencyCapping,
	checkTimezoneSendWindow,
	calculateNextAllowedSendTime,
	daysBetween,
	evaluateHygieneRecall,
	evaluateImplantMilestones,
	evaluateOrthoRecall,
	getImplantMilestoneDueDate,
	getLocalPartsInTimeZone,
	getRecallTemplate,
	PatientRecallPipeline,
	RECALL_TEMPLATES,
	type ImplantMilestone,
	type RecallScenario,
} from "./PatientRecallPipeline.js";
import { describeSmsPayload } from "./templateRenderer.js";

describe("PatientRecallPipeline (Feature #102)", () => {
	// ─── 1. Календарные расчеты ──────────────────────────────────────────────

	describe("addCalendarMonths & addCalendarDays", () => {
		test("adds calendar months correctly for standard dates", () => {
			const start = new Date(Date.UTC(2026, 0, 15, 10, 0)); // Jan 15, 2026
			const result = addCalendarMonths(start, 6);
			assert.equal(result.getUTCFullYear(), 2026);
			assert.equal(result.getUTCMonth(), 6); // July
			assert.equal(result.getUTCDate(), 15);
		});

		test("handles month-end bounds without overflow (Aug 31 + 6 months -> Feb 28)", () => {
			const start = new Date(Date.UTC(2025, 7, 31, 10, 0)); // Aug 31, 2025
			const result = addCalendarMonths(start, 6); // Feb 2026 (non-leap year)
			assert.equal(result.getUTCFullYear(), 2026);
			assert.equal(result.getUTCMonth(), 1); // Feb
			assert.equal(result.getUTCDate(), 28);
		});

		test("handles leap years correctly (Aug 31, 2023 + 6 months -> Feb 29, 2024)", () => {
			const start = new Date(Date.UTC(2023, 7, 31, 10, 0)); // Aug 31, 2023
			const result = addCalendarMonths(start, 6); // Feb 2024 (leap year)
			assert.equal(result.getUTCFullYear(), 2024);
			assert.equal(result.getUTCMonth(), 1); // Feb
			assert.equal(result.getUTCDate(), 29);
		});

		test("adds calendar days accurately", () => {
			const start = new Date(Date.UTC(2026, 2, 10, 8, 0)); // March 10
			const result = addCalendarDays(start, 14);
			assert.equal(result.getUTCDate(), 24);
			assert.equal(result.getUTCMonth(), 2);
		});

		test("calculates daysBetween accurately", () => {
			const d1 = new Date(Date.UTC(2026, 0, 1));
			const d2 = new Date(Date.UTC(2026, 0, 15));
			assert.equal(daysBetween(d1, d2), 14);
		});
	});

	// ─── 2. Клинический сценарий: Профгигиена (6 месяцев) ─────────────────────

	describe("Scenario: Hygiene (Профгигиена)", () => {
		test("not due when less than 6 months elapsed", () => {
			const lastVisit = new Date(Date.UTC(2026, 0, 10)); // Jan 10, 2026
			const now = new Date(Date.UTC(2026, 5, 10)); // June 10, 2026 (5 months)
			const evaluation = evaluateHygieneRecall(lastVisit, now);

			assert.equal(evaluation.isDue, false);
			assert.equal(evaluation.daysOverdue, 0);
			assert.equal(evaluation.targetDueDate.getUTCMonth(), 6); // July 10, 2026
		});

		test("due when exactly 6 months elapsed", () => {
			const lastVisit = new Date(Date.UTC(2026, 0, 10)); // Jan 10, 2026
			const now = new Date(Date.UTC(2026, 6, 10)); // July 10, 2026
			const evaluation = evaluateHygieneRecall(lastVisit, now);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.daysOverdue, 0);
		});

		test("due with overdue days when 7 months elapsed", () => {
			const lastVisit = new Date(Date.UTC(2026, 0, 10)); // Jan 10, 2026
			const now = new Date(Date.UTC(2026, 7, 10)); // Aug 10, 2026 (7 months)
			const evaluation = evaluateHygieneRecall(lastVisit, now);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.daysOverdue >= 31, true);
		});
	});

	// ─── 3. Клинический сценарий: Имплантация (14д, 3мес, 6мес, 1год) ─────────

	describe("Scenario: Implant Follow-up (Профосмотр после имплантации)", () => {
		const installDate = new Date(Date.UTC(2026, 0, 1)); // Jan 1, 2026

		test("calculates milestone target due dates properly", () => {
			const d14 = getImplantMilestoneDueDate(installDate, "14_days");
			const d3m = getImplantMilestoneDueDate(installDate, "3_months");
			const d6m = getImplantMilestoneDueDate(installDate, "6_months");
			const d1y = getImplantMilestoneDueDate(installDate, "1_year");

			assert.equal(d14.getUTCDate(), 15);
			assert.equal(d14.getUTCMonth(), 0); // Jan 15

			assert.equal(d3m.getUTCMonth(), 3); // April 1
			assert.equal(d6m.getUTCMonth(), 6); // July 1
			assert.equal(d1y.getUTCFullYear(), 2027); // Jan 1, 2027
		});

		test("at 10 days post installation: no milestone due", () => {
			const now = new Date(Date.UTC(2026, 0, 11));
			const evaluation = evaluateImplantMilestones(installDate, now);

			assert.equal(evaluation.isDue, false);
			assert.equal(evaluation.activeMilestone, null);
		});

		test("at 14 days post installation: 14_days milestone active", () => {
			const now = new Date(Date.UTC(2026, 0, 15)); // Day 14
			const evaluation = evaluateImplantMilestones(installDate, now);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.activeMilestone, "14_days");
		});

		test("when 14_days completed, at 2 months: waiting for 3_months", () => {
			const now = new Date(Date.UTC(2026, 2, 1)); // March 1 (2 months)
			const evaluation = evaluateImplantMilestones(installDate, now, ["14_days"]);

			assert.equal(evaluation.isDue, false);
			assert.equal(evaluation.activeMilestone, null);
		});

		test("when 14_days completed, at 3 months: 3_months milestone active", () => {
			const now = new Date(Date.UTC(2026, 3, 1)); // April 1 (3 months)
			const evaluation = evaluateImplantMilestones(installDate, now, ["14_days"]);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.activeMilestone, "3_months");
		});

		test("when 14_days and 3_months completed, at 6 months: 6_months milestone active", () => {
			const now = new Date(Date.UTC(2026, 6, 1)); // July 1 (6 months)
			const evaluation = evaluateImplantMilestones(installDate, now, [
				"14_days",
				"3_months",
			]);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.activeMilestone, "6_months");
		});

		test("when previous milestones completed, at 1 year: 1_year milestone active", () => {
			const now = new Date(Date.UTC(2027, 0, 1)); // Jan 1, 2027 (1 year)
			const evaluation = evaluateImplantMilestones(installDate, now, [
				"14_days",
				"3_months",
				"6_months",
			]);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.activeMilestone, "1_year");
		});

		test("when all milestones completed: isDue is false", () => {
			const now = new Date(Date.UTC(2027, 5, 1));
			const evaluation = evaluateImplantMilestones(installDate, now, [
				"14_days",
				"3_months",
				"6_months",
				"1_year",
			]);

			assert.equal(evaluation.isDue, false);
			assert.equal(evaluation.activeMilestone, null);
		});
	});

	// ─── 4. Клинический сценарий: Ортодонтия (каждые 4 недели) ─────────────────

	describe("Scenario: Orthodontic Activation (Активация брекет-системы)", () => {
		const lastActivation = new Date(Date.UTC(2026, 4, 1)); // May 1, 2026

		test("not due before 28 days (e.g. 20 days)", () => {
			const now = new Date(Date.UTC(2026, 4, 21)); // May 21 (20 days)
			const evaluation = evaluateOrthoRecall(lastActivation, now);

			assert.equal(evaluation.isDue, false);
			assert.equal(evaluation.daysOverdue, 0);
		});

		test("due at exactly 28 days (4 weeks)", () => {
			const now = new Date(Date.UTC(2026, 4, 29)); // May 29 (28 days)
			const evaluation = evaluateOrthoRecall(lastActivation, now);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.daysOverdue, 0);
		});

		test("due with overdue days at 35 days", () => {
			const now = new Date(Date.UTC(2026, 5, 5)); // June 5 (35 days)
			const evaluation = evaluateOrthoRecall(lastActivation, now);

			assert.equal(evaluation.isDue, true);
			assert.equal(evaluation.daysOverdue, 7);
		});
	});

	// ─── 5. Защита от спама (Frequency Capping: 7 дней) ───────────────────────

	describe("Anti-Spam: Frequency Capping", () => {
		const now = new Date(Date.UTC(2026, 7, 16, 12, 0)); // Aug 16, 2026

		test("allows sending when patient never received any messages", () => {
			const result = checkFrequencyCapping(null, now);
			assert.equal(result.canSend, true);
			assert.equal(result.isCapped, false);
			assert.equal(result.cooldownRemainingMs, 0);
		});

		test("caps sending when message was sent 3 days ago (< 7 days)", () => {
			const lastSent = new Date(Date.UTC(2026, 7, 13, 12, 0)); // 3 days ago
			const result = checkFrequencyCapping(lastSent, now, 7);

			assert.equal(result.canSend, false);
			assert.equal(result.isCapped, true);
			assert.equal(result.cooldownRemainingMs > 0, true);
			assert.equal(result.nextAllowedDate !== null, true);
			assert.equal(
				result.nextAllowedDate?.toISOString(),
				new Date(Date.UTC(2026, 7, 20, 12, 0)).toISOString(),
			);
		});

		test("allows sending when message was sent exactly 7 days ago", () => {
			const lastSent = new Date(Date.UTC(2026, 7, 9, 12, 0)); // 7 days ago
			const result = checkFrequencyCapping(lastSent, now, 7);

			assert.equal(result.canSend, true);
			assert.equal(result.isCapped, false);
			assert.equal(result.cooldownRemainingMs, 0);
		});

		test("allows sending when message was sent 14 days ago (> 7 days)", () => {
			const lastSent = new Date(Date.UTC(2026, 7, 2, 12, 0)); // 14 days ago
			const result = checkFrequencyCapping(lastSent, now, 7);

			assert.equal(result.canSend, true);
			assert.equal(result.isCapped, false);
		});
	});

	// ─── 6. Контроль часовых поясов (09:00 - 20:00) ───────────────────────────

	describe("Timezone Control (09:00 - 20:00)", () => {
		const timezone = "Europe/Moscow"; // UTC+3

		test("identifies daytime hours (14:30) as within window", () => {
			const date = new Date(Date.UTC(2026, 7, 16, 11, 30)); // 14:30 Moscow (UTC+3)
			const result = checkTimezoneSendWindow(date, timezone);

			assert.equal(result.isInWindow, true);
			assert.equal(result.deferred, false);
			assert.equal(result.localHour, 14);
			assert.equal(result.localMinute, 30);
			assert.equal(result.scheduledAt.getTime(), date.getTime());
		});

		test("allows start boundary at exactly 09:00", () => {
			const date = new Date(Date.UTC(2026, 7, 16, 6, 0)); // 09:00 Moscow
			const result = checkTimezoneSendWindow(date, timezone);

			assert.equal(result.isInWindow, true);
			assert.equal(result.deferred, false);
			assert.equal(result.localHour, 9);
			assert.equal(result.localMinute, 0);
		});

		test("allows upper boundary at 19:59", () => {
			const date = new Date(Date.UTC(2026, 7, 16, 16, 59)); // 19:59 Moscow
			const result = checkTimezoneSendWindow(date, timezone);

			assert.equal(result.isInWindow, true);
			assert.equal(result.deferred, false);
			assert.equal(result.localHour, 19);
			assert.equal(result.localMinute, 59);
		});

		test("defers evening hours (21:30) to next morning 09:00", () => {
			const date = new Date(Date.UTC(2026, 7, 16, 18, 30)); // 21:30 Moscow
			const result = checkTimezoneSendWindow(date, timezone);

			assert.equal(result.isInWindow, false);
			assert.equal(result.deferred, true);
			assert.equal(result.localHour, 21);

			// Should be scheduled at 09:00 on Aug 17 (06:00 UTC)
			const scheduledLocal = getLocalPartsInTimeZone(
				result.scheduledAt,
				timezone,
			);
			assert.equal(scheduledLocal.day, 17);
			assert.equal(scheduledLocal.hour, 9);
			assert.equal(scheduledLocal.minute, 0);
		});

		test("defers early morning hours (07:15) to same day 09:00", () => {
			const date = new Date(Date.UTC(2026, 7, 16, 4, 15)); // 07:15 Moscow
			const result = checkTimezoneSendWindow(date, timezone);

			assert.equal(result.isInWindow, false);
			assert.equal(result.deferred, true);
			assert.equal(result.localHour, 7);

			// Should be scheduled at 09:00 on Aug 16 (06:00 UTC)
			const scheduledLocal = getLocalPartsInTimeZone(
				result.scheduledAt,
				timezone,
			);
			assert.equal(scheduledLocal.day, 16);
			assert.equal(scheduledLocal.hour, 9);
			assert.equal(scheduledLocal.minute, 0);
		});

		test("works across different clinic timezones (Europe/Samara UTC+4)", () => {
			const samaraTz = "Europe/Samara";
			const date = new Date(Date.UTC(2026, 7, 16, 17, 30)); // 21:30 Samara (UTC+4)
			const result = checkTimezoneSendWindow(date, samaraTz);

			assert.equal(result.isInWindow, false);
			assert.equal(result.deferred, true);
			assert.equal(result.localHour, 21);

			const scheduledLocal = getLocalPartsInTimeZone(
				result.scheduledAt,
				samaraTz,
			);
			assert.equal(scheduledLocal.day, 17);
			assert.equal(scheduledLocal.hour, 9);
			assert.equal(scheduledLocal.minute, 0);
		});
	});

	// ─── 7. Шаблоны и генерация сообщений (Telegram, WhatsApp, SMS) ───────────

	describe("Templates & Message Preparation", () => {
		const sampleValues = {
			patient: "Иван Сергеевич",
			clinic: "ДЕНТЕ",
			clinicPhone: "+7 (495) 123-45-67",
			doctor: "Смирнов А. В.",
			tooth: 36,
			link: "https://dente.clinic/portal",
		};

		test("renders hygiene templates for all channels", () => {
			const tg = PatientRecallPipeline.prepareMessageText(
				"hygiene",
				"telegram",
				sampleValues,
			);
			assert.equal(tg.includes("Иван Сергеевич"), true);
			assert.equal(tg.includes("ДЕНТЕ"), true);
			assert.equal(tg.includes("6 месяцев"), true);

			const wa = PatientRecallPipeline.prepareMessageText(
				"hygiene",
				"whatsapp",
				sampleValues,
			);
			assert.equal(wa.includes("Иван Сергеевич"), true);
			assert.equal(wa.includes("+7 (495) 123-45-67"), true);

			const sms = PatientRecallPipeline.prepareMessageText(
				"hygiene",
				"sms",
				sampleValues,
			);
			assert.equal(sms.includes("Иван Сергеевич"), true);
			assert.equal(sms.includes("ДЕНТЕ"), true);
		});

		test("renders implant templates with milestone details", () => {
			const tg14 = PatientRecallPipeline.prepareMessageText(
				"implant_followup",
				"telegram",
				sampleValues,
				"14_days",
			);
			assert.equal(tg14.includes("14 дней"), true);
			assert.equal(tg14.includes("зуб 36"), true);
			assert.equal(tg14.includes("Смирнов А. В."), true);

			const tg3m = PatientRecallPipeline.prepareMessageText(
				"implant_followup",
				"telegram",
				sampleValues,
				"3_months",
			);
			assert.equal(tg3m.includes("3 месяца"), true);

			const tg6m = PatientRecallPipeline.prepareMessageText(
				"implant_followup",
				"telegram",
				sampleValues,
				"6_months",
			);
			assert.equal(tg6m.includes("6 месяцев"), true);

			const tg1y = PatientRecallPipeline.prepareMessageText(
				"implant_followup",
				"telegram",
				sampleValues,
				"1_year",
			);
			assert.equal(tg1y.includes("1 год"), true);
		});

		test("renders ortho activation templates", () => {
			const tgOrtho = PatientRecallPipeline.prepareMessageText(
				"ortho_activation",
				"telegram",
				sampleValues,
			);
			assert.equal(tgOrtho.includes("4 недели"), true);
			assert.equal(tgOrtho.includes("активация"), true);
		});

		test("SMS payload respects reasonable length limits", () => {
			const smsText = PatientRecallPipeline.prepareMessageText(
				"hygiene",
				"sms",
				sampleValues,
			);
			const smsDesc = describeSmsPayload(smsText);
			assert.equal(smsDesc.encoding, "ucs2");
			assert.equal(smsDesc.segments <= 2, true); // Compact and within 2 SMS segments
		});
	});

	// ─── 8. Идемпотентность и Dedupe Keys ─────────────────────────────────────

	describe("Deduplication Keys", () => {
		test("generates unique and deterministic dedupe keys", () => {
			const k1 = buildRecallDedupeKey("pat-123", "hygiene", "2026-08");
			const k2 = buildRecallDedupeKey("pat-123", "implant_followup", "imp-999:14_days");
			const k3 = buildRecallDedupeKey("pat-123", "ortho_activation", "2026-08-16");

			assert.equal(k1, "recall:hygiene:pat-123:2026-08");
			assert.equal(k2, "recall:implant_followup:pat-123:imp-999:14_days");
			assert.equal(k3, "recall:ortho_activation:pat-123:2026-08-16");
		});
	});
});
