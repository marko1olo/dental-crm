/**
 * Снимает все главные экраны с авторизацией в светлой и тёмной теме.
 *
 * Скриншот должен быть реального экрана, поэтому по каждому кадру
 * печатается, что на нём: заголовок, число заметных блоков, попал ли
 * экран логина, есть ли пустые состояния и видимые ошибки. Кадр без
 * подтверждения — не доказательство.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-all";
const VIEWS = (process.env.VIEWS || "shift,schedule,patients,visit,documents,finance,analytics,communications,settings").split(",");
const THEMES = (process.env.THEMES || "light,dark").split(",");
mkdirSync(OUT, { recursive: true });

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
	for (const theme of THEMES) {
		const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
		const page = await context.newPage();
		const pageErrors = [];
		page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 110)));
		await page.goto(WEB, { waitUntil: "domcontentloaded" });
		await page.evaluate(
			({ ct, st, th }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
			},
			{ ct: login.clinicToken, st: unlock.staffToken, th: theme },
		);

		for (const view of VIEWS) {
			pageErrors.length = 0;
			await page.goto(`${WEB}/#${view}`, { waitUntil: "domcontentloaded" });
			await page.reload({ waitUntil: "domcontentloaded" });
			await page.waitForTimeout(3200);

			const state = await page.evaluate(() => {
				const text = document.body.innerText || "";
				const heading =
					document.querySelector(".workspace h2, .workspace h1, .panel-heading h3")?.textContent?.trim() ?? null;
				const empties = [...document.querySelectorAll("*")]
					.filter((el) => el.children.length === 0)
					.map((el) => (el.textContent || "").trim())
					.filter((t) => /^(нет |пока нет|ничего не найдено|нет данных|список пуст|нет записей)/i.test(t));
				return {
					heading,
					isLogin: /Вход в кабинет|Введите пароль|Войти/i.test(text) && !/Смена|Расписание/i.test(text),
					panels: document.querySelectorAll(".panel, .workspace section").length,
					emptyStates: [...new Set(empties)].slice(0, 4),
					hasVisibleError: /Ошибка|Не удалось|Сбой/i.test(text),
					scrollHeight: document.documentElement.scrollHeight,
				};
			});

			const file = `${OUT}/${view}_${theme}.png`;
			await page.screenshot({ path: file });
			console.log(
				`${view.padEnd(15)} ${theme.padEnd(6)} | заголовок: ${(state.heading ?? "нет").slice(0, 46).padEnd(46)} | блоков ${String(state.panels).padStart(3)} | логин: ${state.isLogin ? "ДА" : "нет"} | ошибки на экране: ${state.hasVisibleError ? "есть" : "нет"} | исключений ${pageErrors.length}`,
			);
			if (state.emptyStates.length) console.log(`${" ".repeat(24)}пустые состояния: ${state.emptyStates.join(" | ")}`);
			if (pageErrors.length) console.log(`${" ".repeat(24)}исключения: ${pageErrors.slice(0, 2).join(" | ")}`);
		}
		await context.close();
	}
} finally {
	await browser.close();
}
console.log(`\nкадры в ${OUT}`);
