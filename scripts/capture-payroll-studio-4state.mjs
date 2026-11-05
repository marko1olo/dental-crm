/**
 * capture-payroll-studio-4state.mjs — Red Team 4-State Proof Capture for Doctor Payroll Studio
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.join(process.cwd(), "docs/proofs/payroll");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

function getExecutablePath() {
	for (const p of possibleBrowserPaths) {
		if (existsSync(p)) return p;
	}
	return undefined;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("[PAYROLL_PROOF] Launching browser for 4-State Capture...");
	const execPath = getExecutablePath();
	const browser = await chromium.launch({
		headless: true,
		executablePath: execPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	// --- 1. PC VIEWPORT (1440x900) ---
	console.log("[PAYROLL_PROOF] Capturing Desktop States (1440x900)...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const pcPage = await pcContext.newPage();

	// 1.1 PC Light
	await pcPage.goto("http://127.0.0.1:5173/?demo=true#payroll", { waitUntil: "networkidle", timeout: 30000 });
	await wait(2000);

	await pcPage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await wait(500);

	const pcLightPath = path.join(OUT_DIR, "01_pc_light_1440x900.png");
	await pcPage.screenshot({ path: pcLightPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${pcLightPath} (${statSync(pcLightPath).size} bytes)`);

	// 1.2 PC Dark
	await pcPage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await wait(800);

	const pcDarkPath = path.join(OUT_DIR, "02_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${pcDarkPath} (${statSync(pcDarkPath).size} bytes)`);

	await pcContext.close();

	// --- 2. MOBILE VIEWPORT (390x844 - Apple iPhone 14 / HIG) ---
	console.log("[PAYROLL_PROOF] Capturing Mobile States (390x844)...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	const mobilePage = await mobileContext.newPage();

	// 2.1 Mobile Light
	await mobilePage.goto("http://127.0.0.1:5173/?demo=true#payroll", { waitUntil: "networkidle", timeout: 30000 });
	await wait(2000);

	await mobilePage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await wait(500);

	const mobileLightPath = path.join(OUT_DIR, "03_mobile_light_390x844.png");
	await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${mobileLightPath} (${statSync(mobileLightPath).size} bytes)`);

	// 2.2 Mobile Dark
	await mobilePage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await wait(800);

	const mobileDarkPath = path.join(OUT_DIR, "04_mobile_dark_390x844.png");
	await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${mobileDarkPath} (${statSync(mobileDarkPath).size} bytes)`);

	await mobileContext.close();
	await browser.close();

	console.log("[PAYROLL_PROOF] 4-State Proof Capture Completed Successfully!");
}

run().catch((err) => {
	console.error("[PAYROLL_PROOF] Error:", err);
	process.exit(1);
});
