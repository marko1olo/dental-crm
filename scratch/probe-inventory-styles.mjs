/**
 * Проверка подозрения: на складе классы Tailwind подставлены в inline-стили.
 *
 * В InventoryView объявлено
 *   const paperBg = "bg-white dark:bg-slate-900";
 *   const borderColor = "border-slate-200 dark:border-slate-800";
 * и эти строки используются как ЗНАЧЕНИЯ свойств CSS:
 *   style={{ background: paperBg, border: `1px solid ${borderColor}` }}
 * — 46 вхождений. Имя класса не является значением цвета, поэтому объявление
 * недействительно и свойство берёт наследуемое или начальное значение.
 *
 * Догадку надо подтвердить браузером, а не чтением: сравниваем вычисленные фон и
 * границу карточек склада с соседним настоящим экраном. Ничего не меняет.
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
	for (const theme of ["light", "dark"]) {
		const context = await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" });
		const page = await context.newPage();
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
		await page.goto(`${WEB}/#inventory`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(4000);

		const report = await page.evaluate(() => {
			/*
			 * Ищем элементы, у которых в атрибуте style стоит имя класса вместо
			 * значения цвета: браузер такое объявление отбрасывает, и в самом
			 * атрибуте его тоже не остаётся. Поэтому смотрим не на атрибут, а на
			 * вычисленный результат у карточек склада.
			 */
			const cards = Array.from(document.querySelectorAll("div")).filter((node) => {
				const style = node.getAttribute("style") || "";
				return style.includes("border-radius: 16px") || style.includes("border-radius:16px");
			});
			const sample = cards.slice(0, 6).map((node) => {
				const computed = getComputedStyle(node);
				return {
					background: computed.backgroundColor,
					borderWidth: computed.borderTopWidth,
					borderColor: computed.borderTopColor,
					styleAttr: (node.getAttribute("style") || "").slice(0, 120),
				};
			});
			const withTailwind = Array.from(document.querySelectorAll("[style]")).filter((node) =>
				/bg-white|dark:bg-|border-slate-/.test(node.getAttribute("style") || ""),
			).length;
			return { cardsFound: cards.length, sample, withTailwind };
		});

		console.log(`\n[${theme}] карточек с радиусом 16px: ${report.cardsFound}`);
		console.log(`[${theme}] элементов, где в style осталось имя класса: ${report.withTailwind}`);
		for (const card of report.sample) {
			console.log(
				`  фон ${card.background} | граница ${card.borderWidth} ${card.borderColor}`,
			);
			console.log(`    style: ${card.styleAttr}`);
		}
		await context.close();
	}
} finally {
	await browser.close();
}
