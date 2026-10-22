import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeDispatchReport } from "./deliveryReportNotice.js";
import { cleanDispatch } from "./deliveryReportTestFixtures.js";

describe("разбор очереди: отчёт сервера превращается в честный текст", () => {
	it("шлюз недоступен: пять взято, ноль ушло — это НЕ успех, и в тексте назван повтор", () => {
		const notice = describeDispatchReport({ ...cleanDispatch, claimed: 5, sent: 0, retried: 5 });
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Пока не ушло/);
		assert.match(notice.text, /попроб/i);
	});

	it("след «взято N» восстановлен: видно, что сообщения брали, а не что их не было", () => {
		const notice = describeDispatchReport({ ...cleanDispatch, claimed: 5, sent: 0, retried: 5 });
		assert.match(notice.text, /Взято из очереди: 5 сообщений/);
		assert.match(notice.text, /Отправлено: 0 сообщений/);
	});

	it("тихие часы: отложенные сообщения не прячутся в спокойном блоке", () => {
		const notice = describeDispatchReport({ ...cleanDispatch, claimed: 4, sent: 1, deferred: 3 });
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Отложено до утра: 3/);
		assert.match(notice.text, /тихие часы/i);
	});

	it("канал не настроен — это дело администратора, а не осознанный отказ", () => {
		const notConfigured = describeDispatchReport({ ...cleanDispatch, claimed: 2, sent: 0, notConfigured: 2 });
		assert.equal(notConfigured.kind, "fail");
		assert.match(notConfigured.text, /Отправлять нечем: 2/);
		assert.match(notConfigured.text, /Канал связи не настроен/);

		const suppressed = describeDispatchReport({ ...cleanDispatch, claimed: 2, sent: 0, suppressed: 2 });
		assert.equal(suppressed.kind, "fail");
		assert.match(suppressed.text, /Отправлять не стали: 2/);
		assert.match(suppressed.text, /отказал/);
	});

	it("зависшие захваты названы, но сами по себе не делают итог красным", () => {
		const notice = describeDispatchReport({ ...cleanDispatch, releasedStuck: 2 });
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Заодно возвращено в очередь: 2/);
	});

	it("чистая удача читается спокойно", () => {
		const notice = describeDispatchReport(cleanDispatch);
		assert.equal(notice.kind, "done");
		assert.match(notice.text, /Отправлено: 3 сообщения/);
	});

	it("второе нажатие после отказа: выдержка и расписание", () => {
		const waiting = describeDispatchReport({ ...cleanDispatch, claimed: 0, sent: 0, awaitingRetry: 5 });
		assert.equal(waiting.kind, "fail");
		assert.match(waiting.text, /Ничего не отправлено/);
		assert.match(waiting.text, /Повторить/);

		const futureOnly = describeDispatchReport({ ...cleanDispatch, claimed: 0, sent: 0, awaitingSchedule: 12 });
		assert.equal(futureOnly.kind, "done");
		assert.match(futureOnly.text, /Отправлять сейчас нечего/);

		const empty = describeDispatchReport({ ...cleanDispatch, claimed: 0, sent: 0 });
		assert.equal(empty.kind, "done");
		assert.match(empty.text, /Поставить напоминания/);

		const both = describeDispatchReport({ ...cleanDispatch, claimed: 0, sent: 0, awaitingRetry: 2, awaitingSchedule: 10 });
		assert.equal(both.kind, "fail");
		assert.match(both.text, /2 сообщения ждут повторной попытки/);
		assert.match(both.text, /10 ждут назначенного времени/);
	});

	it("пачка кончилась раньше очереди: остаток назван и не удвоен", () => {
		const notice = describeDispatchReport({ ...cleanDispatch, claimed: 25, sent: 25, awaitingRetry: 14 });
		assert.equal(notice.kind, "fail");
		assert.match(notice.text, /Отправлено: 25 сообщений/);
		assert.match(notice.text, /ждут повторной попытки: 14 сообщений/);
	});
});
