/**
 * Зонд: перемонтируется ли виджет карточки пациента при переключении
 * пациента, и если да — почему. Нужно, чтобы понять, защита от показа
 * чужих данных настоящая или случайная.
 */
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
const raw = await fetch(`${API}/api/patients`, {
	headers: { "x-dente-clinic-token": login.clinicToken, "x-dente-staff-token": unlock.staffToken },
}).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];
const [A, B] = list;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" })).newPage();
await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const SEL = '[data-testid="patient-communication-timeline-widget"]';

// Наблюдаем за появлением/исчезновением узла в реальном времени.
await page.evaluate((sel) => {
	window.__log = [];
	const present = () => !!document.querySelector(sel);
	window.__log.push(`старт: узел ${present() ? "есть" : "нет"}`);
	const obs = new MutationObserver(() => {
		const now = present();
		const last = window.__lastPresent;
		if (now !== last) {
			window.__lastPresent = now;
			window.__log.push(`${new Date().toISOString().slice(17, 23)} узел ${now ? "ПОЯВИЛСЯ" : "ИСЧЕЗ"}`);
		}
	});
	window.__lastPresent = present();
	obs.observe(document.body, { childList: true, subtree: true });
}, SEL);

await page.locator(`text=${A.fullName}`).first().click();
await page.waitForTimeout(2500);
await page.evaluate((sel) => {
	const el = document.querySelector(sel);
	if (el) el.__probeTag = "ОТМЕЧЕН-НА-ПАЦИЕНТЕ-А";
	window.__log.push("отметили узел на пациенте А");
}, SEL);

await page.locator(`text=${B.fullName}`).first().click();
await page.waitForTimeout(2500);

const result = await page.evaluate((sel) => {
	const el = document.querySelector(sel);
	return {
		tagSurvived: el ? el.__probeTag === "ОТМЕЧЕН-НА-ПАЦИЕНТЕ-А" : null,
		log: window.__log,
	};
}, SEL);

console.log("события DOM:");
for (const l of result.log) console.log("   ", l);
console.log(
	`\nузел тот же самый после переключения: ${result.tagSurvived}` +
		(result.tagSurvived === true
			? "  → перемонтирования НЕ было, состояние компонента сохраняется"
			: result.tagSurvived === false
				? "  → узел заменён, компонент перемонтирован (состояние сброшено)"
				: "  → узла нет"),
);

await browser.close();
