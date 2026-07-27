/**
 * Проверяет, что клиника не может изменить карточку чужого пациента.
 *
 * updatePatientInDb и updatePatientAdministrativeProfileInDb принимают
 * organizationId параметром, но в условии WHERE его нет — обновление
 * идёт только по идентификатору пациента. Маршруты
 * PUT /api/patients/:patientId и .../administrative-profile берут
 * organizationId из токена и передают его дальше, то есть намерение
 * ограничить область однозначно, а ограничения нет.
 *
 * Сценарий: заводим вторую организацию с одним пациентом, берём токен
 * первой клиники и пробуем переписать чужую карточку. Ожидание —
 * отказ и неизменённые данные в базе.
 *
 * Все созданные строки удаляются в конце.
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
	const env = readFileSync(".env", "utf8");
	const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
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

const ORIGINAL_NAME = "Чужой Пациент Другой Клиники";
const ORIGINAL_PHONE = "+70000000001";
let foreignOrgId = null;
let foreignPatientId = null;

try {
	foreignOrgId = (
		await client.query(`insert into organizations (name) values ($1) returning id`, ["Соседняя клиника (проверка изоляции)"])
	).rows[0].id;
	foreignPatientId = (
		await client.query(`insert into patients (organization_id, full_name, phone) values ($1, $2, $3) returning id`, [
			foreignOrgId,
			ORIGINAL_NAME,
			ORIGINAL_PHONE,
		])
	).rows[0].id;
	console.log(`чужая организация ${foreignOrgId}`);
	console.log(`чужой пациент    ${foreignPatientId}\n`);

	// --- 1. Основные реквизиты ---
	console.log("1. Попытка переписать ФИО и телефон чужого пациента");
	const res = await fetch(`${API}/api/patients/${foreignPatientId}`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({ fullName: "Взломано Первой Клиникой", phone: "+79990000000" }),
	});
	const body = await res.json().catch(() => ({}));
	check("чужая карточка не обновляется", res.status === 404 || res.status === 403, `HTTP ${res.status} ${(body?.message || body?.error || "").slice(0, 60)}`);

	let row = (await client.query(`select full_name, phone from patients where id = $1`, [foreignPatientId])).rows[0];
	check(
		"ФИО в базе не изменилось",
		row?.full_name === ORIGINAL_NAME,
		`в базе «${row?.full_name}», ожидалось «${ORIGINAL_NAME}»`,
	);
	check("телефон в базе не изменился", row?.phone === ORIGINAL_PHONE, `в базе «${row?.phone}»`);

	// --- 2. Административный профиль ---
	console.log("\n2. Попытка переписать административный профиль чужого пациента");
	const res2 = await fetch(`${API}/api/patients/${foreignPatientId}/administrative-profile`, {
		method: "PUT",
		headers: H,
		body: JSON.stringify({ vipStatus: true, internalNotes: "запись из чужой клиники" }),
	});
	const body2 = await res2.json().catch(() => ({}));
	check(
		"чужой административный профиль не обновляется",
		res2.status === 404 || res2.status === 403 || res2.status === 400,
		`HTTP ${res2.status} ${(body2?.message || body2?.error || "").slice(0, 60)}`,
	);
	row = (await client.query(`select administrative_profile from patients where id = $1`, [foreignPatientId])).rows[0];
	check(
		"административный профиль в базе пуст, как и был",
		row?.administrative_profile === null || row?.administrative_profile === undefined,
		`в базе ${JSON.stringify(row?.administrative_profile)?.slice(0, 70)}`,
	);

	// --- 3. Контроль: своего пациента менять по-прежнему можно ---
	console.log("\n3. Контроль: своя карточка должна обновляться");
	const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
	const own = dash?.patients?.[0];
	if (!own) {
		check("контроль: свой пациент найден", false, "дашборд не отдал ни одного пациента");
	} else {
		const before = (await client.query(`select full_name, phone from patients where id = $1`, [own.id])).rows[0];
		const marker = `${before.full_name}`;
		const resOwn = await fetch(`${API}/api/patients/${own.id}`, {
			method: "PUT",
			headers: H,
			body: JSON.stringify({ fullName: marker, phone: before.phone ?? undefined }),
		});
		check("своя карточка обновляется", resOwn.status === 200, `HTTP ${resOwn.status}`);
		const after = (await client.query(`select full_name from patients where id = $1`, [own.id])).rows[0];
		check("свои данные не испортились", after.full_name === marker, `в базе «${after.full_name}»`);
	}
} finally {
	if (foreignPatientId) await client.query(`delete from patients where id = $1`, [foreignPatientId]).catch(() => {});
	if (foreignOrgId) await client.query(`delete from organizations where id = $1`, [foreignOrgId]).catch(() => {});
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
