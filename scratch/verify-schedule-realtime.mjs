/**
 * Проверяет, что расписание обновляется у второго администратора без
 * перезагрузки страницы.
 *
 * Маршрут routes/schedule.ts не рассылал НИЧЕГО, хотя эндпоинт живых
 * обновлений называется /api/ws/schedule. Двое в расписании не видели
 * действий друг друга — прямой путь к двойной записи на один слот.
 *
 * Сценарий: браузер держит расписание открытым, запись создаётся снаружи
 * (как со второго компьютера), сетка должна показать её сама.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";
import { WebSocket } from "ws";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
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

const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
const patients = dash?.patients || [];
const staff = dash?.clinicSettings?.staff || [];
const doctor = staff.find((s) => s.role === "doctor") || staff[0];
const patient = patients[0];

if (!patient || !doctor) {
	console.error("нет пациента или врача в дашборде — проверять нечего");
	process.exit(1);
}

// В демо-базе кресел нет вовсе, а маршрут требует chairId. Заводим своё и
// убираем в конце: без кресла проверить расписание невозможно.
const db = new pg.Client({ connectionString: databaseUrl() });
await db.connect();
const orgId = (await db.query("select id from organizations limit 1")).rows[0].id;
let chairId = (await db.query("select id from chairs where organization_id=$1 and is_active limit 1", [orgId]))
	.rows[0]?.id;
let chairCreated = false;
if (!chairId) {
	chairId = (
		await db.query(
			`insert into chairs (id, organization_id, name, status, is_active, created_at)
			 values (gen_random_uuid(), $1, 'Кресло проверки расписания', 'available', true, now())
			 returning id`,
			[orgId],
		)
	).rows[0].id;
	chairCreated = true;
}
console.log(`пациент: ${patient.fullName}, врач: ${doctor.fullName}, кресло: ${chairId.slice(0, 8)}${chairCreated ? " (создано для проверки)" : ""}\n`);

// Слот на СЕГОДНЯ: сетка расписания показывает выбранный день, и запись на
// завтра не появилась бы там даже после корректного обновления — на этом
// первая версия проверки дала ложный сбой.
const start = new Date();
start.setHours(9, 15, 0, 0);
const end = new Date(start.getTime() + 30 * 60 * 1000);
const REASON = `Проверка живого расписания ${start.getTime()}`;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" })).newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));

let createdOk = false;
try {
	await page.goto(WEB, { waitUntil: "domcontentloaded" });
	await page.evaluate(
		({ ct, st }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#schedule`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5000);

	const bodyHas = async (needle) => (await page.locator("body").innerText()).includes(needle);

	check("экран расписания открыт", await bodyHas("Расписание"), "");
	check("новой записи ещё нет на экране", !(await bodyHas(REASON)), "");

	// Запись создаётся СНАРУЖИ — как со второго рабочего места.
	const body = {
		patientId: patient.id,
		doctorUserId: doctor.id,
		chairId,
		startsAt: start.toISOString(),
		endsAt: end.toISOString(),
		status: "planned",
		reason: REASON,
	};

	// Сырой сокет рядом с браузером: он показывает, доходит ли событие с
	// сервера вообще. Без этого при сбое непонятно, чья половина цепочки
	// сломана — рассылка или подписка интерфейса.
	const rawEvents = [];
	const probe = new WebSocket(`${API.replace(/^http/, "ws")}/api/ws/schedule`);
	await new Promise((resolve) => {
		const t = setTimeout(resolve, 6000);
		probe.on("open", () =>
			probe.send(
				JSON.stringify({
					type: "AUTH",
					payload: { clinicToken: login.clinicToken, staffToken: unlock.staffToken },
				}),
			),
		);
		probe.on("message", (d) => {
			const s = String(d);
			if (s.includes("AUTH_OK")) {
				clearTimeout(t);
				resolve();
				return;
			}
			try {
				rawEvents.push(JSON.parse(s));
			} catch {}
		});
		probe.on("error", () => {
			clearTimeout(t);
			resolve();
		});
	});

	const res = await fetch(`${API}/api/appointments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify(body),
	});
	const text = await res.text();
	createdOk = res.ok;
	check("внешняя запись создана", res.ok, `HTTP ${res.status}${res.ok ? "" : " " + text.slice(0, 200)}`);
	if (!res.ok) throw new Error("запись не создана, проверять нечего");

	await page.waitForTimeout(1500);
	const broadcast = rawEvents.find((e) => e.type === "APPOINTMENT_CREATED");
	check(
		"сервер разослал APPOINTMENT_CREATED",
		Boolean(broadcast),
		broadcast ? JSON.stringify(broadcast.payload) : `получено ${rawEvents.length} кадров: ${rawEvents.map((e) => e.type).join(", ") || "ни одного"}`,
	);
	try {
		probe.close();
	} catch {}

	// Дебаунс 600мс + перезагрузка дашборда.
	await page.waitForTimeout(5000);
	const appeared = await bodyHas(REASON);
	check(
		"запись появилась в расписании БЕЗ перезагрузки страницы",
		appeared,
		appeared ? "" : "сетка не обновилась за 5 секунд",
	);

	if (!appeared) {
		// Разделяем «живое обновление не сработало» и «запись не рисуется
		// вообще»: перезагружаем и смотрим ещё раз.
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(5000);
		const afterReload = await bodyHas(REASON);
		console.log(
			afterReload
				? "    ДИАГНОЗ: после перезагрузки запись видна → рисуется, не сработало именно живое обновление"
				: "    ДИАГНОЗ: после перезагрузки записи тоже нет → дело не в живом обновлении, сетка её не показывает",
		);
	}
	check("ошибок страницы нет", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | ") || "чисто");
} finally {
	await browser.close();
	if (createdOk) {
		await db.query("delete from appointments where reason=$1", [REASON]).catch(() => {});
	}
	if (chairCreated) {
		await db.query("delete from chairs where id=$1", [chairId]).catch(() => {});
	}
	await db.end();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
