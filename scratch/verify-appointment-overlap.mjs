/**
 * Проверяет защиту расписания от наложения приёмов на живом API и живой
 * базе.
 *
 * Что смотрим:
 *  1. Кресло — двух пациентов нельзя посадить в одно кресло на одно время.
 *  2. Врач — одного врача нельзя занять двумя приёмами одновременно.
 *  3. Пациент — одного пациента нельзя записать в два кресла на одно
 *     время. Сообщение об ошибке в routes/schedule.ts прямо обещает
 *     «выбранное время уже занято пациентом, сотрудником или креслом»,
 *     то есть пациент заявлен как охраняемый ресурс.
 *  4. Гонка — два одновременных запроса на один и тот же слот. Проверка
 *     занятости и вставка идут разными запросами, вне транзакции и без
 *     блокировки, поэтому оба запроса могут увидеть свободный слот.
 *
 * Скрипт заводит собственные кресла и удаляет их в конце. Созданные
 * приёмы тоже удаляются.
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
	for (const f of [".env", "apps/api/.env", ".env.local"]) {
		let env;
		try {
			env = readFileSync(f, "utf8");
		} catch {
			continue;
		}
		const line = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
		if (line) return line.slice("DATABASE_URL=".length).trim();
	}
	throw new Error("DATABASE_URL не найден");
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

const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
const patients = dash?.patients || [];
const staff = dash?.clinicSettings?.staff || [];
const doctors = staff.filter((s) => s.role === "doctor");
const patientA = patients[0];
const patientB = patients[1];
const doctorA = doctors[0] || staff[0];
const doctorB = doctors[1] || staff[1] || doctorA;

if (!patientA || !patientB || !doctorA) {
	console.error("нужно минимум два пациента и один врач в демо-данных");
	process.exit(1);
}
const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

// Организацию берём из базы: дашборд её не отдаёт, а chairs.organization_id
// объявлен NOT NULL.
const orgRow = await client.query(
	`select id from organizations where id = (select organization_id from patients where id = $1)`,
	[patientA.id],
);
const orgId = orgRow.rows[0]?.id;
if (!orgId) {
	console.error("не удалось определить организацию пациента");
	process.exit(1);
}
console.log(`организация ${orgId}`);
console.log(`пациенты: ${patientA.fullName} / ${patientB.fullName}`);
console.log(`врачи: ${doctorA.fullName} / ${doctorB.fullName}${doctorB.id === doctorA.id ? " (второго врача нет, часть проверок пропущу)" : ""}\n`);

const chairIds = [];
const createdAppointments = [];

async function makeChair(name) {
	const r = await client.query(
		`insert into chairs (organization_id, name, is_active) values ($1, $2, true) returning id`,
		[orgId, name],
	);
	const id = r.rows[0].id;
	chairIds.push(id);
	return id;
}

// Круглый час завтра — заведомо не пересекается с демо-данными.
const base = new Date();
base.setDate(base.getDate() + 1);
base.setHours(11, 0, 0, 0);
const startsAt = base.toISOString();
const endsAt = new Date(base.getTime() + 30 * 60_000).toISOString();

async function book(patientId, doctorUserId, chairId) {
	const res = await fetch(`${API}/api/appointments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			patientId,
			doctorUserId,
			chairId,
			status: "planned",
			startsAt,
			endsAt,
			reason: "проверка наложения",
		}),
	});
	const body = await res.json().catch(() => ({}));
	return { status: res.status, body };
}

async function appointmentsInSlot() {
	const r = await client.query(
		`select id, patient_id, doctor_user_id, chair_id, status
		   from appointments
		  where organization_id = $1
		    and starts_at = $2
		    and status not in ('cancelled', 'no_show')
		  order by id`,
		[orgId, new Date(startsAt)],
	);
	return r.rows;
}

async function cleanupAppointments() {
	const rows = await appointmentsInSlot();
	for (const row of rows) {
		await client.query(`delete from appointments where id = $1`, [row.id]);
	}
}

try {
	const chair1 = await makeChair("Проверка наложения 1");
	const chair2 = await makeChair("Проверка наложения 2");
	console.log(`кресла созданы: ${chair1}, ${chair2}\n`);

	// --- 1. Одно кресло, два пациента ---
	console.log("1. Одно кресло, два разных пациента, одно время");
	await cleanupAppointments();
	const first = await book(patientA.id, doctorA.id, chair1);
	check("первая запись создана", first.status === 201, `HTTP ${first.status}`);
	const sameChair = await book(patientB.id, doctorB.id, chair1);
	check(
		"вторая запись в то же кресло отклонена",
		sameChair.status === 409,
		`HTTP ${sameChair.status} ${sameChair.body?.reason || ""} ${(sameChair.body?.message || "").slice(0, 70)}`,
	);
	let rows = await appointmentsInSlot();
	check("в слоте осталась одна запись", rows.length === 1, `в базе записей: ${rows.length}`);

	// --- 2. Один врач, два кресла ---
	console.log("\n2. Один врач, два разных кресла, одно время");
	await cleanupAppointments();
	await book(patientA.id, doctorA.id, chair1);
	const sameDoctor = await book(patientB.id, doctorA.id, chair2);
	check(
		"вторая запись на того же врача отклонена",
		sameDoctor.status === 409,
		`HTTP ${sameDoctor.status} ${(sameDoctor.body?.message || "").slice(0, 70)}`,
	);
	rows = await appointmentsInSlot();
	check("в слоте осталась одна запись", rows.length === 1, `в базе записей: ${rows.length}`);

	// --- 3. Один пациент, два кресла и два врача ---
	console.log("\n3. Один пациент, два кресла, два врача, одно время");
	if (doctorB.id === doctorA.id) {
		console.log("  ПРОПУЩЕНО: в демо-данных только один врач, чистую проверку пациента не поставить");
	} else {
		await cleanupAppointments();
		await book(patientA.id, doctorA.id, chair1);
		const samePatient = await book(patientA.id, doctorB.id, chair2);
		check(
			"вторая запись того же пациента отклонена",
			samePatient.status === 409,
			`HTTP ${samePatient.status} ${(samePatient.body?.message || "").slice(0, 70)}`,
		);
		rows = await appointmentsInSlot();
		check("пациент не оказался в двух креслах одновременно", rows.length === 1, `в базе записей: ${rows.length}`);
	}

	// --- 4. Гонка: два одновременных запроса на один слот ---
	console.log("\n4. Два одновременных запроса на одно кресло");
	await cleanupAppointments();
	const [r1, r2] = await Promise.all([book(patientA.id, doctorA.id, chair1), book(patientB.id, doctorB.id, chair1)]);
	const created = [r1, r2].filter((r) => r.status === 201).length;
	rows = await appointmentsInSlot();
	check(
		"при одновременных запросах создалась ровно одна запись",
		created === 1 && rows.length === 1,
		`успешных ответов ${created}, записей в базе ${rows.length} (${r1.status}/${r2.status})`,
	);

	// --- 5. Гонка по врачу ---
	console.log("\n5. Два одновременных запроса на одного врача в разные кресла");
	await cleanupAppointments();
	const [d1, d2] = await Promise.all([book(patientA.id, doctorA.id, chair1), book(patientB.id, doctorA.id, chair2)]);
	rows = await appointmentsInSlot();
	check(
		"врач не занят двумя приёмами одновременно",
		[d1, d2].filter((r) => r.status === 201).length === 1 && rows.length === 1,
		`ответы ${d1.status}/${d2.status}, записей в базе ${rows.length}`,
	);

	// --- 6. Гонка по пациенту ---
	if (doctorB.id !== doctorA.id) {
		console.log("\n6. Два одновременных запроса на одного пациента в разные кресла");
		await cleanupAppointments();
		const [p1, p2] = await Promise.all([book(patientA.id, doctorA.id, chair1), book(patientA.id, doctorB.id, chair2)]);
		rows = await appointmentsInSlot();
		check(
			"пациент не попал в два кресла при одновременных запросах",
			[p1, p2].filter((r) => r.status === 201).length === 1 && rows.length === 1,
			`ответы ${p1.status}/${p2.status}, записей в базе ${rows.length}`,
		);
	} else {
		console.log("\n6. ПРОПУЩЕНО: нужен второй врач");
	}

	// --- 7. Контроль: непересекающиеся записи должны проходить обе ---
	// Без этой проверки нельзя отличить исправление от грубой блокировки,
	// которая просто запрещает любую параллельную запись.
	console.log("\n7. Два одновременных запроса без общих ресурсов");
	if (doctorB.id !== doctorA.id) {
		await cleanupAppointments();
		const [f1, f2] = await Promise.all([book(patientA.id, doctorA.id, chair1), book(patientB.id, doctorB.id, chair2)]);
		rows = await appointmentsInSlot();
		check(
			"обе независимые записи созданы",
			f1.status === 201 && f2.status === 201 && rows.length === 2,
			`ответы ${f1.status}/${f2.status}, записей в базе ${rows.length}`,
		);
	} else {
		console.log("  ПРОПУЩЕНО: нужен второй врач");
	}

	// --- 8. Перенос приёма в занятое время ---
	console.log("\n8. Перенос приёма в уже занятое время");
	await cleanupAppointments();
	const keep = await book(patientA.id, doctorA.id, chair1);
	const later = new Date(base.getTime() + 2 * 60 * 60_000);
	const moveMe = await fetch(`${API}/api/appointments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			patientId: patientB.id,
			doctorUserId: doctorB.id,
			chairId: chair2,
			status: "planned",
			startsAt: later.toISOString(),
			endsAt: new Date(later.getTime() + 30 * 60_000).toISOString(),
			reason: "проверка переноса",
		}),
	});
	check("подготовка: обе исходные записи созданы", keep.status === 201 && moveMe.status === 201, `${keep.status}/${moveMe.status}`);
	const movingRow = (
		await client.query(
			`select id from appointments where organization_id = $1 and starts_at = $2 and status not in ('cancelled','no_show') limit 1`,
			[orgId, later],
		)
	).rows[0];
	if (movingRow) {
		const moved = await fetch(`${API}/api/appointments/${movingRow.id}`, {
			method: "PATCH",
			headers: H,
			// Переносим во время первой записи и в её кресло.
			body: JSON.stringify({ chairId: chair1, startsAt, endsAt }),
		});
		const movedBody = await moved.json().catch(() => ({}));
		check(
			"перенос в занятое кресло отклонён",
			moved.status === 409,
			`HTTP ${moved.status} ${(movedBody?.message || "").slice(0, 70)}`,
		);
		const slotRows = await appointmentsInSlot();
		check("в занятом слоте по-прежнему одна запись", slotRows.length === 1, `записей ${slotRows.length}`);
		await client.query(`delete from appointments where id = $1`, [movingRow.id]).catch(() => {});
	} else {
		check("подготовка переноса", false, "не нашёл созданную запись для переноса");
	}

	await cleanupAppointments();
	await client.query(`delete from appointments where organization_id = $1 and reason like 'проверка%'`, [orgId]).catch(() => {});
} finally {
	for (const id of chairIds) {
		await client.query(`delete from appointments where chair_id = $1`, [id]).catch(() => {});
		await client.query(`delete from chairs where id = $1`, [id]).catch(() => {});
	}
	for (const id of createdAppointments) {
		await client.query(`delete from appointments where id = $1`, [id]).catch(() => {});
	}
	await client.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
