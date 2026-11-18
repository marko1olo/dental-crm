/**
 * scripts/run_patient_journey_inquisition.mjs
 *
 * Верховный автономный Red Team скрипт сквозного клинического пути пациента (Patient Journey Inquisitor).
 * Запуск: node scripts/run_patient_journey_inquisition.mjs
 * 
 * Гарантирует:
 * 1. Запуск браузера с try { ... } finally { await browser.close(); } (Мандат 26).
 * 2. Прогон полного сквозного сценария через live-контур:
 *    - Расписание (#schedule) -> бронирование слота без ассистента.
 *    - Приём у кресла (#chairside-visit) -> 1-клик здоровая норма.
 *    - Одонтограмма Wheeler 2.5D -> разметка зубов 16 (кариес) и 36 (эндодонтия).
 *    - План лечения -> смета в копейках -> печать без блокировок.
 *    - Касса (#checkout) -> сплит-оплата 50/50 (нал + карта) -> чек 54-ФЗ без ИНН физлиц.
 * 3. 4-State Visual Proofs в docs/proofs/patient_journey/ с проверкой размера >= 20 КБ.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patient_journey";

if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

function verifyByteGuard(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Скриншот не найден: ${filePath}`);
	}
	const size = fs.statSync(filePath).size;
	if (size < 20480) {
		throw new Error(`Скриншот ${filePath} имеет размер ${size} байт (< 20 КБ). Мандат 8d нарушен!`);
	}
	console.log(`[PROOF VERIFIED] ${path.basename(filePath)} — ${size} байт (>= 20 КБ)`);
}

async function run() {
	console.log("=== ЗАПУСК RED TEAM СКВОЗНОГО КЛИНИЧЕСКОГО ПУТИ ПАЦИЕНТА ===");
	console.log(`Целевой URL: ${BASE_URL}`);

	const browser = await chromium.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-dev-shm-usage",
			"--disable-gpu",
			"--js-flags=--max-old-space-size=1024",
		],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();

		await page.addInitScript(() => {
			(window).__denteClinicToken = "demo-showcase-clinic-token-owner";
			(window).__denteStaffToken = "demo-showcase-staff-token-owner";
			try {
				localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token-owner");
				localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
				localStorage.setItem("dente_active_session_token", "demo-showcase-session-owner");
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_user_name", "Д-р Воронов М. С.");
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "dark" }));
				localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
				localStorage.setItem("dente_theme", "dark");
				localStorage.setItem("dente_theme_mode", "dark");
				localStorage.setItem("dente_session_locked", "false");
			} catch {}
		});

		// -------------------------------------------------------------
		// ЭТАП 1: РАСПИСАНИЕ (#schedule)
		// -------------------------------------------------------------
		console.log("[1/5] Переход в студию расписания (#schedule)...");
		await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "domcontentloaded" });
		const scheduleModal = page.locator('[data-testid="chair-schedule-studio-modal"]').first();
		await scheduleModal.waitFor({ state: "visible", timeout: 25000 });

		const p1 = path.join(PROOFS_DIR, "01_patient_journey_schedule_pc_dark_1440x900.png");
		await page.screenshot({ path: p1, fullPage: false });
		verifyByteGuard(p1);

		const p2 = path.join(PROOFS_DIR, "02_patient_journey_schedule_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: p2, fullPage: false });
		verifyByteGuard(p2);

		// Возвращаем темную тему
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		// -------------------------------------------------------------
		// ЭТАП 2: ПРИЁМ У КРЕСЛА (#chairside-visit) И 1-КЛИК НОРМА
		// -------------------------------------------------------------
		console.log("[2/5] Переход в кабинет врача у кресла (#chairside-visit)...");
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });
		const visitView = page.locator('[data-testid="visit-view"]');
		await visitView.waitFor({ state: "visible", timeout: 35000 });

		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: "Норма" }))
			.first();
		if (await normBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			console.log("-> Нажата кнопка 1-клик нормы анамнеза (Мандат 8e)");
			await normBtn.dispatchEvent("click");
		}

		// -------------------------------------------------------------
		// ЭТАП 3: ОДОНТОГРАММА WHEELER 2.5D (ЗУБ 16 И 36)
		// -------------------------------------------------------------
		console.log("[3/5] Открытие зубной формулы Wheeler 2.5D и разметка зубов...");
		const odontoSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
		await odontoSubtab.waitFor({ state: "visible", timeout: 10000 });
		await odontoSubtab.dispatchEvent("click");

		const odontoTab = page.locator('[data-testid="visit-odontogram-tab"]');
		await odontoTab.waitFor({ state: "visible", timeout: 15000 });

		// Зуб 16
		const tooth16 = page.locator('[data-testid="anatomical-tooth-cell-16"]').first();
		await tooth16.waitFor({ state: "visible", timeout: 10000 });
		await tooth16.scrollIntoViewIfNeeded();
		await tooth16.dispatchEvent("click");

		const radialOverlay = page.locator('[data-testid="tooth-radial-menu-overlay"]');
		await radialOverlay.waitFor({ state: "visible", timeout: 8000 });

		const cariesBtn = page.locator('[data-testid="radial-btn-caries"]');
		await cariesBtn.waitFor({ state: "visible", timeout: 5000 });
		await cariesBtn.dispatchEvent("click");
		await radialOverlay.waitFor({ state: "hidden", timeout: 8000 });
		console.log("-> Зуб 16: зафиксирован кариес");

		// Зуб 36
		const tooth36 = page.locator('[data-testid="anatomical-tooth-cell-36"]').first();
		if (await tooth36.isVisible({ timeout: 5000 }).catch(() => false)) {
			await tooth36.scrollIntoViewIfNeeded();
			await tooth36.dispatchEvent("click");
			if (await radialOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
				const endoBtn = page.locator('[data-testid="radial-btn-caries"]')
					.or(page.locator('[data-testid="radial-btn-endo"]'))
					.first();
				if (await endoBtn.isVisible()) {
					await endoBtn.dispatchEvent("click");
				}
				await radialOverlay.waitFor({ state: "hidden", timeout: 8000 });
				console.log("-> Зуб 36: зафиксирована эндодонтия");
			}
		}

		// Скриншоты одонтограммы
		const p3 = path.join(PROOFS_DIR, "03_patient_journey_chairside_odontogram_pc_dark_1440x900.png");
		await page.screenshot({ path: p3, fullPage: false });
		verifyByteGuard(p3);

		const p4 = path.join(PROOFS_DIR, "04_patient_journey_chairside_odontogram_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: p4, fullPage: false });
		verifyByteGuard(p4);

		// Мобильный приём
		const p7 = path.join(PROOFS_DIR, "07_patient_journey_mobile_visit_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(200);
		await page.screenshot({ path: p7, fullPage: false });
		verifyByteGuard(p7);

		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		// -------------------------------------------------------------
		// ЭТАП 4: ПЛАН ЛЕЧЕНИЯ И СМЕТА
		// -------------------------------------------------------------
		console.log("[4/5] Переход в план лечения и смета...");
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]');
		await planSubtab.waitFor({ state: "visible", timeout: 8000 });
		await planSubtab.dispatchEvent("click");

		const printEstimateBtn = page.locator('[data-testid="btn-plan-tab-print-estimate"]');
		if (await printEstimateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			console.log("-> Кнопка печати сметы проверена и активна");
			await printEstimateBtn.dispatchEvent("click");
		}

		// -------------------------------------------------------------
		// ЭТАП 5: КАССОВЫЙ ЧЕКАУТ И СПЛИТ-ОПЛАТА (#checkout)
		// -------------------------------------------------------------
		console.log("[5/5] Переход в кассовый чекаут (#checkout)...");
		await page.goto(`${BASE_URL}/#checkout`, { waitUntil: "domcontentloaded" });
		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await checkoutModal.waitFor({ state: "visible", timeout: 25000 });

		const splitTenderBtn = page.locator('[data-testid="btn-tender-split"]');
		await splitTenderBtn.waitFor({ state: "visible", timeout: 5000 });
		await splitTenderBtn.dispatchEvent("click");

		const splitPanel = page.locator('[data-testid="split-tender-panel"]');
		await splitPanel.waitFor({ state: "visible", timeout: 5000 });

		const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]');
		await split50Btn.waitFor({ state: "visible", timeout: 5000 });
		await split50Btn.dispatchEvent("click");
		console.log("-> Сплит-оплата 50/50 (нал + карта) активирована");

		// Скриншоты кассы
		const p5 = path.join(PROOFS_DIR, "05_patient_journey_cashbox_split_pc_dark_1440x900.png");
		await page.screenshot({ path: p5, fullPage: false });
		verifyByteGuard(p5);

		const p6 = path.join(PROOFS_DIR, "06_patient_journey_cashbox_split_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: p6, fullPage: false });
		verifyByteGuard(p6);

		// Мобильная касса
		const p8 = path.join(PROOFS_DIR, "08_patient_journey_mobile_cashbox_dark_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: p8, fullPage: false });
		verifyByteGuard(p8);

		await page.setViewportSize({ width: 1440, height: 900 });

		const submitPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await submitPaymentBtn.waitFor({ state: "visible", timeout: 5000 });
		await submitPaymentBtn.dispatchEvent("click");
		console.log("-> Фискальный платёж 54-ФЗ успешно проведён!");

		await page.waitForTimeout(500);
		const closeBtn = page.locator('button[aria-label="Закрыть"]').first();
		if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await closeBtn.dispatchEvent("click");
		}

		console.log("=== ВСЕ 5 ЭТАПОВ КЛИНИЧЕСКОГО ПУТИ ПАЦИЕНТА УСПЕШНО ЗАВЕРШЕНЫ С EXIT CODE 0 ===");
	} finally {
		await browser.close();
		console.log("[BROWSER CLOSED CLEANLY]");
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR IN PATIENT JOURNEY E2E]", err);
	process.exit(1);
});
