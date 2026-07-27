/**
 * Проводит оплату через настоящий экран кассы и проверяет базу.
 *
 * Проверяем два дефекта сразу:
 *  1. Касса отказывалась принимать деньги, когда открытого приёма нет вовсе.
 *     Готовность требовала совпадения пациента с пациентом активного приёма, а
 *     гидратация базы кладёт туда заготовку с нулевым UUID — совпадения не
 *     было никогда. Объяснение при этом врало: «активный прием открыт для
 *     другого пациента», хотя приём не открыт ни для кого.
 *  2. Поле суммы открывалось с подставленным «3800» — кассир мог принять
 *     сумму, которой никто не называл.
 *
 * Оплата создаётся настоящая и удаляется в конце.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const AMOUNT = "1234,56";
const AMOUNT_NUMBER = 1234.56;

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
	await page.waitForTimeout(4500);

	const missingBefore = (await page.locator(".payment-capture-missing").first().textContent()) ?? "";
	check(
		"касса не врёт про приём другого пациента",
		!/активный прием открыт для другого пациента/.test(missingBefore),
		missingBefore.trim().slice(0, 110),
	);
	check(
		"единственное препятствие — незаполненная сумма",
		/сумм/i.test(missingBefore) && missingBefore.split("осталось:")[1]?.trim().length < 60,
		missingBefore.trim().slice(0, 110),
	);

	const amountField = page.locator('input[inputmode="numeric"]').first();
	check("поле суммы найдено", (await amountField.count()) > 0);
	const initialValue = await amountField.inputValue();
	check("поле суммы открылось пустым", initialValue.trim() === "", `значение «${initialValue}»`);

	await amountField.fill(AMOUNT);
	await page.waitForTimeout(1200);

	const acceptButton = page.getByRole("button", { name: /Принять оплату|Записать оплату|Провести оплату/ });
	const acceptCount = await acceptButton.count();
	check("кнопка приёма оплаты на экране", acceptCount > 0, `кнопок ${acceptCount}`);
	if (acceptCount > 0) {
		const disabled = await acceptButton.first().isDisabled();
		check("кнопка приёма оплаты доступна без открытого приёма", !disabled);
		if (!disabled) {
			await acceptButton.first().click();
			await page.waitForTimeout(4000);
			// Что сказал экран после нажатия: без этого «оплата не создалась»
			// остаётся без причины.
			const screenSaid = await page.evaluate(() => {
				const banner = document.querySelector(".app-notice");
				const text = (banner?.textContent || "").trim();
				const missing = (document.querySelector(".payment-capture-missing")?.textContent || "").trim();
				return { banner: text.slice(0, 220), missing: missing.slice(0, 220) };
			});
			console.log(`      экран после нажатия: ${screenSaid.banner || "нет сообщения"}`);
			if (screenSaid.missing) console.log(`      осталось: ${screenSaid.missing}`);
			const row = await client.query(
				`select amount_rub, patient_id from payments order by created_at desc limit 1`,
			);
			const saved = Number(row.rows[0]?.amount_rub);
			check(
				"оплата с копейками легла в базу точно",
				saved === AMOUNT_NUMBER,
				`в базе ${row.rows[0]?.amount_rub}, ожидали ${AMOUNT_NUMBER}`,
			);
		}
	}
} finally {
	const after = await client.query(`select count(*)::int as n from payments`);
	const created = after.rows[0].n - before.rows[0].n;
	if (created > 0) {
		const removed = await client.query(
			`delete from payments where id in (
				select id from payments order by created_at desc limit $1
			)`,
			[created],
		);
		console.log(`\nубрано созданных оплат: ${removed.rowCount} из ${created}`);
	} else {
		console.log("\nновых оплат не создано");
	}
	await client.end().catch(() => {});
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
