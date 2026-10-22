import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeDispatchReport, describeReminderReport } from "./deliveryReportNotice.js";
import { cleanDispatch, cleanReminders, latinRun, rawUuid } from "./deliveryReportTestFixtures.js";

describe("каждое поле отчёта слышно в тексте", () => {
	it("разбор очереди: поля меняют текст", () => {
		const base = describeDispatchReport(cleanDispatch).text;
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, claimed: 10 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, sent: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, retried: 2 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, failed: 2 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, suppressed: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, notConfigured: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, deferred: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, releasedStuck: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, awaitingRetry: 1 }).text, base);
		assert.notEqual(describeDispatchReport({ ...cleanDispatch, awaitingSchedule: 1 }).text, base);
	});

	it("напоминания: поля меняют текст", () => {
		const base = describeReminderReport(cleanReminders).text;
		assert.notEqual(describeReminderReport({ ...cleanReminders, organizations: 0 }).text, base);
		assert.notEqual(describeReminderReport({ ...cleanReminders, examined: 0 }).text, base);
		assert.notEqual(describeReminderReport({ ...cleanReminders, queued: 1 }).text, base);
		assert.notEqual(describeReminderReport({ ...cleanReminders, alreadyQueued: 2 }).text, base);
		assert.notEqual(describeReminderReport({ ...cleanReminders, skippedNoChannel: 1 }).text, base);
		assert.notEqual(describeReminderReport({ ...cleanReminders, skippedNoTemplateData: 1 }).text, base);
		assert.notEqual(
			describeReminderReport({
				...cleanReminders,
				skipped: [{ patientName: "А", reason: "no_channel", appointmentAt: "2026-07-29T11:00:00.000Z" }],
			}).text,
			base,
		);
		assert.notEqual(describeReminderReport({ ...cleanReminders, problems: ["Ошибка шлюза"] }).text, base);
	});

	it("ни в одном итоге нет латиницы и нет идентификатора организации", () => {
		const d = describeDispatchReport({ ...cleanDispatch, retried: 2, awaitingRetry: 1 });
		assert.equal(latinRun.test(d.text), false, `Латиница в dispatch: ${d.text}`);
		assert.equal(rawUuid.test(d.text), false, `UUID в dispatch: ${d.text}`);

		const r = describeReminderReport({ ...cleanReminders, skippedNoChannel: 2 });
		assert.equal(latinRun.test(r.text), false, `Латиница в reminder: ${r.text}`);
		assert.equal(rawUuid.test(r.text), false, `UUID в reminder: ${r.text}`);
	});
});
