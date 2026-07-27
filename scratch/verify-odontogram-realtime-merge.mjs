/**
 * Проверяет, что живое обновление одонтограммы ДОПОЛНЯЕТ формулу, а не
 * затирает её.
 *
 * Сервер рассылает результат .returning() по батчу, то есть только
 * изменённые зубы. Клиент делал setTeethData(payload.states) — полную
 * замену. После включения живых обновлений это означало бы: коллега
 * поставил диагноз одному зубу — у всех остальных открытых одонтограмм
 * формула схлопнулась до этого одного зуба.
 *
 * Здесь одна сессия держит карту открытой, а изменение приходит извне.
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
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const raw = await fetch(`${API}/api/patients`, { headers: H }).then((r) => r.json());
const list = Array.isArray(raw) ? raw : raw?.patients || [];
const patient = list[0];
console.log(`пациент: ${patient.fullName}\n`);

// Готовим исходную формулу: три зуба с диагнозами.
const SEED = [
	{ teeth: [11], state: "Caries" },
	{ teeth: [26], state: "Crown" },
	{ teeth: [36], state: "Filled" },
];
for (const s of SEED) {
	await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: s.teeth, state: s.state }),
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
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true }));
		},
		{ ct: login.clinicToken, st: unlock.staffToken },
	);
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.reload({ waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4500);
	await page
		.locator(`.patient-row[aria-label="Карточка пациента: ${patient.fullName}"]`)
		.first()
		.click({ timeout: 8000 });
	await page.waitForTimeout(3500);

	// Сколько зубов имеют непустое состояние — считаем по aria-label,
	// который содержит номер и состояние по-русски.
	// Состояние в aria-label пишется строчными («18, здоров»), поэтому
	// фильтр обязан быть регистронезависимым — на этом первая версия
	// проверки насчитала все 32 зуба и дала ложный сбой.
	const diagnosed = async () =>
		page.evaluate(() => {
			const teeth = [...document.querySelectorAll(".tooth-svg-wrapper")];
			return teeth
				.map((t) => (t.getAttribute("aria-label") || "").replace(/^Зуб /, ""))
				.filter((l) => l && !/здоров/i.test(l));
		});

	const before = await diagnosed();
	check(
		"исходно на формуле видно три диагноза",
		before.length >= 3,
		`${before.length}: ${before.join("; ")}`,
	);
	if (before.length < 3) throw new Error("исходная формула не отрисовалась, проверять нечего");

	// Изменение приходит ИЗВНЕ — как от коллеги за другим компьютером.
	const ext = await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: [46], state: "Pulpitis" }),
	});
	check("внешнее изменение зуба 46 принято", ext.ok, `HTTP ${ext.status}`);

	await page.waitForTimeout(3000);
	const after = await diagnosed();

	check(
		"новый диагноз появился без перезагрузки",
		after.some((l) => l.startsWith("46,")),
		`видно: ${after.join("; ")}`,
	);
	/* БЫЛО: `after.length >= before.length + 1`. Условие молча предполагало,
	   что у зуба 46 до этого диагноза не было, и тогда новый диагноз даёт +1 к
	   счётчику. Но 46 входит в базовый набор демо-данных как имплантат, и
	   стоит другому тесту оставить его диагностированным, как проверка падает
	   при полностью исправном коде: смена состояния 46 счётчик не меняет.
	   Считать надо не количество, а сохранность: все ранее диагностированные
	   зубы, кроме самого 46, обязаны остаться на формуле. */
	const beforeOther = before.filter((l) => !l.startsWith("46,"));
	const missing = beforeOther.filter((l) => !after.includes(l));
	check(
		"прежние диагнозы НЕ стёрты живым обновлением",
		missing.length === 0,
		missing.length
			? `исчезли: ${missing.join("; ")}`
			: `все ${beforeOther.length} прежних диагнозов на месте, всего на формуле ${after.length}`,
	);
	check("ошибок страницы нет", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | ") || "чисто");
} finally {
	// Возврат зубов в здоровое состояние.
	await fetch(`${API}/api/patients/${patient.id}/tooth-states/batch`, {
		method: "POST",
		headers: H,
		body: JSON.stringify({ toothNumbers: [11, 26, 36, 46], state: "Healthy" }),
	}).catch(() => {});
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
