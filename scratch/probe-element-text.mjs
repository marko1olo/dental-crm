/**
 * Печатает полный текст элементов по селектору и их количество.
 *
 * Поиск по текстовым узлам обманывает: React разбивает строку с подстановкой на
 * несколько узлов, и кажется, что подпись пустая. Смотреть надо textContent
 * элемента целиком.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEW = process.env.VIEW || "visit";
const SELECTORS = (process.argv[2] || ".dictation-box").split(",");

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
await page.goto(`${WEB}/#${VIEW}`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

for (const selector of SELECTORS) {
	const found = await page.evaluate((sel) => {
		return [...document.querySelectorAll(sel)].map((el) => {
			const rect = el.getBoundingClientRect();
			return {
				text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 300),
				visible: rect.width > 0 && rect.height > 0,
				size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
			};
		});
	}, selector);
	console.log(`\n${selector}: элементов ${found.length}`);
	found.forEach((item, index) => {
		console.log(`  [${index + 1}] видим:${item.visible ? "да" : "нет"} ${item.size}`);
		console.log(`      ${item.text || "(пусто)"}`);
	});
}

await browser.close();
