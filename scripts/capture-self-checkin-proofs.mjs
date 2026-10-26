import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve("docs/proofs/self_checkin");

fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function saveProof(page, fileName) {
	const filePath = path.join(PROOFS_DIR, fileName);
	await page.screenshot({ path: filePath, fullPage: false });

	const stats = fs.statSync(filePath);
	console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
	if (stats.size < 20480) {
		throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
	}
	return filePath;
}

async function main() {
	const possibleBrowserPaths = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

	console.log("Using browser executable:", browserPath);
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		console.log("\n--- SELF-CHECKIN TERMINAL 4-STATE VISUAL PROOFS ---");
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();

		console.log("Navigating to live kiosk self check-in page...");
		await page.goto(`${WEB_BASE}/#/portal/kiosk`, {
			waitUntil: "commit",
			timeout: 20000,
		});

		await page.waitForFunction(() => {
			const text = document.body ? document.body.innerText : "";
			return !text.includes("Загрузка системы...");
		}, { timeout: 30000 }).catch(() => {});

		await page.waitForSelector(".selfcheckin-modal-window", { state: "visible", timeout: 15000 });
		await page.waitForTimeout(1000);

		// 1. PC Light (1440x900)
		console.log("Capturing 01_self_checkin_pc_light.png...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(600);
		await saveProof(page, "01_self_checkin_pc_light.png");

		// 2. PC Dark (1440x900)
		console.log("Capturing 02_self_checkin_pc_dark.png...");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(600);
		await saveProof(page, "02_self_checkin_pc_dark.png");

		// 3. Mobile Light (390x844)
		console.log("Capturing 03_self_checkin_mobile_light.png...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(600);
		await saveProof(page, "03_self_checkin_mobile_light.png");

		// 4. Mobile Dark (390x844)
		console.log("Capturing 04_self_checkin_mobile_dark.png...");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(600);
		await saveProof(page, "04_self_checkin_mobile_dark.png");

		await context.close();
		console.log("\n>>> ALL 4 SELF-CHECKIN PROOFS SUCCESSFULLY CAPTURED! <<<");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE FAILED:", err);
	process.exit(1);
});
