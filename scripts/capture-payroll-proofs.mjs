/**
 * capture-payroll-proofs.mjs
 * 
 * Captures 4-state visual proofs of DoctorPayrollModal:
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.join(process.cwd(), "docs/proofs/payroll");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const VIEWPORTS = {
	pc: { width: 1440, height: 900, deviceScaleFactor: 1 },
	mobile: { width: 390, height: 844, deviceScaleFactor: 2 },
};

const THEMES = ["light", "dark"];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const browserExecutable = possibleBrowserPaths.find((p) => existsSync(p));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await wait(300);
}

async function run() {
	console.log("🚀 Starting Playwright capture using browser:", browserExecutable);

	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	});

	try {
		for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
			for (const theme of THEMES) {
				const filename = `${vpName}-${theme}.png`;
				const filepath = path.join(OUT_DIR, filename);
				console.log(`\n📸 Capturing ${filename} (${vp.width}x${vp.height}, theme=${theme})...`);

				const context = await browser.newContext({
					viewport: { width: vp.width, height: vp.height },
					deviceScaleFactor: vp.deviceScaleFactor,
					colorScheme: theme,
				});

				const page = await context.newPage();
				page.on("console", (msg) => console.log(`   [PAGE]: ${msg.text()}`));
				page.on("pageerror", (err) => console.log(`   [PAGE ERROR]: ${err.message}`));

				// Inject theme preference before navigation
				await page.addInitScript((th) => {
					localStorage.setItem("dente_theme_mode", th);
				}, theme);

				await page.goto("http://127.0.0.1:5173/?payroll=1", { waitUntil: "domcontentloaded" });
				await wait(1000);

				await applyTheme(page, theme);
				await wait(500);

				// Wait for modal to be visible
				await page.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 10000 });

				// Wait for animations and fonts to settle
				await wait(800);

				// Take screenshot
				await page.screenshot({
					path: filepath,
					fullPage: false,
				});

				const stat = statSync(filepath);
				console.log(`✅ Saved: ${filepath} (${(stat.size / 1024).toFixed(1)} KB)`);
				await context.close();
			}
		}
		console.log("\n🎉 All 4 screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("❌ Capture failed:", err);
	process.exit(1);
});
