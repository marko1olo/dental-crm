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

process.env.DENTAL_STATE_PERSISTENCE = "off";

const SCHEDULE_ROUTE_FILE = path.resolve(
	import.meta.dirname,
	"../../routes/schedule.ts",
);
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

const scheduleSource = readFileSync(SCHEDULE_ROUTE_FILE, "utf8");
const MUTATING_ROUTES = discoverMutatingRoutes(scheduleSource);

describe("периметр расписания закрыт секретом администратора на КАЖДОМ изменяющем маршруте", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	const adminSecret = randomBytes(24).toString("base64url");
	const savedEnvironment = {
		secret: process.env[SECRET_VARIABLE],
		flag: process.env[UNGUARDED_FLAG],
		mode: process.env.NODE_ENV,
	};

	before(async () => {
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
	}

	/**
	 * Тело запроса намеренно НЕ годное: путь «секрет верен» обязан упереться в
	 * разбор тела, а не создать приём. Проверяется именно то, что охрана не
	 * отвечает за маршрут.
	 */
	async function attempt(
		route: DiscoveredRoute,
		secret: string | null,
	): Promise<{ statusCode: number; error: string; message: string }> {
		const headers: Record<string, string> = {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		};
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
		console.log(
			`изменяющие маршруты расписания под охраной: ${addresses.join(" | ")}`,
		);
	});

	test("без секрета администратора каждый изменяющий маршрут отвечает 403 и называет причину с действием", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const { statusCode, error, message } = await attempt(route, null);
			assert.equal(
				statusCode,
				403,
				`${where}: без секрета администратора ответ ${statusCode}. Расписание клиники меняется в обход гейта`,
			);
			assert.equal(
				error,
				"ScheduleAdminSecretRequired",
				`${where}: машинный код отказа потерян, экран по нему ветвится`,
			);
			assert.ok(
				message.length > 0,
				`${where}: отказ ушёл без message — администратор прочитает только «Запись не создана»`,
			);
			assert.ok(
				!LATIN_WORD_KILLING_THE_PHRASE.test(message),
				`${where}: в отказе латинское слово из шести и более букв, фильтр клиента погасит фразу целиком: ${message}`,
			);
			assert.match(
				message,
				REASON,
				`${where}: причина отказа не названа: ${message}`,
			);
			assert.match(
				message,
				NEXT_STEP,
				`${where}: в отказе нет следующего шага: ${message}`,
			);
		}
	});

	test("заведомо неверный секрет не проходит, и его отказ объяснён ПО-СВОЕМУ", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const wrong = await attempt(route, "заведомо-неверный-секрет");
			assert.equal(
				wrong.statusCode,
				403,
				`${where}: неверный секрет прошёл, ответ ${wrong.statusCode}`,
			);
			assert.equal(
				wrong.error,
				"ScheduleAdminSecretRequired",
				`${where}: машинный код отказа потерян`,
			);
			assert.ok(
				!LATIN_WORD_KILLING_THE_PHRASE.test(wrong.message),
				`${where}: в отказе латиница, экран погасит фразу: ${wrong.message}`,
			);
			assert.match(
				wrong.message,
				NEXT_STEP,
				`${where}: в отказе нет следующего шага: ${wrong.message}`,
			);

			/*
			 * Сервер различает «секрета нет» и «секрет не совпал» точно, а действия у
			 * них разные — ввести против взять действующий. Пока текст один, различие
			 * живёт только в машинном поле, которого человек не видит.
			 */
			const missing = await attempt(route, null);
			assert.notEqual(
				wrong.message,
				missing.message,
				`${where}: «секрета нет» и «секрет не совпал» объяснены одним текстом — администратор с опечаткой ` +
					"будет искать секрет, который у него в руках",
			);
		}
	});

	test("с верным секретом охрана НЕ мешает работать ни на одном маршруте", async () => {
		process.env[SECRET_VARIABLE] = adminSecret;
		delete process.env[UNGUARDED_FLAG];
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const { statusCode, error } = await attempt(route, adminSecret);
			/*
			 * Ожидается не 200, а «отказ не периметра»: тело запроса здесь заведомо
			 * не годное, и маршрут обязан судить его по существу (400 разбор, 404 нет
			 * записи). Требовать 200 значило бы заводить в тесте охраны живые данные.
			 */
			assert.ok(
				!PERIMETER_CODES.has(error),
				`${where}: с ВЕРНЫМ секретом ответ всё равно от периметра (${statusCode} ${error}). ` +
					"Администратор с правильным секретом не может изменить расписание",
			);
			assert.ok(
				statusCode !== 403 && statusCode !== 503,
				`${where}: с верным секретом ответ ${statusCode} — запрос не дошёл до самого маршрута`,
			);
		}
	});

	test("секрет не задан на сервере — расписание закрыто, и текст не отправляет вводить секрет", async () => {
		delete process.env[SECRET_VARIABLE];
		delete process.env[UNGUARDED_FLAG];
		process.env.NODE_ENV = "development";
		for (const route of MUTATING_ROUTES) {
			const where = `${route.method} ${route.routePath}`;
			const { statusCode, error, message } = await attempt(route, null);
			assert.equal(
				statusCode,
				503,
				`${where}: незаданный секрет расписания обязан закрывать изменение, а ответ ${statusCode}`,
			);
			assert.equal(
				error,
				"ScheduleAdminSecretMissing",
				`${where}: машинный код отказа потерян, экран по нему ветвится`,
			);
			assert.ok(
				!LATIN_WORD_KILLING_THE_PHRASE.test(message),
				`${where}: в отказе латиница, экран погасит фразу: ${message}`,
			);
			assert.match(
				message,
				/бесполезно|не задан/,
				`${where}: отказ не говорит, что дело в настройке сервера, и администратор будет вводить секрет по кругу: ${message}`,
			);
			assert.match(
				message,
				NEXT_STEP,
				`${where}: в отказе нет следующего шага: ${message}`,
			);
		}
	});

	/**
	 * ЛАЗЕЙКА РАЗРАБОТКИ — ЭТО ДВА УСЛОВИЯ, А НЕ ОДНО.
	 *
	 * Прежнее условие в этом файле было `NODE_ENV !== "production"`, и оно ИСТИННО
	 * при незаданном NODE_ENV — то есть на настоящем сервере, где `npm start`
	 * режим не задаёт. Проверки ниже закрепляют оба конца: названный режим
	 * разработки лазейку открывает, а незаданный и «production» — нет.
	 */
	test("лазейка работает только в названном режиме разработки и только по флагу", async () => {
		const route = MUTATING_ROUTES[0] as DiscoveredRoute;
		const where = `${route.method} ${route.routePath}`;
		delete process.env[SECRET_VARIABLE];

		process.env.NODE_ENV = "development";
		process.env[UNGUARDED_FLAG] = "1";
		const inDevelopment = await attempt(route, null);
		assert.ok(
			!PERIMETER_CODES.has(inDevelopment.error),
			`${where}: в режиме разработки с поднятым флагом охрана обязана пропускать, а ответ ${inDevelopment.statusCode} ${inDevelopment.error}. ` +
				"Сломано существующее послабление — локальная разработка встанет",
		);

		process.env.NODE_ENV = "development";
		delete process.env[UNGUARDED_FLAG];
		const withoutFlag = await attempt(route, null);
		assert.equal(
			withoutFlag.error,
			"ScheduleAdminSecretMissing",
			`${where}: без флага лазейка открылась сама, ответ ${withoutFlag.statusCode} ${withoutFlag.error}`,
		);

		process.env.NODE_ENV = "production";
		process.env[UNGUARDED_FLAG] = "1";
		const inProduction = await attempt(route, null);
		assert.equal(
			inProduction.error,
			"ScheduleAdminSecretMissing",
			`${where}: флаг открыл расписание в production, ответ ${inProduction.statusCode} ${inProduction.error}`,
		);

		/*
		 * ГЛАВНАЯ ИЗ ТРЁХ. Пустой NODE_ENV — типовое состояние настоящего сервера:
		 * `apps/api/package.json` объявляет `"start": "node dist/server.js"` и режима
		 * не задаёт. При прежнем условии `NODE_ENV !== "production"` флаг открывал
		 * расписание именно там, где это опаснее всего, и защищало только то, что
		 * флаг где-то не выставлен.
		 */
		delete process.env.NODE_ENV;
		process.env[UNGUARDED_FLAG] = "1";
		const withoutMode = await attempt(route, null);
		assert.equal(
			withoutMode.error,
			"ScheduleAdminSecretMissing",
			`${where}: при НЕЗАДАННОМ режиме флаг открыл изменение расписания (ответ ${withoutMode.statusCode} ${withoutMode.error}). ` +
				"Это состояние настоящего сервера клиники, а не разработки",
		);

		restoreEnvironment();
	});
});
