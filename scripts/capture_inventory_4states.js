import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\39e032b9-dc9b-48d7-aa98-391c95cb1035";
const docsDir = path.join(process.cwd(), "docs/proofs/inventory");

if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });
if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

async function saveScreenshots(page, baseName) {
	const p1 = path.join(brainDir, `${baseName}.png`);
	const p2 = path.join(docsDir, `${baseName}.png`);
	await page.screenshot({ path: p1, fullPage: false });
	fs.copyFileSync(p1, p2);
}

async function run() {
	const browser = await chromium.launch({ channel: "chrome", headless: true });

	// 1. PC Light (1440x900)
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded" });
		await page.waitForSelector("main.boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await page.waitForTimeout(1000);
		await saveScreenshots(page, "inventory_pc_light_1440x900");
		await saveScreenshots(page, "inventory_pc_light");
		await context.close();
		console.log("Captured PC Light 1440x900");
	}

	// 2. PC Dark (1440x900)
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "dark",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded" });
		await page.waitForSelector("main.boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(1000);
		await saveScreenshots(page, "inventory_pc_dark_1440x900");
		await saveScreenshots(page, "inventory_pc_dark");
		await context.close();
		console.log("Captured PC Dark 1440x900");
	}

	// 3. Mobile Light (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded" });
		await page.waitForSelector("main.boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await page.waitForTimeout(1000);
		await saveScreenshots(page, "inventory_mobile_light_390x844");
		await saveScreenshots(page, "inventory_mobile_light");
		await context.close();
		console.log("Captured Mobile Light 390x844");
	}

	// 4. Mobile Dark (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded" });
		await page.waitForSelector("main.boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.waitForTimeout(2000);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(1000);
		await saveScreenshots(page, "inventory_mobile_dark_390x844");
		await saveScreenshots(page, "inventory_mobile_dark");
		await context.close();
		console.log("Captured Mobile Dark 390x844");
	}

	await browser.close();
	console.log("ALL 4 SCREENSHOTS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
