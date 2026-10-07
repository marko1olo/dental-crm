import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const TARGET_DIR = path.resolve("docs/screenshots/omnichannel_master");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a3b47045-b11d-4653-8af4-e9981cee44dc");

if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const states = [
	{
		name: "omnichannel_master_pc_light.png",
		width: 1440,
		height: 900,
		theme: "light",
		isMobile: false,
	},
	{
		name: "omnichannel_master_pc_dark.png",
		width: 1440,
		height: 900,
		theme: "dark",
		isMobile: false,
	},
	{
		name: "omnichannel_master_mobile_light.png",
		width: 390,
		height: 844,
		theme: "light",
		isMobile: true,
	},
	{
		name: "omnichannel_master_mobile_dark.png",
		width: 390,
		height: 844,
		theme: "dark",
		isMobile: true,
	},
];

async function capture() {
	console.log("Launching browser for 4-state visual capture...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
		],
	});

	for (const state of states) {
		const context = await browser.newContext({
			viewport: { width: state.width, height: state.height },
			isMobile: state.isMobile,
			deviceScaleFactor: 2,
		});

		const page = await context.newPage();
		const url = `http://127.0.0.1:5173/messengers_master_preview.html?theme=${state.theme}`;
		console.log(`Navigating to ${url} (${state.name})...`);

		const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
		if (!res || res.status() !== 200) {
			throw new Error(`Failed to load ${url}: status = ${res?.status()}`);
		}

		// Ensure theme data attribute is applied
		await page.evaluate((t) => {
			document.documentElement.setAttribute("data-theme", t);
			if (t === "dark") {
				document.documentElement.classList.add("dark");
				document.documentElement.classList.remove("light");
			} else {
				document.documentElement.classList.add("light");
				document.documentElement.classList.remove("dark");
			}
		}, state.theme);

		// Wait for overview card and operator desk elements
		await page.waitForSelector("[data-testid='messengers-overview-card']", { timeout: 10000 });
		await page.waitForTimeout(1000); // Wait for animations & icons

		const outPathDocs = path.join(TARGET_DIR, state.name);
		const outPathBrain = path.join(BRAIN_DIR, state.name);

		await page.screenshot({ path: outPathDocs, fullPage: false });
		fs.copyFileSync(outPathDocs, outPathBrain);

		const stat = fs.statSync(outPathDocs);
		console.log(`Saved ${state.name} (${stat.size} bytes)`);

		await context.close();
	}

	await browser.close();
	console.log("ALL 4 VISUAL STATES CAPTURED SUCCESSFULLY!");
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
