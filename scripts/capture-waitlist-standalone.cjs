/**
 * scripts/capture-waitlist-standalone.cjs
 * Captures the 4-State Visual Proofs for Schedule & Waitlist QuickFill:
 * 1. docs/proofs/schedule/01_schedule_waitlist_pc_light_1440x900.png
 * 2. docs/proofs/schedule/02_schedule_waitlist_pc_dark_1440x900.png
 * 3. docs/proofs/schedule/03_schedule_waitlist_mobile_light_390x844.png
 * 4. docs/proofs/schedule/04_schedule_waitlist_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const PROOF_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07b412a3-c2bc-4eff-83a8-d21b281f1917");

for (const d of [PROOF_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(600);
}

async function captureProof(page, filename, description) {
	const filepath = path.join(PROOF_DIR, filename);
	await page.waitForTimeout(400);

	await page.screenshot({ path: filepath, fullPage: false });

	const stats = fs.statSync(filepath);
	if (stats.size < 20000) {
		throw new Error(`[BLANK PROOF DETECTED] ${filename} is only ${stats.size} bytes (< 20KB)!`);
	}
	console.log(`[PROOF CAPTURED] ${filename} (${Math.round(stats.size / 1024)} KB) -> ${description}`);

	try {
		fs.copyFileSync(filepath, path.join(BRAIN_DIR, filename));
	} catch (e) {
		console.warn(`[WARN] Brain copy failed:`, e.message);
	}
	return filepath;
}

async function main() {
	console.log("=== CAPTURING 4-STATE WAITLIST STANDALONE VISUAL PROOFS ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const targetUrl = "http://127.0.0.1:5173/?waitlist-matches=true&slot=demo&drawer=true";

	// 1. PC CONTEXT (1440x900)
	console.log("\n--- Phase 1: PC Desktop (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const pcPage = await pcContext.newPage();
	await pcPage.goto(targetUrl, { waitUntil: "commit" });
	await pcPage.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 25000 });
	await pcPage.waitForTimeout(1000);

	// Proof 1: PC Light 1440x900
	await setTheme(pcPage, "light");
	await captureProof(pcPage, "01_schedule_waitlist_pc_light_1440x900.png", "☀️ PC Light (1440x900) Schedule + Waitlist QuickFill");

	// Proof 2: PC Dark 1440x900
	await setTheme(pcPage, "dark");
	await captureProof(pcPage, "02_schedule_waitlist_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Schedule + Waitlist QuickFill");

	await pcContext.close();

	// 2. MOBILE CONTEXT (390x844 iPhone 14 Pro Apple HIG)
	console.log("\n--- Phase 2: Mobile Apple HIG Bottom Sheet (390x844) ---");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	const mobilePage = await mobileContext.newPage();
	await mobilePage.goto(targetUrl, { waitUntil: "commit" });
	await mobilePage.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 25000 });
	await mobilePage.waitForTimeout(1000);

	// Proof 3: Mobile Light 390x844
	await setTheme(mobilePage, "light");
	await captureProof(mobilePage, "03_schedule_waitlist_mobile_light_390x844.png", "📱 Mobile Light (390x844) Apple HIG Bottom Sheet QuickFill");

	// Proof 4: Mobile Dark 390x844
	await setTheme(mobilePage, "dark");
	await captureProof(mobilePage, "04_schedule_waitlist_mobile_dark_390x844.png", "🌙 Mobile Dark (390x844) Apple HIG Bottom Sheet QuickFill");

	await mobileContext.close();
	await browser.close();

	console.log("\n=== ALL 4 WAITLIST PROOFS CAPTURED SUCCESSFULLY! ===");
}

main().catch((err) => {
	console.error("FATAL ERROR in capture-waitlist-standalone:", err);
	process.exit(1);
});