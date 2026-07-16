import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

async function run() {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	// Set viewport to a typical desktop size
	await page.setViewport({ width: 1440, height: 900 });

	const routes = [
		{ name: "schedule", path: "/schedule" },
		{ name: "patients", path: "/patients" },
		{ name: "finance", path: "/finance" },
		{ name: "settings", path: "/settings" },
		{ name: "imaging", path: "/imaging" },
	];

	const outDir =
		"C:/Users/Admin/.gemini/antigravity/brain/19527560-fbad-4059-97a2-76c3b38db9cc/scratch";

	for (const r of routes) {
		console.log(`Navigating to ${r.path}...`);
		try {
			await page.goto(`http://localhost:5173${r.path}`, {
				waitUntil: "networkidle0",
				timeout: 15000,
			});
			await new Promise((r) => setTimeout(r, 1000)); // give it a moment to render
			const screenshotPath = path.join(outDir, `screenshot_${r.name}.png`);
			await page.screenshot({ path: screenshotPath, fullPage: true });
			console.log(`Saved ${screenshotPath}`);
		} catch (e) {
			console.log(`Error on ${r.path}:`, e.message);
		}
	}

	await browser.close();
}

run();
