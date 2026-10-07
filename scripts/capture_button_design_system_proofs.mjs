import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "docs/screenshots/button_standardization";

async function main() {
	if (!fs.existsSync(OUT_DIR)) {
		fs.mkdirSync(OUT_DIR, { recursive: true });
	}

	console.log("Launching Edge / Chromium...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem(
			"dente-staff-user",
			JSON.stringify({
				id: "demo-owner-user",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				email: "owner@dente-demo.ru",
				organizationId: "00000000-0000-0000-0000-000000000001",
				specialization: "Главврач / Владелец",
			}),
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			}),
		);
	});

	console.log("Navigating to http://127.0.0.1:5173/#settings...");
	await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "commit" });

	// Wait for splash screen to detach
	console.log("Waiting for loading splash to detach...");
	await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForTimeout(2000);

	// Wait for workspace topbar or control pill to be present
	console.log("Waiting for workspace topbar...");
	await page.waitForSelector('.dnt-clinic-control-pill, [data-testid="clinic-control-center-wrapper"], .dnt-topbar', { timeout: 20000 });
	console.log("Topbar detected!");
	await page.waitForTimeout(1500);

	// Switch role to Главврач if demo-role bar is visible
	const chiefDoctorBtn = page.locator('button:has-text("Главврач")');
	if ((await chiefDoctorBtn.count()) > 0) {
		console.log("Switching to Главврач role...");
		await chiefDoctorBtn.first().click();
		await page.waitForTimeout(1500);
	}

	// Dismiss any onboarding popups / overlays
	const dismissTourBtn = page.locator('button:has-text("Больше не показывать")');
	if ((await dismissTourBtn.count()) > 0) {
		console.log("Dismissing tour popup...");
		await dismissTourBtn.first().click();
		await page.waitForTimeout(500);
	}
	const dismissExpressTour = page.locator('button:has-text("Понятно, я сам")');
	if ((await dismissExpressTour.count()) > 0) {
		console.log("Dismissing express tour toast...");
		await dismissExpressTour.first().click();
		await page.waitForTimeout(500);
	}

	// Helper to set theme
	async function setTheme(theme) {
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			localStorage.setItem("dente_theme", t);
		}, theme);
		await page.waitForTimeout(600);
	}

	// -------------------------------------------------------------
	// SCENARIO 1: HEADER & CONTROL CENTER POPOVER
	// -------------------------------------------------------------
	console.log("Capturing Scenario 1: Header Control Center...");
	await setTheme("light");
	
	const clinicPill = page.locator('[data-testid="clinic-control-center-trigger"], .dnt-clinic-control-pill').first();
	if ((await clinicPill.count()) > 0) {
		console.log("Opening control center popover...");
		await clinicPill.click();
		await page.waitForTimeout(800);
		await page.waitForSelector(".dnt-control-center-popover", { timeout: 4000 }).catch(() => {});
	}

	await page.screenshot({
		path: path.join(OUT_DIR, "01_header_control_center_light.png"),
		fullPage: false,
	});
	console.log("Captured 01_header_control_center_light.png");

	// Switch to dark theme
	await setTheme("dark");
	await page.screenshot({
		path: path.join(OUT_DIR, "02_header_control_center_dark.png"),
		fullPage: false,
	});
	console.log("Captured 02_header_control_center_dark.png");

	// Close popover
	await page.keyboard.press("Escape");
	await page.waitForTimeout(400);

	// -------------------------------------------------------------
	// SCENARIO 2: SETTINGS VIEW (ROLE SWITCHER, SUBNAV, SPECIALTY BAR)
	// -------------------------------------------------------------
	console.log("Capturing Scenario 2: Settings View...");
	await setTheme("light");
	await page.evaluate(() => {
		window.location.hash = "settings";
	});
	console.log("Waiting for settings view...");
	await page.waitForSelector('[data-testid="settings-view"], .settings-role-strip-container', { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(1000);

	// Dismiss wizard modal if present
	const dismissWizard = page.locator('button:has-text("Скрыть")');
	if ((await dismissWizard.count()) > 0) {
		console.log("Dismissing setup wizard modal in settings...");
		await dismissWizard.first().click();
		await page.waitForTimeout(1000);
	}

	await page.screenshot({
		path: path.join(OUT_DIR, "03_settings_view_light.png"),
		fullPage: false,
	});
	console.log("Captured 03_settings_view_light.png");

	await setTheme("dark");
	await page.screenshot({
		path: path.join(OUT_DIR, "04_settings_view_dark.png"),
		fullPage: false,
	});
	console.log("Captured 04_settings_view_dark.png");

	// -------------------------------------------------------------
	// SCENARIO 3: COMMUNICATIONS VIEW (SUBNAV & TOP ACTIONS)
	// -------------------------------------------------------------
	console.log("Capturing Scenario 3: Communications View...");
	await setTheme("light");
	await page.evaluate(() => {
		window.location.hash = "communications";
	});
	await page.waitForSelector('[data-testid="communications-view"]', { timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(1500);

	await page.screenshot({
		path: path.join(OUT_DIR, "05_communications_view_light.png"),
		fullPage: false,
	});
	console.log("Captured 05_communications_view_light.png");

	await setTheme("dark");
	await page.screenshot({
		path: path.join(OUT_DIR, "06_communications_view_dark.png"),
		fullPage: false,
	});
	console.log("Captured 06_communications_view_dark.png");

	// -------------------------------------------------------------
	// SCENARIO 4: OMNICHANNEL OPERATOR DESK (FILTERS & CHIPS)
	// -------------------------------------------------------------
	console.log("Capturing Scenario 4: Omnichannel Operator Desk...");
	const botInboxTab = page.locator('[data-testid="communications-tab-bot-inbox"]');
	if ((await botInboxTab.count()) > 0) {
		await botInboxTab.click();
		await page.waitForTimeout(1500);
	}

	await setTheme("light");
	await page.screenshot({
		path: path.join(OUT_DIR, "07_omnichannel_desk_light.png"),
		fullPage: false,
	});
	console.log("Captured 07_omnichannel_desk_light.png");

	await setTheme("dark");
	await page.screenshot({
		path: path.join(OUT_DIR, "08_omnichannel_desk_dark.png"),
		fullPage: false,
	});
	console.log("Captured 08_omnichannel_desk_dark.png");

	await browser.close();
	console.log("All screenshots captured successfully.");
}

main().catch((err) => {
	console.error("Capture script failed:", err);
	process.exit(1);
});
