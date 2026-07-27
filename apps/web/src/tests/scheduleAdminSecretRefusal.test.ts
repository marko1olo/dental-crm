import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scheduleAdminSecretRefusal } from "../hooks/domains/useScheduleLogic.js";

/**
 * От этой функции зависит, покажет ли экран «Записи» поле секрета
 * администратора.
 *
 * Раньше поле висело на экране постоянно строкой «🔐 Разблокировать
 * сохранение расписания»: замок без объяснения, зачем он и что случится.
 * Теперь поле появляется только тогда, когда сервер действительно отказал в
 * изменении расписания и назвал причину. Значит функция обязана отличать этот
 * отказ от всех прочих: если она сработает на чужой ошибке, пользователь
 * получит поле пароля вместо настоящей причины отказа, а если пропустит
 * настоящий отказ — не сможет сохранить запись и не поймёт почему.
 *
 * Сервер отвечает так (apps/api/src/routes/schedule.ts):
 *   403 ScheduleAdminSecretRequired — секрет задан и не совпал;
 *   503 ScheduleAdminSecretMissing — секрет на сервере не задан вовсе.
 */
function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("scheduleAdminSecretRefusal", () => {
	it("узнаёт отказ 403 с неверным секретом", async () => {
		const response = jsonResponse(403, {
			error: "ScheduleAdminSecretRequired",
			message: "Для изменения расписания нужен действующий секрет администратора клиники.",
		});
		assert.equal(await scheduleAdminSecretRefusal(response), "ScheduleAdminSecretRequired");
	});

	it("узнаёт отказ 503, когда секрет на сервере не задан", async () => {
		const response = jsonResponse(503, {
			error: "ScheduleAdminSecretMissing",
			message: "На сервере не задан секрет администратора клиники для изменения расписания.",
		});
		assert.equal(await scheduleAdminSecretRefusal(response), "ScheduleAdminSecretMissing");
	});

	it("не путает пересечение приёмов с требованием секрета", async () => {
		const response = jsonResponse(409, {
			code: "AppointmentCreateRejected",
			reason: "resource_overlap",
			message: "Запись не создана: выбранное время уже занято.",
		});
		assert.equal(await scheduleAdminSecretRefusal(response), null);
	});

	it("не срабатывает на чужом 403", async () => {
		const response = jsonResponse(403, {
			error: "SettingsAdminSecretRequired",
			message: "Для изменения настроек клиники нужен действующий секрет.",
		});
		assert.equal(await scheduleAdminSecretRefusal(response), null);
	});

	it("не срабатывает на чужом 503", async () => {
		const response = jsonResponse(503, { error: "DatabaseUnavailable" });
		assert.equal(await scheduleAdminSecretRefusal(response), null);
	});

	it("не падает, когда тело ответа не JSON", async () => {
		const response = new Response("<html>502 Bad Gateway</html>", { status: 503 });
		assert.equal(await scheduleAdminSecretRefusal(response), null);
	});

	it("не срабатывает на успешном ответе", async () => {
		assert.equal(await scheduleAdminSecretRefusal(jsonResponse(200, { ok: true })), null);
	});

	it("оставляет тело ответа читаемым: сообщение об ошибке разбирается после проверки", async () => {
		const response = jsonResponse(403, {
			error: "ScheduleAdminSecretRequired",
			message: "Для изменения расписания нужен действующий секрет администратора клиники.",
		});
		await scheduleAdminSecretRefusal(response);
		const body = (await response.json()) as { message?: string };
		assert.match(String(body.message), /секрет администратора/);
	});
});
