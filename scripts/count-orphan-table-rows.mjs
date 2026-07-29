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
 * ЗАПУСК (из корня репозитория):
 *   node scripts/count-orphan-table-rows.mjs
 *   node scripts/count-orphan-table-rows.mjs --json
 *
 * Код возврата: 0 — счёт снят и контроль пройден; 1 — контроль не пройден
 * (нули ничего не значат); 2 — до базы не дошли.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const asJson = process.argv.includes("--json");

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
const CONTROL_TABLES = ["organizations", "patients", "appointments", "payments", "visits", "generated_documents"];

/**
 * Таблицы без объявления в Drizzle: состав повторяет `undeclaredTables` реестра,
 * минус служебный `_dente_migrations` (его пишет раскатчик миграций).
 *
 * `serverReferences` — сколько раз имя таблицы встречается в `apps/api/src`
 * (без `dist`), считано с левой границей слова. Граница обязательна:
 * `analytics_snapshots` без неё ловит объявленную `bi_analytics_snapshots`, а
 * `doctor_payrolls` — объявленную `pricelist_doctor_payrolls`, и обе брошенные
 * таблицы выглядят «используемыми», не будучи упомянутыми ни разу.
 *
 * `twin` — объявленная таблица того же смысла (или её колонка/значение kind).
 * `null` — двойника нет: понятие в продукте не реализовано нигде.
 */
const ORPHAN_TABLES = [
	{ table: "analytics_snapshots", serverReferences: 0, twin: { table: "bi_analytics_snapshots" } },
	{ table: "cash_shifts", serverReferences: 0, twin: null },
	{ table: "clinic_workflows", serverReferences: 0, twin: null },
	{ table: "clinical_tasks", serverReferences: 18, twin: null },
	{ table: "dental_lab_orders", serverReferences: 0, twin: { table: "lab_orders" } },
	{ table: "doctor_assistants", serverReferences: 0, twin: { table: "appointments", column: "assistant_user_id" } },
	{ table: "doctor_payrolls", serverReferences: 0, twin: { table: "pricelist_doctor_payrolls" } },
	{
		table: "document_templates",
		serverReferences: 0,
		twin: { table: "generated_documents" },
	},
	{ table: "drill_protocols", serverReferences: 0, twin: { table: "patient_ct_plannings" } },
	{ table: "ingested_patients_mapping", serverReferences: 0, twin: { table: "migration_entity_links" } },
	{ table: "ingestion_sources", serverReferences: 0, twin: { table: "migration_runs" } },
	{ table: "migration_templates", serverReferences: 0, twin: { table: "migration_runs", column: "vendor_profile" } },
	{ table: "patient_anamnesis", serverReferences: 1, twin: null },
	{
		table: "payment_installments",
		serverReferences: 0,
		twin: { table: "generated_documents", kindColumn: "kind", kindValue: "installment_payment_schedule" },
	},
	{ table: "scheduler_reservations", serverReferences: 0, twin: { table: "schedule_time_reservations" } },
	{
		table: "signed_outpatient_cards",
		serverReferences: 0,
		twin: { table: "visit_diaries", column: "crypto_signature_pkcs7" },
	},
	{ table: "treatment_plan_stages_auto_archive", serverReferences: 0, twin: { table: "treatment_plan_stages" } },
	{ table: "ztl_lab_orders", serverReferences: 0, twin: { table: "lab_orders" } },
];

/** `DATABASE_URL` из окружения или КОРНЕВОГО `.env`. Значение никуда не печатается. */
function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(join(REPO_ROOT, ".env"), "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден ни в окружении, ни в корневом .env");
	return line.slice("DATABASE_URL=".length).trim();
}

/** Квотирование идентификатора: имена зашиты в файле, но подстановка без квот — привычка, а не аргумент. */
function quoteIdent(name) {
	if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error(`недопустимое имя объекта: ${name}`);
	return `"${name}"`;
}

/**
 * Единственная точка отправки SQL. Всё, что не начинается с `select`, отвергается
 * до отправки: скрипт разведки не имеет права ни `delete`, ни `alter`, ни `drop`.
 */
function readOnly(client, text, values) {
	if (!/^\s*select\b/i.test(text)) throw new Error(`не select — запрос отклонён: ${text.slice(0, 40)}`);
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
	const { rows } = await readOnly(client, `select count(*)::int as n from ${quoteIdent(table)} ${where}`);
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
		if (!columns.includes(twin.column)) return { ...twin, exists: false, columnMissing: true };
		return {
			...twin,
			exists: true,
			total: await countRows(client, twin.table),
			matching: await countRows(client, twin.table, `where ${quoteIdent(twin.column)} is not null`),
			predicate: `${twin.column} is not null`,
		};
	}
	if (twin.kindValue) {
		if (!columns.includes(twin.kindColumn)) return { ...twin, exists: false, columnMissing: true };
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
	return { ...twin, exists: true, total, matching: total, predicate: "вся таблица" };
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

		const results = [];
		for (const { table, serverReferences, twin } of ORPHAN_TABLES) {
			const columns = await columnsOf(client, table);
			if (columns.length === 0) {
				results.push({ table, serverReferences, exists: false });
				continue;
			}
			const total = await countRows(client, table);
			const hasOrg = columns.includes("organization_id");
			let byOrganization = null;
			let rowsOutsideFixtures = null;
			if (hasOrg) {
				({ byOrganization, rowsOutsideFixtures } = await organizationBreakdown(client, table));
			} else {
				// Колонки организации нет — вычитать фикстуры не из чего. Для пустой
				// таблицы это безразлично; для непустой честный ответ «принадлежность
				// строк по организациям не определяется», а не тихий ноль.
				rowsOutsideFixtures = total === 0 ? 0 : null;
			}
			results.push({
				table,
				serverReferences,
				exists: true,
				columnCount: columns.length,
				hasOrganizationColumn: hasOrg,
				total,
				rowsOutsideFixtures,
				byOrganization,
				twin: await twinRows(client, twin),
			});
		}
		return { control, results };
	} finally {
		await client.end();
	}
}

let measured;
try {
	measured = await main();
} catch (error) {
	console.error("Нет доступа к живой базе — счёт не снят, и скрипт не выдаёт ноль за результат.");
	console.error(`  ${error.message}`);
	process.exit(2);
}

const { control, results } = measured;
const controlFailures = control.filter((c) => c.rows === 0);
const controlOk = controlFailures.length === 0;

if (asJson) {
	console.log(
		JSON.stringify(
			{ controlOk, fixtureOrgPrefixes: FIXTURE_ORG_PREFIXES, control, tables: results },
			null,
			2,
		),
	);
	process.exit(controlOk ? 0 : 1);
}

const pad = (s, n) => String(s).padEnd(n);

console.log("КОНТРОЛЬ: база, к которой подключились, обязана быть рабочей и непустой.");
for (const c of control) console.log(`  ${pad(c.table, 22)} ${c.rows}`);
if (!controlOk) {
	console.error(
		`\nКОНТРОЛЬ НЕ ПРОЙДЕН: пусто в ${controlFailures.map((c) => c.table).join(", ")}. ` +
			"Нули по брошенным таблицам ничего не доказывают — это не та база.",
	);
	process.exit(1);
}
console.log("");

console.log(`Фикстурные префиксы organization_id исключены: ${FIXTURE_ORG_PREFIXES.join(", ")}`);
console.log("");
console.log(
	`${pad("таблица", 36)} ${pad("колонок", 8)} ${pad("org_id", 7)} ${pad("всего", 6)} ${pad("вне фикстур", 12)} ссылок в api`,
);
console.log("-".repeat(96));
for (const r of results) {
	if (!r.exists) {
		console.log(`${pad(r.table, 36)} ${pad("—", 8)} ${pad("—", 7)} нет в базе`);
		continue;
	}
	const outside = r.rowsOutsideFixtures === null ? "не определяется" : r.rowsOutsideFixtures;
	console.log(
		`${pad(r.table, 36)} ${pad(r.columnCount, 8)} ${pad(r.hasOrganizationColumn ? "да" : "НЕТ", 7)} ` +
			`${pad(r.total, 6)} ${pad(outside, 12)} ${r.serverReferences}`,
	);
}

console.log("");
console.log("ОБЪЯВЛЕННЫЙ ДВОЙНИК: непустой двойник = функция работает через него; пустой = функции нет нигде.");
console.log(`${pad("брошенная", 36)} ${pad("двойник", 34)} ${pad("строк", 7)} условие`);
console.log("-".repeat(96));
for (const r of results) {
	if (!r.exists) continue;
	if (!r.twin) {
		console.log(`${pad(r.table, 36)} ${pad("двойника нет", 34)} ${pad("—", 7)} понятие не реализовано нигде`);
		continue;
	}
	if (!r.twin.exists) {
		console.log(`${pad(r.table, 36)} ${pad(r.twin.table, 34)} ${pad("—", 7)} двойника нет в базе`);
		continue;
	}
	console.log(
		`${pad(r.table, 36)} ${pad(r.twin.table, 34)} ${pad(r.twin.matching, 7)} ${r.twin.predicate}` +
			(r.twin.matching === r.twin.total ? "" : ` (всего в таблице ${r.twin.total})`),
	);
}

const withRows = results.filter((r) => r.exists && r.total > 0);
console.log("");
if (withRows.length === 0) {
	console.log("Ни одной строки ни в одной брошенной таблице: разбивать по организациям нечего.");
} else {
	console.log("Разбивка по организациям (только непустые брошенные таблицы):");
	for (const r of withRows) {
		console.log(`  ${r.table}:`);
		for (const org of r.byOrganization ?? []) {
			console.log(`    ${org.organizationId ?? "NULL"}  ${org.rows}  (${org.kind})`);
		}
		if (!r.byOrganization) console.log("    колонки organization_id нет — принадлежность не определяется");
	}
}

const liveTwins = results.filter((r) => r.exists && r.twin?.exists && r.twin.matching > 0).length;
console.log("");
console.log(
	`Итого брошенных таблиц ${results.length}, непустых ${withRows.length}, ` +
		`строк вне фикстур ${results.reduce((n, r) => n + (r.rowsOutsideFixtures ?? 0), 0)}; ` +
		`двойников с данными ${liveTwins}.`,
);
