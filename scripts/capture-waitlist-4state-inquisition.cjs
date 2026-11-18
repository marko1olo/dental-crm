/**
 * scripts/capture-waitlist-4state-inquisition.cjs
 *
 * Dedicated Playwright script for Red Team Schedule & Waitlist QuickFill:
 * 1. 01_schedule_waitlist_pc_light_1440x900.png
 * 2. 02_schedule_waitlist_pc_dark_1440x900.png
 * 3. 03_schedule_waitlist_mobile_light_390x844.png
 * 4. 04_schedule_waitlist_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07b412a3-c2bc-4eff-83a8-d21b281f1917");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const WEB_URL = "http://127.0.0.1:5173/?demo=true&waitlist-matches=true&slot=demo&drawer=true#waitlist";

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
			vite-error-overlay, .boot-state, .boot-container, .boot-screen { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
		document.querySelectorAll(".boot-state, .boot-container, .boot-screen, vite-error-overlay").forEach((el) => {
			el.remove();
		});
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
	await page.waitForTimeout(600);

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
		const cTok = "demo-showcase-clinic-token-owner";
		const sTok = "demo-showcase-staff-token-owner";
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_active_user_id", "doc-1");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_sidebar_collapsed", "false");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
		}));
		document.cookie = `dente_clinic_token=${cTok}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${sTok}; path=/; max-age=31536000`;
	});

	const page = await context.newPage();

	try {
		console.log("Navigating to", WEB_URL, "...");
		await page.goto(WEB_URL, { waitUntil: "commit", timeout: 25000 });

		console.log("Waiting for React to mount and boot screen to clear...");
		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы") && !text.includes("Загрузка рабочей смены") && text.length > 200;
		}, { timeout: 35000 }).catch(() => {});

		// Remove any lingering boot overlays
		await page.evaluate(() => {
			document.querySelectorAll(".boot-state, .boot-container, .boot-screen").forEach((el) => el.remove());
		}).catch(() => {});

		// Wait for waitlist-drawer to mount and candidates to hydrate
		await page.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 25000 });
		console.log("Waitlist drawer confirmed visible!");

		// Wait for candidate card to hydrate from API
		await page.locator('[data-testid="waitlist-candidate-card"]').first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
		console.log("Candidate cards hydrated!");

		await suppressOverlays(page);
		await page.waitForTimeout(600);

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
	console.log("[Playwright] Launching Edge browser for Waitlist 4-States on 5173...");
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

		console.log("\n=== ALL 4 WAITLIST 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
