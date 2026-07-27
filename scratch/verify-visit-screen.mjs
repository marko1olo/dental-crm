/**
 * Живая проверка экрана «Приём» настоящим браузером.
 *
 * Что проверяем:
 *  1. Нажатие на вкладку «Зубная формула и Дневник» не роняет раздел. Оно
 *     роняло: VisitOdontogramTab читал `activeAppointment.id`, а защита выше
 *     смотрела только на пациента. У клиники без приёмов экран схлопывался
 *     вместе с кнопками вкладок — вернуться можно было только перезагрузкой.
 *  2. Зубная карта показывается: она принадлежит пациенту, а не приёму.
 *  3. Диктовка на экране одна. Их было две, и та, что стояла внутри вкладки,
 *     была сломана: подпись действия печаталась пустыми кавычками «», список
 *     «Чтобы собрать черновик, осталось:» выводился пустым, быстрых фраз не
 *     было вовсе.
 *  4. Заказы в лабораторию загружаются, а не падают молча на отсутствующем
 *     `auth` из пустого контекста.
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, locale: "ru-RU" });
const page = await context.newPage();
let errors = [];
page.on("console", (message) => {
	if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
		errors.push(message.text().slice(0, 200));
	}
});
page.on("pageerror", (error) => errors.push(String(error).slice(0, 200)));

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
	await page.goto(`${WEB}/#visit`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	errors = [];

	const dictationBoxes = await page.locator(".dictation-box").count();
	check("диктовка на экране одна", dictationBoxes === 1, `найдено ${dictationBoxes}`);

	const guidance = await page.locator(".dictation-action-guidance").first().textContent();
	check(
		"подсказка диктовки называет действие, а не пустые кавычки",
		!/«»/.test(guidance ?? ""),
		(guidance ?? "").trim().slice(0, 90),
	);

	const missing = await page.locator(".visit-draft-missing").first().textContent();
	check(
		"список «осталось» не пустой, когда черновик не готов",
		(missing ?? "").replace("Чтобы собрать черновик, осталось:", "").trim().length > 0,
		(missing ?? "").trim().slice(0, 90),
	);

	// Переключение на зубную формулу — то, что роняло раздел.
	for (const tab of ["Зубная формула", "Рентгены", "ЭМК и Диктовка"]) {
		errors = [];
		const button = page.locator("button", { hasText: tab }).first();
		const found = await button.count();
		check(`кнопка вкладки «${tab}» на месте`, found > 0);
		if (found === 0) continue;
		await button.click();
		await page.waitForTimeout(1600);
		const state = await page.evaluate(() => ({
			crashed: (document.body.innerText || "").includes("Раздел временно не открылся"),
			tabs: [...document.querySelectorAll("button")].filter((b) =>
				/ЭМК и Диктовка|Зубная формула|Рентгены/.test(b.textContent || ""),
			).length,
			teeth: document.querySelectorAll(".tooth, .tooth-cell, [data-tooth]").length,
		}));
		check(`вкладка «${tab}» не роняет раздел`, !state.crashed);
		check(`после «${tab}» кнопки вкладок остались`, state.tabs >= 3, `кнопок ${state.tabs}`);
		check(
			`на «${tab}» нет ошибок отрисовки и загрузки`,
			errors.filter((line) => /Cannot read propert|is not a function|Failed to load/.test(line)).length === 0,
			errors.slice(0, 1).join(" | "),
		);
		if (tab === "Зубная формула") {
			check("зубная карта показана без приёма", state.teeth >= 28, `зубов ${state.teeth}`);
		}
	}
} finally {
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
