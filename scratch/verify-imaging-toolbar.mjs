/**
 * Живая проверка: панель просмотра снимка наконец влияет на снимок.
 *
 * Яркость, контраст, инверсия, поворот, отражение и масштаб считались в
 * useAppLogic, собирались в imagingViewerImageStyle, передавались в ImagingView
 * и там разбирались из пропсов — и не применялись ни к одному элементу. Врач
 * двигал ползунок, нажимал поворот, снимок оставался прежним. Инструмент
 * выглядел рабочим, потому что сами ползунки двигались.
 *
 * Скрипт открывает «Снимки», читает вычисленные стили настоящей картинки,
 * трогает панель и сверяет, что стили изменились именно так, как обещает
 * кнопка. Проверяются вычисленные значения браузера, а не разметка.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const OUT = "scratch/shots-imaging";
mkdirSync(OUT, { recursive: true });

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

/** Вычисленные фильтр и преобразование главной картинки просмотрщика. */
const readImage = (page) =>
	page.evaluate(() => {
		const image = document.querySelector(".imaging-viewer-stage img");
		if (!image) return null;
		const style = getComputedStyle(image);
		return { filter: style.filter, transform: style.transform };
	});

const browser = await chromium.launch({ headless: true });
try {
	const context = await browser.newContext({ viewport: { width: 1600, height: 1150 }, locale: "ru-RU" });
	const page = await context.newPage();
	const pageErrors = [];
	page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));
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
	await page.goto(`${WEB}/#imaging`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	const before = await readImage(page);
	check("снимок есть на экране", before !== null, before ? before.filter : "картинки нет");
	if (!before) throw new Error("нет снимка для проверки");

	// Поворот вправо: браузер обязан пересчитать матрицу преобразования.
	const rotated = await page.evaluate(() => {
		const button = document.querySelector('[aria-label="Повернуть снимок вправо"]');
		if (!(button instanceof HTMLElement)) return false;
		button.click();
		return true;
	});
	check("кнопка поворота найдена", rotated);
	await page.waitForTimeout(700);
	const afterRotate = await readImage(page);
	check(
		"поворот изменил преобразование снимка",
		afterRotate.transform !== before.transform && afterRotate.transform !== "none",
		`было ${before.transform} стало ${afterRotate.transform}`,
	);

	/*
	 * Инверсия: проверяем переключение, а не конкретное значение.
	 *
	 * Это кнопка-переключатель, а сеанс просмотра сохраняется между запусками.
	 * Ожидание ровно invert(1) валилось на втором прогоне подряд: инверсия уже
	 * была включена, нажатие честно её выключило.
	 */
	const invertBefore = /invert\(1\)/.test(afterRotate.filter);
	const inverted = await page.evaluate(() => {
		const button = Array.from(document.querySelectorAll("button")).find((b) =>
			/инверт|негатив/i.test(b.getAttribute("aria-label") || b.getAttribute("title") || ""),
		);
		if (!button) return false;
		button.click();
		return true;
	});
	check("кнопка инверсии найдена", inverted);
	await page.waitForTimeout(700);
	const afterInvert = await readImage(page);
	check(
		"инверсия переключила фильтр снимка",
		/invert\(1\)/.test(afterInvert.filter) !== invertBefore,
		`было ${afterRotate.filter} стало ${afterInvert.filter}`,
	);

	/*
	 * Яркость: тянем ползунок и смотрим, что brightness в фильтре стал другим.
	 *
	 * Цель выбирается от текущего положения, а не «на максимум»: сеанс
	 * просмотра сохраняется между запусками, и второй прогон подряд ставил
	 * максимум на максимум — фильтр справедливо не менялся, а проверка объявляла
	 * поломку. Ложная тревога обходится не дешевле пропущенной.
	 */
	const brightnessMoved = await page.evaluate(() => {
		const label = Array.from(document.querySelectorAll("label")).find((l) =>
			(l.textContent || "").includes("Яркость"),
		);
		const input = label?.querySelector('input[type="range"]');
		if (!(input instanceof HTMLInputElement)) return null;
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
		const min = Number(input.min) || 0.4;
		const max = Number(input.max) || 1.6;
		const current = Number(input.value);
		const target = String(Math.abs(current - max) > 0.01 ? max : min);
		setter?.call(input, target);
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new Event("change", { bubbles: true }));
		return target;
	});
	check("ползунок яркости найден", brightnessMoved !== null, String(brightnessMoved));
	await page.waitForTimeout(700);
	const afterBrightness = await readImage(page);
	check(
		"яркость изменила фильтр снимка",
		afterBrightness.filter !== afterInvert.filter,
		afterBrightness.filter,
	);

	check("ошибок в консоли нет", pageErrors.length === 0, pageErrors.join(" | "));
	await page.screenshot({ path: `${OUT}/viewer-adjusted.png`, fullPage: false });
	await context.close();
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
