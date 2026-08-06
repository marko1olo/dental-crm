/**
 * Клиент обязан посылать то, что требует охрана маршрута.
 *
 * ЗАЧЕМ. Самый дорогой класс дефектов этого продукта — «работает только на этой
 * машине». Часть маршрутов закрыта охраной `apps/api/src/accessGuard.ts`: без
 * заголовка `x-dente-admin-secret` она отвечает 403, а если секрет на сервере не
 * задан — 503. В корневом `.env` этой машины секрет ЗАКОММЕНТИРОВАН, зато
 * включены лазейки `DENTE_CLINICAL_ALLOW_UNGUARDED_READS/MUTATIONS`, и они гасят
 * охрану целиком. Лазейки живут только пока `NODE_ENV !== "production"`, то есть
 * у настоящего заказчика их нет.
 *
 * Из этого следует то, что нельзя увидеть ни типами, ни тестами, ни глазами:
 * панель, зовущая охраняемый адрес без заголовка, локально зелёная, а в клинике
 * мертва. Проверено живьём 29 июля на отдельном порту с заданным секретом и
 * выключенными лазейками: `/api/communications/campaigns`,
 * `/api/communications/templates`, `/api/communications/outbox`,
 * `/api/reports/summary`, `/api/schedule/day-confirmations` — все 403 при
 * действительных токенах кабинета и сотрудника. Это разделы «Рассылки», «Очередь
 * отправки», «Отчёты руководителя» и «Подтверждение дня».
 *
 * ПОЧЕМУ ГЕЙТ, А НЕ РУЧНОЙ ОБХОД. Файлов веба с голым `fetch("/api/…")` — почти
 * семьдесят, вызовов охраны на сервере — больше двухсот. Руками это не
 * пересматривается, а без проверки завтра добавят следующий такой вызов.
 *
 * ВЕРСИЯ 2: РАЗБОР ДЕРЕВОМ, А НЕ РЕГУЛЯРНЫМ ВЫРАЖЕНИЕМ. Прежний текстовый
 * разбор давал 9 находок: 8 ложных, 1 настоящую, и пропускал ещё одну настоящую.
 * Оба промаха — следствие «искать написание, а не свойство потока данных». Теперь
 * разбор через TypeScript AST (`scripts/lib/guarded-header-analysis.mjs`).
 *
 * Только чтение. Ненулевой код возврата при находках, чтобы ставить в гейт.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import {
	CONDUIT_REASON,
	collectFetchCalls,
	findCallers,
	isTestFile,
} from "./lib/guarded-header-analysis.mjs";

const ROUTES_DIR = "apps/api/src/routes";
const WEB_DIR = "apps/web/src";

/**
 * Охрана, которая требует админский секрет. Имена — из accessGuard.ts.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. В маршрутах встречаются ещё `requireSettingsAccess`
 * (16 вызовов), `requireNonDoctorAccess`, `requireTelegramControlPlaneAccess`,
 * `requirePayoutAccess`, `requireDicomWebSettingsAccess`,
 * `requireScheduleMutationAccess`. Они СОЗНАТЕЛЬНО не внесены: я не проверял, что
 * каждая из них требует именно `x-dente-admin-secret`, а не роль или отдельный
 * секрет настроек. Внести их наугад значило бы получить ложные находки, а проверка,
 * обвиняющая невиновных, тратит время дороже пропущенной поломки. Это НЕ значит,
 * что там всё в порядке: это незакрытая часть, и она названа вслух.
 */
const GUARD_NAMES = [
	"requireClinicalReadAccess",
	"requireClinicalMutationAccess",
	"requireClinicalReadContext",
	"requireClinicalMutationContext",
];

/**
 * Признаки того, что вызов посылает админский секрет. Правильный приём в проекте
 * уже есть, и его зовут десятки панелей — второй способ изобретать не нужно.
 */
const HEADER_HELPERS = [
	"denteAdminSecretRequestHeaders",
	"denteClinicalReadHeaders",
	"denteClinicalMutationHeaders",
	"denteAdminSecretHeaderName",
	"x-dente-admin-secret",
];

function sources(dir, extensions) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === "dist") continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			out.push(...sources(full, extensions));
			continue;
		}
		if (extensions.includes(extname(entry))) out.push(full);
	}
	return out;
}

/**
 * Вырезание комментариев. В этом проекте принято подробно объяснять в
 * комментариях, какой адрес почему сломан, — и без вырезания проверка ловила бы
 * собственную документацию как настоящий вызов.
 *
 * ПОЧЕМУ НЕ РЕГУЛЯРНЫМ ВЫРАЖЕНИЕМ, как было сначала. Прежняя строка
 * `text.replace(/\/\*[\s\S]*?\*\//g, "")` ослепила проверку на ЦЕЛОМ ФАЙЛЕ.
 * В routes/imaging.ts (строка 3083) есть заголовок запроса:
 *     Accept: "application/dicom+json, application/json;q=0.9, * / *;q=0.1"
 * (звёздочка-слэш-звёздочка написана здесь с пробелами, чтобы не повторить беду).
 * Внутри этой СТРОКИ живёт последовательность «слэш-звёздочка», и выражение
 * считало её началом комментария, после чего съедало всё до следующего
 * «звёздочка-слэш» — тысячи строк вместе со всеми 25 регистрациями маршрутов
 * файла. Из-за этого ни один охраняемый маршрут раздела «Снимки» в находки не
 * попадал, и POST /api/imaging/visiograph-ai пришлось искать глазами.
 *
 * Теперь текст проходится посимвольно, и внутри строковых литералов комментарии
 * не ищутся вовсе. Переводы строк у вырезанных комментариев сохраняются: номера
 * строк в отчёте обязаны совпадать с файлом, иначе находку невозможно открыть.
 */
function stripComments(text) {
	let out = "";
	let index = 0;
	let quote = null;
	while (index < text.length) {
		const char = text[index];
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
			/* Только переводы строк — чтобы номера строк не съехали. */
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

function lineOf(text, index) {
	return text.slice(0, index).split("\n").length;
}

/** Тело функции по её объявлению: от первой «{» после списка параметров. */
function functionBody(text, declIndex) {
	const open = text.indexOf("{", declIndex);
	if (open === -1) return "";
	let depth = 0;
	for (let i = open; i < text.length; i += 1) {
		if (text[i] === "{") depth += 1;
		else if (text[i] === "}") {
			depth -= 1;
			if (depth === 0) return text.slice(open, i + 1);
		}
	}
	return text.slice(open);
}

/**
 * Местные обёртки вокруг охраны.
 *
 * ЗАЧЕМ ЭТО ЕСТЬ. Первая версия проверки НЕ НАШЛА `/api/reports/summary`, хотя я
 * своими руками получил на нём 403 на живом сервере. Причина: обработчик зовёт не
 * охрану напрямую, а местную обёртку `scopeFor(request, reply, "report summary")`
 * (reports.ts:79), и уже она внутри зовёт `requireClinicalReadContext`
 * (reports.ts:84). Проверка, оправдывающая заведомо виновный вызов, хуже
 * отсутствующей — поэтому обёртки разбираются на один уровень вглубь, в границах
 * одного файла.
 */
function localGuardWrappers(code) {
	const names = new Set();
	const declarations = [
		/(?:async\s+)?function\s+(\w+)\s*\(/g,
		/\bconst\s+(\w+)\s*=\s*(?:async\s*)?\(/g,
	];
	for (const pattern of declarations) {
		for (const match of code.matchAll(pattern)) {
			const body = functionBody(code, match.index);
			if (GUARD_NAMES.some((guard) => body.includes(guard)))
				names.add(match[1]);
		}
	}
	return [...names];
}

/**
 * Охраняемые маршруты сервера.
 *
 * Тело обработчика берётся от его регистрации до следующей регистрации: охрана
 * зовётся внутри обработчика, а не рядом с адресом.
 */
function collectGuardedRoutes() {
	const registration =
		/\bapp\.(get|post|put|patch|delete)\s*\(\s*["'`](\/api\/[^"'`]*)["'`]/g;
	const routes = [];
	for (const file of sources(ROUTES_DIR, [".ts"])) {
		const code = stripComments(readFileSync(file, "utf8"));
		const indicators = [...GUARD_NAMES, ...localGuardWrappers(code)];
		const found = [...code.matchAll(registration)];
		for (let i = 0; i < found.length; i += 1) {
			const match = found[i];
			const bodyEnd = i + 1 < found.length ? found[i + 1].index : code.length;
			const body = code.slice(match.index, bodyEnd);
			const guard = indicators.find((name) => body.includes(name));
			if (!guard) continue;
			routes.push({
				file,
				line: lineOf(code, match.index),
				method: match[1].toUpperCase(),
				path: match[2],
				guard,
			});
		}
	}
	return routes;
}

/**
 * Адрес маршрута в виде выражения. `:param` совпадает с одним звеном пути,
 * потому что на клиенте на его месте стоит подставленное значение.
 */
function routeMatcher(path) {
	const escaped = path
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\/:[^/\\]+/g, "/[^/]+");
	return new RegExp(`^${escaped}$`);
}

/**
 * Вызовы `fetch` к своему серверу из веба — РАЗБОРОМ ДЕРЕВА.
 *
 * ЧТО ИЗМЕНИЛОСЬ ПРОТИВ ТЕКСТОВОГО РАЗБОРА и почему это не украшение:
 *
 * 1. АДРЕС РАЗВОРАЧИВАЕТСЯ. `fetch(dayConfirmationsRequestPath(date))` теперь
 *    виден: имя сборщика адреса раскрывается до «/api/schedule/day-confirmations».
 *    Текстовый разбор требовал литерала в скобках и МОЛЧА выбрасывал такой вызов —
 *    это и была слепота на настоящее нарушение.
 *
 * 2. ЗАГОЛОВКИ ПРОСЛЕЖИВАЮТСЯ ЧЕРЕЗ ГРАНИЦУ ФУНКЦИИ. Если `fetch` берёт
 *    заголовки из ПАРАМЕТРА своей функции, обвинять эту функцию нельзя: она
 *    посредник, а помощника зовут её вызывающие. Гейт находит вызывающих по
 *    имени и требует помощника у КАЖДОГО. Виноватым называется вызывающий,
 *    который не передал, а не библиотека.
 *
 * ГРАНИЦЫ, названные честно. Вызывающие ищутся по ИМЕНИ функции по всему вебу, без
 * разбора импортов: две разные функции с одним именем будут смешаны. Это делает
 * проверку МЯГЧЕ (лишний «правильный» вызывающий может оправдать посредника), но
 * не жёстче — ложных обвинений отсюда не появляется. Посредник, у которого не
 * нашлось ни одного вызывающего, считается НЕ доказанным и попадает в находки.
 */
function collectWebCalls() {
	const files = sources(WEB_DIR, [".ts", ".tsx"]);
	const calls = [];
	for (const file of files) calls.push(...collectFetchCalls(file));

	/*
	 * Посредники: `fetch` внутри них берёт заголовки из параметра. Спрашиваем
	 * каждого вызывающего по всему вебу. Тесты в счёт не идут: тест может
	 * передать секрет, которого нет у панели.
	 */
	const conduitNames = new Set(
		calls
			.filter((call) => call.reason === CONDUIT_REASON && call.fnName)
			.map((call) => call.fnName),
	);
	const callerVerdict = new Map();
	if (conduitNames.size > 0) {
		for (const file of files) {
			if (isTestFile(file)) continue;
			for (const name of conduitNames) {
				for (const caller of findCallers(file, name)) {
					const previous = callerVerdict.get(name) ?? {
						total: 0,
						guarded: 0,
						offenders: [],
					};
					previous.total += 1;
					if (caller.passesHelper) previous.guarded += 1;
					else previous.offenders.push(`${caller.file}:${caller.line}`);
					callerVerdict.set(name, previous);
				}
			}
		}
	}

	for (const call of calls) {
		if (call.reason !== CONDUIT_REASON) continue;
		const verdict = callerVerdict.get(call.fnName);
		if (verdict && verdict.total > 0 && verdict.offenders.length === 0) {
			call.sendsSecret = true;
			call.reason = `посредник: все ${verdict.total} вызывающих передают заголовки`;
			continue;
		}
		call.offenders = verdict ? verdict.offenders : [];
		call.reason = verdict
			? `посредник: ${verdict.offenders.length} из ${verdict.total} вызывающих без заголовков`
			: "посредник без единого найденного вызывающего";
	}

	return calls;
}

/**
 * Сведение адреса маршрута с адресом вызова, ПОЗВЕНЬЕВО.
 *
 * ПОЧЕМУ НЕ РЕГУЛЯРНЫМ ВЫРАЖЕНИЕМ, как было сначала. Первая версия подставляла
 * вместо `${…}` слово SEGMENT, потом заменяла его на «x» и сводила выражением.
 * На этом она пропускала целый класс вызовов, и нашёл его субагент, а не я:
 *   - `/api/communications/outbox/${id}/${action}` против маршрута
 *     `/api/communications/outbox/:id/cancel` — второе звено на сервере ЛИТЕРАЛ,
 *     а на клиенте подстановка, и «x» с «cancel» не сводился никогда;
 *   - `/api/communications/outbox${query}` — строка запроса приклеена
 *     подстановкой, поэтому `split("?")` её не отрезал, и звено «outboxSEGMENT»
 *     не совпадало с «outbox».
 * Четыре настоящих охраняемых вызова из-за этого гейт НЕ показывал; их закрыли
 * руками, а проверка молчала бы и на пятом.
 *
 * Теперь звенья сравниваются по отдельности: `:param` принимает любое звено, а
 * звено с подстановкой сводится по неизменной части до и после неё.
 */
function segmentsMatch(routeSegment, webSegment) {
	if (routeSegment.startsWith(":")) return true;
	if (!webSegment.includes("SEGMENT")) return routeSegment === webSegment;
	const first = webSegment.indexOf("SEGMENT");
	const prefix = webSegment.slice(0, first);
	const suffix = webSegment
		.slice(first + "SEGMENT".length)
		.replace(/SEGMENT/g, "");
	if (prefix && !routeSegment.startsWith(prefix)) return false;
	if (suffix && !routeSegment.endsWith(suffix)) return false;
	return true;
}

function pathsMatch(routePath, webPath) {
	const routeSegments = routePath.split("/").filter(Boolean);
	const webSegments = webPath.split("/").filter(Boolean);
	if (routeSegments.length !== webSegments.length) return false;
	return routeSegments.every((segment, index) =>
		segmentsMatch(segment, webSegments[index] ?? ""),
	);
}

/**
 * Насколько точно адрес вызова сел на маршрут: чем меньше догадок, тем точнее.
 *
 * Нужно, чтобы вызов приписывался САМОМУ подходящему маршруту. Иначе
 * `/api/patients/${id}` мог бы сесть на литеральный `/api/patients/duplicates`
 * (подстановка формально совпадает с любым словом) и обвинить панель в отказе,
 * которого у неё нет.
 */
function matchPrecision(routePath, webPath) {
	const routeSegments = routePath.split("/").filter(Boolean);
	const webSegments = webPath.split("/").filter(Boolean);
	let exact = 0;
	for (let i = 0; i < routeSegments.length; i += 1) {
		if (
			!routeSegments[i]?.startsWith(":") &&
			routeSegments[i] === webSegments[i]
		)
			exact += 1;
	}
	return exact;
}

/*
 * САМОПРОВЕРКА. Проверка, которая ничего не находит, опаснее отсутствующей: она
 * даёт спокойствие, ничего не охраняя. Здесь на выдуманных данных проверяется,
 * что механизм умеет и находить, и не придираться.
 */
{
	const guardedPath = "/api/самопроверка/охраняемый/:id";
	const mustFlag = pathsMatch(
		guardedPath,
		"/api/самопроверка/охраняемый/SEGMENT",
	);
	const mustNotFlag = pathsMatch(
		guardedPath,
		"/api/самопроверка/другой/SEGMENT",
	);
	if (!mustFlag) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: адрес с подстановкой не совпал с :param — находки терялись бы",
		);
		process.exit(2);
	}
	if (mustNotFlag) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: чужой адрес совпал — были бы ложные находки",
		);
		process.exit(2);
	}
	/*
	 * СЛЕПОЕ ПЯТНО, НАЙДЕННОЕ СУБАГЕНТОМ, закреплено здесь навсегда. Ровно эти два
	 * случая гейт пропускал, и четыре охраняемых вызова пришлось находить глазами:
	 * подстановка на месте литерального звена маршрута и строка запроса, приклеенная
	 * подстановкой. Если хоть одна строка ниже перестанет выполняться, проверка
	 * снова начала оправдывать виновных.
	 */
	const blindSpots = [
		[
			"/api/communications/outbox/:id/cancel",
			"/api/communications/outbox/SEGMENT/SEGMENT",
		],
		[
			"/api/communications/campaigns/:id/launch",
			"/api/communications/campaigns/SEGMENT/SEGMENT",
		],
		["/api/communications/outbox", "/api/communications/outboxSEGMENT"],
	];
	for (const [routePath, webPath] of blindSpots) {
		if (!pathsMatch(routePath, webPath)) {
			console.error(
				`САМОПРОВЕРКА НЕ ПРОШЛА: ${webPath} не сведён с ${routePath}.`,
			);
			console.error(
				"Это слепое пятно уже стоило четырёх пропущенных вызовов — сведение звеньев сломано.",
			);
			process.exit(2);
		}
	}
	/*
	 * СЛЕПОТА НА ЦЕЛЫЙ ФАЙЛ, тоже найденная субагентом. Строка с заголовком
	 * Accept, содержащая «звёздочка-слэш-звёздочка», раньше съедала весь остаток
	 * файла вместе с регистрациями маршрутов. Проверяем на том же образце.
	 */
	const acceptHeaderSample = [
		'const headers = { Accept: "application/json;q=0.9, ' +
			"*/*" +
			';q=0.1" };',
		'app.post("/api/самопроверка/после-заголовка", async () => {',
		"  await requireClinicalReadAccess(request, reply, 'проверка');",
		"});",
	].join("\n");
	if (
		!stripComments(acceptHeaderSample).includes(
			"/api/самопроверка/после-заголовка",
		)
	) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: строка с заголовком Accept съедает маршруты за собой.",
		);
		console.error(
			"Так уже терялись все 25 маршрутов routes/imaging.ts — разбор комментариев сломан.",
		);
		process.exit(2);
	}
	/* И обратное: настоящий комментарий обязан вырезаться, иначе поймаем документацию. */
	if (
		stripComments('/* app.get("/api/выдуманный") */\nconst x = 1;').includes(
			"/api/выдуманный",
		)
	) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: комментарии не вырезаются — проверка поймает свою документацию",
		);
		process.exit(2);
	}

	/* И обратное: разное число звеньев сводиться не должно. */
	if (
		pathsMatch("/api/patients/duplicates", "/api/patients/SEGMENT/duplicates")
	) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: адреса с разным числом звеньев сведены — будут ложные находки",
		);
		process.exit(2);
	}

	const withHelper = `({ headers: denteClinicalReadHeaders() })`;
	const withoutHelper = `({ method: "POST" })`;
	if (!HEADER_HELPERS.some((h) => withHelper.includes(h))) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: вызов с правильным помощником не распознан",
		);
		process.exit(2);
	}
	if (HEADER_HELPERS.some((h) => withoutHelper.includes(h))) {
		console.error(
			"САМОПРОВЕРКА НЕ ПРОШЛА: вызов без заголовков признан отправляющим секрет",
		);
		process.exit(2);
	}
	console.log(
		"самопроверка: подстановка совпадает с :param, чужой адрес не совпадает,",
	);
	console.log(
		"              вызов с помощником распознан, вызов без него — нет",
	);
}

const guarded = collectGuardedRoutes();

/*
 * ВТОРАЯ САМОПРОВЕРКА, НА ЖИВОМ ФАКТЕ. `/api/reports/summary` 29 июля своими
 * руками отдал 403 на отдельном порту с заданным секретом и выключенными
 * лазейками. Первая версия этой проверки его НЕ НАШЛА (охрана спрятана в местной
 * обёртке `scopeFor`). Если строка ниже однажды перестанет выполняться, значит
 * разбор обёрток сломался и проверка снова начала оправдывать виновных.
 */
if (!guarded.some((route) => route.path === "/api/reports/summary")) {
	console.error(
		"САМОПРОВЕРКА НЕ ПРОШЛА: /api/reports/summary не опознан охраняемым,",
	);
	console.error(
		"а он проверен живьём и отвечает 403. Сломан разбор местных обёрток охраны.",
	);
	process.exit(2);
}
console.log(
	"самопроверка: /api/reports/summary опознан охраняемым через обёртку scopeFor",
);
const calls = collectWebCalls();

const findings = [];
for (const call of calls) {
	if (call.sendsSecret) continue;
	/* Из всех подходящих маршрутов берём тот, что сошёлся точнее всех. */
	const route = guarded
		.filter((r) => r.method === call.method && pathsMatch(r.path, call.path))
		.sort(
			(a, b) =>
				matchPrecision(b.path, call.path) - matchPrecision(a.path, call.path),
		)[0];
	if (!route) continue;
	findings.push({ call, route });
}

console.log(`\nохраняемых маршрутов сервера:        ${guarded.length}`);
console.log(`вызовов fetch к своему серверу:      ${calls.length}`);
console.log(
	`из них без админского секрета:       ${calls.filter((c) => !c.sendsSecret).length}`,
);
console.log(`зовут ОХРАНЯЕМЫЙ адрес без секрета:  ${findings.length}`);

if (findings.length > 0) {
	console.log("\nНАЙДЕНЫ ВЫЗОВЫ, КОТОРЫЕ В НАСТОЯЩЕЙ КЛИНИКЕ ОТВЕТЯТ 403.");
	console.log(
		"Локально они зелёные: в .env этой машины секрет закомментирован, а лазейки",
	);
	console.log("включены. У заказчика лазеек нет — раздел будет мёртв.\n");
	const byFile = new Map();
	for (const item of findings) {
		if (!byFile.has(item.call.file)) byFile.set(item.call.file, []);
		byFile.get(item.call.file).push(item);
	}
	for (const [file, items] of byFile) {
		console.log(`  ${file}`);
		for (const { call, route } of items) {
			console.log(`      строка ${call.line}: ${call.method} ${call.path}`);
			console.log(
				`          охрана ${route.guard} — ${route.file}:${route.line}`,
			);
		}
	}
	console.log(
		"\nКак закрывать: посылать заголовки тем способом, который в проекте уже есть —",
	);
	console.log(
		"`auth.denteClinicalReadHeaders()` для чтения и `denteClinicalMutationHeaders()`",
	);
	console.log(
		"для записи (или `denteAdminSecretRequestHeaders` из lib/denteRequestHeaders.ts).",
	);
	console.log(
		"Снимать охрану с маршрута ради зелёного НЕЛЬЗЯ: она защищает врачебную тайну.",
	);
	process.exit(1);
}

console.log("\nкаждый охраняемый адрес зовут с админским секретом");
