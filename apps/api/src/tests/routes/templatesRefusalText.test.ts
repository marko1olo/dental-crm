import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import registerTemplateRoutes from "../../routes/templates.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * ПРОТОКОЛЫ ПРИЁМА ОТКАЗЫВАЛИ КОДОМ ОТВЕТА, А НЕ ПРИЧИНОЙ.
 *
 * ЧТО БЫЛО, замерено запросом в процессе (`app.inject`; дев-сервер на 4100 отдаёт
 * старую сборку и доказательством не считался):
 *
 *   GET    /api/templates        → 403 {"error":"OrgRequired"}
 *   GET    /api/templates/<ном.> → 403 {"error":"OrgRequired"} и 404 {"error":"NotFound"}
 *   POST   /api/templates        → 403 {"error":"OrgRequired"} и 400 {"error":"Title required"}
 *   DELETE /api/templates/<ном.> → 403 {"error":"OrgRequired"}, 404, 403 {"error":"CannotDeleteBuiltIn"}
 *   POST   /api/templates/seed   → 403 {"error":"OrgRequired"}
 *
 * Девять ветвей без поля `message`, причём `Title required` и
 * `CannotDeleteBuiltIn` написаны латиницей — то есть, даже переставь их в
 * `message`, клиент погасил бы фразу целиком (`AppHelpers.tsx`,
 * `operatorReadableErrorDetail` отбрасывает текст без русских букв).
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Список «Клинический шаблон» открывается на КАЖДОМ
 * приёме: это первое, что делает врач, садясь заполнять дневник. Отказ без
 * причины здесь неотличим от «протоколов в этой клинике нет» — тот же дефект,
 * который в этом файле уже починен для провала установки (503). Разница между
 * «войдите в кабинет заново» и «звоните администратору» — это разница между
 * десятью секундами и потерянным приёмом.
 *
 * ПОПРАВКА К РАЗБОРУ УЧАСТКА, проверена чтением обеих ветвей. План писал про эти
 * строки: «там сервер причины и не знает; сочинять её нельзя». Неверно: причина
 * установлена точно в каждой из четырёх — кабинет клиники не определён, протокола
 * с таким номером в клинике нет, у протокола не заполнено название, протокол
 * встроенный. Сочинять не пришлось ничего.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ.
 *  1. Ни один отказ протоколов не уходит без `message`.
 *  2. У текста есть СЛЕДУЮЩИЙ ШАГ, а не только факт отказа.
 *  3. В тексте нет латиницы — иначе человек не увидит ничего.
 *  4. Машинные коды сохранены в поле `error`: интерфейс по ним ветвится.
 *  5. Отказ по названию называет поле русской подписью с экрана, а не именем
 *     колонки базы.
 *  6. Сканер против следующей копии: ни одна ветвь `templates.ts` не отвечает
 *     `error` без `message`. Им же покрыт `CannotDeleteBuiltIn` — эта ветка
 *     требует встроенного протокола в общей базе, а удалять настоящие данные
 *     клиники ради проверки текста нельзя.
 *
 * БАЗА ТОЛЬКО НА ЧТЕНИЕ, И ЭТО ВАЖНО ИМЕННО ЗДЕСЬ. GET /api/templates с рабочим
 * кабинетом ЗАСЕВАЕТ встроенные протоколы, то есть пишет в базу, — поэтому этот
 * адрес зовётся только БЕЗ кабинета, где отказ наступает до посева. Остальные
 * пробы либо отказывают до обращения к базе, либо выполняют один SELECT по
 * номеру, которого в базе нет.
 */

const ORG = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
/** Номер протокола, которого в базе нет: SELECT вернёт пусто, записи не будет. */
const MISSING_TEMPLATE = "0c9a1e77-1f4f-4a55-9f1d-6a2f0c3b7e11";
const LATIN = /[A-Za-z]/;
const NEXT_STEP =
	/Войдите|войдите|Откройте|откройте|Обновите|обновите|Впишите|впишите|Создайте|создайте/;

type Probe = {
	name: string;
	method: "GET" | "POST" | "DELETE";
	url: string;
	payload?: unknown;
	/** Токен кабинета: нужен там, где отказ наступает уже ВНУТРИ клиники. */
	withClinicToken?: boolean;
	expectedStatus: number;
	expectedError: string;
};

const PROBES: Probe[] = [
	{
		name: "список протоколов приёма, кабинет не определён",
		method: "GET",
		url: "/api/templates",
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "один протокол приёма, кабинет не определён",
		method: "GET",
		url: `/api/templates/${MISSING_TEMPLATE}`,
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "создание протокола, кабинет не определён",
		method: "POST",
		url: "/api/templates",
		payload: { title: "Свой протокол" },
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "удаление протокола, кабинет не определён",
		method: "DELETE",
		url: `/api/templates/${MISSING_TEMPLATE}`,
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "переустановка встроенных протоколов, кабинет не определён",
		method: "POST",
		url: "/api/templates/seed",
		expectedStatus: 403,
		expectedError: "OrgRequired",
	},
	{
		name: "протокола с таким номером в клинике нет",
		method: "GET",
		url: `/api/templates/${MISSING_TEMPLATE}`,
		withClinicToken: true,
		expectedStatus: 404,
		expectedError: "NotFound",
	},
	{
		name: "удаление: протокола с таким номером в клинике нет",
		method: "DELETE",
		url: `/api/templates/${MISSING_TEMPLATE}`,
		withClinicToken: true,
		expectedStatus: 404,
		expectedError: "NotFound",
	},
	{
		name: "у нового протокола не заполнено название",
		method: "POST",
		url: "/api/templates",
		payload: { title: "   " },
		withClinicToken: true,
		expectedStatus: 400,
		expectedError: "Title required",
	},
];

describe("отказ протоколов приёма объяснён врачу", () => {
	let app: FastifyInstance;

	before(async () => {
		// Секрет периметра задаётся здесь: гейт clinicalAdminSecret() читает
		// переменную на каждом вызове, поэтому тест не зависит от настроек машины и
		// не трогает настоящий секрет установки.
		process.env.DENTE_CLINICAL_ADMIN_SECRET = "секрет-сторожа-текста-протоколов";
		app = Fastify({ logger: false });
		app.addHook("onRequest", async (request) => {
			getRequestIdentity(request);
		});
		await registerTemplateRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
	});

	async function refusal(
		probe: Probe,
	): Promise<{ statusCode: number; error: string; message: string }> {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			"x-dente-admin-secret": process.env
				.DENTE_CLINICAL_ADMIN_SECRET as string,
		};
		if (probe.withClinicToken) {
			headers["x-dente-clinic-token"] = signToken(
				{ organizationId: ORG },
				authTokenSecret(),
			);
		}
		const response = await app.inject({
			method: probe.method,
			url: probe.url,
			headers,
			payload: probe.payload ?? {},
		});
		const body = response.json() as { error?: unknown; message?: unknown };
		return {
			statusCode: response.statusCode,
			error: typeof body.error === "string" ? body.error : "",
			message: typeof body.message === "string" ? body.message : "",
		};
	}

	test("каждый отказ протоколов называет причину и следующий шаг", async () => {
		for (const probe of PROBES) {
			const { statusCode, error, message } = await refusal(probe);
			assert.equal(
				statusCode,
				probe.expectedStatus,
				`${probe.name}: код ${statusCode}, тело ${message}`,
			);
			assert.equal(
				error,
				probe.expectedError,
				`${probe.name}: машинный код потерян, интерфейс по нему ветвится`,
			);
			assert.ok(
				message.length > 0,
				`${probe.name}: отказ ушёл без message — пустой список протоколов и непоставленный список с экрана неотличимы`,
			);
			assert.ok(
				!LATIN.test(message),
				`${probe.name}: в отказе латиница, фильтр клиента погасит фразу целиком: ${message}`,
			);
			assert.match(
				message,
				NEXT_STEP,
				`${probe.name}: в отказе нет следующего шага: ${message}`,
			);
		}
	});

	test("отказ по названию протокола называет поле подписью с экрана", async () => {
		/*
		 * Прежний текст `Title required` — имя поля запроса. Оператор такого поля не
		 * видит, он видит «Название». Отказ, называющий имя поля вместо подписи,
		 * отправляет человека искать то, чего на экране нет.
		 */
		const { message } = await refusal(
			PROBES.find((probe) => probe.expectedError === "Title required") as Probe,
		);
		assert.match(
			message,
			/названи/i,
			`отказ не называет поле, которое нужно заполнить: ${message}`,
		);
	});

	test("отказ «протокола нет» не выдаётся за отсутствие раздела", async () => {
		/*
		 * Голый 404 клиент превращает в «сервер не знает такого раздела — скорее
		 * всего программа клиники обновлена не полностью, сообщите администратору»
		 * (apps/web/src/lib/panelStateText.ts). Это ложное указание: маршрут
		 * существует и работает, а врача отправляют звать администратора.
		 */
		const { message } = await refusal(
			PROBES.find(
				(probe) => probe.expectedError === "NotFound",
			) as Probe,
		);
		assert.match(
			message,
			/не найден/i,
			`отказ не называет причину — что именно не найдено: ${message}`,
		);
		assert.doesNotMatch(
			message,
			/администратор/i,
			`отказ по несуществующему протоколу отправляет к администратору, хотя лечится обновлением списка: ${message}`,
		);
	});

	test("ни одна ветвь протоколов не отвечает кодом без текста", async () => {
		/*
		 * СТОРОЖ ПРОТИВ СЛЕДУЮЩЕЙ КОПИИ ДЕФЕКТА, и единственное покрытие ветки
		 * `CannotDeleteBuiltIn`: она требует встроенного протокола в общей базе, а
		 * удалять настоящие данные клиники ради проверки текста нельзя.
		 *
		 * Комментарии вырезаются ДО поиска: иначе сторож бил бы по объяснению,
		 * которое цитирует прежний голый отказ, и заставил бы удалить разбор.
		 */
		const { readFileSync } = await import("node:fs");
		const raw = readFileSync(
			new URL("../../routes/templates.ts", import.meta.url),
			"utf8",
		);
		const source = raw
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
		const bare = [...source.matchAll(/\.send\(\{[^;]*?\}\)/gs)]
			.map((match) => match[0])
			.filter((block) => /\berror:/.test(block) && !/\bmessage:/.test(block));
		assert.deepEqual(
			bare,
			[],
			`в templates.ts снова появился отказ без текста для человека:\n${bare.join("\n---\n")}`,
		);
	});
});
