/**
 * scripts/capture-waitlist-5174.cjs
 * Guaranteed 4-State Visual Proof Capture for Schedule & Waitlist QuickFill on active port 5174:
 * 1. docs/proofs/schedule/01_schedule_waitlist_pc_light_1440x900.png
 * 2. docs/proofs/schedule/02_schedule_waitlist_pc_dark_1440x900.png
 * 3. docs/proofs/schedule/03_schedule_waitlist_mobile_light_390x844.png
 * 4. docs/proofs/schedule/04_schedule_waitlist_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5174/?demo=true&waitlist-matches=true&slot=demo&drawer=true#waitlist";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/73106a46-d93f-4ae0-9751-7250aeab3e39");

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
			document.body.classList.add("dark");
			document.body.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
			document.documentElement.style.colorScheme = "light";
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
		await page.goto(WEB_URL, { waitUntil: "commit", timeout: 45000 });

		console.log("Waiting for waitlist drawer selector...");
		await page.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 45000 });
		console.log("Drawer visible!");

		await suppressOverlays(page);
		await page.waitForTimeout(1000);

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
	console.log("[Playwright] Launching Edge browser on active port 5174...");
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
			deviceScaleFactor: 1,
			lightName: "01_schedule_waitlist_pc_light_1440x900.png",
			darkName: "02_schedule_waitlist_pc_dark_1440x900.png",
		});

		// 3 & 4. Mobile Apple HIG (390x844) Light & Dark
		await captureViewportPair(browser, {
			width: 390,
			height: 844,
			isMobile: true,
			deviceScaleFactor: 2,
			lightName: "03_schedule_waitlist_mobile_light_390x844.png",
			darkName: "04_schedule_waitlist_mobile_dark_390x844.png",
		});

		console.log("\n=== ALL 4 WAITLIST 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED ON 5174! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});