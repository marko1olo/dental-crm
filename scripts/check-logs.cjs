const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();

	page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
	page.on("pageerror", (err) => console.log("PAGE ERROR:", err.toString()));

	await page.setViewport({ width: 1440, height: 900 });

	try {
		console.log("Navigating to app...");
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2" });

		// wait a bit
		await new Promise((r) => setTimeout(r, 5000));
	} catch (err) {
		console.error("Error:", err);
	} finally {
		await browser.close();
	}
})();
