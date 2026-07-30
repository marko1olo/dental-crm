/**
 * Живая проверка: лента звонков и сообщений в карточке пациента настоящая.
 *
 * ЧТО БЫЛО. Виджет читал таблицу patient_communication_timelines. В неё не писал
 * НИКТО — ни одной вставки во всём сервере, ноль строк в живой базе. Плюс пациент
 * в ней хранится ИМЕНЕМ, а не ссылкой, поэтому у двух однофамильцев звонки
 * смешались бы. Администратор открывал карточку и видел «событий нет» у любого
 * пациента, сколько бы ему ни звонили.
 *
 * ЧТО ПРОВЕРЯЕМ. Чтение развёрнуто на настоящий журнал communication_events, в
 * который пишут пять живых мест (телефония, ВКонтакте, WhatsApp, приём сообщений
 * из мессенджеров, отправка из раздела связи). Скрипт кладёт в журнал настоящие
 * события — входящий звонок, исходящее СМС и неудачную отправку — и смотрит, что
 * они появились в карточке ИМЕННО ЭТОГО пациента, с правильным видом и цветом, и
 * что в карточке другого пациента их нет.
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
const created = [];

try {
	const orgId = (await client.query(`select organization_id from users where id = $1`, [OWNER])).rows[0]
		.organization_id;
	const patientRows = (
		await client.query(
			`select id, full_name from patients where organization_id = $1 order by created_at limit 2`,
			[orgId],
		)
	).rows;
	check("в клинике есть два пациента для проверки", patientRows.length >= 2, `${patientRows.length}`);
	if (patientRows.length < 2) throw new Error("мало пациентов");
	const [target, other] = patientRows;

	const before = await req(`/api/patients/${target.id}/communication-timelines`, { headers: H }).then((r) =>
		r.json(),
	);
	check("лента читается", Array.isArray(before), `событий сейчас ${before?.length}`);
	const countBefore = Array.isArray(before) ? before.length : -1;

	/*
	 * Кладём события ровно теми значениями, которые объявлены в перечислениях
	 * communication_channel, communication_direction и communication_status.
	 * Выдуманное значение база не примет — и это правильно.
	 */
	const events = [
		{ channel: "phone", direction: "inbound", status: "completed", message: "ПРОВЕРКА входящий звонок" },
		{ channel: "sms", direction: "outbound", status: "delivered", message: "ПРОВЕРКА напоминание о приёме" },
		{ channel: "whatsapp", direction: "outbound", status: "failed", message: "ПРОВЕРКА отправка не удалась" },
	];
	for (const event of events) {
		const inserted = await client.query(
			`insert into communication_events
			   (organization_id, patient_id, actor_user_id, channel, direction, status, message)
			 values ($1, $2, $3, $4, $5, $6, $7)
			 returning id`,
			[orgId, target.id, OWNER, event.channel, event.direction, event.status, event.message],
		);
		created.push(inserted.rows[0].id);
	}
	check("события легли в настоящий журнал", created.length === 3, `${created.length} из 3`);

	const after = await req(`/api/patients/${target.id}/communication-timelines`, { headers: H }).then((r) => r.json());
	check("лента выросла ровно на три события", after.length === countBefore + 3, `${countBefore} → ${after.length}`);

	const byText = (needle) => after.find((item) => String(item.comment || "").includes(needle));
	const incoming = byText("входящий звонок");
	check("входящий звонок распознан как входящий", incoming?.eventType === "incoming_call", String(incoming?.eventType));
	check("успешное событие окрашено зелёным", incoming?.statusColor === "green", String(incoming?.statusColor));
	check(
		"в тексте события виден сотрудник",
		typeof incoming?.comment === "string" && incoming.comment.includes("—"),
		String(incoming?.comment),
	);

	const sms = byText("напоминание о приёме");
	check("СМС распознано как СМС", sms?.eventType === "sms", String(sms?.eventType));

	const failed = byText("отправка не удалась");
	check("неудачная отправка окрашена красным", failed?.statusColor === "red", String(failed?.statusColor));
	check("сообщение мессенджера распознано как переписка", failed?.eventType === "chat", String(failed?.eventType));

	check(
		"ссылки на запись разговора не выдумано",
		after.every((item) => item.audioRecordingUrl === null),
		"все audioRecordingUrl пусты",
	);

	// Порядок: свежие сверху, иначе перед звонком администратор увидит старое.
	const moments = after.map((item) => new Date(item.createdAt).getTime());
	const sortedDesc = moments.every((value, index) => index === 0 || moments[index - 1] >= value);
	check("события идут от свежих к старым", sortedDesc, moments.slice(0, 3).join(" >= "));

	// Чужая карточка не должна показывать эти события.
	const foreign = await req(`/api/patients/${other.id}/communication-timelines`, { headers: H }).then((r) => r.json());
	check(
		"в карточке другого пациента проверочных событий нет",
		Array.isArray(foreign) && !foreign.some((item) => String(item.comment || "").includes("ПРОВЕРКА")),
		`у «${other.full_name}» событий ${foreign?.length}`,
	);
} finally {
	if (created.length > 0) {
		const removed = await client
			.query(`delete from communication_events where id = any($1::uuid[]) returning id`, [created])
			.catch(() => ({ rowCount: -1 }));
		console.log(`\nудалено проверочных событий: ${removed.rowCount} из ${created.length}`);
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
