import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const ARTIFACT_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/3b9934ab-d1fa-45f2-896b-50e23eafb447");
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
	return { filename, sizeKb, hash };
}

async function main() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();

		await page.goto(`${APP_BASE}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForSelector('[data-testid="shift-view-desktop"]', { state: "visible", timeout: 20000 });
		await page.waitForSelector('[data-testid="shift-secondary-accordion"]', { state: "attached", timeout: 20000 });
		await wait(1500);

		// Scroll container down to reveal secondary accordion
		await page.evaluate(() => {
			const container = document.querySelector('.shift-view-scroll-container') || document.querySelector('main') || window;
			if (container.scrollTo) container.scrollTo(0, 400);
			else if (container.scrollTop !== undefined) container.scrollTop = 400;
		});
		await wait(800);

		// Light accordion
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await wait(500);
		await saveProof(page, "proof_doctor_shift_accordion_pc_light_1440x900.png");

		// Dark accordion
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await wait(500);
		await saveProof(page, "proof_doctor_shift_accordion_pc_dark_1440x900.png");

		await context.close();
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
