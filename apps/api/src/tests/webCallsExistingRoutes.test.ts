/**
 * Каждый адрес, который зовёт интерфейс, должен существовать на сервере.
 *
 * ЗАЧЕМ. Аудит нашёл 28 адресов, по которым фронт ходит, а маршрута нет: ответ
 * 404. Хуже всего то, что большинство вызывающих написаны как
 * `response.ok ? response.json() : []` — отсутствующий маршрут молча
 * превращается в пустой список, и на экране просто нет раздела. Пользователь не
 * видит ошибки, он видит пустоту и делает вывод, что данных нет. Уже разобранные
 * случаи ровно такие: виджет разбора дублей годами показывал «дубликатов не
 * обнаружено», потому что его адрес отвечал 404.
 *
 * КАК УСТРОЕНА ПРОВЕРКА. Это «храповик», а не разовая уборка: известные
 * расхождения перечислены поимённо в KNOWN_MISSING и тест на них не падает, но
 * ЛЮБОЙ новый вызов несуществующего адреса валит сборку. Список известных —
 * это долг, зафиксированный явно, а не спрятанный.
 *
 * Разбирать сам список — отдельная работа: часть адресов относится к
 * незаконченным разделам, часть к виджетам, которые правильнее удалить, чем
 * чинить. Здесь только граница, за которую долг не растёт.
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";

const apiSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webSrc = path.resolve(apiSrc, "../../web/src");

/**
 * Известные расхождения на момент введения проверки. Каждая строка — адрес,
 * который интерфейс зовёт, а сервер не обслуживает. Список не должен расти;
 * когда адрес починен или вызов удалён, строку убирают отсюда.
 */
const KNOWN_MISSING: readonly string[] = [
	// Виджеты «конкурентного паритета»: ни маршрута, ни писателя в таблице.
	"/api/clinical/visit-examination-photo-links",
	"/api/crm/bulk-image-operation-logs",
	// Отсюда убраны как починенные: /api/crm/patient-communication-timelines
	// (виджет переведён на communication-timelines у пациента) и
	// /api/crm/patient-archive-reasons-and-blacklists (переведён на
	// archive-status у пациента).
	"/api/crm/patient-duplicate-merge-queues",
	"/api/integrations/egisz-blank-permissions",
	"/api/integrations/mkb10-auto-directories",
	"/api/integrations/yandex-calendar-syncs",
	"/api/marketing/family-recommendation-sources",
	"/api/schedule/external-schedule-action-logs",
	"/api/system/ram-watchdogs",
	"/api/documents/ndfl-tax-calculators",
	// Незаконченные разделы.
	"/api/ai/predict-no-show",
	"/api/ai/visit-flow",
	"/api/billing/payouts",
	"/api/clinic/marketing-settings",
	"/api/clinic/reporting-settings",
	"/api/clinic/workflows",
	"/api/communications/inbox",
	"/api/communications/patients/search",
	"/api/egisz/send",
	"/api/egisz/logs",
	"/api/reporting/token/generate",
	"/api/settings/catalog",
	"/api/settings/catalog-import",
	"/api/settings/protocols",
	"/api/system/analyze-legacy-db",
	"/api/visits/quick",
	/*
	 * Найдено этой же проверкой при вводе — аудит их не заметил. Проверено
	 * вручную: маршрутов нет ни в одном файле routes/.
	 */
	// Строка /api/patients/:param/communications убрана: рабочий адрес всё-таки
	// есть — /api/patients/:patientId/communication-timelines в routes/patients.ts,
	// виджет карточки пациента переведён на него.
	// Рекламации и задачи по пациенту — таблицы есть, маршрутов нет.
	"/api/patients/:param/reclamations",
	"/api/patients/:param/tickets"
	// Строки /api/settings/staff/:param и /api/settings/chairs/:param убраны:
	// в routes/settings.ts добавлены PUT/DELETE на саму сущность сотрудника и
	// кресла, раньше там жили только вложенные /credentials и /working-hours.
];

/** Префиксы, под которыми модули регистрируются в server.ts. */
const REGISTERED_PREFIXES = ["/api/inventory", "/api/portal", "/api/public/booking", "/api/telephony"];

function collectFiles(directory: string, extensions: readonly string[]): string[] {
	const collected: string[] = [];
	for (const entry of readdirSync(directory)) {
		const full = path.join(directory, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "node_modules" || entry === "dist") continue;
			collected.push(...collectFiles(full, extensions));
			continue;
		}
		if (extensions.some((extension) => entry.endsWith(extension))) collected.push(full);
	}
	return collected;
}

/**
 * Приведение адреса к сравнимому виду: параметры пути обезличиваются, потому что
 * `/api/patients/${id}/duplicates` и `/api/patients/:patientId/duplicates` — один
 * и тот же маршрут. Хвостовой параметр отбрасывается: по нему нельзя отличить
 * `/api/egisz/logs/:id` от несуществующего `/api/egisz/logs`.
 */
function normalizePath(raw: string): string {
	// Строка запроса отрезается ПЕРВОЙ. Иначе `/api/x?${query}` превращается в
	// `/api/x:param` и выглядит как несуществующий адрес — ложная тревога,
	// которая обесценивает всю проверку.
	const withoutQuery = raw.split("?")[0] ?? "";
	const withParams = withoutQuery
		.replace(/\$\{[^}]*\}/g, ":param")
		.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ":param")
		.replace(/\/+$/, "");

	/*
	 * Подстановка, приклеенная к слову без косой черты, — это не сегмент пути, а
	 * хвост: в коде встречается `/api/communications/outbox${query}`, где в
	 * переменной уже лежит «?...». Такой адрес обрезается до последнего
	 * настоящего сегмента, иначе страж считает живой маршрут несуществующим.
	 */
	const segments = withParams.split("/");
	const glued = segments.findIndex((segment) => segment.includes(":param") && segment !== ":param");
	return glued === -1
		? withParams
		: [...segments.slice(0, glued), segments[glued]?.replace(/:param.*$/, "") ?? ""].filter(Boolean).join("/").replace(/^/, "/");
}

/** Адреса, которые сервер действительно обслуживает. */
function serverRoutes(): Set<string> {
	const routes = new Set<string>();
	/*
	 * Дженерик перед скобкой матчится НЕЖАДНО и допускает вложенные «>».
	 * Первая редакция писала (?:<[^>]*>)? и спотыкалась на реальном коде
	 * `app.get<{ Querystring: Record<string, unknown> }>("/api/telegram/outbox", …)`:
	 * класс [^>] обрывался на «>» внутри Record<…>, маршрут не попадал в набор, и
	 * страж объявлял несуществующими девять живых адресов. Ложная тревога в
	 * такой проверке хуже её отсутствия — на неё перестают смотреть.
	 */
	const pattern = /\b(?:app|fastify|server|instance)\.(?:get|post|put|patch|delete)\s*(?:<[\s\S]*?>\s*)?\(\s*["'`]([^"'`]+)["'`]/g;

	for (const file of collectFiles(path.join(apiSrc, "routes"), [".ts"])) {
		if (file.endsWith(".test.ts")) continue;
		const source = readFileSync(file, "utf8");
		for (const match of source.matchAll(pattern)) {
			const raw = match[1];
			if (!raw) continue;
			const normalized = normalizePath(raw);
			routes.add(normalized);
			// Маршрут внутри модуля с префиксом объявлен без него.
			if (!normalized.startsWith("/api")) {
				for (const prefix of REGISTERED_PREFIXES) routes.add(normalizePath(prefix + normalized));
			}
		}
	}
	return routes;
}

/** Адреса, которые зовёт интерфейс. */
function webCalls(): Map<string, string[]> {
	const calls = new Map<string, string[]>();
	// Только строки, начинающиеся с /api: относительные адреса и внешние ссылки
	// к серверу отношения не имеют.
	const pattern = /["'`](\/api\/[^"'`\s]*)["'`]/g;

	for (const file of collectFiles(webSrc, [".ts", ".tsx"])) {
		if (file.includes(`${path.sep}tests${path.sep}`) || file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
		const source = readFileSync(file, "utf8");
		for (const match of source.matchAll(pattern)) {
			const raw = match[1];
			if (!raw) continue;
			const normalized = normalizePath(raw);
			if (!normalized.startsWith("/api/")) continue;
			/*
			 * Адрес, который не удалось разобрать целиком: многострочный шаблон
			 * (`/api/visits/${dashboard\n  .activeVisit.id}`) или литеральное
			 * многоточие в заготовке. Утверждать по такому обрывку, что маршрута
			 * нет, — значит выдумывать. Пропускаем молча.
			 */
			if (normalized.includes("${") || normalized.includes("...")) continue;
			const where = calls.get(normalized) ?? [];
			where.push(path.relative(webSrc, file));
			calls.set(normalized, where);
		}
	}
	return calls;
}

/**
 * Совпадение с учётом параметров: `/api/patients/:param/duplicates` со стороны
 * фронта и та же форма со стороны сервера. Дополнительно принимается вариант,
 * когда фронт зовёт адрес глубже зарегистрированного (например, статический
 * файл под маршрутом) — такое сравнение делается по префиксу сегментов.
 */
function isServed(candidate: string, routes: Set<string>): boolean {
	if (routes.has(candidate)) return true;

	const candidateSegments = candidate.split("/");
	for (const route of routes) {
		const routeSegments = route.split("/");
		if (routeSegments.length !== candidateSegments.length) continue;
		const same = routeSegments.every(
			(segment, index) => segment === candidateSegments[index] || segment === ":param" || candidateSegments[index] === ":param"
		);
		if (same) return true;
	}
	return false;
}

describe("адреса, которые зовёт интерфейс", () => {
	test("каждый вызванный адрес обслуживается сервером", () => {
		const routes = serverRoutes();
		assert.ok(routes.size > 50, `маршруты сервера не собрались: найдено ${routes.size}`);

		const missing: string[] = [];
		for (const [candidate, files] of webCalls()) {
			if (isServed(candidate, routes)) continue;
			// Известный долг: не валит сборку, но и не исчезает из виду.
			if (KNOWN_MISSING.some((known) => candidate === known || candidate.startsWith(`${known}/`))) continue;
			missing.push(`${candidate} — зовут: ${[...new Set(files)].slice(0, 3).join(", ")}`);
		}

		assert.deepEqual(
			missing,
			[],
			"Интерфейс зовёт адреса, которых нет на сервере. Такой вызов возвращает 404, а обёртка вида " +
				"`response.ok ? json : []` превращает его в пустой экран без ошибки:\n" +
				missing.join("\n")
		);
	});

	test("список известного долга не разрастается молча", () => {
		/*
		 * Верхняя граница ровно по текущему размеру списка: добавить строку можно
		 * только осознанно, вместе с этим числом. Начиналось с 33 — это 28 находок
		 * аудита плюс 5, найденных самой этой проверкой при вводе.
		 *
		 * Сейчас 28. Последними убраны /api/settings/staff/:param и
		 * /api/settings/chairs/:param: им написаны настоящие обработчики в
		 * routes/settings.ts (PUT и DELETE на саму сущность сотрудника и кресла).
		 *
		 * Число ставится по фактической длине списка, а не «с запасом»: свободная
		 * единица означает, что одну строку долга можно добавить молча, а ради
		 * запрета ровно такого добавления проверка и написана. Убрали строку —
		 * уменьшите и это число.
		 */
		assert.ok(
			KNOWN_MISSING.length <= 28,
			`Известных отсутствующих адресов стало больше: ${KNOWN_MISSING.length}. ` +
				"Долг должен уменьшаться, а не расти."
		);
	});

	test("починенные адреса удаляются из списка долга", () => {
		const routes = serverRoutes();
		const alreadyServed = KNOWN_MISSING.filter((known) => isServed(known, routes));
		assert.deepEqual(
			alreadyServed,
			[],
			`Эти адреса уже обслуживаются — уберите их из KNOWN_MISSING: ${alreadyServed.join(", ")}`
		);
	});
});
