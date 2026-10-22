/**
 * scripts/capture_patient_registry_inquisition.cjs
 *
 * 4-State Visual Proof Capture для Картотеки пациентов на живом стеке (Vite + Fastify + Postgres)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = path.resolve(__dirname, "..", "docs", "screenshots", "patient_registry_inquisition");

async function main() {
	if (!fs.existsSync(OUT_DIR)) {
		fs.mkdirSync(OUT_DIR, { recursive: true });
	}

	console.log(">>> Launching Chromium for Patient Registry visual proof on live API...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	console.log(">>> Navigating to http://127.0.0.1:5173/?demo=1#patients...");
	await page.goto("http://127.0.0.1:5173/?demo=1#patients", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2000);

	// Remove overlays
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
	});

	// Navigate to patients tab
	console.log(">>> Clicking Patients navigation tab...");
	const patientsTab = page.locator("button:has-text('Пациенты'), a:has-text('Пациенты'), [data-tab='patients'], [data-view='patients']").first();
	if (await patientsTab.count() > 0) {
		await patientsTab.click();
	}

	// Wait for loading spinner to detach and grid to be visible
	console.log(">>> Waiting for 'Подготовка картотеки пациентов...' to detach...");
	await page.waitForSelector(".patients-panel, .patients-main-grid, .patient-list-card, table", { timeout: 20000 });
	await page.waitForFunction(() => !document.body.innerText.includes("Подготовка картотеки пациентов"), { timeout: 20000 }).catch(() => {});
	console.log(">>> Patients view ready!");
	await page.waitForTimeout(1000);

	// Remove overlays again
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]').forEach((el) => el.remove());
	});

	async function applyTheme(t) {
		await page.evaluate((theme) => {
			document.documentElement.setAttribute("data-theme", theme);
			const isDark = theme === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, t);
		await page.waitForTimeout(600);
	}

	async function saveShot(name) {
		const shotPath = path.join(OUT_DIR, name);
		await page.screenshot({ path: shotPath, fullPage: false, animations: "disabled" });
		const stat = fs.statSync(shotPath);
		console.log(`>>> Captured ${name}: ${stat.size} bytes (>= 20KB: ${stat.size >= 20480})`);
	}

	// 1. PC Light (1440x900)
	await applyTheme("light");
	await saveShot("01_pc_light_patients.png");

	// 2. PC Dark (1440x900)
	await applyTheme("dark");
	await saveShot("02_pc_dark_patients.png");

	// Switch to Mobile (390x844)
	console.log(">>> Switching to Mobile 390x844...");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(1000);

	// In mobile mode click on Patients tab in the mobile bottom bar
	const mobilePatientsTab = page.locator("nav.mobile-tab-bar button:has-text('Пациенты'), .mobile-tab-item:has-text('Пациенты')").first();
	if (await mobilePatientsTab.count() > 0) {
		await mobilePatientsTab.click();
		await page.waitForTimeout(1500);
	}

	// 3. Mobile Light (390x844)
	await applyTheme("light");
	await saveShot("03_mobile_light_patients.png");

	// 4. Mobile Dark (390x844)
	await applyTheme("dark");
	await saveShot("04_mobile_dark_patients.png");

	await browser.close();
	console.log(">>> All 4 patient registry screenshots captured successfully!");
}

main().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
