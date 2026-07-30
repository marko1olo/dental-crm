/**
 * Снимает одонтограмму в 4 состояниях: мобильный/ПК × светлая/тёмная.
 *
 * ВАЖНО: никаких моков. scratch/capture_all_screens.cjs перехватывает **\/api\/**
 * и отдаёт выдуманный JSON — по таким снимкам нельзя судить, работает ли
 * приложение. Здесь настоящий вход (токены получены от живого /api/auth) и
 * настоящие данные из PostgreSQL.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import pg from "pg";

const API = "http://127.0.0.1:4100";
const WEB = "http://127.0.0.1:5173";
const OUT = "scratch/shots";
mkdirSync(OUT, { recursive: true });

const databaseUrl = readFileSync(".env", "utf8")
	.split(/\r?\n/)
	.find((l) => l.startsWith("DATABASE_URL="))
	.slice("DATABASE_URL=".length)
	.trim();

// 1. Настоящие токены через настоящий вход.
const clinicRes = await fetch(`${API}/api/auth/clinic/login`, {
	method: "POST",
	headers: { "content-type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const { clinicToken, clinicProfile } = await clinicRes.json();
const orgId = clinicProfile.organizationId;

const c = new pg.Client({ connectionString: databaseUrl });
await c.connect();
const staff = await c.query(
	`select id from users where organization_id = $1 and is_active = true
	   and pin_code_hash is not null order by full_name limit 1`,
	[orgId],
);
const patient = await c.query(
	`select id, full_name from patients where organization_id = $1
	 order by full_name limit 1`,
	[orgId],
);
await c.end();

let staffToken = null;
for (const pinCode of ["0000", "1234"]) {
	const res = await fetch(`${API}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		body: JSON.stringify({ userId: staff.rows[0].id, pinCode }),
	});
	if (res.ok) {
		staffToken = (await res.json()).staffToken;
		break;
	}
}
if (!staffToken) throw new Error("не удалось войти сотрудником");

// 2. Реальные состояния зубов, чтобы на снимке было что смотреть.
const save = (toothNumbers, state, surfaces) =>
	fetch(`${API}/api/patients/${patient.rows[0].id}/tooth-states/batch`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
			"x-dente-staff-token": staffToken,
		},
		body: JSON.stringify({ toothNumbers, state, ...(surfaces ? { surfaces } : {}) }),
	}).then((r) => `${state}:${r.status}`);

console.log("состояния зубов:", await Promise.all([
	save([36], "Caries", ["O", "M"]),
	save([11, 21], "Crown"),
	save([46], "Implant"),
	save([17], "Missing"),
	save([24], "Pulpitis", ["D"]),
]).then((x) => x.join(" ")));

const browser = await chromium.launch();
const states = [
	{ name: "pc-light", width: 1440, height: 900, theme: "light" },
	{ name: "pc-dark", width: 1440, height: 900, theme: "dark" },
	{ name: "mobile-light", width: 390, height: 844, theme: "light" },
	{ name: "mobile-dark", width: 390, height: 844, theme: "dark" },
];

for (const s of states) {
	const context = await browser.newContext({
		viewport: { width: s.width, height: s.height },
		deviceScaleFactor: 2,
	});
	const page = await context.newPage();
	const consoleErrors = [];
	page.on("console", (m) => {
		if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
	});

	await page.addInitScript(
		([clinic, staffTok, theme, patientId]) => {
			localStorage.setItem("dente_clinic_token", clinic);
			localStorage.setItem("dente_staff_token", staffTok);
			localStorage.setItem("dente_selected_patient_id", patientId);
			// Экран первого запуска перекрывает приложение целиком (App.tsx:2018).
			// Отмечаем его пройденным флагом, а не кликом по «Начать с чистого
			// листа» — та кнопка обещает пустую базу и снесла бы засеянные данные.
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true }),
			);
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") document.documentElement.classList.add("dark");
		},
		[clinicToken, staffToken, s.theme, patient.rows[0].id],
	);

	// networkidle недостижим: приложение держит открытый WebSocket, сеть никогда
	// не «затихает» и goto отваливался по таймауту.
	await page.goto(`${WEB}/#patients`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(6000);
	// Тема могла быть перезаписана логикой приложения при загрузке.
	await page.evaluate((theme) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, s.theme);
	await page.waitForTimeout(700);

	const chart = page.locator(".tooth-chart-container").first();
	const hasOdontogram = await chart.isVisible().catch(() => false);

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth,
	);

	if (hasOdontogram) {
		await chart.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);
		await chart.screenshot({ path: `${OUT}/chart-${s.name}.png` });
		// Переполнение внутри самой карты зубов: на узком экране дуга не должна
		// вылезать за контейнер.
		const chartOverflow = await chart.evaluate(
			(el) => el.scrollWidth - el.clientWidth,
		);
		console.log(
			`${s.name.padEnd(13)} карта снята, переполнение страницы ${overflow}px, внутри карты ${chartOverflow}px, ошибок ${consoleErrors.length}`,
		);
	} else {
		await page.screenshot({ path: `${OUT}/page-${s.name}.png`, fullPage: true });
		console.log(
			`${s.name.padEnd(13)} КАРТА НЕ НАЙДЕНА, снята вся страница, ошибок ${consoleErrors.length}`,
		);
	}
	for (const e of consoleErrors.slice(0, 3)) console.log(`    ${e}`);
	await context.close();
}
await browser.close();
console.log(`\nснимки в ${OUT}/`);
