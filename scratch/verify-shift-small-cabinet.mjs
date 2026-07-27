/**
 * Живая проверка правила «мелкий кабинет не видит лишнего» на экране «Смена».
 *
 * Таблица «Задачи по ролям» имеет смысл там, где роли разложены по разным
 * людям. В кабинете, где работают один-два человека, все эти задачи всё равно
 * их собственные, а таблица ролей просто занимает экран. Раньше блок
 * показывался всегда: очереди приходят из API постоянно, все четыре.
 *
 * Скрипт временно снимает активность с лишних сотрудников и возвращает её
 * обратно в блоке finally, даже если проверка упала.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
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
const dashboard = () => req("/api/dashboard", { headers: H }).then((r) => r.json());

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
const page = await context.newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);

/**
 * Текст экрана целиком и отдельно текст блока «Что сделать сейчас».
 *
 * Проверять принадлежность дела по всему экрану нельзя: карточка пациента
 * ниже показывает подсказку «Проверить снимок перед переносом в ЭМК», и
 * поиск по подстроке «Проверить снимок» ловил её, а не список дел.
 */
async function shiftText() {
	await page.goto(`${WEB}/#shift`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3500);
	return page.evaluate(() => ({
		all: document.body.innerText || "",
		todo: document.querySelector(".shift-todo")?.textContent || "",
	}));
}

const deactivated = [];

try {
	const before = await dashboard();
	const staff = (before.clinicSettings?.staff ?? []).filter((s) => s.active);
	const roles = new Set(staff.map((s) => s.role));
	console.log(`клиника: активных сотрудников ${staff.length}, ролей ${roles.size}`);
	check(
		"в демо-клинике ролей больше двух — таблица ролей уместна",
		roles.size > 2,
		[...roles].join(", "),
	);

	const clinicText = await shiftText();
	check("таблица «Задачи по ролям» показана клинике", clinicText.all.includes("Задачи по ролям"));

	// Оставляем владельца и врача: типичный мелкий кабинет.
	const keep = new Set([
		staff.find((s) => s.role === "owner")?.id,
		staff.find((s) => s.role === "doctor")?.id,
	]);
	for (const member of staff) {
		if (keep.has(member.id)) continue;
		await client.query(`update users set is_active = false where id = $1`, [member.id]);
		deactivated.push(member.id);
	}
	console.log(`временно отключено сотрудников: ${deactivated.length}`);

	const small = await dashboard();
	const smallStaff = (small.clinicSettings?.staff ?? []).filter((s) => s.active);
	const smallRoles = new Set(smallStaff.map((s) => s.role));
	check(
		"после отключения осталось не больше двух ролей",
		smallRoles.size <= 2,
		[...smallRoles].join(", "),
	);
	check(
		"API всё равно отдаёт все четыре очереди ролей",
		(small.shiftIntelligence?.roleQueues ?? []).length === 4,
		`очередей ${(small.shiftIntelligence?.roleQueues ?? []).length}`,
	);

	const smallText = await shiftText();
	check("мелкий кабинет не видит таблицу «Задачи по ролям»", !smallText.all.includes("Задачи по ролям"));
	check("блок «Что сделать сейчас» остался на месте", smallText.all.includes("Что сделать сейчас"));

	// Пока врач в клинике есть, клиническое дело — не забота владельца, и
	// показывать его владельцу не надо.
	const doctorAction = (small.recommendedActions ?? []).find((a) => a.role === "doctor");
	check(
		"пока врач в штате, его дело владельцу в список дел не кладут",
		!doctorAction || !smallText.todo.includes(doctorAction.title),
		doctorAction ? doctorAction.title : "дел врача в выдаче нет",
	);

	// ---------- Соло-практика: владелец один за всех ----------
	console.log("\nсоло-практика: в штате остаётся только владелец");
	const soloDoctor = staff.find((s) => s.role === "doctor");
	if (soloDoctor) {
		await client.query(`update users set is_active = false where id = $1`, [soloDoctor.id]);
		deactivated.push(soloDoctor.id);
	}
	const solo = await dashboard();
	const soloDoctorAction = (solo.recommendedActions ?? []).find((a) => a.role === "doctor");
	check(
		"в выдаче есть дело с ролью врача",
		Boolean(soloDoctorAction),
		soloDoctorAction ? soloDoctorAction.title : "нет",
	);
	const soloText = await shiftText();
	check(
		"владелец соло-практики видит клиническое дело: врача больше нет, делать его некому",
		Boolean(soloDoctorAction) && soloText.todo.includes(soloDoctorAction.title),
		soloDoctorAction?.title,
	);
	check("соло-практика не видит таблицу «Задачи по ролям»", !soloText.all.includes("Задачи по ролям"));
} finally {
	for (const id of deactivated) {
		await client.query(`update users set is_active = true where id = $1`, [id]).catch((error) => {
			console.log(`ВЕРНУТЬ ВРУЧНУЮ: сотрудник ${id} остался отключён — ${String(error).slice(0, 120)}`);
		});
	}
	const restored = await client
		.query(`select count(*)::int as n from users where is_active = false and id = any($1::uuid[])`, [
			deactivated.length ? deactivated : ["00000000-0000-0000-0000-000000000000"],
		])
		.catch(() => ({ rows: [{ n: -1 }] }));
	console.log(`\nвозвращено сотрудников: ${deactivated.length}, осталось отключённых: ${restored.rows[0]?.n}`);
	if (restored.rows[0]?.n !== 0) check("состав персонала восстановлен", false);
	await client.end().catch(() => {});
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
if (failed.length > 0) {
	console.log("провалились:");
	for (const c of failed) console.log("  -", c.name);
	process.exit(1);
}
