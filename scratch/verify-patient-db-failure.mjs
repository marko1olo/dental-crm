/**
 * Проверяет, что при ошибке записи в базу пациент НЕ показывается
 * сохранённым.
 *
 * В patientsQuery три функции ловят любую ошибку базы и молча
 * возвращают результат из оперативной памяти (sampleData):
 *   createPatientInDb, updatePatientInDb,
 *   updatePatientAdministrativeProfileInDb.
 * Маршрут получает объект пациента, отвечает 200, оператор видит
 * «сохранено» — а в базе ничего не изменилось. Данные теряются молча,
 * и заметить это можно только после перезагрузки страницы.
 *
 * Как вызываем сбой: в текстовое поле кладём нулевой байт. PostgreSQL
 * не принимает его в значениях text, запрос падает, ничего не
 * записывается — то есть ровно тот случай, ради которого и написан
 * catch. Сам байт в исходник не пишем: он делает файл бинарным для git
 * и инструментов, поэтому собираем через String.fromCharCode(0).
 *
 * Ожидание: HTTP не 2xx, и в базе прежнее значение.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const NUL = String.fromCharCode(0);

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден");
	return line.slice("DATABASE_URL=".length).trim();
}

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
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

try {
	const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
	const own = dash?.patients?.[0];
	if (!own) {
		console.error("в дашборде нет пациентов");
		process.exit(1);
	}
	const before = (await client.query(`select full_name, notes from patients where id = $1`, [own.id])).rows[0];
	console.log(`пациент ${own.id}, ФИО в базе «${before.full_name}»\n`);

	// --- 1. Обновление, которое база обязана отвергнуть ---
	console.log("1. Обновление с нулевым байтом в примечании");
	const poisoned = `проверка сбоя${NUL}хвост`;
	const res = await fetch(`${API}/api/patients/${own.id}`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({ fullName: before.full_name, notes: poisoned }),
	});
	const body = await res.json().catch(() => ({}));
	check(
		"клиент не получает подтверждение сохранения",
		res.status >= 400,
		`HTTP ${res.status} ${String(body?.message || body?.error || JSON.stringify(body)).slice(0, 70)}`,
	);

	const after = (await client.query(`select full_name, notes from patients where id = $1`, [own.id])).rows[0];
	check("в базе примечание не изменилось", after.notes === before.notes, `в базе ${JSON.stringify(after.notes)?.slice(0, 50)}`);
	check("в базе ФИО не изменилось", after.full_name === before.full_name, `в базе «${after.full_name}»`);

	// --- 2. Создание, которое база обязана отвергнуть ---
	console.log("\n2. Создание пациента с нулевым байтом в ФИО");
	const countBefore = Number((await client.query(`select count(*)::int as n from patients`)).rows[0].n);
	const resCreate = await fetch(`${API}/api/patients`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ fullName: `Проба Сбоя${NUL}Тест`, phone: "+70000000099" }),
	});
	const bodyCreate = await resCreate.json().catch(() => ({}));
	check(
		"создание не выдаётся за успешное",
		resCreate.status >= 400,
		`HTTP ${resCreate.status} ${String(bodyCreate?.message || bodyCreate?.error || JSON.stringify(bodyCreate)).slice(0, 70)}`,
	);
	const countAfter = Number((await client.query(`select count(*)::int as n from patients`)).rows[0].n);
	check("в базе не появилось новых пациентов", countAfter === countBefore, `было ${countBefore}, стало ${countAfter}`);

	// Если пациент всё же «создался» — сверим, существует ли выданный
	// идентификатор в базе. Именно это и вводит оператора в заблуждение.
	if (resCreate.status < 400 && bodyCreate?.id) {
		const inDb = (await client.query(`select id from patients where id = $1`, [bodyCreate.id])).rows.length;
		check(
			"выданный клиенту идентификатор существует в базе",
			inDb === 1,
			`API вернул id ${bodyCreate.id}, строк с таким id в базе: ${inDb}`,
		);
	}

	// --- 3. Контроль: обычное сохранение по-прежнему работает ---
	console.log("\n3. Контроль: нормальное обновление");
	const resOk = await fetch(`${API}/api/patients/${own.id}`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({ fullName: before.full_name, notes: before.notes ?? null }),
	});
	check("нормальное обновление проходит", resOk.status === 200, `HTTP ${resOk.status}`);
	const restored = (await client.query(`select full_name, notes from patients where id = $1`, [own.id])).rows[0];
	check(
		"данные пациента остались исходными",
		restored.full_name === before.full_name && restored.notes === before.notes,
		`ФИО «${restored.full_name}»`,
	);
} finally {
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
