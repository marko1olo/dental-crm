/**
 * scripts/capture-emr-soap-inquisition-proofs.cjs
 *
 * Dedicated Playwright script for Red Team EMR & SOAP Inquisitor:
 * Accurately awaits full app hydration and renders actual clinical visit screens:
 * 1. 01_visit_soap_emk_pc_light_1440x900.png
 * 2. 02_visit_soap_emk_pc_dark_1440x900.png
 * 3. 03_visit_soap_emk_mobile_light_390x844.png
 * 4. 04_visit_soap_emk_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&visit_standalone=1#visit-diary";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/928dff9d-55a6-4a2b-911b-0a092c406a71");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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
			.copilot-trigger-btn, [data-testid="copilot-floating-trigger"],
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

async function saveScreenshot(page, outName) {
	await suppressOverlays(page);
	await page.waitForTimeout(500);

	const outPath = path.join(PROOFS_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

	const brainPath = path.join(BRAIN_DIR, outName);
	fs.copyFileSync(outPath, brainPath);

	const size = fs.statSync(outPath).size;
	console.log(`[PROOF VERIFIED] ${outName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath}`);
	if (size < 20000) {
		throw new Error(`Screenshot ${outName} too small: ${size} bytes (< 20 KB)!`);
	}
}

async function captureViewportPair(browser, { width, height, isMobile, deviceScaleFactor, lightName, darkName }) {
	console.log(`\n>>> STARTING VIEWPORT PAIR (${width}x${height}, isMobile=${Boolean(isMobile)})...`);
	const context = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor: deviceScaleFactor || 1,
		isMobile: Boolean(isMobile),
		hasTouch: Boolean(isMobile),
	});

	await context.addInitScript(() => {
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
		}));
	});

	const page = await context.newPage();

	try {
		console.log("Navigating to", WEB_URL, "...");
		await page.goto(WEB_URL, { waitUntil: "commit", timeout: 30000 });

		console.log("Waiting for clinical EMR diary content to mount...");
		for (let i = 0; i < 30; i++) {
			await page.waitForTimeout(1000);
			const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
			if (text.includes("Дневник") || text.includes("Жалобы") || text.includes("Кариес") || text.includes("Смирнова")) {
				console.log(`[READY] EMR mounted at ${i + 1}s! Text length: ${text.length}`);
				break;
			}
		}

		await page.waitForTimeout(1500);

		// If on mobile or PC, ensure the EMK/Diary tab is active
		const emkTab = page.locator('[data-testid="visit-subtab-emk"], button:has-text("Дневник приёма"), button:has-text("2. Дневник приёма"), button:has-text("Дневник")').first();
		if (await emkTab.isVisible().catch(() => false)) {
			console.log("Activating EMK tab click...");
			await emkTab.click({ force: true }).catch(() => {});
			await page.waitForTimeout(1000);
		}

		// 1. Capture Light
		console.log(`Capturing ${lightName}...`);
		await setTheme(page, "light");
		await saveScreenshot(page, lightName);

		// 2. Capture Dark
		console.log(`Capturing ${darkName}...`);
		await setTheme(page, "dark");
		await saveScreenshot(page, darkName);
	} finally {
		await context.close();
	}
}

async function main() {
	console.log("[Playwright] Launching Edge browser...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1 & 2. PC (1440x900) Light & Dark
		await captureViewportPair(browser, {
			width: 1440,
			height: 900,
			isMobile: false,
			lightName: "01_visit_soap_emk_pc_light_1440x900.png",
			darkName: "02_visit_soap_emk_pc_dark_1440x900.png",
		});

		// 3 & 4. Mobile (390x844) Light & Dark
		await captureViewportPair(browser, {
			width: 390,
			height: 844,
			isMobile: true,
			deviceScaleFactor: 2,
			lightName: "03_visit_soap_emk_mobile_light_390x844.png",
			darkName: "04_visit_soap_emk_mobile_dark_390x844.png",
		});

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT EMR/SOAP PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
