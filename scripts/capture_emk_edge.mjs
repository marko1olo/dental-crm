import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.resolve("docs/screenshots/inquisition_live");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const baseUrl = "http://127.0.0.1:5173";

async function run() {
	console.log("Launching Edge via Playwright (channel: msedge)...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});

	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-demo-clinic-token");
		localStorage.setItem("dente_staff_token", "live-demo-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true }));
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({
				state: {
					clinicName: "Стоматология ДЕНТЕ Премиум",
					currentDoctor: { id: "doc-1", fullName: "Д-р Воронов А. В.", role: "owner" },
					flags: { disableTour: true },
				},
			})
		);
	});

	const page = await context.newPage();

	console.log("Navigating to home page for demo entrance...");
	await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Быстрый вход в Демо-тур если требуется
	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		console.log("Clicking quick demo button...");
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);

		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await page.waitForTimeout(3000);
		}
	}

	// Переключаем hash на #visit
	console.log("Navigating to #visit...");
	await page.evaluate(() => {
		window.location.hash = "visit";
	});
	await page.waitForTimeout(2500);

	// Очищаем всплывающие подсказки и туры
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
		Array.from(document.querySelectorAll('div, section, aside')).forEach((el) => {
			if (el.textContent && (el.textContent.includes('ШАГ 1 ИЗ 4') || el.textContent.includes('Запись в расписании за 1 клик'))) {
				el.remove();
			}
		});
	});

	// Кликаем по вкладке ЭМК (043/у)
	const emkTab = page.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), button:has-text("Дневник"), [data-testid="visit-subtab-emk"]').first();
	if (await emkTab.isVisible()) {
		console.log("Clicking EMK (043/у) subtab...");
		await emkTab.click({ force: true });
		await page.waitForTimeout(1000);
	}

	// Ждем тулбар
	await page.waitForSelector('[data-testid="emk-unified-toolbar"]', { state: "visible", timeout: 15000 });
	console.log("EMK Unified Toolbar is visible on screen!");

	// 1. LIGHT THEME
	console.log("Applying Light theme...");
	await page.evaluate(() => {
		localStorage.setItem("dente_theme_mode", "light");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("light");
		}
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
		document.documentElement.style.colorScheme = "light";
	});
	await page.waitForTimeout(800);

	const lightShotPath = path.join(OUT_DIR, "proof_emk_toolbar_uncluttered_light.png");
	await page.screenshot({ path: lightShotPath });
	console.log(`[Captured] Light proof: ${lightShotPath}`);

	// 2. DARK THEME
	console.log("Applying Dark theme...");
	await page.evaluate(() => {
		localStorage.setItem("dente_theme_mode", "dark");
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode("dark");
		}
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
		document.documentElement.style.colorScheme = "dark";
	});
	await page.waitForTimeout(800);

	const darkShotPath = path.join(OUT_DIR, "proof_emk_toolbar_uncluttered_dark.png");
	await page.screenshot({ path: darkShotPath });
	console.log(`[Captured] Dark proof: ${darkShotPath}`);

	await browser.close();
	console.log("ALL PROOFS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("Execution error:", err);
	process.exit(1);
});
