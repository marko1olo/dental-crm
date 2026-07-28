/**
 * smoke-clinical-mutation-guard.mjs — поведенческая проверка защиты маршрутов API.
 *
 * ЧТО БЫЛО СЛОМАНО
 * Этот гейт «доказывал» защиту, считая текстовые вхождения ИМЕНИ охранника в
 * исходнике и сравнивая с зашитым числом. Он врал в обе стороны:
 *
 *  1. ЗЕЛЕНЕЛ НА ПРОЗЕ. В apps/api/src/routes/speech.ts настоящих вызовов
 *     охранника мутаций осталось один вместо двух, но появился JSDoc с именем
 *     охранника — счётчик остался равен двум, проверка прошла.
 *  2. КРАСНЕЛ НА ИСПРАВНОМ КОДЕ. Постоянная ошибка
 *     «apps/api/src/routes/patients.ts must guard 3 protected route(s), found 0»
 *     была ложной: patients.ts проверяет доступ вручную — читает
 *     x-dente-clinic-token, вызывает verifyToken, отвечает 401
 *     AuthRequired/AuthExpired и берёт organizationId из ПОДПИСАННОГО токена, а
 *     не из заголовка. Это строже общего помощника. Гейт этого не видел, потому
 *     что искал слово, а не поведение.
 *
 * Из-за (2) скрипт падал на строке 125 — то есть ВСЯ поведенческая часть,
 * написанная ниже, не выполнялась ни разу. Вместе с ней сгнил и её зашитый
 * список адресов: он ждал 403 от POST /api/patients, который давно отвечает 401.
 *
 * ЧТО ЗДЕСЬ ТЕПЕРЬ
 * Ни одного зашитого перечня защищённых маршрутов и ни одного счёта имён.
 *  - Поднимается НАСТОЯЩЕЕ приложение (createDenteApiApp) и читается его
 *    таблица маршрутов. Появился новый адрес — он автоматически попадает в
 *    проверку; «маршрут, о котором гейт не знает» больше невозможен.
 *  - Каждому адресу отправляется запрос БЕЗ учётных данных. Ответ обязан быть
 *    401 или 403. Ответ 2xx — дыра. Ответ 400 — тоже провал: значит запрос
 *    дошёл до валидации тела, то есть охранник его не остановил.
 *  - Гейту всё равно, каким идиомом закрыт маршрут: общим requireClinical*
 *    или рукописной проверкой токена. Оба реальны, оба верны. Именно поэтому
 *    проверять надо поведение.
 *  - Секреты всех административных домена и вебхуков задаются синтетическими
 *    значениями. Иначе маршрут отвечает 503 «секрет не настроен» и выглядит
 *    защищённым только потому, что на этой машине не настроен сервер.
 *  - Законные исключения перечислены поимённо, каждое с причиной и ожидаемым
 *    кодом ответа. Устаревшая запись в списке исключений — это ошибка гейта, и
 *    она валит прогон.
 */

import { randomUUID } from "node:crypto";
import {
	collectRouteTable,
	createRealApiApp,
	materializeRouteUrl,
	mutatingHttpMethods,
	routeKey,
} from "./lib/api-route-census.mjs";

// ─── Синтетическое окружение ────────────────────────────────────────────────
// Значения одноразовые, генерируются на каждый прогон и никуда не печатаются.
// Секрет квитанций обязан быть не короче 16 символов (deliveryReceipts.ts:321),
// поэтому все секреты берутся из randomUUID.
function syntheticSecret(domain) {
	return `smoke-guard-${domain}-${randomUUID()}`;
}

const adminSecretEnvNames = Object.freeze({
	clinical: "DENTE_CLINICAL_ADMIN_SECRET",
	settings: "DENTE_SETTINGS_ADMIN_SECRET",
	telegram: "DENTE_TELEGRAM_ADMIN_SECRET",
});

const webhookSecretEnvNames = Object.freeze([
	"DENTE_WEBHOOK_SECRET",
	"DENTE_TELEGRAM_WEBHOOK_SECRET",
	"WHATSAPP_APP_SECRET",
	"DENTE_COMMUNICATION_RECEIPT_SECRET",
]);

const developmentEscapeFlagNames = Object.freeze([
	"DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_CLINICAL_ALLOW_UNGUARDED_READS",
	"DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS",
	"DENTE_DEV_ALLOW_HEADER_ORG",
	"DENTE_ALLOW_DEMO_LOGIN",
	"DENTE_ALLOW_DEMO_FIXTURES",
]);

const adminSecretHeader = "x-dente-admin-secret";
const secretValues = new Map();

function assignSecret(envName, domain) {
	const value = syntheticSecret(domain);
	secretValues.set(envName, value);
	process.env[envName] = value;
}

function clearDevelopmentEscapes() {
	for (const flag of developmentEscapeFlagNames) delete process.env[flag];
}

function clearAllSecrets() {
	for (const envName of Object.values(adminSecretEnvNames)) {
		delete process.env[envName];
	}
	for (const envName of webhookSecretEnvNames) delete process.env[envName];
}

// ─── Законные исключения ────────────────────────────────────────────────────
// Каждая запись обязана нести причину. Список сознательно короткий: всё, что в
// нём нет, должно отвечать 401/403 без учётных данных.
const unauthenticatedByDesign = [
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/health",
		expectedStatusCodes: [200],
		reason:
			"публичная проверка живости процесса; отдаёт только ok/service/time и никаких данных клиники",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/auth/status",
		expectedStatusCodes: [200],
		reason:
			"состояние входа до входа: отдаёт только флаги clinicUnlocked/staffUnlocked и null-поля, иначе экран входа нечем нарисовать",
	},
	{
		methods: ["OPTIONS"],
		routePath: "*",
		expectedStatusCodes: [204, 400, 404],
		reason:
			"предполётный запрос CORS от @fastify/cors; по спецификации браузер отправляет его без учётных данных",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/clinic/login",
		expectedStatusCodes: [400],
		reason: "вход в кабинет клиники: пароль и есть учётные данные, лимит 5/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/login",
		expectedStatusCodes: [400],
		reason: "вход пользователя по email и паролю, лимит 5/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/staff/unlock",
		expectedStatusCodes: [400],
		reason: "разблокировка смены сотрудника PIN-кодом, лимит 5/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/register",
		expectedStatusCodes: [400],
		reason: "саморегистрация новой клиники, лимит 10/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/setup/init",
		expectedStatusCodes: [400],
		reason: "первичная настройка: создаёт первую организацию, когда токенов ещё нет, лимит 10/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/invites/accept",
		expectedStatusCodes: [400],
		reason: "принятие приглашения: код приглашения в теле и есть учётные данные, лимит 10/мин",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/portal/lab-order/:token",
		expectedStatusCodes: [404],
		reason:
			"портал зуботехнической лаборатории: подписанный токен наряда в адресе и есть учётные данные (lab.ts:277-283)",
	},
	{
		methods: ["POST"],
		routePath: "/api/portal/lab-order/:token/status",
		expectedStatusCodes: [404],
		probePayload: { status: "in_progress" },
		reason:
			"техник меняет статус наряда по токену из адреса; допустимые статусы ограничены перечислением (lab.ts:302-321)",
	},
	{
		methods: ["POST"],
		routePath: "/api/portal/auth/send-otp",
		expectedStatusCodes: [400],
		reason: "пациент запрашивает код входа в портал по номеру телефона, лимит 30/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/portal/auth/verify-otp",
		expectedStatusCodes: [400],
		reason: "проверка кода из SMS: код и есть учётные данные, лимит 30/мин",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/public/booking/:organizationId/doctors",
		expectedStatusCodes: [200],
		reason: "виджет публичной записи: список принимающих врачей клиники, лимит 30/мин",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/public/booking/:organizationId/slots/:doctorId",
		expectedStatusCodes: [400],
		reason: "виджет публичной записи: свободные слоты врача, лимит 30/мин",
	},
	{
		methods: ["POST"],
		routePath: "/api/public/booking/:organizationId/book",
		expectedStatusCodes: [400],
		reason: "виджет публичной записи: сама запись пациента с сайта клиники, лимит 30/мин",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/p/:code",
		expectedStatusCodes: [400],
		reason:
			"публичная ссылка подтверждения/отмены приёма из напоминания: право несёт подписанный код в адресе, лимит на маршруте",
	},
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/whatsapp/webhook",
		expectedStatusCodes: [400],
		reason:
			"рукопожатие проверки вебхука Meta (hub.challenge) — провайдер выполняет его без секрета в заголовке",
	},
	{
		methods: ["POST"],
		routePath: "/api/telegram/webhook/:organizationId",
		expectedStatusCodes: [404],
		reason:
			"арендатор определяется ДО проверки секрета (telegram.ts:2388-2394), поэтому неизвестная организация отклоняется 404 без обращения к базе; ветку секрета закрывает беспараметровый POST /api/telegram/webhook, который эта же перепись валит в 401",
	},
	{
		methods: ["POST"],
		routePath: "/api/telegram/webhook/:organizationId/:botConfigId",
		expectedStatusCodes: [404],
		reason: "то же, что и вариант без botConfigId",
	},
];

// Маршруты, которые ДОЛЖНЫ быть закрыты, но не закрыты. Не молчаливое
// исключение: каждая запись печатается как долг и её ожидаемый ответ
// зафиксирован, поэтому исправление сразу потребует убрать запись.
const unguardedDebt = [
	{
		methods: ["POST"],
		routePath: "/api/settings/reset-demo",
		expectedStatusCodes: [200],
		reason:
			"settings.ts:637 — заглушка без охранника: отвечает {success:true} любому анониму и ничего не делает. Маршрут подлежит удалению, а не защите.",
	},
	{
		methods: ["POST"],
		routePath: "/api/settings/reset-zero",
		expectedStatusCodes: [200],
		reason:
			"settings.ts:641 — та же заглушка для очистки базы: {success:true} любому анониму, никаких действий.",
	},
];

// Маршруты, которые физически нельзя проверить через app.inject. Они НЕ
// опрашиваются вовсе, но обязаны существовать в таблице и печатаются в отчёте:
// пропущенный молча маршрут — это ошибка гейта, пропущенный названный — граница
// его применимости.
const notProbeable = [
	{
		methods: ["GET", "HEAD"],
		routePath: "/api/ws/schedule",
		reason:
			"точка апгрейда WebSocket: app.inject не выполняет рукопожатие Upgrade. Обычный GET проваливается в 404, а автоматический HEAD-двойник доходит до обработчика сокета и ставит таймер аутентификации, который затем падает на socket.close (dist/routes/websocket.js:73). Авторизация сокета этим гейтом НЕ проверяется.",
	},
];

// Обработчики, проверяющие ТЕЛО запроса раньше прав. Пустое тело даёт 400 до
// охранника, и проверка «дошло ли до охранника» теряет смысл. Поэтому зонд
// подаёт тело правильной ФОРМЫ (без единого настоящего значения) — и охранник
// отвечает так, как должен.
const payloadBeforeAuthorisation = [
	{
		methods: ["POST"],
		routePath: "/api/auth/clinic/set-password",
		payload: { newPassword: `smoke-guard-${randomUUID()}` },
		reason:
			"auth.ts:278-281 проверяет длину нового пароля до проверки прав (auth.ts:283-292)",
	},
	{
		methods: ["POST"],
		routePath: "/api/auth/staff/set-pin",
		payload: { userId: "11111111-1111-4111-8111-111111111111", newPin: "0000" },
		reason:
			"auth.ts:331-337 проверяет наличие сотрудника и форму PIN (4–12 цифр) до проверки прав (auth.ts:339-348)",
	},
];

const challengeStatusCodes = new Set([401, 403]);
const syntheticParamValue = "11111111-1111-4111-8111-111111111111";
const syntheticWildcardValue = "smoke-guard-wildcard";

function buildExceptionIndex(entries, kind) {
	const index = new Map();
	for (const entry of entries) {
		for (const method of entry.methods) {
			index.set(routeKey(method, entry.routePath), { ...entry, kind, method });
		}
	}
	return index;
}

const exceptions = new Map([
	...buildExceptionIndex(unauthenticatedByDesign, "public"),
	...buildExceptionIndex(unguardedDebt, "debt"),
	...buildExceptionIndex(notProbeable, "not-probeable"),
]);

const probePayloads = buildExceptionIndex(
	payloadBeforeAuthorisation,
	"payload-before-authorisation",
);

function responseErrorCode(response) {
	try {
		const body = response.json();
		return typeof body?.error === "string" ? body.error : "";
	} catch {
		return "";
	}
}

async function probeWithoutCredentials(app, entry, probePayload) {
	const url = materializeRouteUrl(entry.routePath, {
		paramValue: syntheticParamValue,
		wildcardValue: syntheticWildcardValue,
	});
	const injectOptions = { method: entry.method, url };
	if (entry.method !== "GET" && entry.method !== "HEAD") {
		injectOptions.payload = probePayload ?? {};
	}
	const response = await app.inject(injectOptions);
	return {
		statusCode: response.statusCode,
		errorCode: responseErrorCode(response),
		url,
	};
}

// ─── Прогон ─────────────────────────────────────────────────────────────────

const app = await createRealApiApp();
const routeTable = collectRouteTable(app);

const failures = [];
const warnings = [];

const unparseableRoutes = routeTable.filter(
	(entry) => entry.routePath.includes("(") || !entry.method,
);
for (const entry of unparseableRoutes) {
	failures.push(
		`ТАБЛИЦА МАРШРУТОВ РАЗОБРАНА НЕВЕРНО: ${routeKey(entry.method, entry.routePath)} — перепись нельзя считать полной`,
	);
}

// Секреты всех домена и вебхуков заданы, послабления разработки сняты,
// режим production: иначе часть маршрутов ответит 503 «не настроено» или
// вообще пропустит запрос как локальную отладку.
process.env.NODE_ENV = "production";
clearDevelopmentEscapes();
for (const [domain, envName] of Object.entries(adminSecretEnvNames)) {
	assignSecret(envName, domain);
}
for (const envName of webhookSecretEnvNames) assignSecret(envName, "webhook");

const probeStartedAt = Date.now();
const probeResults = [];
const skippedRoutes = [];
for (const entry of routeTable) {
	const key = routeKey(entry.method, entry.routePath);
	const exception = exceptions.get(key);
	if (exception?.kind === "not-probeable") {
		skippedRoutes.push({ route: key, reason: exception.reason });
		continue;
	}
	const payload = exception?.probePayload ?? probePayloads.get(key)?.payload;
	const result = await probeWithoutCredentials(app, entry, payload);
	probeResults.push({ ...entry, key, exception, ...result });
}
const probeElapsedMs = Date.now() - probeStartedAt;

for (const result of probeResults) {
	const challenged = challengeStatusCodes.has(result.statusCode);
	if (!result.exception) {
		if (!challenged) {
			failures.push(
				`НЕ ЗАЩИЩЁН: ${result.key} без учётных данных ответил ${result.statusCode}` +
					`${result.errorCode ? ` (${result.errorCode})` : ""}, ожидались 401 или 403`,
			);
		}
		continue;
	}
	if (challenged) {
		warnings.push(
			`ЗАПИСЬ ИСКЛЮЧЕНИЯ УСТАРЕЛА: ${result.key} теперь отвечает ${result.statusCode}` +
				` — маршрут закрыт, уберите его из списка «${result.exception.kind}»`,
		);
		continue;
	}
	if (!result.exception.expectedStatusCodes.includes(result.statusCode)) {
		failures.push(
			`ИСКЛЮЧЕНИЕ ИЗМЕНИЛО ПОВЕДЕНИЕ: ${result.key} ответил ${result.statusCode}` +
				`${result.errorCode ? ` (${result.errorCode})` : ""}, в списке «${result.exception.kind}» зафиксированы ` +
				`${result.exception.expectedStatusCodes.join("/")}`,
		);
	}
}

// Устаревшая запись, указывающая на несуществующий маршрут, опаснее лишней
// проверки: она оправдывает адрес, которого больше нет, а переименованный
// адрес молча остаётся без исключения.
const routeTableKeys = new Set(
	routeTable.map((entry) => routeKey(entry.method, entry.routePath)),
);
for (const key of exceptions.keys()) {
	if (!routeTableKeys.has(key)) {
		failures.push(
			`ЗАПИСЬ ИСКЛЮЧЕНИЯ УКАЗЫВАЕТ НА НЕСУЩЕСТВУЮЩИЙ МАРШРУТ: ${key}`,
		);
	}
}
for (const key of probePayloads.keys()) {
	if (!routeTableKeys.has(key)) {
		failures.push(
			`ЗОНДОВОЕ ТЕЛО ОПИСАНО ДЛЯ НЕСУЩЕСТВУЮЩЕГО МАРШРУТА: ${key}`,
		);
	}
}

// ─── Идиомы охраны, посчитанные по фактическим ответам ──────────────────────
const challengeIdioms = {};
for (const result of probeResults) {
	if (!challengeStatusCodes.has(result.statusCode)) continue;
	const label = `${result.statusCode} ${result.errorCode || "(без кода)"}`;
	challengeIdioms[label] = (challengeIdioms[label] ?? 0) + 1;
}

// ─── Охранник обязан ОТКРЫВАТЬСЯ по верным учётным данным ───────────────────
// Иначе постоянно закрытый маршрут (или вечно красный гейт) выглядел бы как
// защита. Проверяется по одному маршруту на каждый секретный идиом — только
// чтения, чтобы не выполнить настоящую запись в базу.
const secretDomainByErrorCode = new Map([
	["ClinicalReadSecretRequired", "clinical"],
	["ClinicalAdminSecretRequired", "clinical"],
	["SettingsAdminSecretRequired", "settings"],
	["DicomWebSettingsAdminSecretRequired", "settings"],
	["TelegramAdminSecretRequired", "telegram"],
]);
const unlockProbes = [];
const unlockedDomains = new Set();
for (const result of probeResults) {
	if (result.method !== "GET") continue;
	const domain = secretDomainByErrorCode.get(result.errorCode);
	if (!domain || unlockedDomains.has(result.errorCode)) continue;
	unlockedDomains.add(result.errorCode);
	const response = await app.inject({
		method: "GET",
		url: result.url,
		headers: {
			[adminSecretHeader]: secretValues.get(adminSecretEnvNames[domain]),
		},
	});
	const openedErrorCode = responseErrorCode(response);
	if (openedErrorCode === result.errorCode) {
		failures.push(
			`ОХРАННИК НЕ ОТКРЫВАЕТСЯ: ${result.key} с верным секретом домена «${domain}» снова ответил ${result.errorCode}`,
		);
	}
	unlockProbes.push({
		route: result.key,
		closedStatus: result.statusCode,
		closedError: result.errorCode,
		openedStatus: response.statusCode,
		openedError: openedErrorCode || null,
	});
}

// ─── Маршруты для проверок отказоустойчивости, выведенные из переписи ───────
const clinicalMutationRoute = probeResults.find(
	(result) =>
		mutatingHttpMethods.includes(result.method) &&
		result.errorCode === "ClinicalAdminSecretRequired",
);
const clinicalReadRoute = probeResults.find(
	(result) =>
		result.method === "GET" && result.errorCode === "ClinicalReadSecretRequired",
);
if (!clinicalMutationRoute) {
	failures.push(
		"В переписи нет ни одного меняющего маршрута под общим охранником клинических мутаций — проверять отказоустойчивость не на чем",
	);
}
if (!clinicalReadRoute) {
	failures.push(
		"В переписи нет ни одного читающего маршрута под общим охранником клинических чтений — проверять отказоустойчивость не на чем",
	);
}

async function injectRoute(result) {
	const injectOptions = { method: result.method, url: result.url };
	if (result.method !== "GET" && result.method !== "HEAD") {
		injectOptions.payload = {};
	}
	return app.inject(injectOptions);
}

const failClosedChecks = [];
if (clinicalMutationRoute && clinicalReadRoute) {
	// 1. production без секрета обязан отказывать, а не пропускать.
	clearAllSecrets();
	clearDevelopmentEscapes();
	process.env.NODE_ENV = "production";
	for (const [label, route] of [
		["мутация", clinicalMutationRoute],
		["чтение", clinicalReadRoute],
	]) {
		const response = await injectRoute(route);
		failClosedChecks.push({
			check: `production без секрета: ${label}`,
			route: route.key,
			statusCode: response.statusCode,
		});
		if (response.statusCode !== 503) {
			failures.push(
				`НЕ ОТКАЗЫВАЕТ ЗАКРЫТО: ${route.key} в production без секрета ответил ${response.statusCode}, ожидался 503`,
			);
		}
	}

	// 2. Секрет чужого домена не должен открывать клинические маршруты.
	for (const domain of ["settings", "telegram"]) {
		assignSecret(adminSecretEnvNames[domain], domain);
		for (const [label, route] of [
			["мутация", clinicalMutationRoute],
			["чтение", clinicalReadRoute],
		]) {
			const response = await injectRoute(route);
			failClosedChecks.push({
				check: `только секрет домена «${domain}»: ${label}`,
				route: route.key,
				statusCode: response.statusCode,
			});
			if (response.statusCode !== 503) {
				failures.push(
					`ЧУЖОЙ СЕКРЕТ ОТКРЫВАЕТ КЛИНИЧЕСКИЙ МАРШРУТ: ${route.key} при заданном только ${domain}-секрете ответил ${response.statusCode}, ожидался 503`,
				);
			}
		}
		delete process.env[adminSecretEnvNames[domain]];
	}

	// 3. Явное послабление для локального стенда обязано работать — иначе
	//    прототипный стенд без секретов не поднять, и разработчики отключат
	//    охранника целиком.
	process.env.NODE_ENV = "development";
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	const escapeResponse = await injectRoute(clinicalReadRoute);
	failClosedChecks.push({
		check: "явное послабление для чтений в development",
		route: clinicalReadRoute.key,
		statusCode: escapeResponse.statusCode,
	});
	if (escapeResponse.statusCode === 403 || escapeResponse.statusCode === 503) {
		failures.push(
			`ПОСЛАБЛЕНИЕ НЕ РАБОТАЕТ: ${clinicalReadRoute.key} с DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1 ответил ${escapeResponse.statusCode}`,
		);
	}
	delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
}

// ─── Публичный /api/health не должен раскрывать состояние резервных копий ───
process.env.NODE_ENV = "production";
const healthResponse = await app.inject({ method: "GET", url: "/api/health" });
const healthBodyText = healthResponse.body ?? "";
if (healthResponse.statusCode !== 200) {
	failures.push(
		`ПУБЛИЧНАЯ ПРОВЕРКА ЖИВОСТИ СЛОМАНА: GET /api/health ответил ${healthResponse.statusCode}`,
	);
}
if (/persistence|backup|резерв/i.test(healthBodyText)) {
	failures.push(
		"ПУБЛИЧНАЯ ПРОВЕРКА ЖИВОСТИ РАСКРЫВАЕТ ХРАНЕНИЕ: в теле /api/health есть сведения о персистентности/резервных копиях",
	);
}
const healthCsp = String(
	healthResponse.headers["content-security-policy"] ?? "",
);
if (!healthCsp.includes("default-src 'none'")) {
	failures.push(
		`ОТВЕТ JSON БЕЗ ЖЁСТКОЙ CSP: GET /api/health вернул Content-Security-Policy «${healthCsp}»`,
	);
}

// ─── Читаемое сообщение оператору вместо технического текста ────────────────
// Единственная поведенческая проверка этого сообщения в репозитории.
assignSecret(adminSecretEnvNames.clinical, "clinical");
process.env.DENTAL_LOCAL_WHISPER_URL = "not a valid local bridge url";
const localBridgeResponse = await app.inject({
	method: "GET",
	url: "/api/system/local-bridges/readiness",
	headers: {
		[adminSecretHeader]: secretValues.get(adminSecretEnvNames.clinical),
	},
});
delete process.env.DENTAL_LOCAL_WHISPER_URL;
if (localBridgeResponse.statusCode !== 200) {
	failures.push(
		`ГОТОВНОСТЬ ЛОКАЛЬНЫХ МОДУЛЕЙ НЕДОСТУПНА С ВЕРНЫМ СЕКРЕТОМ: ответ ${localBridgeResponse.statusCode}`,
	);
} else {
	const localBridgeText = JSON.stringify(localBridgeResponse.json());
	if (
		!localBridgeText.includes(
			"Адрес локального модуля не читается. Проверьте URL в серверных настройках.",
		)
	) {
		failures.push(
			"НЕЧИТАЕМОЕ ПРЕДУПРЕЖДЕНИЕ: при битом адресе локального модуля оператор не получает понятного текста",
		);
	}
	if (
		/(Invalid URL|TypeError|AbortError|ECONNREFUSED|ECONNRESET|fetch failed)/i.test(
			localBridgeText,
		)
	) {
		failures.push(
			"УТЕЧКА ТЕХНИЧЕСКОГО ТЕКСТА: готовность локальных модулей отдаёт наружу текст исключения парсера или сети",
		);
	}
}

await app.close();
clearAllSecrets();
clearDevelopmentEscapes();
delete process.env.NODE_ENV;

// ─── Отчёт ──────────────────────────────────────────────────────────────────
const mutatingProbes = probeResults.filter((result) =>
	mutatingHttpMethods.includes(result.method),
);
const readProbes = probeResults.filter(
	(result) => result.method === "GET" || result.method === "HEAD",
);
const summary = {
	ok: failures.length === 0,
	routeTableEntries: routeTable.length,
	probedRoutes: probeResults.length,
	mutatingRoutesProbed: mutatingProbes.length,
	readRoutesProbed: readProbes.length,
	challengedRoutes: probeResults.filter((result) =>
		challengeStatusCodes.has(result.statusCode),
	).length,
	challengedMutatingRoutes: mutatingProbes.filter((result) =>
		challengeStatusCodes.has(result.statusCode),
	).length,
	challengeIdioms,
	guardUnlockProbes: unlockProbes,
	failClosedChecks,
	exceptions: {
		unauthenticatedByDesign: unauthenticatedByDesign.map((entry) => ({
			route: `${entry.methods.join("/")} ${entry.routePath}`,
			expected: entry.expectedStatusCodes,
			reason: entry.reason,
		})),
		unguardedDebt: unguardedDebt.map((entry) => ({
			route: `${entry.methods.join("/")} ${entry.routePath}`,
			expected: entry.expectedStatusCodes,
			reason: entry.reason,
		})),
		notProbeable: notProbeable.map((entry) => ({
			route: `${entry.methods.join("/")} ${entry.routePath}`,
			reason: entry.reason,
		})),
	},
	skippedRoutes,
	payloadBeforeAuthorisation: payloadBeforeAuthorisation.map((entry) => ({
		route: `${entry.methods.join("/")} ${entry.routePath}`,
		reason: entry.reason,
	})),
	probeElapsedMs,
	warnings,
};

const reportLines = [JSON.stringify(summary, null, 2)];
if (failures.length > 0) {
	reportLines.push(`\nПРОВАЛЕНО ПРОВЕРОК: ${failures.length}`);
	for (const failure of failures) reportLines.push(`  - ${failure}`);
	reportLines.push(
		`\nЗащита маршрутов не подтверждена: ${failures.length} нарушений.`,
	);
}
// Поток дописывается до конца, и только потом процесс завершается принудительно.
// Без явного выхода прогон висит ~10 секунд: пул PostgreSQL и таймеры,
// поднятые настоящим приложением, держат цикл событий, а в наборе смоуков это
// время умножается на количество скриптов.
await new Promise((resolve) => {
	process.stdout.write(`${reportLines.join("\n")}\n`, resolve);
});
process.exit(failures.length > 0 ? 1 : 0);
