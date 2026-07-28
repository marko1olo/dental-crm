/**
 * Риск неявки: расчёт на живом сервере и живой базе, оба исхода.
 *
 * ЧТО ПРОВЕРЯЕТСЯ. Виджет карточки звал POST /api/ai/predict-no-show, а маршрута
 * не было: 404, кнопка «Рассчитать AI-риск» не делала ничего. Здесь проверяются
 * ОБА пути, а не только удачный:
 *   - пациент с историей — расчёт с числами, причинами и советом;
 *   - пациент без истории — честный отказ, а не выдуманный «низкий риск».
 *
 * ПОЧЕМУ БАЗА ЧИТАЕТСЯ НАПРЯМУЮ. Чтобы доказать ветку расчёта, нужен пациент, у
 * которого действительно есть завершённые записи. Угадывать «первого из списка»
 * нельзя: проверка, прошедшая на пациенте без истории, доказала бы только отказ и
 * молча пропустила бы весь расчёт. Скрипт НИЧЕГО НЕ ПИШЕТ — ни в базу, ни в дерево.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const DECIDED = ["completed", "arrived", "in_treatment", "no_show", "cancelled"];

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

async function req(path, init = {}, attempts = 40) {
	let last = null;
	for (let i = 0; i < attempts; i += 1) {
		try {
			return await fetch(`${API}${path}`, init);
		} catch (error) {
			last = error;
			await new Promise((r) => setTimeout(r, 3000));
		}
	}
	throw last;
}

function databaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith("DATABASE_URL="));
	if (!line) throw new Error("DATABASE_URL не найден в корневом .env");
	return line.slice("DATABASE_URL=".length).trim();
}

const login = await req("/api/auth/clinic/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
/* Без токена дальше проверять нечего, и обвинять маршрут нельзя. */
if (!login?.clinicToken) {
	console.log("СБОЙ вход в кабинет не удался — маршрут НЕ ПРОВЕРЕН.");
	console.log("ответ входа:", JSON.stringify(login).slice(0, 300));
	process.exit(1);
}
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

/* Организация берётся из самого токена, чтобы искать пациентов ровно той клиники,
 * в которую мы вошли, а не «какой-нибудь». */
const orgId = JSON.parse(Buffer.from(login.clinicToken.split(".")[0], "base64url").toString()).organizationId;

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const counted = await client.query(
	`select p.id, p.full_name,
	        count(a.id) filter (where a.status = any($2) and a.starts_at < now())::int as decided
	   from patients p
	   left join appointments a on a.patient_id = p.id and a.organization_id = p.organization_id
	  where p.organization_id = $1
	  group by p.id, p.full_name
	  order by decided desc`,
	[orgId, DECIDED],
);
await client.end();

const withHistory = counted.rows.find((row) => row.decided >= 2);
const withoutHistory = counted.rows.find((row) => row.decided < 2);
console.log(
	`в клинике ${counted.rows.length} карт; с историей (>=2 решённых записей): ` +
		`${counted.rows.filter((r) => r.decided >= 2).length}`,
);

/* ── Ветка отказа: истории мало ──────────────────────────────────────────── */
if (withoutHistory) {
	const res = await req("/api/ai/predict-no-show", {
		method: "POST",
		headers: H,
		body: JSON.stringify({ patientId: withoutHistory.id }),
	});
	const body = await res.json().catch(() => ({}));
	check(
		"мало истории — отказ, а не выдуманный низкий риск",
		res.status === 422,
		`код ${res.status} (${withoutHistory.full_name}, решённых записей ${withoutHistory.decided})`,
	);
	check(
		"отказ объяснён по-русски и советует, что делать",
		typeof body.message === "string" &&
			/запис/i.test(body.message) &&
			/подтвердите/i.test(body.message) &&
			!/history|riskLevel|null|undefined/i.test(body.message),
		String(body.message).slice(0, 130),
	);
} else {
	console.log("  (пропущено: пациента без истории в этой клинике нет)");
}

/* ── Ветка расчёта ───────────────────────────────────────────────────────── */
/*
 * Если в клинике нет карты с историей, она СОЗДАЁТСЯ на время проверки и удаляется
 * в конце. Без этого ветка расчёта осталась бы непроверенной, а проверка,
 * доказавшая только отказ, объявила бы себя зелёной — это ровно тот самый ложный
 * OK, которым я оскоромился за эти сутки уже не раз.
 *
 * Засеиваются три ПРОШЕДШИЕ записи: две состоявшиеся и одна неявка. Ожидание
 * заранее известно и проверяется ниже: неявок 1, приходов 2, доля 0.33, уровень
 * «средний» (одна неявка при доле ниже 0.34).
 */
let target = withHistory;
let seededIds = [];
if (!target) {
	const host = withoutHistory ?? counted.rows[0];
	const seeder = new pg.Client({ connectionString: databaseUrl() });
	await seeder.connect();
	const inserted = await seeder.query(
		`insert into appointments (organization_id, patient_id, status, starts_at, ends_at)
		 values ($1,$2,'completed', now() - interval '30 day', now() - interval '30 day' + interval '30 min'),
		        ($1,$2,'completed', now() - interval '20 day', now() - interval '20 day' + interval '30 min'),
		        ($1,$2,'no_show',   now() - interval '10 day', now() - interval '10 day' + interval '30 min')
		 returning id`,
		[orgId, host.id],
	);
	await seeder.end();
	seededIds = inserted.rows.map((r) => r.id);
	target = { id: host.id, full_name: host.full_name, decided: 3 };
	console.log(`  (засеяно ${seededIds.length} временных записей для ${host.full_name}; будут удалены)`);
}

async function cleanupSeeded() {
	if (seededIds.length === 0) return;
	const cleaner = new pg.Client({ connectionString: databaseUrl() });
	await cleaner.connect();
	const removed = await cleaner.query("delete from appointments where id = any($1) returning id", [seededIds]);
	const left = await cleaner.query("select count(*)::int as n from appointments where id = any($1)", [seededIds]);
	await cleaner.end();
	check(
		"временные записи проверки удалены, чужого не осталось",
		removed.rows.length === seededIds.length && left.rows[0].n === 0,
		`удалено ${removed.rows.length} из ${seededIds.length}, осталось ${left.rows[0].n}`,
	);
}

const withHistoryOrSeeded = target;
if (withHistoryOrSeeded) {
	const withHistory = withHistoryOrSeeded;
	try {
	const res = await req("/api/ai/predict-no-show", {
		method: "POST",
		headers: H,
		body: JSON.stringify({ patientId: withHistory.id }),
	});
	const risk = await res.json().catch(() => ({}));
	check("расчёт выполняется", res.status === 200, `код ${res.status} (${withHistory.full_name})`);
	check(
		"уровень риска — одно из трёх значений, которые понимает экран",
		["low", "medium", "high"].includes(risk.riskLevel),
		String(risk.riskLevel),
	);
	check(
		"вероятность — число от 0 до 1",
		typeof risk.noShowProbability === "number" &&
			risk.noShowProbability >= 0 &&
			risk.noShowProbability <= 1,
		String(risk.noShowProbability),
	);
	check(
		"причины перечислены человеческим текстом, без латиницы и имён полей",
		Array.isArray(risk.factors) &&
			risk.factors.length > 0 &&
			risk.factors.every((f) => typeof f === "string" && !/[A-Za-z_]{4,}/.test(f)),
		Array.isArray(risk.factors) ? risk.factors.join("; ").slice(0, 130) : String(risk.factors),
	);
	check(
		"совет говорит, что делать",
		typeof risk.recommendedAction === "string" && risk.recommendedAction.length > 20,
		String(risk.recommendedAction).slice(0, 90),
	);
	/*
	 * Числа обязаны сходиться с базой: уровень без проверяемых чисел — это гадание,
	 * которое невозможно оспорить.
	 */
	check(
		"учтённых записей столько же, сколько в базе",
		risk.history?.consideredAppointments === withHistory.decided,
		`сервер ${risk.history?.consideredAppointments}, база ${withHistory.decided}`,
	);
	check(
		"неявки плюс отмены плюс приходы равны учтённым",
		risk.history &&
			risk.history.noShows + risk.history.cancellations + risk.history.attended ===
				risk.history.consideredAppointments,
		JSON.stringify(risk.history),
	);
	check(
		"вероятность равна доле неявок",
		risk.history &&
			Math.abs(
				risk.noShowProbability -
					Math.round((risk.history.noShows / risk.history.consideredAppointments) * 100) / 100,
			) < 0.011,
		`${risk.noShowProbability} против ${risk.history?.noShows}/${risk.history?.consideredAppointments}`,
	);
	/*
	 * На засеянной истории исход известен заранее, поэтому проверяется не только
	 * «числа согласованы между собой», но и «числа именно те». Согласованность без
	 * ожидаемого значения прошла бы и на сплошных нулях.
	 */
	if (seededIds.length === 3) {
		check(
			"на известной истории (2 прихода, 1 неявка) числа те самые",
			risk.history?.noShows === 1 &&
				risk.history?.attended === 2 &&
				risk.history?.cancellations === 0 &&
				risk.noShowProbability === 0.33,
			JSON.stringify(risk.history) + ` доля ${risk.noShowProbability}`,
		);
		check(
			"одна неявка при доле ниже трети — уровень средний, не высокий",
			risk.riskLevel === "medium",
			String(risk.riskLevel),
		);
		check(
			"свежая неявка названа отдельной причиной",
			Array.isArray(risk.factors) && risk.factors.some((f) => /последн/i.test(f) && /неявк/i.test(f)),
			Array.isArray(risk.factors) ? risk.factors.join("; ").slice(0, 130) : "-",
		);
	}
	} finally {
		/* Удаление в finally: упавшая проверка не должна оставить мусор в базе клиники. */
		await cleanupSeeded();
	}
} else {
	console.log("  СБОЙ в клинике нет ни одной карты — проверять нечего");
	checks.push({ name: "в клинике есть хотя бы одна карта", ok: false });
}

/* ── Отказы ──────────────────────────────────────────────────────────────── */
const noPatient = await req("/api/ai/predict-no-show", { method: "POST", headers: H, body: "{}" });
check("без пациента запрос не принимается", noPatient.status === 400, `код ${noPatient.status}`);

const alien = await req("/api/ai/predict-no-show", {
	method: "POST",
	headers: H,
	body: JSON.stringify({ patientId: "11111111-2222-3333-4444-555555555555" }),
});
check("чужая или несуществующая карта отвечает 404", alien.status === 404, `код ${alien.status}`);

const noToken = await req("/api/ai/predict-no-show", {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-staff-token": unlock.staffToken },
	body: JSON.stringify({ patientId: withHistory?.id ?? withoutHistory?.id }),
});
check("без токена кабинета расчёт не отдаётся", noToken.status === 401, `код ${noToken.status}`);

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
