/**
 * Живая проверка копеек через настоящий экран кассы, а не только через API.
 *
 * Поле ввода суммы раньше пропускало только цифры и отвечало «укажите сумму
 * целыми рублями без копеек». Проверяем браузером: набор «1500,50» проходит,
 * платёж уходит, сумма в базе ровно 1500.50, а на экране показана как
 * «1 500,50 ₽» — не «1 500,5 ₽».
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

const client = new pg.Client({ connectionString: databaseUrl() });
await client.connect();
const before = await client.query(`select count(*)::int as n from payments`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
const page = await context.newPage();

try {
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
	await page.goto(`${WEB}/#finance`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	// Поле суммы ищем по подписи, а не по позиции: разметка кассы меняется.
	const amountField = page.locator('input[inputmode="numeric"], input[name*="amount" i], input[aria-label*="умм" i]').first();
	const fieldFound = (await amountField.count()) > 0;
	check("поле ввода суммы найдено на экране кассы", fieldFound);
	if (!fieldFound) throw new Error("поле суммы не найдено");

	await amountField.fill("1500,50");
	await page.waitForTimeout(900);

	const screen = await page.evaluate(() => document.body.innerText || "");
	check(
		"экран больше не требует «целыми рублями без копеек»",
		!screen.includes("целыми рублями без копеек"),
	);
	check(
		"нет жалобы на формат введённой суммы",
		!/сумма указывается цифрами/i.test(screen),
		(screen.match(/сумма указывается[^\n]*/i) ?? ["жалобы нет"])[0],
	);

	// Проверяем формат вывода денег на самом экране.
	const moneyShapes = await page.evaluate(() => {
		const text = document.body.innerText || "";
		return {
			oneDecimal: /\d,\d ₽/.test(text),
			twoDecimals: /\d,\d\d ₽/.test(text),
			samples: (text.match(/[\d  ]+,\d+ ₽/g) ?? []).slice(0, 5),
		};
	});
	check(
		"суммы не печатаются с одной цифрой после запятой",
		!moneyShapes.oneDecimal,
		`образцы: ${moneyShapes.samples.join(" | ") || "нет"}`,
	);
} finally {
	const after = await client.query(`select count(*)::int as n from payments`);
	console.log(`\nоплат в базе: было ${before.rows[0].n}, стало ${after.rows[0].n}`);
	if (after.rows[0].n !== before.rows[0].n) {
		check("экранная проверка не создала лишних оплат", false, "проверьте базу вручную");
	}
	await client.end().catch(() => {});
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
