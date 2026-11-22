import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\2225d95d-5fb9-403d-b98a-84768cb68fa8";
const docsDir = path.join(process.cwd(), "docs/proofs/inventory");

if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

async function saveScreenshots(page, baseName) {
	const p1 = path.join(brainDir, `${baseName}.png`);
	const p2 = path.join(docsDir, `${baseName}.png`);
	await page.screenshot({ path: p1, fullPage: false });
	fs.copyFileSync(p1, p2);
	const size = fs.statSync(p2).size;
	console.log(`[SAVED] ${baseName}.png (${size} bytes)`);
}

async function run() {
	const browser = await chromium.launch({ channel: "chrome", headless: true });
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		colorScheme: "light",
	});
	const page = await context.newPage();

	// Загружаем страницу один раз
	console.log("Navigating to http://127.0.0.1:5173/?demo=true#inventory...");
	await page.goto("http://127.0.0.1:5173/?demo=true#inventory", { waitUntil: "commit", timeout: 20000 });
	await page.waitForTimeout(2000);
	await page.waitForSelector("main.boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
	await page.waitForTimeout(1500);

	// 3. Mobile Light (390x844)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.documentElement.classList.add("light");
	});
	await page.waitForTimeout(1000);
	await saveScreenshots(page, "03_inventory_stock_mobile_light_390x844");
	await saveScreenshots(page, "inventory_mobile_light_390x844");
	await saveScreenshots(page, "inventory_mobile_light");
	console.log("Captured Mobile Light 390x844");

	// 4. Mobile Dark (390x844)
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.remove("light");
		document.documentElement.classList.add("dark");
	});
	await page.waitForTimeout(1000);
	await saveScreenshots(page, "04_inventory_stock_mobile_dark_390x844");
	await saveScreenshots(page, "inventory_mobile_dark_390x844");
	await saveScreenshots(page, "inventory_mobile_dark");
	console.log("Captured Mobile Dark 390x844");

	await browser.close();
	console.log("\n[SUCCESS] Mobile Proofs Captured Successfully!");
}

run().catch((err) => {
	console.error("[ERROR]", err);
	process.exit(1);
});
