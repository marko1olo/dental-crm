/**
 * Живая проверка расхождения двух прайсовых таблиц.
 *
 * В базе два справочника услуг:
 *   services — его читает дашборд (db/domainStateHydration.ts), и именно из
 *     него берётся список услуг на всех экранах;
 *   service_catalog_items — в него пишет мастер первого запуска
 *     (routes/workspaceProfile.ts), из него читают документы
 *     (db/documentQuery.ts) и по нему сверяет услугу склад
 *     (routes/inventory.ts).
 *
 * Пока таблицы не совпадают, экран показывает одни услуги, а сервер проверяет
 * другие. Скрипт измеряет это на живой системе: заводит услугу в той таблице,
 * которую читает экран, и пробует применить её там, где сервер сверяет по
 * второй.
 *
 * Только измерение, ничего не чинит. Всё созданное удаляет.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	for (const file of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(file, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
}

async function req(path, init = {}, attempts = 14) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 2500));
		}
	}
	throw last;
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await req("/api/auth/staff/unlock", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());
const H = {
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

let serviceId = null;
let orgId = null;

try {
	orgId = (await client.query(`select organization_id from users where id = $1`, [OWNER])).rows[0]
		.organization_id;

	const counts = await client.query(
		`select
		   (select count(*)::int from services where organization_id = $1) as services,
		   (select count(*)::int from service_catalog_items where organization_id = $1) as catalog`,
		[orgId],
	);
	console.log(
		`  строк в services: ${counts.rows[0].services}, в service_catalog_items: ${counts.rows[0].catalog}`,
	);

	/*
	 * Услуга заводится в service_catalog_items — там, куда пишет мастер первого
	 * запуска и откуда читают документы и склад. Экран обязан показать её же.
	 *
	 * До правки экран читал таблицу services, и проверка ставила строку туда:
	 * услуга появлялась в списке, а склад отвечал на неё 404. Теперь измеряем
	 * обратное направление — что заведённое мастером доходит до экрана.
	 */
	const inserted = await client.query(
		`insert into service_catalog_items
		   (organization_id, code, title, base_price_rub, price_rub, duration_minutes)
		 values ($1, 'ПРОВЕРКА-РАСХОЖДЕНИЯ', 'Проверочная услуга расхождения', 2400.50, 2400.50, 30)
		 returning id`,
		[orgId],
	);
	serviceId = inserted.rows[0].id;

	const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const onScreen = (dash.serviceCatalog ?? []).find((s) => s.id === serviceId);
	check("услуга видна на экране", Boolean(onScreen), onScreen?.title);

	/*
	 * Правило списания материала: сервер сверяет услугу по service_catalog_items.
	 * Если таблицы разошлись, кладовщик выбирает услугу из списка на экране и
	 * получает отказ «услуга не найдена» — про услугу, которую только что видел.
	 */
	const ruleResponse = await req(`/api/inventory/${orgId}/rules/${serviceId}`, { headers: H });
	check(
		"сервер знает эту услугу при работе со складом",
		ruleResponse.status !== 404,
		`код ${ruleResponse.status}`,
	);

	check(
		"цена с копейками дошла до экрана без округления",
		onScreen?.basePriceRub === 2400.5,
		String(onScreen?.basePriceRub),
	);

	// Документы читают через getServiceCatalogForOrganization — ту же таблицу.
	const inDocumentSource = await client.query(
		`select id from service_catalog_items where id = $1`,
		[serviceId],
	);
	check(
		"услуга видна и там, откуда её берут документы",
		inDocumentSource.rowCount > 0,
		inDocumentSource.rowCount > 0 ? "" : "в источнике документов её нет",
	);
} finally {
	if (serviceId) {
		const removed = await client
			.query(`delete from service_catalog_items where id = $1 returning id`, [serviceId])
			.catch(() => ({ rowCount: -1 }));
		console.log(`\nудалено проверочных услуг: ${removed.rowCount}`);
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
