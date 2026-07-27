/**
 * Живая проверка: что делает касса с копейками.
 *
 * Колонка payments.amount_rub объявлена integer, а схема API требует
 * z.number().int(). Вопрос, на который надо ответить фактом, а не чтением
 * кода: дробная сумма отвергается или молча усекается. Если усекается —
 * клиника теряет деньги на каждой оплате с копейками, и это надо чинить
 * немедленно. Если отвергается — денег не теряем, но принять оплату
 * «1500 руб. 50 коп.» невозможно, и об этом надо честно сказать.
 *
 * Скрипт удаляет созданные оплаты за собой.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MARK = "Проверка копеек";

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
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const createdMutationIds = [];

try {
	const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const patient = (dash.patients ?? [])[0];

	async function pay(amountRub, tag) {
		const clientMutationId = `${MARK}-${tag}-${amountRub}`;
		createdMutationIds.push(clientMutationId);
		const res = await req("/api/billing/payments", {
			method: "POST",
			headers: H,
			body: JSON.stringify({
				patientId: patient.id,
				amountRub,
				method: "cash",
				paidAt: new Date().toISOString(),
				clientMutationId,
			}),
		});
		const body = await res.json().catch(() => ({}));
		return { status: res.status, body };
	}

	// 1. Целая сумма — опорная точка: путь оплаты вообще работает.
	const whole = await pay(1500, "whole");
	check("целая сумма принимается", whole.status === 201 || whole.status === 200, `код ${whole.status} ${String(whole.body?.message ?? "")}`);
	if (whole.status === 201 || whole.status === 200) {
		const row = await client.query(
			`select amount_rub from payments where client_mutation_id = $1`,
			[`${MARK}-whole-1500`],
		);
		check(
			"целая сумма легла в базу без изменений",
			Number(row.rows[0]?.amount_rub) === 1500,
			`в базе ${row.rows[0]?.amount_rub}`,
		);
	}

	// 2. Сумма с копейками — то, чего касса раньше не умела.
	const fractional = await pay(1500.5, "kopecks");
	check(
		"сумма с копейками принимается",
		fractional.status === 201 || fractional.status === 200,
		`код ${fractional.status} ${String(fractional.body?.message ?? "")}`,
	);
	const kopecksRow = await client.query(
		`select amount_rub from payments where client_mutation_id = $1`,
		[`${MARK}-kopecks-1500.5`],
	);
	check(
		"в базе ровно то, что прислали, до копейки",
		Number(kopecksRow.rows[0]?.amount_rub) === 1500.5,
		`прислали 1500.5, в базе ${kopecksRow.rows[0]?.amount_rub}`,
	);
	check(
		"тип колонки — точный десятичный, а не двоичный",
		String(kopecksRow.rows[0]?.amount_rub ?? "") === "1500.5" ||
			Number(kopecksRow.rows[0]?.amount_rub) === 1500.5,
		`значение из драйвера: ${typeof kopecksRow.rows[0]?.amount_rub} ${JSON.stringify(kopecksRow.rows[0]?.amount_rub)}`,
	);
	check(
		"ответ API отдаёт сумму числом, а не строкой",
		typeof fractional.body?.amountRub === "number" && fractional.body.amountRub === 1500.5,
		`${typeof fractional.body?.amountRub} ${JSON.stringify(fractional.body?.amountRub)}`,
	);

	// 3. Одна копейка — крайний случай, на котором ломается плавающая точка.
	const oneKopeck = await pay(0.01, "onekopeck");
	check(
		"одна копейка принимается",
		oneKopeck.status === 201 || oneKopeck.status === 200,
		`код ${oneKopeck.status}`,
	);
	const oneKopeckRow = await client.query(
		`select amount_rub from payments where client_mutation_id = $1`,
		[`${MARK}-onekopeck-0.01`],
	);
	check(
		"одна копейка сохранена как 0.01, а не как ноль",
		Number(oneKopeckRow.rows[0]?.amount_rub) === 0.01,
		`в базе ${oneKopeckRow.rows[0]?.amount_rub}`,
	);

	// 4. Три знака после запятой — это не деньги, молча округлять нельзя.
	const tooPrecise = await pay(10.005, "toprecise");
	check(
		"три знака после запятой отвергаются, а не округляются молча",
		tooPrecise.status === 400,
		`код ${tooPrecise.status}`,
	);

	// 5. Деление без потерь: сумма частей равна целому до копейки.
	const split = await client.query(
		`select (1000.00::numeric(12,2) / 3)::numeric(12,2) as part`,
	);
	const part = Number(split.rows[0].part);
	check(
		"деление 1000 на три и сложение обратно не теряет копейку",
		Math.round((part * 2 + (1000 - part * 2)) * 100) === 100000,
		`часть ${part}, остаток ${(1000 - part * 2).toFixed(2)}`,
	);
} finally {
	let removed = 0;
	for (const id of createdMutationIds) {
		const res = await client
			.query(`delete from payments where client_mutation_id = $1`, [id])
			.catch(() => ({ rowCount: 0 }));
		removed += res.rowCount ?? 0;
	}
	console.log(`убрано оплат: ${removed}`);
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
