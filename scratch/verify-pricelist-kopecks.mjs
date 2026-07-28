/**
 * Живая проверка: прайс клиники держит копейки на всём пути.
 *
 * service_catalog_items.base_price_rub и price_rub были integer. Услугу за
 * 1 500,50 ₽ занести было нельзя вовсе: копейки не округлялись при выводе, а
 * отвергались базой на записи. Прайс — то, из чего вырастает план лечения и
 * счёт пациенту, поэтому округление начиналось прямо здесь.
 *
 * Путь длинный, и сломаться он может в четырёх местах: колонка в базе, режим
 * numeric у drizzle (без mode: "number" значение приходит строкой), схема
 * `@dental/shared` и разбор ответа. Скрипт проходит его целиком: кладёт услугу
 * с копейками прямо в базу, читает дашборд через настоящий сервер и смотрит,
 * что вернулось — число с копейками или строка, или округлённое до рубля.
 *
 * Всё созданное удаляется.
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

/** Цена с копейками, в которой копейки не круглые: 50 копеек «съедаются» тише. */
const PRICE = 1500.5;
const CODE = "ПРОВЕРКА-КОПЕЕК";
let createdId = null;

try {
	const [{ organization_id: orgId }] = (
		await client.query(`select organization_id from users where id = $1`, [OWNER])
	).rows;
	check("организация найдена", Boolean(orgId), String(orgId));

	/*
	 * Прайс на экране берётся из таблицы `services`, а не из
	 * `service_catalog_items`.
	 *
	 * Первая редакция проверки клала строку в service_catalog_items, база её
	 * принимала, а в дашборде услуга не появлялась — при этом в прайсе было семь
	 * позиций, хотя в service_catalog_items ноль строк. Так и вскрылось, что
	 * прайсовых таблиц две: мастер первого запуска пишет в одну
	 * (routes/workspaceProfile.ts), дашборд читает другую
	 * (db/domainStateHydration.ts), а документы — снова первую
	 * (db/documentQuery.ts через getServiceCatalogForOrganization).
	 */
	const inserted = await client.query(
		`insert into services
		   (organization_id, code, title, base_price_rub, duration_minutes)
		 values ($1, $2, $3, $4, 30)
		 returning id, base_price_rub`,
		[orgId, CODE, "Проверочная услуга с копейками", PRICE],
	);
	createdId = inserted.rows[0].id;
	check("база приняла цену с копейками", Boolean(createdId), `в базе: ${inserted.rows[0].base_price_rub}`);
	check(
		"база хранит ровно 1500.50, а не 1500 и не 1501",
		String(inserted.rows[0].base_price_rub) === "1500.50",
		String(inserted.rows[0].base_price_rub),
	);

	const dash = await req("/api/dashboard", { headers: H });
	check("дашборд отвечает", dash.status === 200, `код ${dash.status}`);
	const body = await dash.json();
	const item = (body.serviceCatalog ?? []).find((s) => s.code === CODE);
	check("услуга пришла в прайс дашборда", Boolean(item), item?.title);
	if (item) {
		check(
			"цена пришла числом, а не строкой",
			typeof item.basePriceRub === "number",
			`${typeof item.basePriceRub}: ${JSON.stringify(item.basePriceRub)}`,
		);
		check("копейки на месте, рубль не округлён", item.basePriceRub === PRICE, String(item.basePriceRub));
	}

	/*
	 * Дашборд проходит через схему `@dental/shared`. Если бы там осталось
	 * z.number().int(), разбор упал бы или выбросил услугу — поэтому отдельно
	 * убеждаемся, что прайс не опустел целиком.
	 */
	check(
		"схема не выбросила прайс целиком",
		Array.isArray(body.serviceCatalog) && body.serviceCatalog.length > 0,
		`позиций: ${body.serviceCatalog?.length}`,
	);
} finally {
	if (createdId) {
		const removed = await client
			.query(`delete from services where id = $1 returning id`, [createdId])
			.catch(() => ({ rowCount: -1 }));
		console.log(`\nудалено проверочных услуг: ${removed.rowCount}`);
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
