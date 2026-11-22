import { chromium } from "playwright";
import fs from "node:fs";

async function run() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	const page = await context.newPage();
	page.on("response", (res) => {
		if (res.status() >= 400 || res.url().includes("icon") || res.url().includes("main")) {
			console.log(`[HTTP ${res.status()}]: ${res.url()}`);
		}
	});
	page.on("requestfailed", (r) => console.log(`[REQ FAILED]: ${r.url()} ${r.failure()?.errorText}`));

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "commit" });
	await page.waitForTimeout(4000);

	await browser.close();
}

run().catch(console.error);
