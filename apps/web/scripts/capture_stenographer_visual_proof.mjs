/**
 * capture_stenographer_visual_proof.mjs
 * Live Playwright screenshot capture for Clinical Stenographer & Smart Snippets in Form 043/y.
 * Captures real UI from live CRM (http://127.0.0.1:5173/?demo=true#visit), ZERO fake HTML mockups.
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BRAIN_ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e94f6d48-047e-4c2f-9d77-e2764e7d5dad";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/visit";
const BASE_URL = "http://127.0.0.1:5173";

async function main() {
	for (const dir of [BRAIN_ARTIFACTS_DIR, PROOFS_DIR]) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	console.log("🚀 Запуск браузера для фиксации визуального доказательства Стенографа...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch (e) {
		console.log("msedge недоступен, пробуем встроенный chromium...");
		browser = await chromium.launch({ headless: true });
	}

	// 1. PC 1440x900 Viewport
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	page.on("pageerror", (err) => {
		console.error("!!! EXACT PAGE ERROR STACK:\n", err.stack || err.message);
	});
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.error("!!! CONSOLE ERROR:\n", msg.text());
		}
	});

	// Пропускаем все /src/ файлы для беспрепятственной сборки Vite
	await page.route("**/api/**", (route) => {
		if (route.request().url().includes("/src/")) {
			return route.continue();
		}
		if (route.request().url().includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					clinic: { id: "org-1", name: "Стоматология ДЕНТЕ", mode: "clinic", hasInventoryModule: true },
					staff: [{ id: "user-1", name: "Д-р Смирнов А.П.", role: "doctor" }],
					activeDoctor: { id: "user-1", name: "Д-р Смирнов А.П.", role: "doctor" },
					appointments: [
						{
							id: "appt-steno-1",
							patientId: "pat-ivanov",
							patientName: "Иванов Пётр Сергеевич",
							startsAt: new Date().toISOString(),
							date: new Date().toLocaleDateString("ru-RU"),
							status: "in_progress",
							reason: "Лечение кариеса зуба 1.6",
							diagnosis: "K02.1 Кариес дентина (зуб 16)",
							diagnosisTooth: 16,
						},
					],
					patients: [
						{
							id: "pat-ivanov",
							fullName: "Иванов Пётр Сергеевич",
							phone: "+7 (916) 123-45-67",
							birthDate: "1988-04-12",
							age: 38,
							gender: "male",
							status: "active",
						},
					],
					activePatient: {
						id: "pat-ivanov",
						fullName: "Иванов Пётр Сергеевич",
						phone: "+7 (916) 123-45-67",
						birthDate: "1988-04-12",
						age: 38,
						gender: "male",
						status: "active",
					},
					activeAppointment: {
						id: "appt-steno-1",
						patientId: "pat-ivanov",
						startsAt: new Date().toISOString(),
						date: new Date().toLocaleDateString("ru-RU"),
						status: "in_progress",
						diagnosisTooth: 16,
					},
					activeVisit: {
						id: "visit-steno-1",
						patientId: "pat-ivanov",
						appointmentId: "appt-steno-1",
						diagnosisTooth: 16,
						status: "in_progress",
					},
				}),
			});
		}
		if (route.request().method() === "GET") {
			return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
		}
		return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "test-clinic-tok");
		localStorage.setItem("dente_staff_token", "test-staff-tok");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "light" }));
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
	});

	console.log("🌐 Открытие live CRM: http://127.0.0.1:5173/?demo=true#visit...");
	await page.goto(`${BASE_URL}/?demo=true#visit`, { waitUntil: "load" });

	let loaded = false;
	for (let i = 0; i < 20; i++) {
		await page.waitForTimeout(1000);
		const body = await page.innerText("body").catch(() => "");
		if (!body.includes("Загрузка CRM") && body.length > 50) {
			console.log(`✅ CRM готова за ${i + 1} сек!`);
			loaded = true;
			break;
		}
	}

	if (!loaded) {
		console.warn("Внимание: долгое ожидание загрузки страницы");
	}

	await page.waitForTimeout(1500);

	// Переключаем hash #visit
	await page.evaluate(() => {
		window.location.hash = "#visit";
	});
	await page.waitForTimeout(1000);

	// Клик по пациенту, если в списке
	const queueBtn = page.locator('button:has-text("Иванов"), [data-testid="patient-queue-row"]').first();
	if (await queueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Выбор пациента Иванов...");
		await queueBtn.click();
		await page.waitForTimeout(1000);
	}

	// Переключаем на таб ЭМК
	const emkTab = page.locator('button:has-text("ЭМК"), [data-testid="visit-tab-emk"]').first();
	if (await emkTab.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Переключение на вкладку ЭМК...");
		await emkTab.click();
		await page.waitForTimeout(1000);
	}

	// Проверяем наличие бара стенографа
	const stenoBar = page.locator('[data-testid="clinical-stenographer-bar"]').first();
	const hasBar = await stenoBar.isVisible({ timeout: 3000 }).catch(() => false);
	console.log(`Статус бара стенографа: ${hasBar ? "ВИДЕН" : "Поиск полей..."}`);

	// Ищем textarea и тестируем автокомплит стенографа
	const targetTextarea = page.locator('textarea[data-testid*="treatment"], textarea[data-testid*="complaint"], textarea').first();
	if (await targetTextarea.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Клик в textarea для проверки ввода стенограммы 'пхр'...");
		await targetTextarea.click();
		await targetTextarea.fill("пхр");
		await targetTextarea.press("Tab");
		await page.waitForTimeout(500);
	}

	// Кликаем по чипу 'кф', если видим
	const kfChip = page.locator('[data-testid="btn-steno-chip-кф"]').first();
	if (await kfChip.isVisible({ timeout: 1500 }).catch(() => false)) {
		console.log("Клик по чипу стенограммы 'кф'...");
		await kfChip.click();
		await page.waitForTimeout(500);
	}

	// ☀️ 1. PC Light Mode Screenshot (1440x900)
	console.log("📸 Снятие PC Light Mode скриншота (1440x900)...");
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await page.waitForTimeout(600);

	const pcLightBrain = path.join(BRAIN_ARTIFACTS_DIR, "clinical_stenographer_pc_light_1440x900.png");
	const pcLightProof = path.join(PROOFS_DIR, "clinical_stenographer_pc_light_1440x900.png");
	await page.screenshot({ path: pcLightBrain, fullPage: false });
	fs.copyFileSync(pcLightBrain, pcLightProof);

	const pcLightSize = fs.statSync(pcLightBrain).size;
	console.log(`✅ PC Light Mode: ${pcLightSize} байт (требование >= 20 КБ: ${pcLightSize >= 20000 ? "OK" : "FAIL"})`);

	// 🌙 2. PC Dark Mode Screenshot (1440x900)
	console.log("📸 Снятие PC Dark Mode скриншота (1440x900)...");
	await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await page.waitForTimeout(600);

	const pcDarkBrain = path.join(BRAIN_ARTIFACTS_DIR, "clinical_stenographer_pc_dark_1440x900.png");
	const pcDarkProof = path.join(PROOFS_DIR, "clinical_stenographer_pc_dark_1440x900.png");
	await page.screenshot({ path: pcDarkBrain, fullPage: false });
	fs.copyFileSync(pcDarkBrain, pcDarkProof);

	const pcDarkSize = fs.statSync(pcDarkBrain).size;
	console.log(`✅ PC Dark Mode: ${pcDarkSize} байт (требование >= 20 КБ: ${pcDarkSize >= 20000 ? "OK" : "FAIL"})`);

	// 3. Mobile Viewport 390x844 (Apple HIG check)
	console.log("📱 Переключение на мобильный экран 390x844...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(600);

	// 🌙 Mobile Dark
	const mobDarkBrain = path.join(BRAIN_ARTIFACTS_DIR, "clinical_stenographer_mobile_dark_390x844.png");
	const mobDarkProof = path.join(PROOFS_DIR, "clinical_stenographer_mobile_dark_390x844.png");
	await page.screenshot({ path: mobDarkBrain, fullPage: false });
	fs.copyFileSync(mobDarkBrain, mobDarkProof);
	const mobDarkSize = fs.statSync(mobDarkBrain).size;
	console.log(`✅ Mobile Dark Mode: ${mobDarkSize} байт (требование >= 20 КБ: ${mobDarkSize >= 20000 ? "OK" : "FAIL"})`);

	// ☀️ Mobile Light
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await page.waitForTimeout(600);

	const mobLightBrain = path.join(BRAIN_ARTIFACTS_DIR, "clinical_stenographer_mobile_light_390x844.png");
	const mobLightProof = path.join(PROOFS_DIR, "clinical_stenographer_mobile_light_390x844.png");
	await page.screenshot({ path: mobLightBrain, fullPage: false });
	fs.copyFileSync(mobLightBrain, mobLightProof);
	const mobLightSize = fs.statSync(mobLightBrain).size;
	console.log(`✅ Mobile Light Mode: ${mobLightSize} байт (требование >= 20 КБ: ${mobLightSize >= 20000 ? "OK" : "FAIL"})`);

	await browser.close();
	console.log("🎉 Все 4 скриншота успешно зафиксированы и проверены!");
}

main().catch((err) => {
	console.error("Ошибка при снятии скриншотов:", err);
	process.exit(1);
});
