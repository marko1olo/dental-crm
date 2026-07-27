/**
 * Снимает реальный экран «Снимки» с авторизацией, в светлой и тёмной теме,
 * и отдельно область заметки к снимку — то место, где стояла кнопка-заглушка
 * «Сгенерировать с помощью ИИ».
 *
 * Скриншот должен быть реального экрана, а не логина и не пустоты, поэтому
 * скрипт печатает, что именно нашёл на странице: есть ли снимки, открылся ли
 * просмотрщик, видно ли поле заметки.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-imaging";
mkdirSync(OUT, { recursive: true });

async function req(path, init = {}, attempts = 12) {
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
		await page.goto(`${WEB}/#imaging`, { waitUntil: "domcontentloaded" });
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(4000);

		// Что вообще на экране: без этого скриншот нечем подтвердить.
		const state = await page.evaluate(() => {
			const cards = document.querySelectorAll("[href*='#imaging'], .imaging-study-card, .imaging-feed-item");
			const note = document.querySelector('textarea[aria-label="Заметка к снимку"]');
			const oldInput = document.querySelector('input[aria-label="Заметка к снимку"]');
			const templateBtn = [...document.querySelectorAll("button")].find((b) => /Шаблон описания/i.test(b.textContent || ""));
			const stubBtn = [...document.querySelectorAll("button")].find((b) => /заглушка/i.test(b.getAttribute("title") || ""));
			return {
				title: document.querySelector(".imaging-copy h2")?.textContent?.trim() ?? null,
				cardCount: cards.length,
				hasNoteTextarea: !!note,
				hasNoteInput: !!oldInput,
				hasTemplateButton: !!templateBtn,
				hasStubButton: !!stubBtn,
				bodyMentionsLogin: /Вход в кабинет|Введите пароль/i.test(document.body.innerText),
			};
		});
		console.log(`\n=== тема ${theme} ===`);
		console.log(`  заголовок экрана: ${state.title ?? "не найден"}`);
		console.log(`  элементов ленты снимков: ${state.cardCount}`);
		console.log(`  поле заметки многострочное: ${state.hasNoteTextarea}`);
		console.log(`  осталось однострочное поле: ${state.hasNoteInput}`);
		console.log(`  кнопка «Шаблон описания»: ${state.hasTemplateButton}`);
		console.log(`  кнопка-заглушка «(заглушка)»: ${state.hasStubButton}`);
		console.log(`  это экран логина: ${state.bodyMentionsLogin}`);

		await page.screenshot({ path: `${OUT}/imaging_${theme}_full.png`, fullPage: false });

		// Пробуем открыть просмотрщик первого снимка, чтобы поле заметки было видно.
		const opened = await page
			.locator(".imaging-open-viewer, [data-testid='imaging-open-viewer'], .imaging-study-card a, .imaging-feed-item a")
			.first()
			.click({ timeout: 5000 })
			.then(() => true)
			.catch(() => false);
		await page.waitForTimeout(2500);
		console.log(`  просмотрщик открыт по клику: ${opened}`);

		const strip = page.locator(".viewer-session-strip").first();
		if ((await strip.count()) > 0) {
			await strip.scrollIntoViewIfNeeded().catch(() => null);
			await page.waitForTimeout(400);
			await strip.screenshot({ path: `${OUT}/note_${theme}.png` }).catch(() => null);
			console.log(`  снимок области заметки: ${OUT}/note_${theme}.png`);
		} else {
			console.log("  область заметки на экране не найдена");
			await page.screenshot({ path: `${OUT}/imaging_${theme}_after_click.png` });
		}
		await context.close();
	}
} finally {
	await browser.close();
}
console.log(`\nфайлы в ${OUT}`);
