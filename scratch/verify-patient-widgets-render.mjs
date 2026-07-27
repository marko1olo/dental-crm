/**
 * Проверяет, что все переведённые на usePatientResource виджеты карточки
 * пациента реально отрисовываются, переживают переключение пациента и не
 * дают ошибок в консоли. Typecheck такие поломки не ловит.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok, detail });
	console.log(`  ${ok ? "OK  " : "СБОЙ"} ${name}${detail ? " — " + detail : ""}`);
}

const login = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
}).then((r) => r.json());
const unlock = await fetch(`${API}/api/auth/staff/unlock`, {
	method: "POST",
	headers: { "Content-Type": "application/json", "x-dente-clinic-token": login.clinicToken },
	body: JSON.stringify({ userId: OWNER, pinCode: "0000" }),
}).then((r) => r.json());
const raw = await fetch(`${API}/api/patients`, {
	headers: { "x-dente-clinic-token": login.clinicToken, "x-dente-staff-token": unlock.staffToken },
}).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];
const [A, B] = list;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1100 }, locale: "ru-RU" })).newPage();

const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
page.on("console", (m) => {
	if (m.type() !== "error") return;
	const t = m.text();
	// Сетевые 404 демо-данных не относятся к правке.
	if (/Failed to load resource|favicon/i.test(t)) return;
	consoleErrors.push(t.slice(0, 200));
});

await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.evaluate(
	({ ct, st }) => {
		localStorage.setItem("dente_clinic_token", ct);
		localStorage.setItem("dente_staff_token", st);
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
	},
	{ ct: login.clinicToken, st: unlock.staffToken },
);
await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4500);

const selectPatient = async (p) =>
	page
		.locator(`.patient-row[aria-label="Карточка пациента: ${p.fullName}"]`)
		.first()
		.click({ timeout: 8000 });

const WIDGETS = [
	['[data-testid="patient-communication-timeline-widget"]', "история коммуникаций"],
	['[data-testid="patient-archive-blacklist-widget"]', "блокировка и чёрный список"],
	['[data-testid="patient-service-lineages-widget"]', "дерево обращений"],
];

try {
	await selectPatient(A);
	await page.waitForTimeout(3000);

	for (const [sel, name] of WIDGETS) {
		const n = await page.locator(sel).count();
		check(`виджет отрисован: ${name}`, n > 0, `найдено ${n}`);
	}

	// Кнопка блокировки не должна быть активна до загрузки статуса.
	const blacklistBtn = page.locator('[data-testid="patient-archive-blacklist-widget"] button').first();
	const btnText = (await blacklistBtn.count()) ? await blacklistBtn.innerText() : "<нет>";
	check(
		"кнопка ЧС показывает загруженный статус, а не заглушку",
		btnText.includes("черный список") || btnText.includes("черного списка"),
		`текст «${btnText.trim()}»`,
	);

	// Переключение туда-обратно — состояние не должно ломаться.
	await selectPatient(B);
	await page.waitForTimeout(2500);
	await selectPatient(A);
	await page.waitForTimeout(2500);

	for (const [sel, name] of WIDGETS) {
		const n = await page.locator(sel).count();
		check(`после двойного переключения жив: ${name}`, n > 0, `найдено ${n}`);
	}

	check("нет необработанных ошибок страницы", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | ") || "чисто");
	check("нет ошибок в консоли", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ") || "чисто");
} finally {
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
