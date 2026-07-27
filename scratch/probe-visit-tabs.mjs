/**
 * Проверяет, что вкладки экрана «Приём» действительно переключают содержимое.
 *
 * На экране три вкладки: «ЭМК и Диктовка», «Зубная формула и Дневник»,
 * «Рентгены и Диагностика». Если основная часть разметки стоит ВНЕ условия по
 * вкладке, переключение почти ничего не меняет: пользователь жмёт вкладку и
 * видит ту же простыню, только с добавкой сверху. Тогда вкладки — украшение, а
 * не навигация, и честнее их убрать или довести до дела.
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

const TABS = ["ЭМК и Диктовка", "Зубная формула и Дневник", "Рентгены и Диагностика"];
const snapshots = [];

for (const tab of TABS) {
	const button = page.locator("button", { hasText: tab }).first();
	if ((await button.count()) === 0) {
		console.log(`вкладка «${tab}» не найдена`);
		continue;
	}
	await button.click();
	await page.waitForTimeout(1400);
	const state = await page.evaluate(() => ({
		length: (document.body.innerText || "").trim().length,
		height: document.documentElement.scrollHeight,
		dictation: document.querySelectorAll(".dictation-box").length,
		toothMap: document.querySelectorAll(".tooth-map").length,
		text: (document.body.innerText || "").replace(/\s+/g, " "),
	}));
	snapshots.push({ tab, ...state });
	console.log(
		`  ${tab.padEnd(26)} текста ${String(state.length).padStart(5)} высота ${String(state.height).padStart(5)} ` +
			`диктовок ${state.dictation} зубных карт ${state.toothMap}`,
	);
}

console.log("\nчто меняется между вкладками:");
for (let i = 1; i < snapshots.length; i += 1) {
	const previous = snapshots[i - 1];
	const current = snapshots[i];
	const shared = previous.text.length && current.text.length
		? [...previous.text].filter((_, index) => previous.text[index] === current.text[index]).length
		: 0;
	const sameShare = previous.text.length ? Math.round((shared / previous.text.length) * 100) : 0;
	console.log(
		`  «${previous.tab}» → «${current.tab}»: разница текста ${Math.abs(current.length - previous.length)} символов, ` +
			`совпадение по позициям ~${sameShare}%`,
	);
}

await browser.close();
