import { chromium } from "playwright";
import path from "node:path";
import { stat, copyFile } from "node:fs/promises";

async function prepareAndClean(page, theme) {
	for (let i = 0; i < 40; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if (await offlineBtn.count() > 0 && await offlineBtn.isVisible()) {
			await offlineBtn.click({ force: true });
			await page.waitForTimeout(600);
		}

		const hasLoading = await page.evaluate(() => {
			const text = document.body ? document.body.innerText : "";
			return text.includes("Загрузка системы") || text.includes("Загрузка CRM");
		}).catch(() => true);
		if (!hasLoading) break;
		await page.waitForTimeout(400);
	}

	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, .global-toast-container, [data-testid="demo-mode-banner"]'
		).forEach((el) => el.remove());
	}, theme);

	await page.waitForTimeout(600);
}

async function captureDrawer() {
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	}
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_active_role", "assistant");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
	});
	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/?demo=true#scanner", { waitUntil: "commit", timeout: 45000 });
	await page.waitForTimeout(2500);

	await prepareAndClean(page, "light");
	await page.waitForSelector(".sanpin-container", { state: "visible", timeout: 20000 });

	const autoclaveTab = page.locator('[data-testid="tab-autoclave-btn"]');
	if (await autoclaveTab.count() > 0) {
		await autoclaveTab.click({ force: true });
		await page.waitForTimeout(600);
	}

	// Click + Новый цикл
	const newCycleBtn = page.locator('[data-testid="start-cycle-btn"]');
	console.log("newCycleBtn count:", await newCycleBtn.count());
	if (await newCycleBtn.count() > 0) {
		await newCycleBtn.click({ force: true });
		await page.waitForTimeout(1000);
	}

	await page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 10000 }).catch(() => console.log("dialog not found"));

	const drawerPath = path.join("C:/Clinic_MVP/dental-crm/docs/proofs/sterilization", "02_pc_sterilization_modal_light_1440x900.png");
	const brainPath = path.join("C:/Users/Admin/.gemini/antigravity/brain/62f8efbc-41fc-4d54-95d5-c00f4c48d7b4", "02_pc_sterilization_modal_light_1440x900.png");
	await page.screenshot({ path: drawerPath, fullPage: false });
	await copyFile(drawerPath, brainPath).catch(() => {});

	// Switch to dark mode for modal
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.documentElement.classList.remove("light");
	});
	await page.waitForTimeout(600);

	const drawerDarkPath = path.join("C:/Clinic_MVP/dental-crm/docs/proofs/sterilization", "04_pc_sterilization_modal_dark_1440x900.png");
	const brainDarkPath = path.join("C:/Users/Admin/.gemini/antigravity/brain/62f8efbc-41fc-4d54-95d5-c00f4c48d7b4", "04_pc_sterilization_modal_dark_1440x900.png");
	await page.screenshot({ path: drawerDarkPath, fullPage: false });
	await copyFile(drawerDarkPath, brainDarkPath).catch(() => {});

	const st = await stat(drawerPath);
	const stDark = await stat(drawerDarkPath);
	console.log(`Saved drawer light proof (${(st.size / 1024).toFixed(1)} KB) and dark proof (${(stDark.size / 1024).toFixed(1)} KB)`);
	await browser.close();
}

captureDrawer().catch(console.error);
