/**
 * Живая проверка экрана «Связь» настоящим браузером.
 *
 * Что проверяем:
 *  1. Клиника без задач связи не видит четыре нуля в ряд и форму «заметка
 *     закрытия» без объекта: поле заметки уходит вместе с taskId в
 *     POST /api/communications/tasks/complete, значит без задач оно бессмысленно.
 *  2. Сообщение о неподключённых каналах не отправляет пользователя «в окружение
 *     сервера», а разделяет ответственность и даёт кнопку.
 *  3. Кнопка «Отправить из очереди» действительно вызывает разбор очереди и
 *     печатает отчёт, а не молчит.
 */
import { chromium } from "playwright";

const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
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

const dash = await req("/api/dashboard", {
	headers: {
		"x-dente-clinic-token": login.clinicToken,
		"x-dente-staff-token": unlock.staffToken,
	},
}).then((r) => r.json());
const openTasks = (dash.communicationTasks ?? []).length;
console.log(`задач связи в клинике: ${openTasks}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error).slice(0, 160)));

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
	await page.goto(`${WEB}/#communications`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	const text = await page.evaluate(() => document.body.innerText || "");
	check("экран открылся, а не логин", text.includes("Связь с пациентами"));
	check("на экране нет исключений", pageErrors.length === 0, pageErrors.join(" | "));

	if (openTasks === 0) {
		check("форма заметки закрытия не показана, когда закрывать нечего", !text.includes("Что сказал пациент"));
		check("нет старой подписи «Заметка закрытия»", !text.includes("Заметка закрытия"));
		check(
			"сводка из четырёх нулей не показана",
			!/Открыто\s*\n?\s*0/.test(text) || !text.includes("После приема"),
			"сводка скрыта при пустых счётчиках",
		);
	} else {
		check("форма заметки показана, потому что есть задачи", text.includes("Что сказал пациент"));
	}

	check(
		"сообщение о каналах не отправляет в «окружение сервера»",
		!text.includes("Ключи шлюзов задаются в окружении сервера"),
	);
	check(
		"сообщение о каналах разделяет ответственность",
		text.includes("Телеграм и WhatsApp клиника подключает сама") ||
			!text.includes("ни один канал связи не подключён"),
	);
	const connectButton = page.getByRole("button", { name: /Подключить Телеграм или WhatsApp/ });
	const hasConnect = (await connectButton.count()) > 0;
	check("есть кнопка подключения каналов", hasConnect || !text.includes("не подключён"));
	if (hasConnect) {
		await connectButton.first().click();
		await page.waitForTimeout(1500);
		const hash = await page.evaluate(() => window.location.hash);
		check("кнопка ведёт в настройки бота", hash.includes("settings"), hash);
		await page.goto(`${WEB}/#communications`, { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(3000);
	}

	// Кнопка отправки из очереди: должна дать отчёт, а не промолчать.
	const dispatchButton = page.getByRole("button", { name: /Отправить из очереди/ });
	const hasDispatch = (await dispatchButton.count()) > 0;
	check("кнопка называется «Отправить из очереди», а не «Разобрать очередь»", hasDispatch);
	if (hasDispatch) {
		await dispatchButton.first().click();
		await page.waitForTimeout(3500);
		const afterText = await page.evaluate(() => document.body.innerText || "");
		check(
			"разбор очереди отчитался о результате",
			/Разобрано \d+/.test(afterText) || /не отправлено \d+/.test(afterText),
			(afterText.match(/Разобрано[^\n]*/) ?? ["отчёта нет"])[0],
		);
	}
} finally {
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
