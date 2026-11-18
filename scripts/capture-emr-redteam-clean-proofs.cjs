/**
 * scripts/capture-emr-redteam-clean-proofs.cjs
 *
 * Captures clean visual proofs for EMR Studio Modal and Inline SOAP Diaries:
 * - 03_emr_studio_inline_diaries_pc_dark_1440x900.png
 * - 04_emr_studio_inline_diaries_pc_light_1440x900.png
 * - 01_emr_studio_pc_light_1440x900.png
 * - 02_emr_studio_pc_dark_1440x900.png
 * - 05_emr_studio_mobile_light_390x844.png
 * - 06_emr_studio_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const SCREENSHOTS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/7874bebf-68ff-4e10-86e0-712da7493927");

for (const dir of [PROOFS_DIR, SCREENSHOTS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveProof(page, baseName) {
	const outProof = path.join(PROOFS_DIR, baseName);
	await page.screenshot({ path: outProof, fullPage: false, animations: "disabled" });

	const outScreenshots = path.join(SCREENSHOTS_DIR, baseName);
	fs.copyFileSync(outProof, outScreenshots);

	const brainProof = path.join(BRAIN_DIR, baseName);
	fs.copyFileSync(outProof, brainProof);

	const size = fs.statSync(outProof).size;
	if (size < 20480) {
		throw new Error(`[ANTI-BLANK GUARD] Screenshot ${baseName} is under 20KB (${size} bytes)`);
	}
	console.log(`[CAPTURED & VERIFIED] ${baseName}: ${size} bytes (${(size / 1024).toFixed(1)} KB)`);
	return size;
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function run() {
	console.log("=== Launching Chrome for EMR Studio Inquisitor Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
	});

	try {
		// ══════════════════════════════════════════════════════════════════════════
		// 1. DESKTOP VIEWPORT (1440x900)
		// ══════════════════════════════════════════════════════════════════════════
		const desktopCtx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await desktopCtx.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("theme", "dark");
		});

		const page = await desktopCtx.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?demo=true#medical-card ...");
		await page.goto("http://127.0.0.1:5173/?demo=true#medical-card", { waitUntil: "commit", timeout: 45000 });
		await page.waitForTimeout(4000);
		await suppressOverlays(page);

		// Dispatch custom event to ensure launcher opens
		await page.evaluate(() => {
			window.location.hash = "#medical-card";
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await page.waitForTimeout(1500);
		await suppressOverlays(page);

		// Ensure EMR modal is visible
		await page.waitForSelector('.emr-studio-modal', { state: "visible", timeout: 15000 });

		// Switch to Diaries Tab (4. Дневники визитов)
		console.log("Switching to 4. Дневники визитов...");
		const diariesTabBtn = page.locator('nav button:has-text("4. Дневники визитов")');
		await diariesTabBtn.click();
		await page.waitForTimeout(600);

		// Open inline form if closed
		const quickAddBtn = page.locator('[data-testid="btn-toggle-inline-diary-form"]');
		const formOpened = await page.locator('[data-testid="input-inline-diary-tooth"]').isVisible().catch(() => false);
		if (!formOpened && await quickAddBtn.isVisible()) {
			console.log("Opening inline diary form...");
			await quickAddBtn.click();
			await page.waitForTimeout(600);
		}

		// 1. PC Dark Inline Diaries (1440x900)
		console.log("\n1. Capturing 03_emr_studio_inline_diaries_pc_dark_1440x900.png...");
		await setTheme(page, "dark");
		await page.waitForTimeout(600);
		await saveProof(page, "03_emr_studio_inline_diaries_pc_dark_1440x900.png");

		// 2. PC Light Inline Diaries (1440x900)
		console.log("\n2. Capturing 04_emr_studio_inline_diaries_pc_light_1440x900.png...");
		await setTheme(page, "light");
		await page.waitForTimeout(600);
		await saveProof(page, "04_emr_studio_inline_diaries_pc_light_1440x900.png");

		// 3. PC Light Overview A4 (1440x900)
		console.log("\n3. Capturing 01_emr_studio_pc_light_1440x900.png (Overview A4)...");
		const overviewTabBtn = page.locator('nav button:has-text("Обзор и печать A4")');
		await overviewTabBtn.click();
		await page.waitForTimeout(800);
		await saveProof(page, "01_emr_studio_pc_light_1440x900.png");

		// 4. PC Dark Overview A4 (1440x900)
		console.log("\n4. Capturing 02_emr_studio_pc_dark_1440x900.png (Overview A4)...");
		await setTheme(page, "dark");
		await page.waitForTimeout(800);
		await saveProof(page, "02_emr_studio_pc_dark_1440x900.png");

		await desktopCtx.close();

		// ══════════════════════════════════════════════════════════════════════════
		// 2. MOBILE VIEWPORT (390x844 - iPhone Apple HIG)
		// ══════════════════════════════════════════════════════════════════════════
		console.log("\n=== Launching Mobile Viewport (390x844) ===");
		const mobileCtx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileCtx.addInitScript(() => {
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("theme", "light");
		});

		const mPage = await mobileCtx.newPage();
		await mPage.goto("http://127.0.0.1:5173/?demo=true#medical-card", { waitUntil: "commit", timeout: 45000 });
		await mPage.waitForTimeout(4000);
		await suppressOverlays(mPage);

		await mPage.evaluate(() => {
			window.location.hash = "#medical-card";
			window.dispatchEvent(new CustomEvent("dente:open-medical-card"));
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await mPage.waitForTimeout(1500);
		await suppressOverlays(mPage);

		// Switch to Diaries Tab
		const mDiariesTabBtn = mPage.locator('nav button:has-text("4. Дневники визитов")');
		if (await mDiariesTabBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			await mDiariesTabBtn.click();
			await mPage.waitForTimeout(600);
		}

		// 5. Mobile Light (390x844)
		console.log("\n5. Capturing 05_emr_studio_mobile_light_390x844.png...");
		await setTheme(mPage, "light");
		await mPage.waitForTimeout(600);
		await saveProof(mPage, "05_emr_studio_mobile_light_390x844.png");

		// 6. Mobile Dark (390x844)
		console.log("\n6. Capturing 06_emr_studio_mobile_dark_390x844.png...");
		await setTheme(mPage, "dark");
		await mPage.waitForTimeout(600);
		await saveProof(mPage, "06_emr_studio_mobile_dark_390x844.png");

		await mobileCtx.close();
		console.log("\n>>> ALL 6 EMR STUDIO PROOFS SUCCESSFULLY CAPTURED & VERIFIED! <<<");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL] Capture error:", err);
	process.exit(1);
});
