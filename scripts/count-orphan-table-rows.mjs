/**
 * count-orphan-table-rows.mjs
 *
 * Счёт строк в таблицах живой базы, которых НЕТ в объявлениях Drizzle
 * (`undeclaredTables` из `smoke-schema-missing-declarations.mjs`), вместе с
 * двойником каждой — объявленной таблицей того же смысла.
 *
 * ЗАЧЕМ. Перепись KK5 доказала, что 18 таблиц созданы миграциями и никогда не
 * объявлены. Из этого НЕ следует «удалить»: пока строки не посчитаны, в
 * `payment_installments` и `signed_outpatient_cards` может лежать боевая история
 * платежей и подписанных карт. Решение «удалить таблицу» принимается по числу
 * строк, а не по числу ссылок в коде.
 *
 * ПОЧЕМУ ГОЛЫЙ count(*) НЕ ДОКАЗАТЕЛЬСТВО (стоячее правило кампании). В этой
 * базе живут три вида организаций: боевая клиника, демонстрационная фикстура
 * снимков `d0000000-…` и тестовое пространство `dce70000-…`, которое сеют и
 * убирают тесты. `count(*) = 4` без разбивки не отличает «четыре боевых
 * рассрочки» от «четырёх строк, которые сейчас же удалит `after` теста».
 * Поэтому счёт снимается с разбивкой по `organization_id` и с явным вычетом
 * фикстурных префиксов.
 *
 * ПОЧЕМУ ЗДЕСЬ ЕСТЬ КОНТРОЛЬ. Скрипт, который печатает нули, подключившись к
 * пустой или не той базе, выдаёт «доказательство отсутствия данных» из ничего.
 * Поэтому сначала считаются КОНТРОЛЬНЫЕ таблицы, которые обязаны быть непустыми
 * (`organizations`, `patients`, …). Контроль не прошёл — код возврата 1 и нули
 * не предъявляются как результат.
 *
 * ПОЧЕМУ СЧИТАЕТСЯ ДВОЙНИК. Пустая брошенная таблица сама не говорит, ПОЧЕМУ она
 * брошена, а причина решает, что с ней делать. Непустой объявленный двойник —
 * доказательство «двойник принят, функция работает через него». Пустой двойник —
 * доказательство обратного: функции нет ни с той, ни с этой стороны, и удаление
 * таблицы не закрывает продуктовую дыру, а только убирает мусор из базы.
 * Двойник задаётся таблицей, а где смысл живёт в колонке или в значении
 * перечисления — колонкой (`column`, счёт непустых) или значением (`kindValue`).
 *
 * ТОЛЬКО ЧТЕНИЕ. Каждый запрос проходит через `readOnly()`, который отказывается
 * отправлять текст, начинающийся не с `select`. Имена таблиц и колонок зашиты в
 * этом файле и квотируются: подстановки извне здесь нет вообще.
 *
 * ПОЧЕМУ «НЕ ОПРЕДЕЛЯЕТСЯ» НЕ СКЛАДЫВАЕТСЯ В НОЛЬ. Шесть таблиц реестра из
 * восемнадцати не имеют колонки `organization_id` — среди них
 * `payment_installments` и `signed_outpatient_cards`, то есть рассрочки платежей и
 * подписанные амбулаторные карты. Для непустой таблицы без этой колонки «строк вне
 * фикстур» НЕ ИЗВЕСТНО: вычитать фикстурные организации не из чего. До этого пакета
 * итоговая строка складывала такие значения через `?? 0`, и «не знаю» становилось
 * нулём ровно в той строке, по которой принимают решение «удалять таблицу или нет».
 * Сегодня вывод от этого не менялся, потому что все счёта нулевые, — но будь в
 * `payment_installments` 500 строк, скрипт напечатал бы «непустых 1, строк вне
 * фикстур 0» и подтвердил бы удаление боевой истории платежей. Теперь известное и
 * неизвестное считаются отдельно и печатаются по-разному. Свойство проверяется без
 * базы: `--selfcheck`.
 *
 * ПОЧЕМУ ССЫЛКИ СЧИТАЮТСЯ, А НЕ ВПИСЫВАЮТСЯ. Колонка «ссылок в api» раньше была
 * набором констант `serverReferences`, вписанных руками. В выводе они стояли рядом
 * с настоящими `count(*)` из базы и читались как замер, хотя ими не были: их
 * верность была свойством дня, когда их вписали. Теперь ссылки считаются обходом
 * `apps/api/src` при каждом прогоне (`measureApiReferences`), а измеренное и
 * классифицированное разделены по колонкам.
 *
 * ЗАПУСК (из корня репозитория):
 *   node scripts/count-orphan-table-rows.mjs
 *   node scripts/count-orphan-table-rows.mjs --json
 *   node scripts/count-orphan-table-rows.mjs --selfcheck   (без базы)
 *
 * Код возврата: 0 — счёт снят и контроль пройден; 1 — контроль не пройден
 * (нули ничего не значат); 2 — до базы не дошли.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const asJson = process.argv.includes("--json");
const selfCheckOnly = process.argv.includes("--selfcheck");

/** Серверные исходники, по которым считаются ссылки. Миграции здесь НЕ лежат — см. `measureApiReferences`. */
const API_SOURCE_ROOT = join(REPO_ROOT, "apps", "api", "src");

/**
 * Префиксы первой группы UUID, по которым организация опознаётся как НЕ боевая.
 * `dce70000` — тестовое пространство `apps/api/src/tests/support/fixtureOrganizations.ts`;
 * `d0000000` — демонстрационная клиника снимков. Оба перечислены там же как
 * заведомо не принадлежащие рабочей клинике.
 */
const FIXTURE_ORG_PREFIXES = ["d0000000", "dce70000"];

/**
 * Контроль: таблицы, которые в рабочей базе обязаны быть непустыми. Ноль здесь
 * означает «подключились не туда», а не «данных нет».
 */
const CONTROL_TABLES = [
	"organizations",
	"patients",
	"appointments",
	"payments",
	"visits",
	"generated_documents",
];

/**
 * Таблицы без объявления в Drizzle: состав повторяет `undeclaredTables` реестра,
 * минус служебный `_dente_migrations` (его пишет раскатчик миграций).
 *
 * Числа ссылок здесь НЕ вписаны: их считает `measureApiReferences` при каждом
 * прогоне. Вписанная константа в инструменте, которым решают судьбу таблицы с
 * данными, живёт до первого рефакторинга и после него врёт молча.
 *
 * `twin` — объявленная таблица того же смысла (или её колонка/значение kind).
 * `null` — двойника нет: понятие в продукте не реализовано нигде.
 */
const ORPHAN_TABLES = [
	{ table: "analytics_snapshots", twin: { table: "bi_analytics_snapshots" } },
	{ table: "cash_shifts", twin: null },
	{ table: "clinic_workflows", twin: null },
	{ table: "clinical_tasks", twin: null },
	{ table: "dental_lab_orders", twin: { table: "lab_orders" } },
	{
		table: "doctor_assistants",
		twin: { table: "appointments", column: "assistant_user_id" },
	},
	{ table: "doctor_payrolls", twin: { table: "pricelist_doctor_payrolls" } },
	{ table: "document_templates", twin: { table: "generated_documents" } },
	{ table: "drill_protocols", twin: { table: "patient_ct_plannings" } },
	{
		table: "ingested_patients_mapping",
		twin: { table: "migration_entity_links" },
	},
	{ table: "ingestion_sources", twin: { table: "migration_runs" } },
	{
		table: "migration_templates",
		twin: { table: "migration_runs", column: "vendor_profile" },
	},
	{ table: "patient_anamnesis", twin: null },
	{
		table: "payment_installments",
		twin: {
			table: "generated_documents",
			kindColumn: "kind",
			kindValue: "installment_payment_schedule",
		},
	},
	{
		table: "scheduler_reservations",
		twin: { table: "schedule_time_reservations" },
	},
	{
		table: "signed_outpatient_cards",
		twin: { table: "visit_diaries", column: "crypto_signature_pkcs7" },
	},
	{
		table: "treatment_plan_stages_auto_archive",
		twin: { table: "treatment_plan_stages" },
	},
	{ table: "ztl_lab_orders", twin: { table: "lab_orders" } },
];

/* ------------------------------------------------------------------------- *
 * ССЫЛКИ НА ИМЯ ТАБЛИЦЫ В СЕРВЕРНОМ КОДЕ — ЗАМЕР
 *
 * Раньше это были константы `serverReferences`, вписанные руками. Здесь они
 * считаются: `apps/api/src` читается целиком (несколько сотен файлов, десятые доли
 * секунды — числа файлов здесь нет намеренно, оно печатается замером и меняется
 * каждый день), и каждое вхождение имени попадает в одну из четырёх взаимно
 * исключающих корзин. Сумма корзин обязана равняться общему числу вхождений —
 * иначе классификатор сломан и скрипт падает, а не печатает расхождение.
 *
 * ПОЧЕМУ КОРЗИНЫ, А НЕ ОДНО ЧИСЛО. Решение «таблицу удалять нельзя» принимается
 * по ссылке из рабочего кода. Упоминание в комментарии таблицу не использует:
 * `clinical_tasks` названа 18 раз, но пять из них — проза в шапках файлов, а
 * восемь — тест. Одно число «18» читается как восемнадцать обращений к таблице,
 * которых нет. Обратный и более опасный случай: таблица, названная ТОЛЬКО из
 * теста или ТОЛЬКО в комментарии, при подсчёте одним числом выглядит живой и
 * снимается с удаления без причины.
 *
 * ЧЕГО ЗДЕСЬ НЕТ. Миграции: DDL, создавший эти таблицы, лежит в
 * `apps/api/drizzle/*.sql`, ВНЕ `apps/api/src`, поэтому `CREATE TABLE` в счёт
 * ссылок не попадает вообще — отделять его не нужно. Клиент (`apps/web`) тоже не
 * входит: колонка называется «в api» и означает именно сервер.
 * ------------------------------------------------------------------------- */

const SKIPPED_DIRS = new Set([
	"node_modules",
	"dist",
	".git",
	"build",
	"coverage",
]);
const SCANNED_EXTENSIONS = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
];

/** Рекурсивный обход `apps/api/src`. `null` — каталога нет, и это не ноль ссылок. */
function collectApiSourceFiles(root) {
	let entries;
	try {
		entries = readdirSync(root, { withFileTypes: true });
	} catch {
		return null;
	}
	const files = [];
	const walk = (dir, dirEntries) => {
		for (const entry of dirEntries) {
			if (entry.name.startsWith(".") && entry.name !== ".") continue;
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				if (SKIPPED_DIRS.has(entry.name)) continue;
				walk(full, readdirSync(full, { withFileTypes: true }));
				continue;
			}
			if (!entry.isFile()) continue;
			if (SCANNED_EXTENSIONS.some((ext) => entry.name.endsWith(ext)))
				files.push(full);
		}
	};
	walk(root, entries);
	return files;
}

/** Тест или рабочий код. Ссылка из теста не доказывает, что таблицей пользуется продукт. */
function isTestFile(path) {
	const p = path.replace(/\\/g, "/");
	return /(?:^|\/)tests?\//.test(p) || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(p);
}

/**
 * `/` начинает регулярное выражение, а не деление, если предыдущий значимый
 * символ кода не может закончить операнд. Без этой проверки регулярка вида
 * `/['"]/` (такие в `apps/api/src` есть) уводит разборщик в мнимую строку и
 * разметка комментариев дальше по файлу становится случайной.
 */
const REGEX_ALLOWED_AFTER_CHAR = /[([{,;:=!&|?+\-*%~^<>]$/;
const REGEX_ALLOWED_AFTER_WORD =
	/(?:^|[^A-Za-z0-9_$])(return|typeof|case|in|of|new|delete|void|instanceof|do|else|yield|await)$/;

function regexAllowedAfter(tail) {
	if (tail === "") return true;
	return (
		REGEX_ALLOWED_AFTER_CHAR.test(tail) || REGEX_ALLOWED_AFTER_WORD.test(tail)
	);
}

function skipSimpleString(text, start) {
	const quote = text[start];
	let i = start + 1;
	while (i < text.length) {
		const c = text[i];
		if (c === "\\") {
			i += 2;
			continue;
		}
		if (c === quote || c === "\n") return i + 1;
		i += 1;
	}
	return i;
}

function skipRegexLiteral(text, start) {
	let i = start + 1;
	let inClass = false;
	while (i < text.length) {
		const c = text[i];
		if (c === "\\") {
			i += 2;
			continue;
		}
		if (c === "\n") return start + 1;
		if (inClass) {
			if (c === "]") inClass = false;
		} else if (c === "[") {
			inClass = true;
		} else if (c === "/") {
			i += 1;
			while (i < text.length && /[a-z]/.test(text[i])) i += 1;
			return i;
		}
		i += 1;
	}
	return start + 1;
}

/**
 * Шаблонная строка. `${…}` — снова код, поэтому вложенные шаблоны и комментарий
 * внутри подстановки размечаются правильно: `sql` + вложенный `map(v => \`…\`)`
 * встречается в этом проекте, и наивный разбор до первой обратной кавычки сбивал
 * бы состояние на весь остаток файла.
 */
function skipTemplate(text, start, mask) {
	let i = start + 1;
	while (i < text.length) {
		const c = text[i];
		if (c === "\\") {
			i += 2;
			continue;
		}
		if (c === "`") return i + 1;
		if (c === "$" && text[i + 1] === "{") {
			i = markComments(text, i + 2, mask, true);
			continue;
		}
		i += 1;
	}
	return i;
}

/**
 * Разметка: `mask[i] = 1`, если символ находится внутри комментария. Проходит по
 * коду один раз, пропуская строки, шаблоны и регулярки, чтобы `//` и `/*` внутри
 * них не считались началом комментария.
 *
 * ГРАНИЦА ТОЧНОСТИ, названная честно: разборщик не знает типов и не раскрывает
 * JSX, поэтому это классификация по синтаксису, а не компилятор. Поэтому ОБЩЕЕ
 * число вхождений печатается отдельно от разбивки: общее число не зависит от
 * этого разбора вообще, а сумма корзин сверяется с ним на каждом прогоне.
 */
function markComments(text, start, mask, stopAtCloseBrace = false) {
	let i = start;
	let braceDepth = 0;
	let tail = "";
	const pushTail = (ch) => {
		tail = (tail + ch).slice(-16);
	};
	while (i < text.length) {
		const c = text[i];
		if (c === "/" && text[i + 1] === "/") {
			while (i < text.length && text[i] !== "\n") mask[i++] = 1;
			continue;
		}
		if (c === "/" && text[i + 1] === "*") {
			mask[i++] = 1;
			mask[i++] = 1;
			while (i < text.length && !(text[i] === "*" && text[i + 1] === "/"))
				mask[i++] = 1;
			if (i < text.length) {
				mask[i++] = 1;
				mask[i++] = 1;
			}
			continue;
		}
		if (c === '"' || c === "'") {
			i = skipSimpleString(text, i);
			pushTail('"');
			continue;
		}
		if (c === "`") {
			i = skipTemplate(text, i, mask);
			pushTail("`");
			continue;
		}
		if (c === "/" && regexAllowedAfter(tail)) {
			i = skipRegexLiteral(text, i);
			pushTail("/");
			continue;
		}
		if (stopAtCloseBrace) {
			if (c === "{") braceDepth += 1;
			else if (c === "}") {
				if (braceDepth === 0) return i + 1;
				braceDepth -= 1;
			}
		}
		if (!/\s/.test(c)) pushTail(c);
		i += 1;
	}
	return i;
}

/**
 * Вхождения имени с границей слова С ОБЕИХ СТОРОН. Левая граница обязательна:
 * `analytics_snapshots` без неё ловится внутри объявленной
 * `bi_analytics_snapshots`, а `doctor_payrolls` — внутри объявленной
 * `pricelist_doctor_payrolls`, и обе брошенные таблицы выглядят используемыми,
 * не будучи названными ни разу. Правая — по той же причине с другой стороны:
 * `treatment_plan_stages` без неё ловится внутри
 * `treatment_plan_stages_auto_archive`.
 */
const WORD_CHAR = /[A-Za-z0-9_]/;

function countOccurrences(text, mask, name) {
	let code = 0;
	let comment = 0;
	let from = 0;
	for (;;) {
		const at = text.indexOf(name, from);
		if (at === -1) break;
		from = at + 1;
		const before = at > 0 ? text[at - 1] : "";
		const after = at + name.length < text.length ? text[at + name.length] : "";
		if (before !== "" && WORD_CHAR.test(before)) continue;
		if (after !== "" && WORD_CHAR.test(after)) continue;
		if (mask[at]) comment += 1;
		else code += 1;
	}
	return { code, comment };
}

/**
 * Замер ссылок по всем именам за один проход файлов. Возвращает `null`, если
 * каталог исходников не найден: «не нашли, где искать» — это НЕ «ссылок ноль»,
 * и печататься оно обязано иначе.
 */
function measureApiReferences(names) {
	const files = collectApiSourceFiles(API_SOURCE_ROOT);
	if (files === null || files.length === 0) return null;
	const byName = new Map(
		names.map((name) => [
			name,
			{
				productionCode: 0,
				productionComment: 0,
				testCode: 0,
				testComment: 0,
				files: [],
			},
		]),
	);
	for (const file of files) {
		let text;
		try {
			text = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const mask = new Uint8Array(text.length);
		let masked = false;
		const test = isTestFile(relative(API_SOURCE_ROOT, file));
		for (const name of names) {
			if (!text.includes(name)) continue;
			if (!masked) {
				markComments(text, 0, mask);
				masked = true;
			}
			const { code, comment } = countOccurrences(text, mask, name);
			if (code === 0 && comment === 0) continue;
			const bucket = byName.get(name);
			if (test) {
				bucket.testCode += code;
				bucket.testComment += comment;
			} else {
				bucket.productionCode += code;
				bucket.productionComment += comment;
			}
			bucket.files.push({
				file: relative(REPO_ROOT, file).replace(/\\/g, "/"),
				code,
				comment,
				test,
			});
		}
	}
	const references = new Map();
	for (const [name, bucket] of byName) {
		const total =
			bucket.productionCode +
			bucket.productionComment +
			bucket.testCode +
			bucket.testComment;
		references.set(name, { ...bucket, total });
	}
	return { scannedFiles: files.length, references };
}

/** `DATABASE_URL` из окружения или КОРНЕВОГО `.env`. Значение никуда не печатается. */
function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line)
		throw new Error(
			"DATABASE_URL не найден ни в окружении, ни в корневом .env",
		);
	return line.slice("DATABASE_URL=".length).trim();
}

/** Квотирование идентификатора: имена зашиты в файле, но подстановка без квот — привычка, а не аргумент. */
function quoteIdent(name) {
	if (!/^[a-z_][a-z0-9_]*$/.test(name))
		throw new Error(`недопустимое имя объекта: ${name}`);
	return `"${name}"`;
}

/**
 * Единственная точка отправки SQL. Всё, что не начинается с `select`, отвергается
 * до отправки: скрипт разведки не имеет права ни `delete`, ни `alter`, ни `drop`.
 */
function readOnly(client, text, values) {
	if (!/^\s*select\b/i.test(text))
		throw new Error(`не select — запрос отклонён: ${text.slice(0, 40)}`);
	return client.query(text, values);
}

function classifyOrg(orgId) {
	if (orgId === null || orgId === undefined) return "без организации";
	const prefix = String(orgId).slice(0, 8).toLowerCase();
	if (prefix === "dce70000") return "тестовая фикстура";
	if (prefix === "d0000000") return "демо-фикстура";
	return "боевая";
}

function isFixtureOrg(orgId) {
	if (orgId === null || orgId === undefined) return false;
	return FIXTURE_ORG_PREFIXES.includes(String(orgId).slice(0, 8).toLowerCase());
}

async function columnsOf(client, table) {
	const { rows } = await readOnly(
		client,
		`select column_name
		   from information_schema.columns
		  where table_schema = 'public' and table_name = $1
		  order by ordinal_position`,
		[table],
	);
	return rows.map((r) => r.column_name);
}

async function countRows(client, table, where = "") {
	const { rows } = await readOnly(
		client,
		`select count(*)::int as n from ${quoteIdent(table)} ${where}`,
	);
	return rows[0].n;
}

/** Разбивка по организациям + строки вне фикстурных организаций. */
async function organizationBreakdown(client, table) {
	const { rows } = await readOnly(
		client,
		`select organization_id::text as organization_id, count(*)::int as n
		   from ${quoteIdent(table)}
		  group by organization_id
		  order by n desc, organization_id nulls last`,
	);
	const byOrganization = rows.map((r) => ({
		organizationId: r.organization_id,
		rows: r.n,
		kind: classifyOrg(r.organization_id),
	}));
	const rowsOutsideFixtures = byOrganization
		.filter((r) => !isFixtureOrg(r.organizationId))
		.reduce((n, r) => n + r.rows, 0);
	return { byOrganization, rowsOutsideFixtures };
}

/** Строки двойника: таблица целиком, непустая колонка или значение перечисления. */
async function twinRows(client, twin) {
	if (!twin) return null;
	const columns = await columnsOf(client, twin.table);
	if (columns.length === 0) return { ...twin, exists: false };
	if (twin.column) {
		if (!columns.includes(twin.column))
			return { ...twin, exists: false, columnMissing: true };
		return {
			...twin,
			exists: true,
			total: await countRows(client, twin.table),
			matching: await countRows(
				client,
				twin.table,
				`where ${quoteIdent(twin.column)} is not null`,
			),
			predicate: `${twin.column} is not null`,
		};
	}
	if (twin.kindValue) {
		if (!columns.includes(twin.kindColumn))
			return { ...twin, exists: false, columnMissing: true };
		const { rows } = await readOnly(
			client,
			`select count(*)::int as n from ${quoteIdent(twin.table)} where ${quoteIdent(twin.kindColumn)}::text = $1`,
			[twin.kindValue],
		);
		return {
			...twin,
			exists: true,
			total: await countRows(client, twin.table),
			matching: rows[0].n,
			predicate: `${twin.kindColumn} = '${twin.kindValue}'`,
		};
	}
	const total = await countRows(client, twin.table);
	return {
		...twin,
		exists: true,
		total,
		matching: total,
		predicate: "вся таблица",
	};
}

/**
 * ИТОГ ПО «СТРОКАМ ВНЕ ФИКСТУР» — центр этого файла, потому что именно по этому
 * числу принимают решение «удалять таблицу или нет».
 *
 * `rowsOutsideFixtures === null` означает «не определяется»: у таблицы нет
 * колонки `organization_id` и в ней есть строки, поэтому вычесть фикстурные
 * организации не из чего. Такое значение НЕЛЬЗЯ складывать. Прежний код писал
 * `results.reduce((n, r) => n + (r.rowsOutsideFixtures ?? 0), 0)` — и в итоговой
 * строке «не знаю» превращалось в «ноль строк», то есть в разрешение на удаление.
 *
 * Поэтому здесь две величины, а не одна: сумма ПО ИЗВЕСТНЫМ таблицам и отдельный
 * список тех, по которым ответа нет. `naiveZeroCoalesced` считается только для
 * `--selfcheck`: он воспроизводит старое поведение, чтобы разница между «0» и
 * «не определяется» проверялась запуском, а не обещанием.
 */
function summarizeRowsOutsideFixtures(results) {
	const existing = results.filter((r) => r.exists);
	const known = existing.filter(
		(r) =>
			r.rowsOutsideFixtures !== null && r.rowsOutsideFixtures !== undefined,
	);
	const undetermined = existing.filter(
		(r) =>
			r.rowsOutsideFixtures === null || r.rowsOutsideFixtures === undefined,
	);
	// Существующая таблица без числа в `total` — сломанный вызов, а не «ноль строк».
	// Тихий `?? 0` здесь был бы тем же дефектом, который правит этот пакет, поэтому
	// такой случай падает, а не занижает число строк с неустановленной принадлежностью.
	for (const r of undetermined) {
		if (typeof r.total !== "number") {
			throw new Error(
				`у таблицы ${r.table} нет счёта строк — итог не может быть посчитан честно`,
			);
		}
	}
	return {
		knownSum: known.reduce((n, r) => n + r.rowsOutsideFixtures, 0),
		knownTables: known.length,
		undeterminedTables: undetermined.map((r) => r.table),
		undeterminedRowsTotal: undetermined.reduce((n, r) => n + r.total, 0),
		naiveZeroCoalesced: existing.reduce(
			(n, r) => n + (r.rowsOutsideFixtures ?? 0),
			0,
		),
	};
}

/** Итоговая строка про строки вне фикстур. Ноль и «не знаю» здесь выглядят по-разному. */
function renderRowsOutsideFixturesLine(summary) {
	if (summary.undeterminedTables.length === 0) {
		return `Строк вне фикстур: ${summary.knownSum} — определено по всем ${summary.knownTables} таблицам.`;
	}
	return (
		`Строк вне фикстур: известно ${summary.knownSum} по ${summary.knownTables} таблицам; ` +
		`НЕ ОПРЕДЕЛЯЕТСЯ ещё по ${summary.undeterminedTables.length} ` +
		`(${summary.undeterminedTables.join(", ")}) — в них ${summary.undeterminedRowsTotal} строк без колонки ` +
		"organization_id, и принадлежность этих строк боевой клинике не установлена. " +
		"Сумма НЕ полна; считать её нулём нельзя."
	);
}

async function main() {
	const { default: pg } = await import("pg");
	const client = new pg.Client({ connectionString: databaseUrl() });
	await client.connect();

	try {
		const control = [];
		for (const table of CONTROL_TABLES) {
			control.push({ table, rows: await countRows(client, table) });
		}

		const measuredReferences = measureApiReferences(
			ORPHAN_TABLES.map((t) => t.table),
		);

		const results = [];
		for (const { table, twin } of ORPHAN_TABLES) {
			// `null`, если каталог исходников не найден: «не знаем» вместо ноля и здесь.
			const references = measuredReferences
				? measuredReferences.references.get(table)
				: null;
			const columns = await columnsOf(client, table);
			if (columns.length === 0) {
				results.push({ table, references, exists: false });
				continue;
			}
			const total = await countRows(client, table);
			const hasOrg = columns.includes("organization_id");
			let byOrganization = null;
			let rowsOutsideFixtures = null;
			if (hasOrg) {
				({ byOrganization, rowsOutsideFixtures } = await organizationBreakdown(
					client,
					table,
				));
			} else {
				// Колонки организации нет — вычитать фикстуры не из чего. Для пустой
				// таблицы это безразлично; для непустой честный ответ «принадлежность
				// строк по организациям не определяется», а не тихий ноль.
				rowsOutsideFixtures = total === 0 ? 0 : null;
			}
			results.push({
				table,
				references,
				exists: true,
				columnCount: columns.length,
				hasOrganizationColumn: hasOrg,
				total,
				rowsOutsideFixtures,
				byOrganization,
				twin: await twinRows(client, twin),
			});
		}
		return {
			control,
			results,
			scannedApiFiles: measuredReferences
				? measuredReferences.scannedFiles
				: null,
		};
	} finally {
		await client.end();
	}
}

/* ------------------------------------------------------------------------- *
 * САМОПРОВЕРКА (`--selfcheck`). Базы не требует, ничего не пишет.
 *
 * ЗАЧЕМ. Проверяемое свойство — «не определяется» не превращается в ноль в
 * итоговой строке — на живой базе СЕГОДНЯ не проверяется: все восемнадцать таблиц
 * пусты, `null` не возникает ни разу, и сломанный вариант печатает то же самое,
 * что исправленный. Обещать в комментарии, что «теперь правильно», значит выдать
 * непроверенное за проверенное. Поэтому свойство проверяется на заданном наборе,
 * где неизвестное есть: `payment_installments` с 500 строками и без колонки
 * `organization_id` — ровно тот случай, ради которого этот пакет существует.
 *
 * Заодно проверяется разборщик комментариев: он новый, и его ошибка немедленно
 * превратилась бы в неверную колонку «код продукта».
 * ------------------------------------------------------------------------- */
if (selfCheckOnly) {
	const failures = [];
	const expect = (ok, what) => {
		if (!ok) failures.push(what);
	};

	const fixture = [
		{
			table: "cash_shifts",
			exists: true,
			total: 0,
			hasOrganizationColumn: true,
			rowsOutsideFixtures: 0,
		},
		{
			table: "clinical_tasks",
			exists: true,
			total: 7,
			hasOrganizationColumn: true,
			rowsOutsideFixtures: 7,
		},
		{
			table: "payment_installments",
			exists: true,
			total: 500,
			hasOrganizationColumn: false,
			rowsOutsideFixtures: null,
		},
		{
			table: "signed_outpatient_cards",
			exists: true,
			total: 12,
			hasOrganizationColumn: false,
			rowsOutsideFixtures: null,
		},
	];
	const summary = summarizeRowsOutsideFixtures(fixture);
	const line = renderRowsOutsideFixturesLine(summary);
	const brokenLine = `строк вне фикстур ${summary.naiveZeroCoalesced}`;

	console.log(
		"НАБОР: 500 строк рассрочек и 12 подписанных карт БЕЗ колонки organization_id, 7 строк с ней.",
	);
	console.log(`  сломанный вариант печатал:  ${brokenLine}`);
	console.log(`  исправленный печатает:      ${line}`);
	console.log("");

	expect(summary.knownSum === 7, "сумма по известным таблицам обязана быть 7");
	expect(summary.knownTables === 2, "известных таблиц обязано быть 2");
	expect(
		summary.undeterminedTables.join(",") ===
			"payment_installments,signed_outpatient_cards",
		"неизвестные таблицы обязаны быть названы обе",
	);
	expect(
		summary.undeterminedRowsTotal === 512,
		"строк с неустановленной принадлежностью обязано быть 512",
	);
	expect(
		line.includes("НЕ ОПРЕДЕЛЯЕТСЯ"),
		"итоговая строка обязана назвать неизвестное неизвестным",
	);
	expect(
		line.includes("payment_installments"),
		"итоговая строка обязана назвать payment_installments",
	);
	expect(
		line.includes("signed_outpatient_cards"),
		"итоговая строка обязана назвать signed_outpatient_cards",
	);
	expect(
		!brokenLine.includes("payment_installments") &&
			!brokenLine.includes("не определ"),
		"старая строка обязана быть воспроизведена именно как молчащая — иначе проверка ничего не проверяет",
	);
	// Ложной тревоги быть не должно: когда неизвестного нет (сегодняшняя база), строка молчит про него.
	const allKnown = summarizeRowsOutsideFixtures([
		{ table: "cash_shifts", exists: true, total: 0, rowsOutsideFixtures: 0 },
	]);
	expect(
		!renderRowsOutsideFixturesLine(allKnown).includes("НЕ ОПРЕДЕЛЯЕТСЯ"),
		"при полностью известных данных строка не должна кричать про неизвестное",
	);

	// Разборщик комментариев на заданном образце с известным ответом.
	const sample = [
		"/* таблица payment_installments в шапке файла — это комментарий */",
		"const q = sql`SELECT * FROM payment_installments WHERE id = ${id}`;",
		"// payment_installments в строчном комментарии",
		"const re = /['\"]/; // payment_installments после регулярки с кавычкой внутри",
		"const other = bi_analytics_snapshots_payment_installments_x;",
		"const nested = tags.map((v) => `${v}payment_installments`);",
	].join("\n");
	const sampleMask = new Uint8Array(sample.length);
	markComments(sample, 0, sampleMask);
	const sampleCount = countOccurrences(
		sample,
		sampleMask,
		"payment_installments",
	);
	console.log(
		`ОБРАЗЕЦ РАЗБОРЩИКА: код ${sampleCount.code}, комментарии ${sampleCount.comment} (ожидается 2 и 3).`,
	);
	expect(
		sampleCount.code === 2,
		"в образце ровно два вхождения в коде (шаблон sql и вложенный шаблон)",
	);
	expect(
		sampleCount.comment === 3,
		"в образце ровно три вхождения в комментариях, включая строку после регулярки",
	);

	// Инвариант замера на настоящем дереве: сумма корзин равна общему числу вхождений.
	const measuredRefs = measureApiReferences(ORPHAN_TABLES.map((t) => t.table));
	if (measuredRefs === null) {
		console.log(
			"apps/api/src не найден с этого пути — замер ссылок не проверялся (и нулём не подменялся).",
		);
	} else {
		for (const [name, ref] of measuredRefs.references) {
			expect(
				ref.total ===
					ref.productionCode +
						ref.productionComment +
						ref.testCode +
						ref.testComment,
				`корзины ${name} не сходятся с общим числом вхождений`,
			);
		}
		console.log(
			`ЗАМЕР ССЫЛОК: файлов ${measuredRefs.scannedFiles}, корзины сходятся по всем ${measuredRefs.references.size} именам.`,
		);
	}

	if (failures.length > 0) {
		console.error("");
		for (const f of failures) console.error(`ПРОВАЛ: ${f}`);
		process.exit(1);
	}
	console.log("");
	console.log("САМОПРОВЕРКА ПРОЙДЕНА.");
	process.exit(0);
}

let measured;
try {
	measured = await main();
} catch (error) {
	console.error(
		"Нет доступа к живой базе — счёт не снят, и скрипт не выдаёт ноль за результат.",
	);
	console.error(`  ${error.message}`);
	process.exit(2);
}

const { control, results, scannedApiFiles } = measured;
const controlFailures = control.filter((c) => c.rows === 0);
const controlOk = controlFailures.length === 0;
const outsideFixtures = summarizeRowsOutsideFixtures(results);

if (asJson) {
	console.log(
		JSON.stringify(
			{
				controlOk,
				fixtureOrgPrefixes: FIXTURE_ORG_PREFIXES,
				control,
				// `rowsOutsideFixturesTotal` здесь НЕ выдаётся одним числом намеренно:
				// пока есть таблицы без `organization_id`, единственного верного итога не
				// существует, и потребитель JSON обязан увидеть обе величины.
				rowsOutsideFixtures: {
					knownSum: outsideFixtures.knownSum,
					knownTables: outsideFixtures.knownTables,
					undeterminedTables: outsideFixtures.undeterminedTables,
					undeterminedRowsTotal: outsideFixtures.undeterminedRowsTotal,
				},
				apiReferences: {
					scannedFiles: scannedApiFiles,
					measuredThisRun: scannedApiFiles !== null,
				},
				tables: results,
			},
			null,
			2,
		),
	);
	process.exit(controlOk ? 0 : 1);
}

const pad = (s, n) => String(s).padEnd(n);

console.log(
	"КОНТРОЛЬ: база, к которой подключились, обязана быть рабочей и непустой.",
);
for (const c of control) console.log(`  ${pad(c.table, 22)} ${c.rows}`);
if (!controlOk) {
	console.error(
		`\nКОНТРОЛЬ НЕ ПРОЙДЕН: пусто в ${controlFailures.map((c) => c.table).join(", ")}. ` +
			"Нули по брошенным таблицам ничего не доказывают — это не та база.",
	);
	process.exit(1);
}
console.log("");

console.log(
	`Фикстурные префиксы organization_id исключены: ${FIXTURE_ORG_PREFIXES.join(", ")}`,
);
console.log("");
console.log(
	`${pad("таблица", 36)} ${pad("колонок", 8)} ${pad("org_id", 7)} ${pad("всего", 6)} ${pad("вне фикстур", 15)} код api`,
);
console.log("-".repeat(96));
for (const r of results) {
	if (!r.exists) {
		console.log(`${pad(r.table, 36)} ${pad("—", 8)} ${pad("—", 7)} нет в базе`);
		continue;
	}
	// Ноль и «не знаю» — разные ответы, и в решающей колонке обязаны выглядеть по-разному.
	const outside =
		r.rowsOutsideFixtures === null ? "не определяется" : r.rowsOutsideFixtures;
	const apiCode = r.references
		? r.references.productionCode
		: "не определяется";
	console.log(
		`${pad(r.table, 36)} ${pad(r.columnCount, 8)} ${pad(r.hasOrganizationColumn ? "да" : "НЕТ", 7)} ` +
			`${pad(r.total, 6)} ${pad(outside, 15)} ${apiCode}`,
	);
}

console.log("");
if (scannedApiFiles === null) {
	console.log(
		"ССЫЛКИ В apps/api/src НЕ ОПРЕДЕЛЯЮТСЯ: каталог исходников не найден с этого пути. " +
			"Ноль вместо замера здесь не печатается.",
	);
} else {
	console.log(
		`ССЫЛКИ НА ИМЯ ТАБЛИЦЫ В apps/api/src — ЗАМЕР ЭТОГО ПРОГОНА (прочитано файлов ${scannedApiFiles}), ` +
			"не вписанные числа.",
	);
	console.log(
		"Границы слова с обеих сторон; рабочий код, комментарии и тесты разделены. «Удалять нельзя» даёт только",
	);
	console.log(
		"колонка «код продукта»: упоминание в комментарии таблицу не использует, а ссылка из теста — не продукт.",
	);
	console.log(
		`${pad("таблица", 36)} ${pad("код продукта", 13)} ${pad("комментарии", 12)} ${pad("тесты", 6)} ${pad("всего", 6)} файлы рабочего кода`,
	);
	console.log("-".repeat(110));
	for (const r of results) {
		const ref = r.references;
		if (!ref) {
			console.log(`${pad(r.table, 36)} не определяется`);
			continue;
		}
		const where = ref.files
			.filter((f) => !f.test && f.code > 0)
			.map((f) => `${f.file}:${f.code}`)
			.join(" ");
		console.log(
			`${pad(r.table, 36)} ${pad(ref.productionCode, 13)} ${pad(ref.productionComment, 12)} ` +
				`${pad(ref.testCode + ref.testComment, 6)} ${pad(ref.total, 6)} ${where === "" ? "—" : where}`,
		);
	}
}

console.log("");
console.log(
	"ОБЪЯВЛЕННЫЙ ДВОЙНИК: непустой двойник = функция работает через него; пустой = функции нет нигде.",
);
console.log(
	`${pad("брошенная", 36)} ${pad("двойник", 34)} ${pad("строк", 7)} условие`,
);
console.log("-".repeat(96));
for (const r of results) {
	if (!r.exists) continue;
	if (!r.twin) {
		console.log(
			`${pad(r.table, 36)} ${pad("двойника нет", 34)} ${pad("—", 7)} понятие не реализовано нигде`,
		);
		continue;
	}
	if (!r.twin.exists) {
		console.log(
			`${pad(r.table, 36)} ${pad(r.twin.table, 34)} ${pad("—", 7)} двойника нет в базе`,
		);
		continue;
	}
	console.log(
		`${pad(r.table, 36)} ${pad(r.twin.table, 34)} ${pad(r.twin.matching, 7)} ${r.twin.predicate}` +
			(r.twin.matching === r.twin.total
				? ""
				: ` (всего в таблице ${r.twin.total})`),
	);
}

const withRows = results.filter((r) => r.exists && r.total > 0);
console.log("");
if (withRows.length === 0) {
	console.log(
		"Ни одной строки ни в одной брошенной таблице: разбивать по организациям нечего.",
	);
} else {
	console.log("Разбивка по организациям (только непустые брошенные таблицы):");
	for (const r of withRows) {
		console.log(`  ${r.table}:`);
		for (const org of r.byOrganization ?? []) {
			console.log(
				`    ${org.organizationId ?? "NULL"}  ${org.rows}  (${org.kind})`,
			);
		}
		if (!r.byOrganization)
			console.log(
				"    колонки organization_id нет — принадлежность не определяется",
			);
	}
}

const liveTwins = results.filter(
	(r) => r.exists && r.twin?.exists && r.twin.matching > 0,
).length;
const namedInApiCode = results.filter(
	(r) => r.references && r.references.productionCode > 0,
).length;
console.log("");
console.log(
	`Итого брошенных таблиц ${results.length}, непустых ${withRows.length}, двойников с данными ${liveTwins}, ` +
		(scannedApiFiles === null
			? "названных рабочим кодом api не определяется."
			: `названных рабочим кодом api ${namedInApiCode}.`),
);
console.log(renderRowsOutsideFixturesLine(outsideFixtures));
