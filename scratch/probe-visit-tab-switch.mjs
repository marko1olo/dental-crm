/**
 * Переключает вкладки экрана «Приём» и ловит ошибки консоли на каждом шаге.
 *
 * Обход разделов проверяет только первый показ. Падение может случиться при
 * переключении вкладки — тогда пользователь нажимает «Зубная формула», экран
 * схлопывается, а на снимке первого показа всё было в порядке.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
const page = await context.newPage();
let errors = [];
page.on("console", (message) => {
	if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
		errors.push(message.text().slice(0, 260));
	}
});
page.on("pageerror", (error) => errors.push(String(error).slice(0, 260)));

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
await page.goto(`${WEB}/#visit`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

for (const tab of ["Зубная формула", "Рентгены", "ЭМК и Диктовка"]) {
	errors = [];
	const button = page.locator("button", { hasText: tab }).first();
	const found = await button.count();
	console.log(`\n=== вкладка «${tab}»: кнопок ${found}`);
	if (found === 0) continue;
	await button.click();
	await page.waitForTimeout(1600);
	const state = await page.evaluate(() => ({
		crashed: (document.body.innerText || "").includes("Раздел временно не открылся"),
		length: (document.body.innerText || "").trim().length,
		toothMap: document.querySelectorAll(".tooth-map").length,
		teeth: document.querySelectorAll(".tooth, .tooth-cell, [data-tooth]").length,
		tabsVisible: [...document.querySelectorAll("button")].filter((b) =>
			/ЭМК и Диктовка|Зубная формула|Рентгены/.test(b.textContent || ""),
		).length,
	}));
	console.log(
		`  падение:${state.crashed ? "ДА" : "нет"} текста:${state.length} зубных карт:${state.toothMap} ` +
			`зубов:${state.teeth} кнопок вкладок:${state.tabsVisible}`,
	);
	if (errors.length) {
		console.log(`  ошибок ${errors.length}:`);
		for (const line of errors.slice(0, 2)) console.log(`    ${line}`);
	}
}

await browser.close();
