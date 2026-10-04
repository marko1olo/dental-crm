const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "inquisition_live");
if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

const BRAIN_DIR = path.resolve(
	"C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc"
);
if (!fs.existsSync(BRAIN_DIR)) {
	fs.mkdirSync(BRAIN_DIR, { recursive: true });
}

async function run() {
	console.log("[Playwright] Launching Chrome in iPhone 14 (390x844, scale 2, touch)...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	});

	// Pre-seed demo tokens
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({ completed: true, dismissed: true })
		);
	});

	const page = await context.newPage();

	// Use active port 5174
	const port = "5174";
	console.log(`[Playwright] Connecting to http://127.0.0.1:${port}/#documents...`);
	await page.goto(`http://127.0.0.1:${port}/#documents`, { waitUntil: "domcontentloaded", timeout: 15000 });
	console.log(`[Playwright] Connected to http://127.0.0.1:${port}`);

	// Check if we need to click demo tour
	try {
		const quickDemoBtn = page.locator('button:has-text("Быстрый вход в Демо-тур")').first();
		if (await quickDemoBtn.isVisible({ timeout: 2000 })) {
			console.log("[Playwright] Clicking quick demo entry...");
			await quickDemoBtn.click();
			const enterBtn = page.locator('button:has-text("Войти в демо-тур как Терапевт")').first();
			await enterBtn.waitFor({ state: "visible", timeout: 5000 });
			await enterBtn.click();
			await page.waitForTimeout(2000);
		}
	} catch (e) {
		console.log("[Playwright] Demo tour prompt already passed or auto-logged in.");
	}

	// Remove overlays
	await page.evaluate(() => {
		document
			.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
			)
			.forEach((el) => el.remove());
	});

	// Navigate to Documents view
	console.log("[Playwright] Navigating to Documents view...");
	await page.evaluate(() => {
		window.location.hash = "#documents";
	});
	await page.waitForTimeout(1500);

	// Try clicking Documents in MobileTabBar if drawer is needed
	const docHubSelector = '[data-testid="mobile-documents-hub"]';
	let isHubVisible = await page.isVisible(docHubSelector);

	if (!isHubVisible) {
		console.log("[Playwright] Hub not yet visible, clicking More -> Documents in TabBar...");
		const moreTab = page.locator('.mobile-tab-item:has-text("Ещё")').first();
		if (await moreTab.isVisible({ timeout: 3000 })) {
			await moreTab.click();
			await page.waitForTimeout(600);
			const docDrawerItem = page.locator('button:has-text("Документы и справки")').first();
			if (await docDrawerItem.isVisible({ timeout: 3000 })) {
				await docDrawerItem.click();
				await page.waitForTimeout(1500);
			}
		}
	}

	// Wait for mobile documents hub
	console.log("[Playwright] Waiting for mobile documents hub...");
	await page.waitForSelector(docHubSelector, { timeout: 15000 });
	console.log("[Playwright] Mobile Documents Hub is visible!");

	// Clean overlays once more
	await page.evaluate(() => {
		document
			.querySelectorAll(
				'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
			)
			.forEach((el) => el.remove());
	});

	// CAPTURE 1: LIGHT MODE
	console.log("[Playwright] Setting light mode...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
	});
	await page.waitForTimeout(600);

	const lightShotPath = path.join(OUT_DIR, "proof_mobile_documents_hub_light.png");
	await page.screenshot({ path: lightShotPath, fullPage: false });
	console.log(`[Playwright] Captured LIGHT proof: ${lightShotPath}`);

	// Copy to brain
	const brainLightPath = path.join(BRAIN_DIR, "proof_mobile_documents_hub_light.png");
	fs.copyFileSync(lightShotPath, brainLightPath);
	console.log(`[Playwright] Copied LIGHT proof to parent brain: ${brainLightPath}`);

	// CAPTURE 2: DARK MODE
	console.log("[Playwright] Setting dark mode...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme_mode", "dark");
	});
	await page.waitForTimeout(600);

	const darkShotPath = path.join(OUT_DIR, "proof_mobile_documents_hub_dark.png");
	await page.screenshot({ path: darkShotPath, fullPage: false });
	console.log(`[Playwright] Captured DARK proof: ${darkShotPath}`);

	// Copy to brain
	const brainDarkPath = path.join(BRAIN_DIR, "proof_mobile_documents_hub_dark.png");
	fs.copyFileSync(darkShotPath, brainDarkPath);
	console.log(`[Playwright] Copied DARK proof to parent brain: ${brainDarkPath}`);

	// Optional: Also test clicking on a document to capture the Bottom Sheet preview in Dark mode!
	const firstDocItem = page.locator('[data-testid^="mobile-doc-item-"]').first();
	if (await firstDocItem.isVisible({ timeout: 2000 })) {
		console.log("[Playwright] Tapping on first document to preview Bottom Sheet...");
		await firstDocItem.click();
		await page.waitForTimeout(800);
		const sheetSelector = '[data-testid="mobile-document-preview-sheet"]';
		if (await page.isVisible(sheetSelector)) {
			console.log("[Playwright] Bottom Sheet is visible!");
			const sheetDarkPath = path.join(OUT_DIR, "proof_mobile_documents_sheet_dark.png");
			await page.screenshot({ path: sheetDarkPath, fullPage: false });
			const brainSheetPath = path.join(BRAIN_DIR, "proof_mobile_documents_sheet_dark.png");
			fs.copyFileSync(sheetDarkPath, brainSheetPath);
			console.log(`[Playwright] Captured Bottom Sheet proof: ${sheetDarkPath}`);
		}
	}

	await browser.close();
	console.log("[Playwright] Screenshot capture finished successfully!");
}

run().catch((err) => {
	console.error("[Playwright] Execution failed:", err);
	process.exit(1);
});
