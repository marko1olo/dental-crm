/**
 * Ловит настоящую причину падения раздела.
 *
 * Граница ошибок (workspaceRouteErrorBoundary) показывает пользователю
 * «Раздел временно не открылся», а сама ошибка уходит в консоль браузера.
 * Скрипт собирает исключения, ошибки консоли и неудачные запросы.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const VIEW = process.env.VIEW || "settings";

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

const pageErrors = [];
const consoleErrors = [];
const failedRequests = [];
page.on("pageerror", (error) => pageErrors.push(error.stack || String(error)));
page.on("console", (message) => {
	if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
page.on("response", (response) => {
	if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
});

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
await page.waitForTimeout(5000);

const crashed = await page.evaluate(() => (document.body.innerText || "").includes("Раздел временно не открылся"));
console.log(`экран #${VIEW}: граница ошибок показана — ${crashed ? "ДА" : "нет"}`);

console.log(`\nисключений: ${pageErrors.length}`);
for (const error of pageErrors.slice(0, 3)) console.log(`  ${error.split("\n").slice(0, 6).join("\n  ")}`);

console.log(`\nошибок консоли: ${consoleErrors.length}`);
for (const line of consoleErrors.slice(0, 8)) console.log(`  ${line.slice(0, 400)}`);

console.log(`\nнеудачных запросов: ${failedRequests.length}`);
for (const line of [...new Set(failedRequests)].slice(0, 10)) console.log(`  ${line}`);

await browser.close();
