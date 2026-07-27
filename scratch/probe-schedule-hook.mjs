/**
 * Зонд: смонтирован ли ScheduleView, открыт ли сокет на странице
 * расписания и приходят ли в него кадры APPOINTMENT_CREATED.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

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

// Кресло нужно до запуска браузера, чтобы оно попало в первый дашборд.
const envText = readFileSync(".env", "utf8");
const dbUrl = envText.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL=")).slice(13).trim();
const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
const orgId = (await db.query("select id from organizations limit 1")).rows[0].id;
let chairId = (await db.query("select id from chairs where organization_id=$1 and is_active limit 1", [orgId]))
	.rows[0]?.id;
let chairCreated = false;
if (!chairId) {
	chairId = (
		await db.query(
			`insert into chairs (id, organization_id, name, status, is_active, created_at)
			 values (gen_random_uuid(), $1, 'Кресло зонда', 'available', true, now()) returning id`,
			[orgId],
		)
	).rows[0].id;
	chairCreated = true;
}
console.log(`кресло: ${chairId.slice(0, 8)}${chairCreated ? " (создано)" : ""}`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" })).newPage();

const wsFrames = [];
page.on("websocket", (ws) => {
	console.log("сокет открыт страницей:", ws.url());
	ws.on("framereceived", (f) => {
		const s = String(f.payload).slice(0, 160);
		wsFrames.push(s);
	});
	ws.on("framesent", (f) => {
		const s = String(f.payload).slice(0, 80);
		console.log("   → отправлено:", s);
	});
});

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
await page.waitForTimeout(6000);

const mounted = await page.evaluate(() => ({
	hash: location.hash,
	scheduleMarkers: {
		newAppointmentForm: !!document.querySelector('[data-testid*="appointment"], .schedule-grid, .appointment-card'),
		scheduleClasses: [...document.querySelectorAll('[class*="schedule"]')].length,
		hasDateFilter: !!document.querySelector('[aria-label="Фильтр расписания по дате"]'),
	},
}));
console.log("\nhash:", mounted.hash);
console.log("признаки экрана расписания:", JSON.stringify(mounted.scheduleMarkers));
console.log("кадров получено к этому моменту:", wsFrames.length, wsFrames.slice(0, 3));

// Создаём запись и смотрим, доходит ли кадр ДО СТРАНИЦЫ.
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};
const dash = await fetch(`${API}/api/dashboard`, { headers: H }).then((r) => r.json());
const doctor = (dash.clinicSettings?.staff || []).find((s) => s.role === "doctor");
const patient = (dash.patients || [])[0];
const chair = (dash.clinicSettings?.chairs || [])[0];
console.log("\nкресел в дашборде:", (dash.clinicSettings?.chairs || []).length);

if (chair && doctor && patient) {
	const start = new Date();
	start.setHours(11, 45, 0, 0);
	const REASON = `Зонд живого расписания ${start.getTime()}`;
	wsFrames.length = 0;
	const res = await fetch(`${API}/api/appointments`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({
			patientId: patient.id,
			doctorUserId: doctor.id,
			chairId: chair.id,
			startsAt: start.toISOString(),
			endsAt: new Date(start.getTime() + 30 * 60000).toISOString(),
			status: "planned",
			reason: REASON,
		}),
	});
	console.log("создание записи:", res.status);
	await page.waitForTimeout(4000);
	console.log("кадров после создания:", wsFrames.length);
	for (const f of wsFrames) console.log("   ", f);
	const shown = (await page.locator("body").innerText()).includes(REASON);
	console.log("запись видна на странице без перезагрузки:", shown);
	await db.query("delete from appointments where reason=$1", [REASON]).catch(() => {});
} else {
	console.log("нет кресла/врача/пациента в дашборде — создание пропущено");
}

await browser.close();
if (chairCreated) await db.query("delete from chairs where id=$1", [chairId]).catch(() => {});
await db.end();
