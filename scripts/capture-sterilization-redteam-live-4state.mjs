import { mkdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_CONV_ID = "670604ef-4e3d-4059-98a0-4bd9a905313e";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/proofs/sterilization";
const WEB_URL = "http://127.0.0.1:5173";

mkdirSync(OUT_CONV, { recursive: true });
mkdirSync(OUT_DOCS, { recursive: true });

async function initContextStorage(context, theme) {
	await context.addInitScript(({ themeMode }) => {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
		localStorage.setItem("dente_theme_mode", themeMode);
		localStorage.setItem("dente_theme", themeMode);
		localStorage.setItem("theme", themeMode);
	}, { themeMode: theme });
}

async function prepareAndClean(page, theme) {
	for (let i = 0; i < 30; i++) {
		const offlineBtn = page.locator('button:has-text("Перейти в автономный режим")');
		if (await offlineBtn.count() > 0 && await offlineBtn.isVisible()) {
			await offlineBtn.click({ force: true });
			await page.waitForTimeout(400);
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

	await page.waitForTimeout(500);
}

async function saveProof(page, baseName) {
	const filename = `${baseName}.png`;
	const p1 = path.join(OUT_DOCS, filename);
	const p2 = path.join(OUT_CONV, filename);
	await page.screenshot({ path: p1, fullPage: false });
	copyFileSync(p1, p2);

	const st = statSync(p1);
	if (st.size < 15000) {
		throw new Error(`Blank artifact error: ${filename} size is ${st.size} bytes (< 15KB)!`);
	}
	console.log(`[Screenshot] Saved: ${filename} (${(st.size / 1024).toFixed(1)} KB)`);
}

async function captureState(browser, stateName, theme, isMobile = false) {
	console.log(`\n--- Capturing ${stateName} (${theme}) ---`);
	const context = await browser.newContext(
		isMobile
			? {
					viewport: { width: 390, height: 844 },
					deviceScaleFactor: 2,
					isMobile: true,
					hasTouch: true,
					colorScheme: theme,
				}
			: {
					viewport: { width: 1440, height: 900 },
					deviceScaleFactor: 1,
					colorScheme: theme,
				}
	);
	await initContextStorage(context, theme);
	const page = await context.newPage();
	await page.goto(`${WEB_URL}/?demo=true#sanpin`, { waitUntil: "networkidle", timeout: 35000 });
	await prepareAndClean(page, theme);

	// Wait for SanPiN or autoclave tab
	await page.waitForSelector(".sanpin-container, .sanpin-journal-view, [data-testid='tab-autoclave-btn'], .sanpin-sterilization-journal", { timeout: 15000 }).catch(() => {});

	// Switch to autoclave tab if visible
	const autoclaveTab = page.locator('[data-testid="tab-autoclave-btn"]');
	if (await autoclaveTab.count() > 0 && await autoclaveTab.isVisible()) {
		await autoclaveTab.click({ force: true });
		await page.waitForTimeout(600);
	}

	await saveProof(page, stateName);
	await context.close();
}

async function run() {
	console.log("Launching Chromium for Sterilization 4-State Proofs...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
	}

	try {
		// 1. PC Light (1440x900)
		await captureState(browser, "sterilization_pc_light_1440x900", "light", false);

		// 2. PC Dark (1440x900)
		await captureState(browser, "sterilization_pc_dark_1440x900", "dark", false);

		// 3. Mobile Light (390x844)
		await captureState(browser, "sterilization_mobile_light_390x844", "light", true);

		// 4. Mobile Dark (390x844)
		await captureState(browser, "sterilization_mobile_dark_390x844", "dark", true);

		console.log("\n🎉 All 4 canonical 4-state sterilization proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Sterilization 4-state capture failed:", err);
	process.exit(1);
});
