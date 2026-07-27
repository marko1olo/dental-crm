/**
 * Проверяет, что при неудачном сохранении зубная формула действительно
 * возвращается к прежнему состоянию.
 *
 * Подозрение по коду: снимок «до» делается как `[...prev]` — это
 * поверхностная копия. Сами объекты зубов остаются те же, а новое
 * состояние проставляется мутацией `item.state = state`. То есть снимок
 * «до» изменяется вместе с состоянием, и откат возвращает уже новое
 * значение. Пользователь видит сообщение «Изменения отменены», а на схеме
 * остаётся несохранённое состояние: формула расходится с базой, и
 * интерфейс об этом врёт.
 *
 * Сценарий: запрос сохранения принудительно заваливаем, меняем состояние
 * зуба через интерфейс и сверяем, что на схеме и что в базе.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const TOOTH = 11;

const checks = [];
function check(name, ok, detail) {
	checks.push({ name, ok });
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
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const raw = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];
const patient = list[0];
if (!patient) {
	console.error("нет пациентов");
	process.exit(1);
}

// Исходное состояние зуба — заведомо известное.
await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
	method: "POST",
	headers: H,
	body: JSON.stringify({ toothNumbers: [TOOTH], state: "Caries" }),
});

async function toothStateInDb() {
	const data = await fetch(`${API}/api/patients/${patient.id}/tooth-states`, { headers: H }).then((r) => r.json());
	const states = Array.isArray(data?.states) ? data.states : [];
	return states.find((s) => Number(s.toothNumber) === TOOTH)?.state ?? "нет записи";
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "ru-RU" })).newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 140)));

try {
	console.log(`пациент ${patient.fullName}, зуб ${TOOTH}, в базе «${await toothStateInDb()}»\n`);

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
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);
	await page.locator(`.patient-row[aria-label="Карточка пациента: ${patient.fullName}"]`).first().click({ timeout: 8000 });
	await page.waitForTimeout(3500);

	const labelOf = async (toothNumber) =>
		page.evaluate((n) => {
			const nodes = [...document.querySelectorAll(".tooth-svg-wrapper")];
			const found = nodes.find((el) => (el.getAttribute("aria-label") || "").startsWith(`Зуб ${n},`));
			return found ? (found.getAttribute("aria-label") || "").replace(/^Зуб /, "") : "не найден";
		}, toothNumber);

	const before = await labelOf(TOOTH);
	check("исходное состояние зуба видно на схеме", /кариес/i.test(before), `на схеме «${before}»`);
	if (!/кариес/i.test(before)) throw new Error("исходное состояние не отрисовалось, проверять нечего");

	// Сохранение обязано провалиться.
	await page.route("**/api/patients/*/tooth-states/batch", (route) =>
		route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "ProbeFailure" }) }),
	);

	// Меняем состояние через интерфейс: клик по зубу открывает меню состояний.
	await page.locator(`.tooth-svg-wrapper[aria-label^="Зуб ${TOOTH},"]`).first().click({ timeout: 8000 });
	await page.waitForTimeout(900);

	const menuOptions = await page.evaluate(() =>
		[...document.querySelectorAll("button")]
			.map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
			.filter((t) => /отсутств|коронк|имплант|пломб|здоров|наблюд|лечени/i.test(t))
			.slice(0, 12),
	);
	console.log(`  доступные состояния в меню: ${menuOptions.join(" | ") || "(меню не открылось)"}`);

	const targetOption = page
		.locator("button")
		.filter({ hasText: /^\s*(❌\s*)?Нет зуба\s*$|отсутству/i })
		.first();
	const optionCount = await targetOption.count();
	if (optionCount === 0) {
		check("в меню состояний есть пункт «нет зуба»", false, "пункт не найден, дальше проверять нечем");
	} else {
		await targetOption.click({ timeout: 8000 });
		await page.waitForTimeout(2500);

		const afterFailure = await labelOf(TOOTH);
		const dbState = await toothStateInDb();
		check("в базе состояние не изменилось", /caries/i.test(dbState), `в базе «${dbState}»`);
		check(
			"на схеме состояние вернулось к прежнему",
			/кариес/i.test(afterFailure),
			`на схеме «${afterFailure}», в базе «${dbState}»`,
		);
		const toastText = await page.evaluate(() => document.body.innerText.match(/Ошибка сохранения[^\n]*/)?.[0] ?? "");
		check("пользователю показано сообщение об ошибке", toastText.length > 0, toastText || "сообщения нет");
	}

	check("исключений на странице нет", pageErrors.length === 0, pageErrors.join(" | ") || "чисто");
} finally {
	await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: [TOOTH], state: "Healthy" }),
	}).catch(() => {});
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
