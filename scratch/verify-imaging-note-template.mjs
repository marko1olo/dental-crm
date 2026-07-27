/**
 * Проверяет поле заметки к снимку и кнопку «Шаблон описания» на живом
 * экране, а не по исходнику.
 *
 * Заводит временный снимок (без него просмотрщик не открывается), открывает
 * его, жмёт кнопку шаблона и сверяет, что в заметку легла заготовка под тип
 * снимка с подставленным номером зуба. В конце снимок удаляется.
 *
 * БЫЛО на этом месте: кнопка с роботом и подсказкой «Сгенерировать с
 * помощью ИИ (заглушка)», единственным действием которой было дописать в
 * клиническую заметку строку « [AI AnalyzeCTReport]».
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import pg from "pg";
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

function envValue(key) {
	const line = readFileSync(".env", "utf8")
		.split(/\r?\n/)
		.find((l) => l.startsWith(`${key}=`));
	return line ? line.slice(key.length + 1).trim() : null;
}

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
const H = {
	"Content-Type": "application/json",
	"x-dente-clinic-token": login.clinicToken,
	"x-dente-staff-token": unlock.staffToken,
};

const dash = await req("/api/dashboard", { headers: H }).then((r) => r.json());
const patient = dash?.patients?.[0];
if (!patient) {
	console.error("нет пациентов");
	process.exit(1);
}

const created = await req("/api/imaging/studies", {
	method: "POST",
	headers: H,
	body: JSON.stringify({
		patientId: patient.id,
		kind: "periapical",
		title: "Проверка шаблона описания",
		toothCode: "36",
		sourceKind: "manual_upload",
		sourceName: "проверка",
	}),
});
const createdBody = await created.json().catch(() => ({}));
const studyId = createdBody?.study?.id ?? createdBody?.id ?? null;
console.log(`снимок заведён: HTTP ${created.status}, id ${studyId ?? "нет"}\n`);
if (!studyId) {
	console.error(`не удалось завести снимок: ${JSON.stringify(createdBody).slice(0, 200)}`);
	process.exit(1);
}

const client = new pg.Client({ connectionString: envValue("DATABASE_URL") });
await client.connect();

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

		console.log(`=== тема ${theme} ===`);
		const feedText = await page.evaluate(() => {
			const panel = document.querySelector(".imaging-panel");
			return (panel?.innerText || "").replace(/\s+/g, " ").slice(0, 260);
		});
		console.log(`  что на экране: ${feedText}`);

		// Открываем снимок: карточка в ленте.
		let opened = await page
			.getByText("Проверка шаблона описания", { exact: false })
			.first()
			.click({ timeout: 6000 })
			.then(() => true)
			.catch(() => false);
		if (!opened) {
			// Запасной путь: любая ссылка «Открыть» в ленте.
			opened = await page
				.locator(".imaging-panel a, .imaging-panel button")
				.filter({ hasText: /Открыть|Просмотр/i })
				.first()
				.click({ timeout: 6000 })
				.then(() => true)
				.catch(() => false);
		}
		await page.waitForTimeout(2500);
		check("снимок открылся в просмотрщике", opened, opened ? "" : "карточка снимка не найдена");

		const note = page.locator('textarea[aria-label="Заметка к снимку"]').first();
		check("поле заметки многострочное", (await note.count()) > 0, `найдено элементов: ${await note.count()}`);
		const oldInput = await page.locator('input[aria-label="Заметка к снимку"]').count();
		check("однострочного поля не осталось", oldInput === 0, `найдено: ${oldInput}`);

		const stub = await page.locator('button[title*="заглушка"]').count();
		check("кнопки-заглушки нет", stub === 0, `найдено: ${stub}`);

		const templateBtn = page.locator("button", { hasText: "Шаблон описания" }).first();
		check("кнопка «Шаблон описания» на экране", (await templateBtn.count()) > 0);

		if ((await templateBtn.count()) > 0 && (await note.count()) > 0) {
			await templateBtn.click();
			await page.waitForTimeout(600);
			const text = await note.inputValue();
			check("шаблон вставлен в заметку", text.trim().length > 0, `${text.split("\n").length} строк`);
			check("номер зуба подставлен из снимка", /Зуб:\s*36/.test(text), text.split("\n")[0] ?? "");
			check(
				"заготовка соответствует прицельному снимку",
				/Корневые каналы:/.test(text) && /Периапикальные ткани:/.test(text),
				text.replace(/\n/g, " | ").slice(0, 110),
			);
			// Повторное нажатие не должно затирать написанное.
			await note.fill("Пациент жалуется на боль");
			await templateBtn.click();
			await page.waitForTimeout(400);
			const merged = await note.inputValue();
			check("уже написанное не затирается", merged.startsWith("Пациент жалуется на боль"), merged.slice(0, 60).replace(/\n/g, " | "));

			const strip = page.locator(".viewer-session-strip").first();
			if ((await strip.count()) > 0) {
				await strip.scrollIntoViewIfNeeded().catch(() => null);
				await page.waitForTimeout(300);
				await strip.screenshot({ path: `${OUT}/note_${theme}.png` }).catch(() => null);
				console.log(`  снимок области заметки: ${OUT}/note_${theme}.png`);
			}
		}
		await context.close();
	}
} finally {
	await client.query(`delete from imaging_studies where id = $1`, [studyId]).catch(() => {});
	await client.end();
	await browser.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\nпроверок: ${checks.length}, успешно ${checks.length - failed.length}, сбоев ${failed.length}`);
process.exit(failed.length ? 1 : 0);
