/**
 * Зонд: сколько запросов /communications реально уходит и в каком порядке
 * приходят ответы при переключении пациента. Нужно, чтобы объяснить,
 * почему устаревшие данные не показались, хотя компонент не перемонтируется.
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
const short = (id) => (id === A.id ? "А" : id === B.id ? "Б" : id.slice(0, 6));

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" })).newPage();

const events = [];
const t0 = Date.now();
await page.route("**/api/patients/*/communications", async (route) => {
	const id = route.request().url().match(/\/api\/patients\/([^/]+)\/communications/)?.[1];
	events.push(`${String(Date.now() - t0).padStart(6)}мс  ЗАПРОС  пациент ${short(id)}`);
	if (id === A.id) await new Promise((r) => setTimeout(r, 4000));
	events.push(`${String(Date.now() - t0).padStart(6)}мс  ОТВЕТ   пациент ${short(id)}`);
	await route.fulfill({
		status: 200,
		contentType: "application/json",
		body: JSON.stringify([
			{
				id: `syn-${id}`,
				organizationId: "00000000-0000-0000-0000-000000000001",
				patientId: id,
				channelType: "SMS",
				direction: "OUTBOUND",
				summary: `МАРКЕР-${short(id)}`,
				staffName: "Проверка",
				timestamp: "2026-01-01T10:00:00.000Z",
			},
		]),
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
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

const SEL = '[data-testid="patient-communication-timeline-widget"]';
const text = async () => {
	const n = await page.locator(SEL).count();
	return n ? (await page.locator(SEL).first().innerText()).replace(/\s+/g, " ").slice(0, 120) : "<нет>";
};

events.push("--- клик по А ---");
await page.locator(`text=${A.fullName}`).first().click();
await page.waitForTimeout(6000);
console.log("после А:", await text());

events.push("--- клик по Б ---");
await page.locator(`text=${B.fullName}`).first().click();
await page.waitForTimeout(300);
console.log("через 300мс после Б:", await text());
await page.waitForTimeout(8000);
console.log("через 8с после Б:", await text());

console.log("\nхронология сети:");
for (const e of events) console.log("   ", e);

await browser.close();
