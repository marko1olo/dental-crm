import { existsSync } from "node:fs";
import { chromium } from "playwright";

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

async function main() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
	});

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (msg) => {
		console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
	});

	page.on("requestfailed", (req) => {
		console.log(`[REQ FAILED]: ${req.url()} - ${req.failure()?.errorText}`);
	});

	page.on("response", (res) => {
		if (res.status() >= 400) {
			console.log(`[RES ${res.status()}]: ${res.url()}`);
		}
	});

	console.log("Navigating to http://127.0.0.1:5173...");
	await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(6000);

	const state = await page.evaluate(() => {
		return {
			text: document.body.innerText.slice(0, 300),
			localStorageKeys: Object.keys(localStorage),
		};
	});
	console.log("Page state:", state);

	await browser.close();
}

main().catch(console.error);
