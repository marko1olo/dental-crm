/**
 * Живая проверка того, что раздел «Настройки» вообще открывается.
 *
 * Он не открывался: вкладка «Клиника» вынесена в отдельный компонент
 * SettingsClinicTab, который достаёт из объекта пропсов 65 значений, а
 * передавалось 28. Первое обращение по ключу к неопределённому объекту —
 * `staffScheduleDrafts[member.id]` — роняло отрисовку, и React показывал
 * границу ошибок «Раздел временно не открылся. Уже введенные данные не
 * менялись». Клиника не могла задать ни название, ни телефон, ни кресла, ни
 * расписание сотрудников.
 *
 * Проверка смотрит и на границу ошибок, и на присутствие настоящих элементов
 * вкладки: одного отсутствия слова «не открылся» мало — пустой экран его тоже
 * не содержит.
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
const consoleErrors = [];
page.on("console", (message) => {
	if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
		consoleErrors.push(message.text().slice(0, 200));
	}
});

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
	await page.goto(`${WEB}/#settings/clinic`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(5000);

	const text = await page.evaluate(() => document.body.innerText || "");
	check("граница ошибок не показана", !text.includes("Раздел временно не открылся"));
	check(
		"в консоли нет падения отрисовки",
		!consoleErrors.some((line) => /Cannot read propert|is not a function/.test(line)),
		consoleErrors.slice(0, 2).join(" | "),
	);

	// Настоящие элементы вкладки «Клиника».
	check("виден выбор режима клиники", text.includes("Отдельный врач") && text.includes("Малая клиника"));
	check("видны поля профиля клиники", text.includes("Название клиники") && text.includes("Телефон"));
	check("видно рабочее время смены", text.includes("Начало смены") && text.includes("Конец смены"));
	check("видна готовность режима", /ГОТОВНОСТЬ РЕЖИМА|Готовность режима/i.test(text));

	// Список сотрудников с расписанием — именно на нём падала отрисовка.
	const staffRows = await page.locator(".staff-row").count();
	check("список сотрудников отрисован", staffRows > 0, `строк ${staffRows}`);

	// Кнопка выдачи доступов вызывала несуществующую функцию.
	const credentialButtons = await page
		.locator("button", { hasText: /Управление доступом|Выдать доступ/ })
		.count();
	check("кнопка доступов сотрудника на экране", credentialButtons > 0, `кнопок ${credentialButtons}`);
	if (credentialButtons > 0) {
		await page
			.locator("button", { hasText: /Управление доступом|Выдать доступ/ })
			.first()
			.click();
		await page.waitForTimeout(800);
		const opened = await page.evaluate(() => (document.body.innerText || "").includes("Сохранить доступы"));
		check("форма доступов раскрывается", opened);
		check(
			"раскрытие формы не роняет отрисовку",
			!(await page.evaluate(() => (document.body.innerText || "").includes("Раздел временно не открылся"))),
		);
	}
} finally {
	await browser.close().catch(() => {});
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nитог: ${checks.length - failed.length} из ${checks.length}`);
for (const c of failed) console.log("  провал:", c.name);
if (failed.length > 0) process.exit(1);
