/**
 * Живая проверка: набор включённых модулей клиники хранится на сервере.
 *
 * ЧТО БЫЛО. Модульность — сердце продукта: соло-врач не должен видеть склад,
 * зарплаты, воронку обращений. Мастер первого запуска про это спрашивает, в
 * настройках есть вкладка «Модули». На сервере этого не существовало:
 *   GET /api/workspace/profile отдавал жёстко прописанную константу — все
 *     признаки true, пресет "enterprise", одинаково для любой клиники;
 *   POST /api/workspace/profile разбирал семнадцать признаков и не писал ни
 *     одного, отвечая { ok: true };
 *   POST /api/workspace/preset/:name раскладывал признаки так, будто это колонки
 *     таблицы organizations — drizzle молча отбрасывал неизвестные ключи.
 *
 * В браузере это не было видно: выбор хранится в localStorage. Стоило открыть
 * программу на втором устройстве или под другим сотрудником — и все модули снова
 * включены.
 *
 * Проверяется именно то, что localStorage не подменяет: значение в базе, ответ
 * сервера в ЧИСТОМ браузере без сохранённого выбора, и меню рабочего места.
 * Исходный набор возвращается в конце.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

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
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
let originalFlags = null;
let orgId = null;

try {
	orgId = (await client.query(`select organization_id from users where id = $1`, [OWNER])).rows[0]
		.organization_id;
	originalFlags = (
		await client.query(`select workspace_feature_flags as f from organizations where id = $1`, [orgId])
	).rows[0].f;
	console.log(`  исходный набор в базе: ${originalFlags === null ? "не заполнен" : "есть"}`);

	// ── Сохранение одного признака ────────────────────────────────────────────
	const saved = await req("/api/workspace/profile", {
		method: "POST",
		headers: H,
		body: JSON.stringify({ hasInventoryModule: false }),
	});
	check("сохранение принято", saved.status === 200, `код ${saved.status}`);
	const savedBody = await saved.json().catch(() => ({}));
	check(
		"ответ содержит сохранённый набор, а не только ok",
		savedBody.hasInventoryModule === false,
		JSON.stringify({ ok: savedBody.ok, hasInventoryModule: savedBody.hasInventoryModule }),
	);

	const inDb = (
		await client.query(`select workspace_feature_flags as f from organizations where id = $1`, [orgId])
	).rows[0].f;
	check("признак лёг в базу", inDb && inDb.hasInventoryModule === false, JSON.stringify(inDb?.hasInventoryModule));

	// ── Чтение отдаёт сохранённое, а не константу ─────────────────────────────
	const read = await req("/api/workspace/profile", { headers: H }).then((r) => r.json());
	check("чтение отдаёт выключенный склад", read.hasInventoryModule === false, String(read.hasInventoryModule));
	check("остальные признаки не сброшены", read.hasTasks === true && read.hasAnalyticsModule === true,
		`hasTasks=${read.hasTasks}, hasAnalyticsModule=${read.hasAnalyticsModule}`);

	// ── Второй признак не затирает первый ─────────────────────────────────────
	await req("/api/workspace/profile", {
		method: "POST",
		headers: H,
		body: JSON.stringify({ hasPayrollModule: false }),
	});
	const readTwo = await req("/api/workspace/profile", { headers: H }).then((r) => r.json());
	check(
		"второе сохранение не вернуло склад обратно",
		readTwo.hasInventoryModule === false && readTwo.hasPayrollModule === false,
		`склад=${readTwo.hasInventoryModule}, зарплаты=${readTwo.hasPayrollModule}`,
	);

	// ── Мусор в теле не попадает в базу ───────────────────────────────────────
	await req("/api/workspace/profile", {
		method: "POST",
		headers: H,
		body: JSON.stringify({ hasTasks: "да, конечно", придуманныйПризнак: true }),
	});
	const afterGarbage = (
		await client.query(`select workspace_feature_flags as f from organizations where id = $1`, [orgId])
	).rows[0].f;
	check("строка вместо признака отброшена", afterGarbage.hasTasks === true, JSON.stringify(afterGarbage.hasTasks));
	check(
		"выдуманный ключ в базу не попал",
		!Object.hasOwn(afterGarbage, "придуманныйПризнак"),
		Object.keys(afterGarbage).length + " ключей",
	);

	// ── ЧИСТЫЙ браузер: без localStorage набор должен прийти с сервера ─────────
	const { chromium } = await import("playwright");
	const browser = await chromium.launch({ headless: true });
	try {
		const context = await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "ru-RU" });
		const page = await context.newPage();
		await page.goto(WEB, { waitUntil: "domcontentloaded" });
		/*
		 * Ставим только токены входа. Ключ dente_workspace_profile НЕ ставим
		 * намеренно: раньше именно он создавал видимость работающей модульности, и
		 * проверять надо поведение без него.
		 */
		await page.evaluate(
			({ ct, st }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_theme_mode", "light");
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			},
			{ ct: login.clinicToken, st: unlock.staffToken },
		);
		await page.goto(`${WEB}/#shift`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(5000);

		const rail = await page.evaluate(() => {
			const nav = document.querySelector(".workspace-sidebar, nav, aside");
			return (nav?.innerText || document.body.innerText || "").replace(/\s+/g, " ");
		});
		check("меню рабочего места прочитано", rail.length > 20, `${rail.length} знаков`);
		check(
			"выключенный склад пропал из меню в чистом браузере",
			!/Склад/.test(rail),
			(rail.match(/Склад[^|]{0,20}/) ?? ["Склада в меню нет"])[0],
		);
		await page.screenshot({ path: "scratch/shots-flags-clean.png", fullPage: false });
		await context.close();
	} finally {
		await browser.close();
	}
} finally {
	if (orgId) {
		await client
			.query(`update organizations set workspace_feature_flags = $1 where id = $2`, [originalFlags, orgId])
			.catch(() => {});
		console.log("\nисходный набор модулей возвращён");
	}
	await client.end().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
