import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
console.log("Navigating...");
try {
	await page.goto("http://127.0.0.1:5173/#prices", { waitUntil: "commit", timeout: 15000 });
	console.log("URL:", page.url());
	await page.waitForTimeout(4000);
	const content = await page.content();
	console.log("Has boot-state:", content.includes("boot-state"));
	console.log("Has root:", content.includes('id="root"'));
	console.log("Modal count:", await page.locator('[data-testid="service-pricelist-studio-modal"]').count());
} catch (e) {
	console.error("Error:", e.message);
} finally {
	await browser.close();
}
