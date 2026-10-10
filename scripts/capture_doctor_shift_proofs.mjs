import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const ARTIFACT_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/1088bb18-60a1-4af0-aa1c-05a147921b8e");
const REPO_SCREENSHOTS_DIR = path.resolve("screenshots");
const DOCS_SCREENSHOTS_DIR = path.resolve("docs/screenshots");

const DIRS = [ARTIFACT_DIR, REPO_SCREENSHOTS_DIR, DOCS_SCREENSHOTS_DIR];
for (const dir of DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function saveProof(page, filename) {
	const buffer = await page.screenshot({ fullPage: false });
	const hash = crypto.createHash("md5").update(buffer).digest("hex");
	const sizeKb = Math.round(buffer.length / 1024);

	console.log(`[PROOF] Saving ${filename} (${sizeKb} KB, MD5: ${hash})`);
	for (const dir of DIRS) {
		const outPath = path.join(dir, filename);
		fs.writeFileSync(outPath, buffer);
	}
	return { filename, sizeKb, hash, path: path.join(ARTIFACT_DIR, filename) };
}

async function main() {
	console.log("=== INQUISITION: CAPTURING DOCTOR SHIFT COCKPIT PROOFS VIA EDGE PLAYWRIGHT ===");

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();

		page.on("console", (msg) => {
			if (msg.type() === "error" || msg.type() === "warn") {
				console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
			}
		});
		page.on("pageerror", (err) => console.error(`[PAGE UNCAUGHT ERROR]`, err));

		console.log(`Navigating to ${APP_BASE}/?demo=true#shift ...`);
		await page.goto(`${APP_BASE}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForSelector('[data-testid="shift-view-desktop"]', { state: "visible", timeout: 20000 });
		await page.waitForSelector('[data-testid="doctor-shift-control-bar"]', { state: "visible", timeout: 20000 });
		await wait(2000);

		console.log("Saving initial screenshot before any theme manipulation...");
		await saveProof(page, "initial_shift_view.png");

		// Toggle theme via UI button or HTML attribute
		// Let's check how the UI button does it:
		console.log("Looking for theme switcher button in sidebar...");
		const themeBtn = await page.$('button:has-text("Свет"), button:has-text("Тьма")');
		console.log(`Theme button found: ${themeBtn !== null}`);

		// Capture Light Theme
		console.log("Capturing LIGHT theme proof...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await wait(1000);
		await saveProof(page, "proof_doctor_shift_cockpit_pc_light_1440x900.png");

		// Capture Dark Theme
		console.log("Capturing DARK theme proof...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await wait(1000);
		await saveProof(page, "proof_doctor_shift_cockpit_pc_dark_1440x900.png");

		await context.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
