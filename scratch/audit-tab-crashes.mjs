/**
 * Нажимает на переключатели внутри каждого раздела и проверяет, что ни одно
 * нажатие не роняет экран.
 *
 * Обход разделов (audit-route-crashes) проверяет только первый показ. Так была
 * пропущена главная поломка экрана «Приём»: он открывался нормально, а нажатие
 * на вкладку «Зубная формула» роняло весь раздел вместе с кнопками вкладок —
 * вернуться можно было только перезагрузкой страницы.
 *
 * Ищем именно переключатели вида, а не любые кнопки: нажимать «Удалить» или
 * «Отправить» на живой базе нельзя. Признак — кнопка с aria-pressed,
 * role="tab" или из известных наборов вкладок раздела.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const VIEWS = [
	"shift",
	"schedule",
	"patients",
	"imaging",
	"visit",
	"documents",
	"finance",
	"analytics",
	"communications",
	"marketing",
];

/** Подписи, по которым узнаём переключатель вида, а не действие над данными. */
const SAFE_LABEL = /^(ЭМК и Диктовка|Зубная формула|Рентгены|Все записи|Все|В очереди|Отправляется|Отправлено|Доставлено|Ошибка|Отменено|Не отправлено|Показать аналитику|Скрыть аналитику|Показать другие роли|Скрыть другие роли|Сегодня|День|Неделя|Месяц|Список|Сетка)/;

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
const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
const page = await context.newPage();
let errors = [];
page.on("console", (message) => {
	if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
		errors.push(message.text().slice(0, 200));
	}
});
page.on("pageerror", (error) => errors.push(String(error).slice(0, 200)));

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

const broken = [];
let clicks = 0;

for (const view of VIEWS) {
	await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);

	const labels = await page.evaluate((pattern) => {
		const rule = new RegExp(pattern);
		const seen = new Set();
		for (const button of document.querySelectorAll("button")) {
			const text = (button.textContent || "").trim().replace(/\s+/g, " ");
			if (!text || text.length > 40) continue;
			const looksLikeSwitch =
				button.hasAttribute("aria-pressed") ||
				button.getAttribute("role") === "tab" ||
				rule.test(text);
			if (looksLikeSwitch) seen.add(text);
		}
		return [...seen].slice(0, 10);
	}, SAFE_LABEL.source);

	if (labels.length === 0) {
		console.log(`${view}: переключателей не найдено`);
		continue;
	}
	console.log(`${view}: переключателей ${labels.length}`);

	for (const label of labels) {
		errors = [];
		const button = page.locator("button", { hasText: label }).first();
		if ((await button.count()) === 0) continue;
		try {
			await button.click({ timeout: 4000 });
		} catch {
			continue;
		}
		clicks += 1;
		await page.waitForTimeout(1100);
		const state = await page.evaluate(() => ({
			crashed: (document.body.innerText || "").includes("Раздел временно не открылся"),
			length: (document.body.innerText || "").trim().length,
		}));
		const renderErrors = errors.filter((line) =>
			/Cannot read propert|is not a function|is not defined/.test(line),
		);
		const ok = !state.crashed && renderErrors.length === 0 && state.length > 200;
		console.log(`   ${ok ? "OK  " : "СБОЙ"} «${label}» текста:${state.length}`);
		if (!ok) {
			broken.push({ view, label, crashed: state.crashed, error: renderErrors[0] ?? "" });
			// После падения раздел не восстанавливается сам — перезагружаем.
			await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForTimeout(2600);
		}
	}
}

await browser.close();

console.log(`\nнажатий: ${clicks}, поломок: ${broken.length}`);
for (const item of broken) {
	console.log(`  ${item.view} → «${item.label}»${item.crashed ? " — раздел упал" : ""}`);
	if (item.error) console.log(`      ${item.error}`);
}
if (broken.length > 0) process.exit(1);
