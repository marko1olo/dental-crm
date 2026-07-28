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
 *    СКОЛЬКО ИМЕННО маршрутов держится на этом — не проза, а замер: перед
 *    основным проходом выполняется проход с ПОЛНОСТЬЮ снятыми секретами, и его
 *    гистограмма ответов печатается в отчёте (secretsWithheldPosture). В
 *    прошлой сдаче это число было названо по памяти и оказалось занижено в 11
 *    раз (заявлено 24, фактически 276 из 479 — измерено ревизором и теперь
 *    измеряется каждым прогоном).
 *  - Законные исключения перечислены поимённо, каждое с причиной и ожидаемым
 *    кодом ответа. Устаревшая запись в списке исключений — это ошибка гейта, и
 *    она валит прогон.
 *  - Сборка обязана быть свежее исходников (см. api-route-census.mjs). Гейт,
 *    поднимающий устаревший dist, зеленеет о вчерашнем коде.
 *  - Поток логгера перехвачен: шум запросов отсекается уровнем, но любая запись
 *    уровня >= 40 валит прогон. Без этого забытый `return` после охранника
 *    («Reply was already sent…») невидим — код ответа тот же самый, а тело
 *    обработчика при этом выполняется.
 *
 * ГРАНИЦЫ ПРИМЕНИМОСТИ (перечислены явно, см. injectionLimitations в отчёте)
 * `app.inject` — не браузер. Утверждать, что каждый охранник, который проверяет
 * этот гейт, есть тот же охранник, в который стучится браузер, НЕЛЬЗЯ: у
 * инъекции нет рукопожатия Upgrade и нет слушающего сетевого порта, а один
 * охранник читает именно `listening`. Оба расхождения названы в отчёте вместе с
 * командой, которая их закрывает.
 */

import { randomUUID } from "node:crypto";
import {
	auditDevelopmentEscapeFlags,
	clearDevelopmentEscapes,
	collectRouteTable,
	createRealApiApp,
	loadGuardHeaderNames,
	loggerAlertLevel,
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

const secretValues = new Map();

function assignSecret(envName, domain) {
	const value = syntheticSecret(domain);
	secretValues.set(envName, value);
	process.env[envName] = value;
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
		// Гейт подставляет в :organizationId случайный UUID, то есть клинику,
		// которой в базе нет. Раньше маршрут отвечал на это 200 и пустым списком, и
		// здесь стояло [200]: пациент по мёртвой ссылке или устаревшему QR-коду
		// читал «Нет доступных врачей» и уходил, а клиника не узнавала, что её
		// виджет записи мёртв, потому что сервер отвечал успехом. Теперь
		// несуществующая клиника — это 404 с причиной и действием, и ожидание здесь
		// именно 404: вернувшийся 200 означал бы возврат дефекта.
		expectedStatusCodes: [404],
		reason:
			"виджет публичной записи: список принимающих врачей клиники, лимит 30/мин; " +
			"у случайного UUID клиники нет, поэтому ожидается отказ «клиника по ссылке не найдена»",
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

// ─── Названные границы применимости инъекции ────────────────────────────────
// Гейт уже честно объявлял слепое пятно по WebSocket. Второе расхождение с
// браузерным путём было в бумагах названо равенством — это неверно, и здесь оно
// зафиксировано так же явно.
const injectionLimitations = [
	{
		subject: "рукопожатие Upgrade у WebSocket",
		guard: "dist/routes/websocket.js — авторизация сокета",
		divergence:
			"app.inject не выполняет Upgrade, поэтому обработчик сокета либо не достигается, либо достигается без сокета",
		verdictImpact:
			"оба метода адреса не опрашиваются вовсе; они перечислены в notProbeable и в skippedRoutes",
		closingCommand:
			'живой WS-клиент против запущенного сервера: node -e "const ws=new (require(\'ws\'))(process.env.DENTE_WS_URL);ws.on(\'close\',(c)=>console.log(\'close\',c));ws.on(\'message\',(m)=>console.log(String(m)))"',
	},
	{
		subject: "процесс не слушает сетевой порт",
		guard:
			"apps/api/src/security/identity.ts:102-106 serverAcceptsNetworkConnections() → :112-115 unverifiedOrganizationUsable()",
		divergence:
			"решение о НЕПРОВЕРЕННОЙ (взятой из заголовка) организации зависит от request.server.server.listening. Под app.inject он всегда false, поэтому ветку, которую проходит браузер (listening=true), этот гейт не исполняет ни разу. Утверждение «каждый охранник, который проверяет гейт, — тот же охранник, в который стучится браузер» для этого охранника НЕВЕРНО.",
		verdictImpact:
			"на вердикт не влияет и ошибается в сторону ложного КРАСНОГО, а не зелёного: заголовочная организация принимается только при DENTE_DEV_ALLOW_HEADER_ORG=1 и NODE_ENV != production, а гейт держит production и снимает флаг. Это не рассуждение, а проба: см. failClosedChecks, «заголовок организации при снятом production-запрете».",
		closingCommand:
			"живой сервер на слушающем порту: тот же меняющий маршрут с заголовком организации и без токена при DENTE_DEV_ALLOW_HEADER_ORG=1 и NODE_ENV=development — сравнить с ответом через app.inject",
	},
];

/*
 * Обходной список для обработчиков, проверяющих ТЕЛО запроса РАНЬШЕ прав.
 *
 * ЭТО НАСТРОЙКА ЗОНДА, А НЕ СПИСОК НАХОДОК. Если обработчик разбирает тело до
 * охранника, пустое тело даёт 400 ещё до охранника, и проверка «дошло ли до
 * охранника» теряет смысл. Для таких маршрутов зонд подаёт тело правильной
 * ФОРМЫ, без единого настоящего значения.
 *
 * СПИСОК ПУСТ, И ЭТО РЕЗУЛЬТАТ, А НЕ УПУЩЕНИЕ. Здесь стояли два маршрута —
 * POST /api/auth/clinic/set-password и POST /api/auth/staff/set-pin — с
 * пояснениями «проверяет длину нового пароля до проверки прав» и «проверяет
 * наличие сотрудника и форму PIN до проверки прав». Оба обработчика с тех пор
 * ИСПРАВЛЕНЫ: сейчас в auth.ts у обоих сначала права, потом тело, о чём в коде
 * стоят прямые комментарии «СНАЧАЛА ПРАВА, ПОТОМ ТЕЛО». Пояснения же остались
 * прежними и описывали поведение, которого больше нет.
 *
 * Почему это было не безобидно. Гейт печатает этот список в своём выводе (см.
 * `payloadBeforeAuthorisation` в отчёте), и ведущий, читая отчёт, принял
 * настройку зонда за две живые находки безопасности и доложил их наверх как
 * новый дефект. Устаревшее пояснение в конфигурации инструмента доказательства
 * стоит ровно столько же, сколько устаревшая сборка: оба заставляют делать
 * выводы о прошлом состоянии кода.
 *
 * И обход ОСЛАБЛЯЛ проверку. Подавая правильное тело, зонд ни разу не проверял,
 * что ПУСТОЕ тело тоже отбивается охранником. Теперь оба маршрута опрашиваются
 * ровно как остальные 436, то есть исправление обработчиков проверяется
 * поведением, а не комментарием.
 *
 * Механизм оставлен: следующий обработчик, разбирающий тело раньше прав, снова
 * потребует записи здесь — и вместе с ней настоящей причины, а не унаследованной.
 */
const payloadBeforeAuthorisation = [];

// ─── Записи логгера, которые означают «охранник сработал» ───────────────────
// Уровень 40 сам по себе не дефект: часть охранников сообщает об отказе именно
// предупреждением, а этот гейт весь прогон занят тем, что провоцирует отказы.
// Поэтому здесь перечислены записи, каждая с исходником и причиной; всё
// остальное уровня >= 40 валит прогон. Запись о ДВОЙНОМ ОТВЕТЕ не может быть
// разрешена ни одной строкой этого списка — она проверяется раньше и всегда
// является провалом. Разрешение, ни разу не совпавшее за прогон, попадает в
// warnings: либо текст записи изменился, либо охранник перестал сообщать.
const expectedGuardLogRecords = [
	{
		pattern: /^\[webhook:[a-z0-9_-]+\] Отклонён запрос с неверным секретом\.$/,
		source: "apps/api/src/security/webhookAuth.ts:95-98",
		reason:
			"охранник вебхука отказал (401 WebhookSecretMismatch) и записал отказ предупреждением. Гейт стучится во все вебхуки без секрета, поэтому запись обязана появиться; её отсутствие подозрительнее её наличия.",
	},
];

const challengeStatusCodes = new Set([401, 403]);
/** «Секрет домена не настроен» — отказ по конфигурации, а не по правам. */
const secretUnconfiguredStatusCode = 503;
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

const { app, logCapture, buildFreshness, importEnvironment } =
	await createRealApiApp();
const { adminSecretHeader, organizationHeader } = await loadGuardHeaderNames();
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

// Инвентарь послаблений сверяется с исходниками: имя, найденное в коде и не
// внесённое в список, означает машину, на которой гейт прошёл бы мимо.
const escapeFlagAudit = await auditDevelopmentEscapeFlags();
for (const entry of escapeFlagAudit.undeclared) {
	failures.push(
		`ПОСЛАБЛЕНИЕ НЕ ВНЕСЕНО В СПИСОК: ${entry.name} (${entry.source}) снимается по факту находки, но отсутствует в developmentEscapeFlagNames — впишите имя, иначе следующее послабление снова окажется незамеченным`,
	);
}

/**
 * Один полный проход по таблице маршрутов запросами БЕЗ учётных данных.
 * Вызывается дважды: со снятыми секретами (замер того, сколько маршрутов
 * держится на «секрет не настроен») и с заданными (собственно проверка прав).
 */
async function sweepWithoutCredentials() {
	const startedAt = Date.now();
	const results = [];
	const skipped = [];
	for (const entry of routeTable) {
		const key = routeKey(entry.method, entry.routePath);
		const exception = exceptions.get(key);
		if (exception?.kind === "not-probeable") {
			skipped.push({ route: key, reason: exception.reason });
			continue;
		}
		const payload = exception?.probePayload ?? probePayloads.get(key)?.payload;
		const result = await probeWithoutCredentials(app, entry, payload);
		results.push({ ...entry, key, exception, ...result });
	}
	return { results, skipped, elapsedMs: Date.now() - startedAt };
}

// ─── Проход 1: секреты СНЯТЫ. Замер, а не проза ─────────────────────────────
// Прошлая сдача утверждала, что задание синтетических секретов затрагивает 24
// маршрута. Ревизор измерил 276 из 479. Число было взято из другой (протекающей)
// конфигурации и занижено в 11 раз. Теперь его меряет сам гейт на каждом
// прогоне, поэтому расходиться с реальностью ему больше негде.
process.env.NODE_ENV = "production";
await clearDevelopmentEscapes();
clearAllSecrets();
const secretsWithheldSweep = await sweepWithoutCredentials();

const secretsWithheldStatusHistogram = {};
for (const result of secretsWithheldSweep.results) {
	const label = String(result.statusCode);
	secretsWithheldStatusHistogram[label] =
		(secretsWithheldStatusHistogram[label] ?? 0) + 1;
}
const secretUnconfiguredRouteCount = secretsWithheldSweep.results.filter(
	(result) => result.statusCode === secretUnconfiguredStatusCode,
).length;
const secretsWithheldChallengedCount = secretsWithheldSweep.results.filter(
	(result) => challengeStatusCodes.has(result.statusCode),
).length;
// Следствие основного прохода, оставленное утверждением сознательно: замер без
// проверки гниёт. В пустом окружении открытым может быть только то, что названо
// публичным или записано долгом.
const openedWithoutSecrets = secretsWithheldSweep.results.filter(
	(result) =>
		!result.exception && result.statusCode >= 200 && result.statusCode < 300,
);
for (const result of openedWithoutSecrets) {
	failures.push(
		`ОТКРЫТ В ПУСТОМ ОКРУЖЕНИИ: ${result.key} без единого настроенного секрета ответил ${result.statusCode} — маршрут не назван публичным и не записан долгом`,
	);
}

// ─── Проход 2: секреты заданы, послабления сняты, режим production ──────────
// Иначе часть маршрутов ответит 503 «не настроено» или вообще пропустит запрос
// как локальную отладку.
process.env.NODE_ENV = "production";
await clearDevelopmentEscapes();
for (const [domain, envName] of Object.entries(adminSecretEnvNames)) {
	assignSecret(envName, domain);
}
for (const envName of webhookSecretEnvNames) assignSecret(envName, "webhook");

const gradedSweep = await sweepWithoutCredentials();
const probeResults = gradedSweep.results;
const skippedRoutes = gradedSweep.skipped;
const probeElapsedMs = gradedSweep.elapsedMs;

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
// Маршрут с РУКОПИСНОЙ проверкой токена: его ответ не зависит ни от секретов
// домена, ни от послаблений, поэтому именно на нём проверяется запрет
// заголовочной организации в production.
const handRolledAuthMutationRoute = probeResults.find(
	(result) =>
		mutatingHttpMethods.includes(result.method) &&
		result.errorCode === "AuthRequired",
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
if (!handRolledAuthMutationRoute) {
	failures.push(
		"В переписи нет ни одного меняющего маршрута с рукописной проверкой токена (401 AuthRequired) — запрет заголовочной организации в production проверять не на чем",
	);
}

async function injectRoute(result, headers) {
	const injectOptions = { method: result.method, url: result.url };
	if (result.method !== "GET" && result.method !== "HEAD") {
		injectOptions.payload = {};
	}
	if (headers) injectOptions.headers = headers;
	return app.inject(injectOptions);
}

const failClosedChecks = [];
if (clinicalMutationRoute && clinicalReadRoute) {
	// 1. production без секрета обязан отказывать, а не пропускать.
	clearAllSecrets();
	await clearDevelopmentEscapes();
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
		if (response.statusCode !== secretUnconfiguredStatusCode) {
			failures.push(
				`НЕ ОТКАЗЫВАЕТ ЗАКРЫТО: ${route.key} в production без секрета ответил ${response.statusCode}, ожидался ${secretUnconfiguredStatusCode}`,
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
			if (response.statusCode !== secretUnconfiguredStatusCode) {
				failures.push(
					`ЧУЖОЙ СЕКРЕТ ОТКРЫВАЕТ КЛИНИЧЕСКИЙ МАРШРУТ: ${route.key} при заданном только ${domain}-секрете ответил ${response.statusCode}, ожидался ${secretUnconfiguredStatusCode}`,
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
	if (
		escapeResponse.statusCode === 403 ||
		escapeResponse.statusCode === secretUnconfiguredStatusCode
	) {
		failures.push(
			`ПОСЛАБЛЕНИЕ НЕ РАБОТАЕТ: ${clinicalReadRoute.key} с DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1 ответил ${escapeResponse.statusCode}`,
		);
	}
	delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
}

// 4. Заголовок организации в production не открывает ЗАПИСЬ.
//    Именно этим держится безвредность расхождения app.inject и слушающего
//    порта (injectionLimitations): непроверенная организация вообще не
//    возникает, пока послабление не включено, а в production оно выключено
//    принудительно. Утверждение измеряется, а не пересказывается.
if (handRolledAuthMutationRoute) {
	process.env.NODE_ENV = "production";
	process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
	const headerOrgResponse = await injectRoute(handRolledAuthMutationRoute, {
		[organizationHeader]: syntheticParamValue,
	});
	delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
	failClosedChecks.push({
		check: "заголовок организации при снятом production-запрете",
		route: handRolledAuthMutationRoute.key,
		statusCode: headerOrgResponse.statusCode,
	});
	if (!challengeStatusCodes.has(headerOrgResponse.statusCode)) {
		failures.push(
			`ЗАГОЛОВОК ОРГАНИЗАЦИИ ОТКРЫВАЕТ ЗАПИСЬ: ${handRolledAuthMutationRoute.key} в production с ${organizationHeader} и DENTE_DEV_ALLOW_HEADER_ORG=1 ответил ${headerOrgResponse.statusCode}, ожидались 401 или 403`,
		);
	}
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
await clearDevelopmentEscapes();
delete process.env.NODE_ENV;

// ─── Записи логгера: единственный признак ответа «дважды» ───────────────────
// Охранник, который ответил 403 и НЕ прервал обработчик, отдаёт тот же 403 —
// по коду ответа это не отличить. Fastify сообщает об этом записью уровня 40.
const expectedRecordHits = new Map();
const loggerAlerts = logCapture.alerts().map((alert) => {
	if (alert.doubleReply) {
		failures.push(
			`ОБРАБОТЧИК ОТВЕТИЛ ДВАЖДЫ: ${alert.message}${alert.requestId ? ` (запрос ${alert.requestId})` : ""}` +
				" — охранник ответил, но тело обработчика продолжило работу: потерян «return» после охранника",
		);
		return { ...alert, expectedBy: null };
	}
	const allowance = expectedGuardLogRecords.find((entry) =>
		entry.pattern.test(alert.message),
	);
	if (allowance) {
		expectedRecordHits.set(
			allowance.source,
			(expectedRecordHits.get(allowance.source) ?? 0) + 1,
		);
		return { ...alert, expectedBy: allowance.source };
	}
	failures.push(
		`ЛОГГЕР СООБЩИЛ О СБОЕ (уровень ${alert.level ?? "?"} >= ${loggerAlertLevel}): ${alert.message}` +
			`${alert.requestId ? ` (запрос ${alert.requestId})` : ""}`,
	);
	return { ...alert, expectedBy: null };
});
for (const entry of expectedGuardLogRecords) {
	if (expectedRecordHits.has(entry.source)) continue;
	warnings.push(
		`РАЗРЕШЕНИЕ ЗАПИСИ ЛОГГЕРА НИ РАЗУ НЕ СОВПАЛО: ${entry.source} — либо текст записи изменился, либо охранник перестал сообщать об отказе; проверьте запись, а не удаляйте её молча`,
	);
}

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
	buildFreshness,
	importEnvironment,
	logCaptureLevel: logCapture.level,
	loggerAlerts,
	expectedGuardLogRecords: expectedGuardLogRecords.map((entry) => ({
		pattern: String(entry.pattern),
		source: entry.source,
		matched: expectedRecordHits.get(entry.source) ?? 0,
		reason: entry.reason,
	})),
	escapeFlagAudit,
	secretsWithheldPosture: {
		probedRoutes: secretsWithheldSweep.results.length,
		secretUnconfiguredRoutes: secretUnconfiguredRouteCount,
		challengedRoutes: secretsWithheldChallengedCount,
		statusHistogram: secretsWithheldStatusHistogram,
		elapsedMs: secretsWithheldSweep.elapsedMs,
		meaning:
			`столько маршрутов отвечает ${secretUnconfiguredStatusCode} «секрет домена не настроен», пока гейт не задал синтетические секреты. ` +
			"Это не защита правами, а отказ по конфигурации, и без синтетических секретов такие маршруты выглядели бы закрытыми даром.",
	},
	challengeIdioms,
	guardUnlockProbes: unlockProbes,
	failClosedChecks,
	injectionLimitations,
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
