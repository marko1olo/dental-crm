/**
 * scripts/capture-test-advancements-4state.mjs
 *
 * Выделенный генератор визуальных пруфов 4-State Proof для новой системы E2E тестов:
 * 1. Клинический приём у кресла и формула Wheeler (Clinical Master Journey)
 * 2. Кассовый сплит-чек и семейный баланс (Billing & Family Split)
 * 3. Склад материалов и мягкий овердрафт (Warehouse Soft Negative Stock)
 *
 * Сохраняет 12 скриншотов высокого разрешения в docs/proofs/test_system_advancements/
 * Проверяет байтовый порог каждого скриншота >= 20 КБ (Мандат 8d).
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/test_system_advancements");
if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";

console.log("[TEST ADVANCEMENTS 4-STATE CAPTURE] Starting capture session...");

const launchOptions = {
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
};

const browser = await chromium.launch(launchOptions);

const scenarios = [
	{
		id: "clinical_journey",
		hash: "#chairside-visit",
		name: "Клинический приём у кресла и одонтограмма Wheeler",
		prefixNum: 1,
		mobileStepSelector: '[data-testid="mobile-chairside-visit-workspace-step-exam"], button:has-text("Осмотр")',
	},
	{
		id: "billing_split",
		hash: "#checkout",
		name: "Кассовый чекаут и сплит-оплата",
		prefixNum: 5,
		mobileStepSelector: null,
	},
	{
		id: "warehouse_soft_negative",
		hash: "#warehouse",
		name: "Склад материалов и Soft Negative Stock",
		prefixNum: 9,
		mobileStepSelector: null,
	},
];

const viewports = [
	{
		name: "pc_light_1440x900",
		width: 1440,
		height: 900,
		theme: "light",
		isMobile: false,
	},
	{
		name: "pc_dark_1440x900",
		width: 1440,
		height: 900,
		theme: "dark",
		isMobile: false,
	},
	{
		name: "mobile_light_390x844",
		width: 390,
		height: 844,
		theme: "light",
		isMobile: true,
	},
	{
		name: "mobile_dark_390x844",
		width: 390,
		height: 844,
		theme: "dark",
		isMobile: true,
	},
];

let totalCaptured = 0;
const results = [];

try {
	for (const sc of scenarios) {
		console.log(`\n======================================================`);
		console.log(`[SCENARIO] ${sc.name} (${sc.hash})`);
		console.log(`======================================================`);

		for (let i = 0; i < viewports.length; i++) {
			const vp = viewports[i];
			const fileIndex = String(sc.prefixNum + i).padStart(2, "0");
			const fileName = `${fileIndex}_${sc.id}_${vp.name}.png`;
			const filePath = path.join(PROOFS_DIR, fileName);

			const context = await browser.newContext({
				viewport: { width: vp.width, height: vp.height },
				userAgent: vp.isMobile
					? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
					: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
				hasTouch: vp.isMobile,
				isMobile: vp.isMobile,
			});

			const page = await context.newPage();

			// Настройка авторизации и состояния
			await page.addInitScript(({ theme }) => {
				window.__denteClinicToken = "test-clinic-advancements";
				window.__denteStaffToken = "test-staff-advancements";
				window.__denteNavigationCount = 0;

				try {
					localStorage.setItem("dente_clinic_token", "test-clinic-advancements");
					localStorage.setItem("dente_staff_token", "test-staff-advancements");
					localStorage.setItem("dente_active_session_token", "test-session-advancements");
					localStorage.setItem("dente_user_role", "doctor");
					localStorage.setItem("dente_user_name", "Д-р Смирнов А. П.");
					localStorage.setItem("dente_onboarding_completed", "true");
					localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
					localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme }));
					localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
					localStorage.setItem("dente_theme", theme);
					localStorage.setItem("dente_theme_mode", theme);
					localStorage.setItem("dente_session_locked", "false");
				} catch {}
			}, { theme: vp.theme });

			await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
			await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});

			// Переключение на целевой раздел через hashchange
			await page.evaluate((targetHash) => {
				window.location.hash = targetHash.replace("#", "");
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			}, sc.hash);
			await page.waitForTimeout(600);

			// Применяем тему в DOM
			await page.evaluate(({ theme }) => {
				if (theme === "dark") {
					document.documentElement.classList.remove("light");
					document.documentElement.classList.add("dark");
					document.documentElement.setAttribute("data-theme", "dark");
				} else {
					document.documentElement.classList.remove("dark");
					document.documentElement.classList.add("light");
					document.documentElement.setAttribute("data-theme", "light");
				}
			}, { theme: vp.theme });

			// Дополнительная мобильная подгонка
			if (vp.isMobile && sc.mobileStepSelector) {
				const stepBtn = page.locator(sc.mobileStepSelector).first();
				if (await stepBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
					await stepBtn.dispatchEvent("click");
					await page.waitForTimeout(400);
				}
			}

			// Если это сплит-чек, переключаем на сплит-тендер
			if (sc.id === "billing_split") {
				try {
					const splitBtn = page.locator('[data-testid="btn-tender-split"]').first();
					if (await splitBtn.count() > 0) {
						await splitBtn.dispatchEvent("click");
						await page.waitForTimeout(300);
					}
					const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]').first();
					if (await split50Btn.count() > 0) {
						await split50Btn.dispatchEvent("click");
						await page.waitForTimeout(200);
					}
				} catch (e) {
					// safe fallback
				}
			}

			// Если это одонтограмма, переключаем вкладку
			if (sc.id === "clinical_journey" && !vp.isMobile) {
				try {
					const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]').first();
					if (await odontogramSubtab.count() > 0) {
						await odontogramSubtab.dispatchEvent("click");
						await page.waitForTimeout(400);
					}
				} catch (e) {
					// safe fallback
				}
			}

			await page.screenshot({ path: filePath, fullPage: false });

			const stat = fs.statSync(filePath);
			console.log(`[CAPTURED] ${fileName} (${(stat.size / 1024).toFixed(1)} KB) - ${stat.size >= 20480 ? "PASS" : "FAIL"}`);

			results.push({
				file: fileName,
				path: filePath,
				size: stat.size,
				pass: stat.size >= 20480,
			});

			totalCaptured++;
			await context.close();
		}
	}
} finally {
	await browser.close();
}

console.log(`\n======================================================`);
console.log(`[SUMMARY] Total screenshots captured: ${totalCaptured}`);
const allPassed = results.every((r) => r.pass);
console.log(`[BYTE GUARD] All >= 20KB: ${allPassed ? "YES (100% PASS)" : "NO"}`);
console.log(`======================================================\n`);

if (!allPassed) {
	process.exit(1);
}
