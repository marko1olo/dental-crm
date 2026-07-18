const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = process.argv[2] || __dirname;

const TARGET_URL = "http://localhost:5173/#schedule";

async function run() {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	// PC Size
	await page.setViewport({ width: 1280, height: 800 });

	console.log("Navigating to", TARGET_URL);
	await page.goto(TARGET_URL, { waitUntil: "networkidle0" });

	// Wait for the app to load
	await page.waitForSelector("body", { timeout: 10000 });
	await new Promise(r => setTimeout(r, 2000));
	
	// Create artifact directory if it doesn't exist
	if (!fs.existsSync(ARTIFACT_DIR)) {
		fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
	}

	console.log("Taking PC Light screenshot...");
	await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
	// Some apps use data-theme on html or body
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.classList.remove("dark");
	});
	await new Promise(r => setTimeout(r, ));
	await page.screenshot({ path: path.join(ARTIFACT_DIR, "pc_light.png"), fullPage: true });

	console.log("Taking PC Dark screenshot...");
	await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.classList.add("dark");
	});
	await new Promise(r => setTimeout(r, ));
	await page.screenshot({ path: path.join(ARTIFACT_DIR, "pc_dark.png"), fullPage: true });

	// Mobile Size
	await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

	console.log("Taking Mobile Dark screenshot...");
	await page.screenshot({ path: path.join(ARTIFACT_DIR, "mobile_dark.png"), fullPage: true });

	console.log("Taking Mobile Light screenshot...");
	await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.classList.remove("dark");
	});
	await new Promise(r => setTimeout(r, ));
	await page.screenshot({ path: path.join(ARTIFACT_DIR, "mobile_light.png"), fullPage: true });

	await browser.close();
	console.log("Done!");
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
