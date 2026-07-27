/**
 * Проверяет, что при переключении пациента на зубной формуле не остаётся
 * формула предыдущего.
 *
 * Эффект загрузки в OdontogramModule зависит от patientId, но при смене
 * идентификатора не сбрасывает состояние и не отменяет предыдущий запрос:
 *   пока ответ по новому пациенту не пришёл, на экране висит формула
 *     прошлого — без признака загрузки;
 *   если ответ по прошлому пациенту придёт позже, он перетрёт формулу
 *     нового.
 * Врач видит чужие диагнозы на карточке текущего пациента и может
 * отметить лечение не на той формуле.
 *
 * Сценарий: пациенту А задаём три диагноза, пациенту Б — ни одного,
 * ответ по Б задерживаем на три секунды и смотрим, что показано.
 */
import { chromium } from "playwright";

const WEB = process.env.DENTE_WEB_URL || "http://127.0.0.1:5173";
const API = process.env.DENTE_API_URL || "http://127.0.0.1:4100";
const OWNER = "e44d32ca-7777-4c00-a001-c88f01b92e21";
const DELAY_MS = 3000;

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
const A = list[0];
const B = list[1];
if (!A || !B) {
	console.error("нужно минимум два пациента");
	process.exit(1);
}
console.log(`А: ${A.fullName}\nБ: ${B.fullName}\n`);

const SEED = [
	{ teeth: [11], state: "Caries" },
	{ teeth: [26], state: "Crown" },
	{ teeth: [36], state: "Filled" },
];
for (const s of SEED) {
	await fetch(`${API}/api/patients/${A.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: s.teeth, state: s.state }),
	});
}
// У Б формула чистая: любые диагнозы на его карточке — чужие.
for (const s of SEED) {
	await fetch(`${API}/api/patients/${B.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: s.teeth, state: "Healthy" }),
	});
}

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1000 }, locale: "ru-RU" })).newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));

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

	// Ответ по формуле Б приходит с задержкой — так гонка становится
	// наблюдаемой, а не зависящей от везения.
	await page.route(`**/api/patients/${B.id}/tooth-states**`, async (route) => {
		await new Promise((r) => setTimeout(r, DELAY_MS));
		await route.continue();
	});

	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4500);

	const diagnosed = async () =>
		page.evaluate(() => {
			const teeth = [...document.querySelectorAll(".tooth-svg-wrapper")];
			return teeth
				.map((t) => (t.getAttribute("aria-label") || "").replace(/^Зуб /, ""))
				.filter((l) => l && !/здоров/i.test(l));
		});

	/* Маркеры «только А».
	   В демо-данных у всех пациентов есть общий набор из пяти диагнозов
	   (17, 21, 24, 38, 46) — проверено запросом к API для трёх пациентов.
	   Поэтому «на формуле Б нет диагнозов» — негодное условие: у Б они свои
	   и законные. Судить можно только по зубам, диагнозы на которых есть у А
	   и заведомо отсутствуют у Б: 11, 26, 36 выставлены выше как Healthy
	   именно для этого. */
	const A_ONLY = [11, 26, 36];
	const aOnlyVisible = async () => {
		const labels = await diagnosed();
		return labels.filter((l) => A_ONLY.some((n) => l.startsWith(`${n},`)));
	};

	await page.locator(`.patient-row[aria-label="Карточка пациента: ${A.fullName}"]`).first().click({ timeout: 8000 });
	await page.waitForTimeout(3500);
	const onA = await diagnosed();
	check("на формуле пациента А видны его диагнозы", onA.length >= 3, `${onA.length}: ${onA.join("; ")}`);
	if (onA.length < 3) throw new Error("формула А не отрисовалась, проверять нечего");

	// Переключаемся на Б и смотрим сразу, пока ответ по Б ещё в пути.
	await page.locator(`.patient-row[aria-label="Карточка пациента: ${B.fullName}"]`).first().click({ timeout: 8000 });
	await page.waitForTimeout(900);

	const during = await aOnlyVisible();
	const loadingShown = await page.evaluate(() => {
		const text = document.body.innerText || "";
		return /Загрузка формулы|Загрузка зубной|Загружаем формулу/i.test(text);
	});
	check(
		"пока формула Б грузится, диагнозы только-А не показываются",
		during.length === 0 || loadingShown,
		`видно чужих зубов: ${during.length}${during.length ? ` (${during.join("; ")})` : ""}, индикатор загрузки: ${loadingShown ? "есть" : "нет"}`,
	);

	// После прихода ответа зубы 11, 26, 36 у Б должны быть здоровы.
	await page.waitForTimeout(DELAY_MS + 1500);
	const afterB = await aOnlyVisible();
	check("после загрузки на формуле Б нет чужих диагнозов", afterB.length === 0, `видно чужих зубов: ${afterB.length} (${afterB.join("; ")})`);

	// Обратное переключение: формула А должна вернуться полностью.
	await page.locator(`.patient-row[aria-label="Карточка пациента: ${A.fullName}"]`).first().click({ timeout: 8000 });
	await page.waitForTimeout(3000);
	const backToA = await aOnlyVisible();
	check("вернувшись к А, снова видим его собственные диагнозы", backToA.length === A_ONLY.length, `${backToA.length} из ${A_ONLY.length}: ${backToA.join("; ")}`);

	check("в консоли браузера нет исключений", pageErrors.length === 0, pageErrors.join(" | ") || "чисто");
} finally {
	await browser.close();
	/* Возвращаем зубы-маркеры в здоровое состояние у обоих пациентов.
	   Без уборки соседние проверки формулы начинают падать не на дефекте, а
	   на остатках чужой фикстуры — именно так и произошло с проверкой живого
	   слияния. */
	for (const id of [A.id, B.id]) {
		await fetch(`${API}/api/patients/${id}/tooth-states/batch`, {
			method: "POST",
			headers: H,
			body: JSON.stringify({ toothNumbers: [11, 26, 36], state: "Healthy" }),
		}).catch(() => {});
	}
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
