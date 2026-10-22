import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeReminderReport } from "./deliveryReportNotice.js";
import { cleanReminders } from "./deliveryReportTestFixtures.js";

describe("напоминания: пропущенные пациенты обязаны быть названы", () => {
	it("семь поставлено, трое без связи — их имена на экране, и итог не спокойный", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			queued: 7,
			skippedNoChannel: 3,
			skipped: [
				{ patientName: "Иванов И.И.", reason: "no_channel", appointmentAt: "2026-07-29T11:00:00.000Z" },
				{ patientName: "Петров П.П.", reason: "no_channel", appointmentAt: "2026-07-29T12:00:00.000Z" },
				{ patientName: "Сидоров С.С.", reason: "no_channel", appointmentAt: "2026-07-29T13:00:00.000Z" },
			],
		});
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Иванов И\.И\./);
		assert.match(notice.text, /Петров П\.П\./);
		assert.match(notice.text, /Сидоров С\.С\./);
	});

	it("две причины пропуска не сваливаются в одну фразу", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			queued: 1,
			skippedNoChannel: 1,
			skippedNoTemplateData: 1,
			skipped: [
				{ patientName: "Без Телефона", reason: "no_channel", appointmentAt: "2026-07-29T11:00:00.000Z" },
				{ patientName: "Без Шаблона", reason: "no_template_data", appointmentAt: "2026-07-29T12:00:00.000Z" },
			],
		});
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /нет способа связи/);
		assert.match(notice.text, /не хватает данных/);
	});

	it("сервер прислал число, но не прислал имён — число не выдумывается в имена", () => {
		const notice = describeReminderReport({ ...cleanReminders, skippedNoChannel: 4 });
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Без напоминания остались 4 пациента/);
		assert.match(notice.text, /Кто именно — сервер не назвал/);
	});

	it("имён меньше, чем пропусков: об обрезке сказано прямо", () => {
		const notice = describeReminderReport({
			...cleanReminders,
			skippedNoChannel: 10,
			skipped: [
				{ patientName: "Первый", reason: "no_channel", appointmentAt: "2026-07-29T11:00:00.000Z" },
				{ patientName: "Второй", reason: "no_channel", appointmentAt: "2026-07-29T12:00:00.000Z" },
			],
		});
		assert.match(notice.text, /Названы первые 2/);
	});

	it("напоминания выключены: ноль объяснён, а не подан как результат работы", () => {
		const notice = describeReminderReport({ ...cleanReminders, organizations: 0, queued: 0 });
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Автоматические напоминания у клиники выключены/);
	});

	it("приёмов в окне нет: спокойно, но с объяснением, почему ноль", () => {
		const notice = describeReminderReport({ ...cleanReminders, examined: 0, queued: 0 });
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Приёмов, о которых пора напоминать, сейчас нет/);
	});

	it("чистая удача остаётся спокойной", () => {
		const notice = describeReminderReport(cleanReminders);
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Поставлено напоминаний: 5/);
	});
});
