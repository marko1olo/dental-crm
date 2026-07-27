/**
 * Живая проверка: что на самом деле охраняет замок «🔐 Разблокировать
 * сохранение расписания» на экране «Записи».
 *
 * В интерфейсе это поле пароля с подписью «Секрет администратора клиники для
 * сохранения расписания». После ввода экран пишет «Админ-доступ активен для
 * расписания».
 *
 * На сервере есть `requireScheduleMutationAccess` — она сверяет заголовок
 * `x-dente-admin-secret` с `DENTE_SCHEDULE_ADMIN_SECRET`. Но в `schedule.ts`
 * она объявлена и **не вызывается ни в одном маршруте**. Скрипт проверяет
 * фактическое поведение API, а не чтение кода.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const MARK = "Проверка замка расписания";

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
let chairId = null;

try {
	const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
	const patients = dash.patients ?? [];
	const staff = (dash.clinicSettings?.staff ?? []).filter((s) => s.active);
	const doctor = staff.find((s) => s.role === "doctor") ?? staff[0];
	const orgRow = await client.query(`select organization_id as org from patients where id = $1`, [
		patients[0].id,
	]);
	const orgId = orgRow.rows[0]?.org;
	const chair = await client.query(
		`insert into chairs (organization_id, name, is_active) values ($1, $2, true) returning id`,
		[orgId, MARK],
	);
	chairId = chair.rows[0].id;

	const start = new Date();
	start.setHours(4, 0, 0, 0);
	const body = {
		patientId: patients[0].id,
		doctorUserId: doctor.id,
		chairId,
		startsAt: start.toISOString(),
		endsAt: new Date(start.getTime() + 30 * 60_000).toISOString(),
		reason: MARK,
		status: "planned",
	};

	// 1. Создание приёма вообще без секрета.
	const created = await req("/api/appointments", { method: "POST", headers: H, body: JSON.stringify(body) });
	check(
		"приём создаётся без секрета администратора",
		created.status === 201,
		`код ${created.status}`,
	);

	const row = await client.query(`select id from appointments where reason = $1 limit 1`, [MARK]);
	const appointmentId = row.rows[0]?.id ?? null;
	check("приём действительно лёг в базу", Boolean(appointmentId), String(appointmentId));

	// 2. Изменение расписания приёма без секрета — это ровно то, что интерфейс
	//    называет «сохранением расписания».
	if (appointmentId) {
		const moved = new Date(start.getTime() + 60 * 60_000);
		const put = await req(`/api/schedule/appointments/${appointmentId}`, {
			method: "PUT",
			headers: H,
			body: JSON.stringify({
				startsAt: moved.toISOString(),
				endsAt: new Date(moved.getTime() + 30 * 60_000).toISOString(),
			}),
		});
		check(
			"расписание приёма сохраняется без секрета администратора",
			put.status >= 200 && put.status < 300,
			`код ${put.status}`,
		);
		const after = await client.query(`select starts_at from appointments where id = $1`, [appointmentId]);
		check(
			"перенос доехал до базы",
			new Date(after.rows[0]?.starts_at).getTime() === moved.getTime(),
			`в базе ${after.rows[0]?.starts_at}`,
		);
	}

	// 3. Заведомо неверный секрет ничего не меняет: сервер его не смотрит.
	if (appointmentId) {
		const moved = new Date(start.getTime() + 120 * 60_000);
		const put = await req(`/api/schedule/appointments/${appointmentId}`, {
			method: "PUT",
			// Заголовки — ByteString, кириллица в них не проходит вовсе.
			headers: { ...H, "x-dente-admin-secret": "obviously-wrong-secret-value" },
			body: JSON.stringify({
				startsAt: moved.toISOString(),
				endsAt: new Date(moved.getTime() + 30 * 60_000).toISOString(),
			}),
		});
		check(
			"неверный секрет не отвергается: сервер заголовок не проверяет",
			put.status >= 200 && put.status < 300,
			`код ${put.status}`,
		);
	}

	console.log(
		"\nвывод: замок в интерфейсе ничего не охраняет. Серверная охрана\n" +
			"requireScheduleMutationAccess объявлена в apps/api/src/routes/schedule.ts:137\n" +
			"и не вызывается ни в одном маршруте, DENTE_SCHEDULE_ADMIN_SECRET не задан.",
	);
} finally {
	const gone = await client.query(`delete from appointments where reason = $1`, [MARK]).catch((e) => {
		console.log(`уборка приёмов не прошла: ${String(e).slice(0, 160)}`);
		return { rowCount: -1 };
	});
	const chairsGone = chairId
		? await client.query(`delete from chairs where id = $1`, [chairId]).catch(() => ({ rowCount: -1 }))
		: { rowCount: 0 };
	console.log(`убрано: приёмов ${gone.rowCount}, кресел ${chairsGone.rowCount}`);
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
