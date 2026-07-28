/**
 * Расписание застряло в загрузке или просто медленное?
 *
 * На снимке экрана «Записи» видно «Расписание — загрузка» без единой строки и
 * «Обзвон и подтверждения» со скелетонами и надписью «Обновляю…». Снимок делался
 * через 3,2 секунды после открытия, поэтому это может быть и незавершённая
 * загрузка, и вечное зависание.
 *
 * Разница принципиальная: вечная загрузка на самом нужном экране клиники значит,
 * что администратор не видит записей вообще. Ждём заметно дольше и смотрим, что
 * изменилось, а заодно читаем консоль и неудачные запросы — именно там причина.
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
try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
	const page = await context.newPage();
	const errors = [];
	const failed = [];
	page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
	page.on("requestfailed", (r) => failed.push(`${r.method()} ${r.url().slice(0, 110)}`));
	const apiCalls = [];
	page.on("response", (r) => {
		const url = r.url();
		if (url.includes("/api/")) apiCalls.push(`${r.status()} ${url.replace(API, "").slice(0, 90)}`);
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
	await page.goto(`${WEB}/#schedule`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });

	/** Что видно на экране расписания в этот момент. */
	const snapshot = async (label) => {
		const state = await page.evaluate(() => {
			const text = document.body.innerText || "";
			const skeletons = document.querySelectorAll(
				"[class*='skeleton'], [class*='Skeleton'], [aria-busy='true']",
			).length;
			return {
				loadingPill: /загрузка|Обновляю/i.test(text),
				skeletons,
				rows: document.querySelectorAll("[class*='appointment'], [class*='schedule-row'], tbody tr").length,
				chars: text.length,
				head: text.replace(/\s+/g, " ").slice(0, 200),
			};
		});
		console.log(
			`  ${label}: знаков ${state.chars}, строк расписания ${state.rows}, скелетонов ${state.skeletons}, надпись загрузки ${state.loadingPill ? "есть" : "нет"}`,
		);
		return state;
	};

	await page.waitForTimeout(4000);
	const early = await snapshot("через 4 с");
	await page.waitForTimeout(12000);
	const late = await snapshot("через 16 с");
	await page.waitForTimeout(14000);
	const veryLate = await snapshot("через 30 с");

	console.log(`\nтекст экрана через 30 с: ${veryLate.head}`);
	console.log(`\nисключений в консоли: ${errors.length}`);
	for (const e of errors.slice(0, 5)) console.log(`  ${e}`);
	console.log(`неудачных запросов: ${failed.length}`);
	for (const f of failed.slice(0, 8)) console.log(`  ${f}`);
	console.log(`\nобращения к серверу (${apiCalls.length}):`);
	for (const c of apiCalls.slice(0, 25)) console.log(`  ${c}`);

	const stillLoading = veryLate.loadingPill || veryLate.skeletons > 0;
	console.log(
		`\nВЫВОД: ${stillLoading ? "ЗАСТРЯЛО — через 30 секунд экран всё ещё грузится" : "не застряло, загрузка завершилась"}`,
	);
	await page.screenshot({ path: "scratch/shots-schedule-30s.png", fullPage: false });
	void early;
	void late;
	await context.close();
} finally {
	await browser.close();
}
