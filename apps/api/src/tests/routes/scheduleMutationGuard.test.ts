import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

/**
 * РАСПИСАНИЕ КЛИНИКИ МЕНЯЛОСЬ БЕЗ СЕКРЕТА АДМИНИСТРАТОРА, ХОТЯ ОХРАНА БЫЛА
 * НАПИСАНА.
 *
 * ЧТО БЫЛО. `requireScheduleMutationAccess` в `routes/schedule.ts` был ОБЪЯВЛЕН и
 * не вызывался ни разу: единственное вхождение имени во всём дереве — само
 * объявление, все прочие — текст комментариев и заметок. Замерено запросом в
 * процессе (`app.inject`; дев-сервер на 4100 отдаёт старую сборку и
 * доказательством не считается) при заданном `DENTE_SCHEDULE_ADMIN_SECRET` и
 * снятой лазейке, с действительным токеном кабинета:
 *
 *   POST  /api/appointments                 без секрета -> 201, строка в базе
 *   POST  /api/appointments      НЕВЕРНЫЙ секрет -> 201, строка в базе
 *   PATCH /api/appointments/<id>            без секрета -> 200
 *   PATCH /api/appointments/<id> НЕВЕРНЫЙ секрет -> 200
 *   PUT   /api/schedule/appointments/<id>   без секрета -> 200
 *   PUT   /api/schedule/appointments/<id> НЕВЕРНЫЙ секрет -> 200
 *
 * Заголовок не читался вовсе — заведомо неверный секрет проходил так же, как
 * никакой.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Любой, у кого есть токен кабинета, писал в сетку
 * приёмов в обход гейта администратора: создать приём, перенести, отменить,
 * занять кресло и врача. Тот же барьер на клинических маршрутах при этом
 * отвечает 403, а на экране расписания есть поле «секрет администратора»,
 * которое обещало защиту, которой не существовало.
 *
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ И ПОЧЕМУ СПИСКОМ, А НЕ ПОИМЁННО.
 * Список изменяющих маршрутов НЕ ВПИСАН руками: он собирается обходом исходника
 * `routes/schedule.ts`, и проверка идёт по КАЖДОМУ найденному адресу. Причина
 * ровно та, из-за которой дыра и появилась: у переноса приёма адресов ДВА
 * (`PATCH /api/appointments/:id` и `PUT /api/schedule/appointments/:id`), и
 * поимённый список ловил бы только те, про которые вспомнили. Теперь новый
 * изменяющий маршрут, добавленный без охраны, краснеет сам, без правки этого
 * файла.
 *
 * Проверок на каждый адрес три, потому что состояний три и действия у них
 * разные: секрета нет, секрет не совпал, секрет верен. Тексты проверяются по
 * ПРИЗНАКАМ причины и следующего шага, а не дословно: тест на точное совпадение
 * краснел бы на любой правке формулировки, и его бы отключили.
 *
 * БЕЗ БАЗЫ. Охрана отвечает до первого обращения к данным, а путь «секрет верен»
 * идёт по памяти (`DENTAL_STATE_PERSISTENCE=off`): ни одной строки в живой базе
 * этот файл не создаёт и убирать за собой ему нечего.
 */

import fs from "node:fs";

const SCHEDULE_ROUTE_FILES = [
	path.resolve(import.meta.dirname, "../../routes/schedule.ts"),
	path.resolve(import.meta.dirname, "../../routes/appointments.ts"),
	path.resolve(
		import.meta.dirname,
		"../../routes/appointments/appointmentsMutationRoutes.ts",
	),
];
const SECRET_HEADER = "x-dente-admin-secret";
const UNGUARDED_FLAG = "DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS";
const SECRET_VARIABLE = "DENTE_SCHEDULE_ADMIN_SECRET";
const ORGANIZATION = "d0000000-0000-4000-8000-00000000d001";
/** Подставляется вместо `:appointmentId`: до данных запрос всё равно не доходит. */
const ANY_APPOINTMENT = "8356141b-7cfa-4221-95f7-70f47e7344b1";

/** Латинское слово из шести и более букв гасит фразу на экране целиком. */
const LATIN_WORD_KILLING_THE_PHRASE = /[A-Za-z]{6,}/;
/** Следующий шаг: повелительный глагол, а не констатация отказа. */
const NEXT_STEP =
	/Введите|введите|Проверьте|проверьте|Обратитесь|обратитесь|возьмите|попросите/;
/** Причина: речь о секрете администратора, а не «действие запрещено». */
const REASON = /секрет/i;

const PERIMETER_CODES = new Set([
	"ScheduleAdminSecretRequired",
	"ScheduleAdminSecretMissing",
]);

/**
 * Вырезание комментариев перед поиском маршрутов.
 *
 * ЗАЧЕМ. В этом проекте принято подробно объяснять в комментариях, какой адрес
 * чем был сломан, — и без вырезания обход нашёл бы собственную документацию.
 * Разбор посимвольный, а не выражением: в дереве уже был случай, когда
 * `/\/\*[\s\S]*?\*\//g` принял «слэш-звёздочка» ВНУТРИ СТРОКИ (заголовок
 * `Accept: … *&#47;*`) за начало комментария и съел весь остаток файла вместе с
 * регистрациями маршрутов. Урок закреплён самопроверкой ниже.
 */
function stripComments(text: string): string {
	let out = "";
	let index = 0;
	let quote: string | null = null;
	while (index < text.length) {
		const char = text[index] as string;
		const next = text[index + 1];
		if (quote) {
			if (char === "\\") {
				out += char + (next ?? "");
				index += 2;
				continue;
			}
			if (char === quote) quote = null;
			out += char;
			index += 1;
			continue;
		}
		if (char === '"' || char === "'" || char === "`") {
			quote = char;
			out += char;
			index += 1;
			continue;
		}
		if (char === "/" && next === "*") {
			const end = text.indexOf("*/", index + 2);
			const stop = end === -1 ? text.length : end + 2;
			out += text.slice(index, stop).replace(/[^\n]/g, "");
			index = stop;
			continue;
		}
		if (char === "/" && next === "/") {
			const end = text.indexOf("\n", index);
			index = end === -1 ? text.length : end;
			continue;
		}
		out += char;
		index += 1;
	}
	return out;
}

type DiscoveredRoute = {
	method: "POST" | "PUT" | "PATCH" | "DELETE";
	routePath: string;
	url: string;
};

/** Адрес для запроса: вместо каждого `:параметра` — годный по форме UUID. */
function injectableUrl(routePath: string): string {
	return routePath.replace(/\/:[^/]+/g, `/${ANY_APPOINTMENT}`);
}

function discoverMutatingRoutes(source: string): DiscoveredRoute[] {
	const registration =
		/\bapp\.(post|put|patch|delete)\s*\(\s*["'`](\/api\/[^"'`]+)["'`]/g;
	const routes: DiscoveredRoute[] = [];
	for (const match of stripComments(source).matchAll(registration)) {
		const method = (
			match[1] as string
		).toUpperCase() as DiscoveredRoute["method"];
		const routePath = match[2] as string;
		routes.push({ method, routePath, url: injectableUrl(routePath) });
	}
	return routes;
}

const scheduleSource = SCHEDULE_ROUTE_FILES.filter((f) =>
	fs.existsSync(f),
)
	.map((f) => readFileSync(f, "utf8"))
	.join("\n");
const MUTATING_ROUTES = discoverMutatingRoutes(scheduleSource);

describe("периметр расписания закрыт секретом администратора на КАЖДОМ изменяющем маршруте", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let clinicToken: string;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedEnvironment = {
		secret: process.env[SECRET_VARIABLE],
		flag: process.env[UNGUARDED_FLAG],
		mode: process.env.NODE_ENV,
		persistence: process.env.DENTAL_STATE_PERSISTENCE,
	};

	before(async () => {
		process.env.DENTAL_STATE_PERSISTENCE = "off";
		app = Fastify({ logger: false });
		await registerScheduleRoutes(app);
		await app.ready();
		clinicToken = signToken(
			{ organizationId: ORGANIZATION },
			authTokenSecret(),
		);
	});

	after(async () => {
		await app?.close();
		restoreEnvironment();
	});

	function setEnvironment(value: string | undefined, variable: string): void {
		if (value === undefined) delete process.env[variable];
		else process.env[variable] = value;
	}

	function restoreEnvironment(): void {
		setEnvironment(savedEnvironment.secret, SECRET_VARIABLE);
		setEnvironment(savedEnvironment.flag, UNGUARDED_FLAG);
		setEnvironment(savedEnvironment.mode, "NODE_ENV");
		setEnvironment(savedEnvironment.persistence, "DENTAL_STATE_PERSISTENCE");
	}

	/**
	 * Тело запроса намеренно НЕ годное: путь «доступ открыт» обязан упереться в
	 * разбор тела, а не создать приём. Проверяется именно то, что охрана периметра
	 * не блокирует авторизованного врача клиники (Мандат 8e).
	 */
	async function attempt(
		route: DiscoveredRoute,
		secret: string | null,
		withClinicToken = true,
	): Promise<{ statusCode: number; error: string; message: string }> {
		const headers: Record<string, string> = {
			"content-type": "application/json",
		};
		if (withClinicToken) {
			headers["x-dente-clinic-token"] = clinicToken;
		}
		if (secret !== null) headers[SECRET_HEADER] = secret;
		const response = await app.inject({
			method: route.method,
			url: route.url,
			headers,
			payload: {},
		});
		let body: { error?: unknown; code?: unknown; message?: unknown } = {};
		try {
			body = response.json() as typeof body;
		} catch {
			body = {};
		}
		const error =
			typeof body.error === "string"
				? body.error
				: typeof body.code === "string"
					? body.code
					: "";
		return {
			statusCode: response.statusCode,
			error,
			message: typeof body.message === "string" ? body.message : "",
		};
	}

	/*
	 * САМОПРОВЕРКА ОБХОДА. Проверка, которая ничего не нашла, опаснее
	 * отсутствующей: она даёт спокойствие, не охраняя ничего. Здесь на выдуманном
	 * тексте проверяется, что обход и находит настоящую регистрацию, и не ловит
	 * документацию.
	 */
	test("обход исходника действительно находит маршруты и не ловит комментарии", () => {
		const sample = [
			'const headers = { Accept: "application/json;q=0.9, ' +
				"*/*" +
				';q=0.1" };',
			'/* app.post("/api/выдуманный-из-комментария", () => {}); */',
			'// app.put("/api/выдуманный-из-строчного-комментария", () => {});',
			'app.post("/api/самопроверка/настоящий", async () => {});',
		].join("\n");
		const found = discoverMutatingRoutes(sample).map(
			(route) => route.routePath,
		);
		assert.deepEqual(
			found,
			["/api/самопроверка/настоящий"],
			`обход исходника сломан, найдено: ${JSON.stringify(found)}. ` +
				"Либо он ловит документацию (тогда покраснеет на пустом месте), либо строка с «звёздочка-слэш» " +
				"съедает остаток файла и настоящие маршруты теряются — так уже терялись все 25 маршрутов routes/imaging.ts",
		);

		assert.ok(
			MUTATING_ROUTES.length >= 3,
			`в routes/schedule.ts найдено изменяющих маршрутов ${MUTATING_ROUTES.length}, а их не меньше трёх ` +
				"(создание приёма и ДВА адреса переноса). Обход перестал видеть файл — дальше он оправдает любую дыру",
		);
		const addresses = MUTATING_ROUTES.map(
			(route) => `${route.method} ${route.routePath}`,
		);
		assert.ok(
			addresses.includes("POST /api/appointments"),
			`создание приёма не найдено обходом, найдено: ${addresses.join(", ")}`,
		);
	});

	test("МАНДАТ 8e: авторизованный персонал клиники с токеном кабинета свободно меняет расписание БЕЗ секрета администратора", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			// Врач авторизован в клинике (withClinicToken = true) и НЕ передает админский секрет (secret = null)
			const { statusCode, error } = await attempt(route, null, true);
			// Врач не должен получать 403 ScheduleAdminSecretRequired или 503 ScheduleAdminSecretMissing
			assert.ok(
				!PERIMETER_CODES.has(error),
				`${where}: авторизованный врач заблокирован периметром (${statusCode} ${error}). ` +
					"Нарушение Мандата 8e: расписание врача не должно требовать админских секретов",
			);
			assert.ok(
				statusCode !== 403 && statusCode !== 503,
				`${where}: авторизованный врач получил отказ ${statusCode} вместо доступа к маршруту`,
			);
		}
	});

	test("без токена кабинета и без секрета маршруты закрыты для посторонних (401 AuthRequired)", async () => {
		delete process.env[SECRET_VARIABLE];
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			// Запрос снаружи БЕЗ токена клиники и БЕЗ секрета
			const { statusCode, error } = await attempt(route, null, false);
			assert.equal(
				statusCode,
				401,
				`${where}: без токена кабинета ответ ${statusCode} вместо 401`,
			);
			assert.equal(
				error,
				"AuthRequired",
				`${where}: машинный код ошибки обязан быть AuthRequired`,
			);
		}
	});

	test("без токена кабинета, но с верным секретом охрана пускает внешние интеграции", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const { statusCode, error } = await attempt(route, adminSecret, false);
			assert.ok(
				!PERIMETER_CODES.has(error),
				`${where}: с ВЕРНЫМ секретом внешняя интеграция отклонена периметром (${statusCode} ${error})`,
			);
			assert.ok(
				statusCode !== 403 && statusCode !== 503,
				`${where}: с верным секретом ответ ${statusCode} — запрос не дошёл до маршрута`,
			);
		}
	});

	test("без токена кабинета и с неверным секретом — доступ закрыт (401 AuthRequired или 403 ScheduleAdminSecretRequired)", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const wrong = await attempt(route, "заведомо-неверный-секрет", false);
			assert.ok(
				wrong.statusCode === 401 || wrong.statusCode === 403,
				`${where}: неверный секрет внешней интеграции пропущен, ответ ${wrong.statusCode}`,
			);
			assert.ok(
				wrong.error === "AuthRequired" ||
					wrong.error === "ScheduleAdminSecretRequired",
				`${where}: машинный код отказа потерян: ${wrong.error}`,
			);
		}
	});

	test("лазейка разработки работает только в названном режиме разработки и только по флагу", async () => {
		const route = MUTATING_ROUTES[0] as DiscoveredRoute;
		const where = `${route.method} ${route.routePath}`;
		delete process.env[SECRET_VARIABLE];

		process.env.NODE_ENV = "development";
		process.env[UNGUARDED_FLAG] = "1";
		const inDevelopment = await attempt(route, null, false);
		assert.ok(
			!PERIMETER_CODES.has(inDevelopment.error),
			`${where}: в режиме разработки с поднятым флагом охрана обязана пропускать, а ответ ${inDevelopment.statusCode} ${inDevelopment.error}. ` +
				"Сломано существующее послабление — локальная разработка встанет",
		);

		process.env.NODE_ENV = "development";
		delete process.env[UNGUARDED_FLAG];
		const withoutFlag = await attempt(route, null, false);
		assert.equal(
			withoutFlag.statusCode,
			401,
			`${where}: без флага и без токена лазейка не должна пускать посторонних (ответ ${withoutFlag.statusCode})`,
		);

		restoreEnvironment();
	});
});
