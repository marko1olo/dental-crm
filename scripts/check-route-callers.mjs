/**
 * Маршрут без вызывающего и маршрут с пятью вызывающими.
 *
 * ЗАЧЕМ. Два дефекта этого дерева, каждый из которых пришлось находить ГЛАЗАМИ,
 * потому что поймать их было нечем:
 *
 *  1. `DELETE /api/settings/chairs/:chairId` был живым маршрутом сервера, а в
 *     интерфейсе его не звал НИКТО: функция `deleteChair` существовала в
 *     useAppLogic и не имела ни одного вызова, кнопки не было. Разбор лежит в
 *     `apps/web/src/components/settings/SettingsClinicTab.tsx:880`. Починено — и
 *     ровно поэтому этот гейт НЕ может опереться на него как на живой пример.
 *  2. `POST /api/settings/staff` оброс ТРЕМЯ отдельными реализациями вызова
 *     (`useAppLogic.tsx:7482`, `useAppLogic.tsx:7551`,
 *     `components/settings/SettingsStaffTab.tsx:97`), а
 *     `PUT /api/settings/staff/:staffId` — ДВУМЯ (`useAppLogic.tsx:7506`,
 *     `SettingsStaffTab.tsx:180`). Три реализации одного запроса — это три места,
 *     где надо не забыть заголовок, три разных тела и три разных разбора отказа.
 *
 * ПОЧЕМУ ЭТОГО НЕ ЛОВИТ НИЧТО ИЗ СУЩЕСТВУЮЩЕГО. Ни один из этих случаев не
 * ошибка типов: обе стороны компилируются, `npm run typecheck` зелёный по
 * построению — он не знает, что строка «/api/settings/staff» кого-то адресует.
 * Соседний гейт `apps/api/src/tests/webCallsExistingRoutes.test.ts` проверяет
 * ОБРАТНОЕ направление — «интерфейс зовёт адрес, которого на сервере нет» (404),
 * с двумя списками долга и храповиком. Направление «маршрут есть, а звать его
 * некому» и «маршрут один, а реализаций вызова три» там не проверяется ничем, и
 * в этом нет упрёка: это другой вопрос к тем же двум наборам данных.
 *
 * ПОЧЕМУ ГЕЙТ ПОКА ТОЛЬКО ПЕЧАТАЕТ (код возврата 0). Первый прогон находок даёт
 * много, и часть из них — законная (вебхуки, портал пациента, публичный виджет:
 * их клиента в этом репозитории нет вовсе). Сделать `lint` красным для всей
 * команды — решение владельца гейтов, а не автора скрипта. Красный порог ставится
 * одной строкой, когда список разобран: см. ЧТО СТАВИТЬ КРАСНЫМ в конце файла.
 *
 * Код возврата 2 оставлен и используется: он означает, что сломан САМ разбор.
 * Проверка, которая ничего не находит, опаснее отсутствующей — она даёт
 * спокойствие, ничего не охраняя.
 *
 * Только чтение. Ни сборки, ни базы, ни сети (кроме необязательного `--live`).
 *
 * Запуск:  node scripts/check-route-callers.mjs [--live] [--all]
 *   --live  дополнительно сверить статический разбор с таблицей маршрутов ЖИВОГО
 *           Fastify (`scripts/lib/api-route-census.mjs`). Требует свежего
 *           `apps/api/dist`; без него шаг пропускается с объяснением, а не молча.
 *   --all   печатать находки целиком, без сокращения длинных списков.
 */

import {
	buildTopology,
	callSitesOf,
	classifySurface,
	clientUsageIn,
	collectClientUsage,
	collectServerRoutes,
	matchPrecision,
	normalizeRoutePath,
	pathsMatch,
	routeRegistrationsIn,
	surfaceInternal,
} from "./lib/route-topology.mjs";

const printAll = process.argv.includes("--all");
const withLiveCensus = process.argv.includes("--live");

function fail(message, ...details) {
	console.error(`САМОПРОВЕРКА НЕ ПРОШЛА: ${message}`);
	for (const line of details) console.error(`    ${line}`);
	process.exit(2);
}

/*
 * ═══ САМОПРОВЕРКА РАЗБОРА ═════════════════════════════════════════════════════
 *
 * Всё ниже гоняет ТОТ ЖЕ код, что и дерево, на образцах, снятых с живых файлов.
 * Каждый образец здесь стоит не «для полноты», а потому что ровно на нём один из
 * существующих разборов этого репозитория измеренно ослеп.
 */
{
	// ── Сервер: форма регистрации ───────────────────────────────────────────────
	const serverFixture = [
		// Получатель НЕ `app`. Два ЖИВЫХ маршрута дерева зарегистрированы так, и
		// оба закрытых списка получателей в репозитории их не видят:
		// routes/websocket.ts:96 и routes/whatsapp.ts:334.
		'	wsApp.get("/api/ws/schedule", { websocket: true }, handler);',
		"	await app.register(async (webhookScope) => {",
		'		webhookScope.post("/api/whatsapp/webhook", async (request, reply) => {});',
		"	});",
		// Дженерик с вложенным «>»: на нём обрывался класс [^>] и девять живых
		// адресов исчезали из набора.
		'	app.get<{ Querystring: Record<string, unknown> }>("/api/telegram/outbox", handler);',
		// Литерал регулярного выражения с кавычкой внутри — imaging.ts:1084. На нём
		// разъезжался посимвольный лексер, после чего заголовок Accept ниже открывал
		// мнимый комментарий на 155 тысяч символов.
		'	if (!/[;"\\n]/.test(value)) return value;',
		'	const headers = { Accept: "application/dicom+json, application/json;q=0.9, */*;q=0.1" };',
		// Три подделки, которые маршрутом считаться не должны.
		'	// app.get("/api/never/registered", handler);',
		"	/*",
		'	 * app.get("/api/never/registered/inside-block", handler);',
		"	 */",
		'	const documented = "app.get(\\"/api/never/registered/inside-string\\", handler)";',
		// Обращение к словарю по ключу, похожему на путь: один аргумент, не маршрут.
		'	const cached = routeCache.get("/api/never/registered/in-map");',
		'	const linked = patientLinks.get("/api/never/registered/in-links");',
		// Путь в переменной: утверждать нечего, и выдуманный маршрут «ROUTE_PATH»
		// в наборе хуже отсутствующего.
		"	app.get(ROUTE_PATH, handler);",
	].join("\n");

	const seen = routeRegistrationsIn("fixture.ts", serverFixture).map(
		(entry) => `${entry.method} ${entry.declaredPath}`,
	);
	const expected = [
		"GET /api/ws/schedule",
		"POST /api/whatsapp/webhook",
		"GET /api/telegram/outbox",
	];
	if (JSON.stringify(seen) !== JSON.stringify(expected)) {
		fail(
			"разбор регистраций разошёлся с образцом.",
			`ожидалось: ${JSON.stringify(expected)}`,
			`получено:  ${JSON.stringify(seen)}`,
			"Лишняя строка «never/registered» означает, что комментарий, строка или обращение к словарю",
			"снова считаются маршрутом — гейт объявит мёртвым адрес, которого на сервере нет вообще.",
			"Пропавшая строка означает обратное: потеряна живая регистрация, и гейт отправит человека",
			"удалять работающий код. Второе дороже: /api/ws/schedule и /api/whatsapp/webhook живые.",
		);
	}

	// ── Сведение адресов ────────────────────────────────────────────────────────
	// Слепые пятна, за которые соседний гейт заплатил четырьмя пропущенными
	// вызовами (scripts/check-guarded-route-headers.mjs, блок blindSpots).
	const mustMatch = [
		["/api/communications/outbox/:param/cancel", "/api/communications/outbox/:param/:param"],
		["/api/settings/staff/:param", "/api/settings/staff/:param"],
		["/api/communications/outbox", normalizeRoutePath("/api/communications/outbox${query}")],
	];
	for (const [routePath, callPath] of mustMatch) {
		if (!pathsMatch(routePath, callPath)) {
			fail(`«${callPath}» не сведён с «${routePath}» — вызывающий потерян, маршрут выглядел бы мёртвым.`);
		}
	}
	if (pathsMatch("/api/patients/duplicates", "/api/patients/:param/duplicates")) {
		fail("адреса с разным числом сегментов сведены — вызовы приписываются чужим маршрутам.");
	}
	if (pathsMatch("/api/settings/staff", "/api/settings/chairs")) {
		fail("разные адреса сведены — весь отчёт был бы случайным.");
	}

	// ── Ничья сведения, ИЗМЕРЕННАЯ на дереве ───────────────────────────────────
	// Упоминание `/api/settings/staff/:param` сводится и с одноимённым маршрутом, и
	// с литеральным `/api/settings/staff/commissions`. На подсчёте одних совпадений
	// оценки выходили равными, упоминание приписывалось обоим, и
	// `GET /api/settings/staff/commissions` выглядел вызываемым, хотя его не зовёт
	// никто. Ничья в пользу неверного кандидата ПРЯЧЕТ находку.
	const exactScore = matchPrecision("/api/settings/staff/:param", "/api/settings/staff/:param");
	const bridgedScore = matchPrecision("/api/settings/staff/commissions", "/api/settings/staff/:param");
	if (!(exactScore > bridgedScore)) {
		fail(
			"сведение через подстановку оценено не хуже точного — упоминание приписывается лишним маршрутам,",
			`точное=${exactScore}, через подстановку=${bridgedScore}`,
			"и живая находка «GET /api/settings/staff/commissions никем не зовётся» из отчёта исчезает.",
		);
	}

	// ── Адрес внутри литерала, а не с его начала ────────────────────────────────
	// Четыре вызывающих /api/ws/schedule написаны как "ws://host:4100/api/ws/..."
	// и `${protocol}//${host}/api/ws/schedule`. Разбор, требующий /api/ в начале
	// литерала, объявит работающий эндпоинт живых обновлений мёртвым.
	if (normalizeRoutePath("ws://localhost:4100/api/ws/schedule".slice("ws://localhost:4100".length)) !== "/api/ws/schedule") {
		fail("нормализация испортила адрес живых обновлений.");
	}

	// ── Свод: мёртвый маршрут находится, живой — нет ────────────────────────────
	// Оба класса на выдуманных данных, потому что настоящий пример первого класса
	// (deleteChair) уже починен, а гейт обязан продолжать его ловить.
	const probeRoutes = [
		{ method: "DELETE", path: "/api/самопроверка/кресла/:param", where: "fixture.ts:1", file: "fixture.ts", prefix: "", receiver: "app", declaredPath: "" },
		{ method: "POST", path: "/api/самопроверка/сотрудники", where: "fixture.ts:2", file: "fixture.ts", prefix: "", receiver: "app", declaredPath: "" },
		{ method: "GET", path: "/api/самопроверка/выгрузка/:param", where: "fixture.ts:3", file: "fixture.ts", prefix: "", receiver: "app", declaredPath: "" },
	];
	const probeCalls = [
		{ file: "A.tsx", line: 10, fromTest: false, method: "POST", path: "/api/самопроверка/сотрудники", raw: "" },
		{ file: "A.tsx", line: 90, fromTest: false, method: "POST", path: "/api/самопроверка/сотрудники", raw: "" },
		{ file: "B.tsx", line: 20, fromTest: false, method: "POST", path: "/api/самопроверка/сотрудники", raw: "" },
		// Вызов ИЗ ТЕСТА не делает маршрут живым: пользователя у него по-прежнему нет.
		{ file: "x.test.ts", line: 5, fromTest: true, method: "DELETE", path: "/api/самопроверка/кресла/:param", raw: "" },
	];
	const probeReferences = [
		// Ссылка на выгрузку — настоящий пользователь маршрута, хотя это не fetch.
		{ file: "C.tsx", line: 7, fromTest: false, path: "/api/самопроверка/выгрузка/:param" },
	];
	const probe = buildTopology({ routes: probeRoutes, calls: probeCalls, references: probeReferences });
	const probeByKey = new Map(probe.map((entry) => [entry.key, entry]));
	const dead = probeByKey.get("DELETE /api/самопроверка/кресла/:param");
	const duplicated = probeByKey.get("POST /api/самопроверка/сотрудники");
	const viaHref = probeByKey.get("GET /api/самопроверка/выгрузка/:param");
	if (!dead || dead.callers.length !== 0) {
		fail("маршрут без вызывающих получил вызывающего — класс «deleteChair» больше не ловится.");
	}
	if (dead.referrers.length !== 0) {
		fail("вызов из теста посчитан пользователем маршрута — мёртвый маршрут выглядел бы живым.");
	}
	if (!duplicated || duplicated.callers.length !== 3) {
		fail(
			`маршрут с тремя реализациями показал ${duplicated?.callers.length ?? "нет данных"} — класс «POST /api/settings/staff» больше не ловится.`,
		);
	}
	if (!viaHref || viaHref.referrers.length !== 1) {
		fail("ссылка <a href> не признана пользователем маршрута — гейт потребует удалить работающую выгрузку.");
	}

	// ── Обращение через общий помощник запросов ─────────────────────────────────
	// Так сегодня написан SettingsStaffTab: адрес уходит свойством `url:` в
	// requestStaffMutation, а `fetch` внутри помощника получает переменную. Третья
	// реализация `POST /api/settings/staff` видна ТОЛЬКО так, и если счёт вести по
	// одному `fetch`, гейт покажет 2 вместо 3 — то есть не увидит того самого
	// случая, ради которого написан.
	const viaHelper = buildTopology({
		routes: [probeRoutes[1]],
		calls: probeCalls.filter((call) => call.file !== "B.tsx" && !call.fromTest),
		references: [{ file: "SettingsStaffTab.tsx", line: 117, fromTest: false, path: "/api/самопроверка/сотрудники" }],
	})[0];
	const helperSites = callSitesOf(viaHelper);
	if (helperSites.length !== 3) {
		fail(
			`обращений к маршруту сосчитано ${helperSites.length}, а их 3 (два fetch и один адрес через общий помощник).`,
			"Счёт по одному `fetch` не видит обращений через помощник запросов, а в дереве он уже есть:",
			"apps/web/src/components/settings/staffMutationRequest.ts зовут два экрана настроек.",
		);
	}
	if (helperSites.filter((site) => site.via === "fetch").length !== 2) {
		fail("обращения через помощник и напрямую перестали различаться в отчёте.");
	}

	// ── Один вызов не должен считаться двумя ───────────────────────────────────
	// Измерено на дереве: у PUT /api/settings/staff/:param/working-hours выходило
	// две «реализации» — сам `fetch` (useScheduleLogic.ts:472) и его же адрес,
	// перенесённый на следующую строку (:473). Гейт, удваивающий счёт, отправляет
	// искать копию, которой нет, — и на такой гейт перестают смотреть.
	const doubleCountProbe = clientUsageIn(
		"fixture.tsx",
		"const response = await fetch(\n\t`/api/самопроверка/двойной-счёт/${id}`,\n\t{ method: \"PUT\" },\n);",
	);
	if (doubleCountProbe.calls.length !== 1) {
		fail(`разбор нашёл ${doubleCountProbe.calls.length} вызовов вместо одного.`);
	}
	if (doubleCountProbe.references.length !== 0) {
		fail(
			"адрес внутри вызова `fetch` попал ещё и в упоминания — один запрос сосчитан дважды.",
			`упоминаний: ${doubleCountProbe.references.length}`,
		);
	}

	// ── Адрес, собранный из основания в постоянной ──────────────────────────────
	// ИЗМЕРЕНО НА ДЕРЕВЕ: без разворачивания постоянных гейт объявил мёртвыми ВСЕ
	// ПЯТЬ маршрутов лидов, хотя их зовёт store/leadsStore.ts запросами вида
	// `fetch(`${API_URL}/leads`)`. В литерале такого запроса «/api/» нет вообще,
	// поэтому разбор его не видел и выбрасывал молча. Пять живых маршрутов в
	// списке «звать некому» — это отчёт, после которого гейт выключают.
	const baseProbe = clientUsageIn(
		"fixture.ts",
		[
			'const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100/api";',
			'const uiPreferencesServerPath = "/api/самопроверка/настройки";',
			"async function load() {",
			"	await fetch(`${API_URL}/самопроверка/лиды`);",
			"	await fetch(uiPreferencesServerPath);",
			'	await fetch(`${externalHost}/самопроверка/чужое`);',
			'	await fetch("https://example.ru/внешний");',
			"}",
		].join("\n"),
	);
	const baseProbePaths = baseProbe.calls.map((call) => call.path).sort();
	if (JSON.stringify(baseProbePaths) !== JSON.stringify(["/api/самопроверка/лиды", "/api/самопроверка/настройки"])) {
		fail(
			"адрес, собранный из основания в постоянной, не развернулся.",
			`получено: ${JSON.stringify(baseProbePaths)}`,
			"Это ровно тот случай, на котором гейт объявил мёртвыми все пять маршрутов лидов.",
		);
	}
	if (baseProbe.unresolved.length !== 1) {
		fail(
			`неразобранных адресов ${baseProbe.unresolved.length}, а должен быть один.`,
			"Запрос с неизвестным основанием обязан попасть в НЕИЗВЕСТНО, а не выброситься молча:",
			"молча выброшенный вызов превращает живой маршрут в мёртвый. Внешняя ссылка, наоборот,",
			"в НЕИЗВЕСТНО попадать не должна — иначе список НЕИЗВЕСТНО перестанут читать.",
		);
	}

	console.log("самопроверка: регистрация на не-`app` найдена, комментарий и словарь маршрутом не считаются,");
	console.log("              мёртвый маршрут найден, три реализации сосчитаны (включая обращение через");
	console.log("              общий помощник), один вызов не сосчитан дважды, вызов из теста не в счёт,");
	console.log("              ссылка href признана пользователем маршрута, сведение через подстановку");
	console.log("              слабее точного");
}

/* ═══ РАЗБОР ДЕРЕВА ══════════════════════════════════════════════════════════ */

const server = collectServerRoutes();
const client = collectClientUsage();
const topology = buildTopology({ routes: server.routes, calls: client.calls, references: client.references });

/*
 * НИЖНИЕ ГРАНИЦЫ НА САМ РАЗБОР. Одна опечатка в поиске — и гейт станет зелёным на
 * любом дереве, ничего не проверяя. Границы поставлены заведомо ниже замера
 * (маршруты и экраны законно появляются и исчезают), ловится обвал до нуля.
 */
if (server.routes.length < 100) {
	fail(
		`маршрутов сервера собрано ${server.routes.length} — при таком числе гейт объявит мёртвым почти всё.`,
		`просмотрено файлов: ${server.fileCount}`,
	);
}
if (client.calls.filter((call) => !call.fromTest).length < 100) {
	fail(
		`вызовов интерфейса разобрано ${client.calls.filter((call) => !call.fromTest).length} — разбор клиента обвалился.`,
		`просмотрено файлов: ${client.fileCount}`,
	);
}

const productionCalls = client.calls.filter((call) => !call.fromTest);
const unresolvedProduction = client.unresolved.filter((entry) => !entry.fromTest);

const withoutCallers = topology.filter(
	(entry) => entry.callers.length === 0 && entry.methodUnknownCallers.length === 0 && entry.referrers.length === 0,
);
const internalWithoutCallers = withoutCallers.filter((entry) => classifySurface(entry.path) === surfaceInternal);
const externalWithoutCallers = withoutCallers.filter((entry) => classifySurface(entry.path) !== surfaceInternal);
const withSites = topology.map((entry) => ({ entry, sites: callSitesOf(entry) }));
const multipleImplementations = withSites
	.filter((row) => row.sites.length > 1)
	.sort((left, right) => right.sites.length - left.sites.length);
const multipleFetchOnly = topology.filter((entry) => entry.callers.length > 1);
const methodUnknownOnly = topology.filter(
	(entry) => entry.callers.length === 0 && entry.methodUnknownCallers.length > 0,
);
const referencedNotFetched = topology.filter(
	(entry) => entry.callers.length === 0 && entry.methodUnknownCallers.length === 0 && entry.referrers.length > 0,
);

/* ═══ ОТЧЁТ ══════════════════════════════════════════════════════════════════ */

console.log("");
console.log("─── что разобрано ──────────────────────────────────────────────────────");
console.log(`файлов сервера просмотрено:            ${server.fileCount}`);
console.log(`маршрутов /api найдено:                ${server.routes.length}`);
console.log(`маршрутов вне /api (не проверяются):   ${server.nonApi.length}`);
console.log(`файлов клиента просмотрено:            ${client.fileCount}`);
console.log(`вызовов fetch к своему серверу:        ${productionCalls.length} (плюс ${client.calls.length - productionCalls.length} из тестов)`);
console.log(`упоминаний адреса вне fetch:           ${client.references.filter((r) => !r.fromTest).length}`);
console.log(`получатели регистраций:                ${server.receivers.map(([name, count]) => `${name}=${count}`).join(", ")}`);
console.log(`файлов с префиксом плагина:            ${server.prefixedFiles.length}${server.prefixedFiles.length ? ` (${server.prefixedFiles.map((entry) => entry.prefix).join(", ")})` : ""}`);

console.log("");
console.log("─── чего гейт НЕ знает (НЕИЗВЕСТНО, а не «нет вызывающего») ────────────");
console.log(`fetch с неразобранным адресом:         ${unresolvedProduction.length}`);
console.log(`вызовов с неразобранным методом:       ${productionCalls.filter((call) => call.method === null).length}`);
console.log(`регистраций с двойным префиксом:       ${server.ambiguous.length}`);
console.log(`префиксов без найденного файла:        ${server.unresolvedPrefixes.length}`);
if (unresolvedProduction.length > 0) {
	console.log("");
	console.log("  Адрес этих запросов собран вне вызова. Гейт про них НЕ УТВЕРЖДАЕТ НИЧЕГО —");
	console.log("  любой из них может быть тем самым вызывающим для маршрута из списка ниже.");
	console.log("  Пока они здесь, ни одна находка «никто не зовёт» не является доказанной.");
	for (const entry of printAll ? unresolvedProduction : unresolvedProduction.slice(0, 12)) {
		console.log(`    ${entry.file}:${entry.line}  fetch(${entry.expression})`);
	}
	if (!printAll && unresolvedProduction.length > 12) console.log(`    … и ещё ${unresolvedProduction.length - 12}`);
}
for (const entry of server.ambiguous) {
	console.log(`    ДВОЙНОЙ ПРЕФИКС: ${entry.where} — префикс «${entry.prefix}» + путь «${entry.declaredPath}»`);
	console.log("        Маршрут в набор НЕ включён: угадывать, склеены они или нет, значит выдумать адрес.");
}
for (const entry of server.unresolvedPrefixes) {
	console.log(`    ПРЕФИКС БЕЗ ФАЙЛА: ${entry.where} — «${entry.plugin}» с префиксом «${entry.prefix}»`);
	console.log("        Маршруты этого файла попадут в набор БЕЗ префикса и будут выглядеть мёртвыми.");
}

console.log("");
console.log("═══ НАХОДКА 1: маршрут есть, звать его некому ══════════════════════════");
console.log(`внутренних экранных маршрутов без вызывающего:  ${internalWithoutCallers.length}`);
console.log(`внешних поверхностей без вызывающего:           ${externalWithoutCallers.length} (вебхуки, портал, публичный виджет — клиента здесь нет)`);
console.log("");
console.log("Класс дефекта: `DELETE /api/settings/chairs/:chairId` был живым маршрутом,");
console.log("который не звала ни одна кнопка. Такое не видит ни компилятор, ни тесты.");
console.log("Красным должен становиться ТОЛЬКО первый список: у вебхука клиента в этом");
console.log("репозитории нет по построению, и требовать его — ложная тревога.");
if (internalWithoutCallers.length > 0) {
	console.log("");
	const byFile = new Map();
	for (const entry of internalWithoutCallers) {
		if (!byFile.has(entry.file)) byFile.set(entry.file, []);
		byFile.get(entry.file).push(entry);
	}
	const shown = printAll ? [...byFile] : [...byFile].slice(0, 25);
	for (const [file, entries] of shown) {
		console.log(`  ${file}`);
		for (const entry of entries) console.log(`      :${entry.where.split(":").pop()}  ${entry.method} ${entry.path}`);
	}
	if (!printAll && byFile.size > shown.length) {
		console.log(`  … и ещё ${byFile.size - shown.length} файлов, полностью — с ключом --all`);
	}
}
if (externalWithoutCallers.length > 0) {
	console.log("");
	console.log("  Внешние поверхности (справочно, находкой не считаются):");
	const bySurface = new Map();
	for (const entry of externalWithoutCallers) {
		const surface = classifySurface(entry.path);
		bySurface.set(surface, (bySurface.get(surface) ?? 0) + 1);
	}
	for (const [surface, count] of [...bySurface].sort((left, right) => right[1] - left[1])) {
		console.log(`    ${String(count).padStart(4)}  ${surface}`);
	}
}

console.log("");
console.log("═══ НАХОДКА 2: у одного маршрута несколько реализаций вызова ════════════");
console.log(`маршрутов с более чем одним обращением:  ${multipleImplementations.length}`);
console.log(`из них более одного прямого fetch:       ${multipleFetchOnly.length}`);
console.log(`самый обросший:                          ${multipleImplementations[0] ? `${multipleImplementations[0].sites.length} обращения у ${multipleImplementations[0].entry.key}` : "нет"}`);
console.log("");
console.log("Класс дефекта: `POST /api/settings/staff` оброс тремя отдельными реализациями,");
console.log("`PUT /api/settings/staff/:staffId` — двумя. Каждая копия — своё тело запроса,");
console.log("свой разбор отказа и своё место, где можно забыть заголовок охраны.");
console.log("Обращения считаются вместе с теми, что идут через общий помощник запросов:");
console.log("иначе третья реализация POST /api/settings/staff не видна вовсе (её адрес");
console.log("уходит свойством `url:` в staffMutationRequest.ts, а fetch там получает");
console.log("переменную). Обращение вне fetch метода НЕ несёт, поэтому в таких строках");
console.log("метод в ключе — метод МАРШРУТА, а не доказанный метод вызова.");
console.log("Больше одного обращения — НЕ автоматически дефект: список законно зовут из");
console.log("двух экранов. Дефект — когда копий три и они разошлись. Разбирать глазами.");
if (multipleImplementations.length > 0) {
	console.log("");
	const shown = printAll ? multipleImplementations : multipleImplementations.slice(0, 20);
	for (const { entry, sites } of shown) {
		console.log(`  ${sites.length}x  ${entry.key}`);
		console.log(`        маршрут: ${entry.where}`);
		for (const site of sites) console.log(`        ${site.via === "fetch" ? "fetch " : "адрес "} ${site.file}:${site.line}`);
	}
	if (!printAll && multipleImplementations.length > shown.length) {
		console.log(`  … и ещё ${multipleImplementations.length - shown.length}, полностью — с ключом --all`);
	}
}

if (referencedNotFetched.length > 0 || methodUnknownOnly.length > 0) {
	console.log("");
	console.log("─── справочно: чем оправдан маршрут без fetch ──────────────────────────");
	console.log(`адрес упомянут вне fetch (href, WebSocket, window.open):  ${referencedNotFetched.length}`);
	console.log(`вызывающий есть, но метод его вызова не разобран:         ${methodUnknownOnly.length}`);
	for (const entry of printAll ? methodUnknownOnly : methodUnknownOnly.slice(0, 8)) {
		console.log(`    ${entry.key} — ${entry.methodUnknownCallers.map((call) => `${call.file}:${call.line}`).join(", ")}`);
	}
}

/*
 * СВЕРКА СО ЖИВОЙ ТАБЛИЦЕЙ МАРШРУТОВ — необязательный шаг, по ключу --live.
 *
 * Статический разбор — не таблица Fastify, и подменять одно другим нельзя.
 * Настоящая таблица берётся из `printRoutes()` собранного приложения
 * (scripts/lib/api-route-census.mjs) и она авторитетнее. Но она требует свежего
 * `apps/api/dist`, то есть СБОРКИ, а сборка — общее состояние с другими
 * прогонами: по `.agents/AGENTS.md` (7a, «один писатель на гейт») её нельзя
 * запускать вслепую. Поэтому шаг необязательный, а его пропуск ОБЪЯСНЯЕТСЯ,
 * а не замалчивается.
 */
if (withLiveCensus) {
	console.log("");
	console.log("─── сверка со таблицей маршрутов живого Fastify ────────────────────────");
	try {
		const census = await import("./lib/api-route-census.mjs");
		const { app } = await census.createRealApiApp();
		const live = census
			.collectRouteTable(app)
			.filter((entry) => entry.routePath.startsWith("/api/"))
			.map((entry) => `${entry.method} ${normalizeRoutePath(entry.routePath)}`);
		await app.close();
		const liveSet = new Set(live);
		const staticSet = new Set(topology.map((entry) => entry.key));
		const onlyLive = [...liveSet].filter((key) => !staticSet.has(key));
		const onlyStatic = [...staticSet].filter((key) => !liveSet.has(key));
		console.log(`в живой таблице:            ${liveSet.size}`);
		console.log(`в статическом разборе:      ${staticSet.size}`);
		console.log(`есть живьём, нет в разборе:  ${onlyLive.length}  (разбор слеп на них — маршрут не проверяется)`);
		console.log(`есть в разборе, нет живьём:  ${onlyStatic.length}  (разбор выдумал — они попали бы в находки зря)`);
		for (const key of onlyLive.slice(0, 20)) console.log(`    только живьём: ${key}`);
		for (const key of onlyStatic.slice(0, 20)) console.log(`    только в разборе: ${key}`);
	} catch (error) {
		console.log("ПРОПУЩЕНА, и вот почему (это не зелёный результат, это отсутствие результата):");
		for (const line of String(error?.message ?? error).split("\n").slice(0, 4)) console.log(`    ${line}`);
	}
} else {
	console.log("");
	console.log("─── сверка со таблицей маршрутов живого Fastify ────────────────────────");
	console.log("НЕ ПРОВОДИЛАСЬ: нужен ключ --live и свежий apps/api/dist. Числа выше получены");
	console.log("статическим разбором исходников, а не с работающего сервера.");
}

/*
 * ЧТО СТАВИТЬ КРАСНЫМ, когда список разобран.
 *
 * Гейт сознательно возвращает 0: он печатает топологию, а не выносит вердикт.
 * Красным его делает владелец гейтов, и по-хорошему двумя храповиками — тем же
 * приёмом, что уже работает в `apps/api/src/tests/webCallsExistingRoutes.test.ts`:
 * поимённый список известного долга, который не валит сборку, плюс запрет на его
 * рост. Порог по одному числу («не больше N мёртвых маршрутов») хуже: он не
 * различает, какие именно N, и молча разрешает обменять починенный маршрут на
 * новый мёртвый.
 *
 * До разбора списка красным можно ставить только НАХОДКУ 2 сверх текущего
 * максимума и только внутренние экраны из НАХОДКИ 1 — внешние поверхности
 * (вебхук, портал, публичный виджет) вызывающего в этом репозитории не имеют по
 * построению, и требовать его от них значит краснеть на верном коде. Гейт,
 * краснеющий на верном коде, выключают целиком, и тогда он не поймает ничего.
 */
console.log("");
console.log("─── ИТОГ ───────────────────────────────────────────────────────────────");
console.log(`маршрут есть, звать некому (внутренние):  ${internalWithoutCallers.length}`);
console.log(`несколько реализаций одного вызова:      ${multipleImplementations.length}`);
console.log(`НЕИЗВЕСТНО (адрес собран вне вызова):    ${unresolvedProduction.length}`);
console.log("");
console.log("Гейт только печатает (код возврата 0). Порог и храповик — решение владельца");
console.log("гейтов; как их ставить, написано в конце этого файла.");
process.exit(0);
