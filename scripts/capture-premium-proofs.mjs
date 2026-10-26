/**
 * scripts/capture-premium-proofs.mjs
 * 
 * Captures 4 canonical Red Team Visual Proofs of DENTE Live UI:
 * - 01_premium_pc_light.png (1440x900, Light)
 * - 02_premium_pc_dark.png (1440x900, Dark)
 * - 03_premium_mobile_light.png (390x844, Light Mobile)
 * - 04_premium_mobile_dark.png (390x844, Dark Mobile)
 */

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_URL = "http://127.0.0.1:5173/?demo=1";
const PROOF_DIR = path.join(process.cwd(), "docs/proofs/premium_design");

if (!existsSync(PROOF_DIR)) {
	mkdirSync(PROOF_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

const STATES = [
	{
		filename: "01_premium_pc_light.png",
		width: 1440,
		height: 900,
		theme: "light",
	},
	{
		filename: "02_premium_pc_dark.png",
		width: 1440,
		height: 900,
		theme: "dark",
	},
	{
		filename: "03_premium_mobile_light.png",
		width: 390,
		height: 844,
		theme: "light",
	},
	{
		filename: "04_premium_mobile_dark.png",
		width: 390,
		height: 844,
		theme: "dark",
	},
];

async function capture() {
	console.log("[SCREENSHOT] Launching browser...");
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
		console.log(`[SCREENSHOT] Using browser: ${browserExecutable}`);
	}

	const browser = await chromium.launch(launchOptions);
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log(`[SCREENSHOT] Navigating to ${APP_URL}...`);
	await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

	console.log("[SCREENSHOT] Waiting for live UI to mount...");
	await page.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 25000 });
	await page.waitForTimeout(2000);

	for (const state of STATES) {
		console.log(`[SCREENSHOT] Preparing ${state.filename} (${state.width}x${state.height}, ${state.theme})...`);
		await page.setViewportSize({ width: state.width, height: state.height });

		await page.evaluate((th) => {
			localStorage.setItem("dente_demo_showcase", "true");
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark" || th === "night" || th === "ocean" || th === "emerald" || th === "cyber_xray") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
		}, state.theme);

		await page.waitForTimeout(1500);

		const outPath = path.join(PROOF_DIR, state.filename);
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`[SCREENSHOT] Saved: ${outPath}`);
	}

	await browser.close();
	console.log("[SCREENSHOT] All 4 states successfully captured.");
}

capture().catch((err) => {
	console.error("[SCREENSHOT] Error during capture:", err);
	process.exit(1);
});
