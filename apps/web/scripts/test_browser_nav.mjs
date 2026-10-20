import { existsSync } from "node:fs";
import { chromium } from "playwright";

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

async function run() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
	});

	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	console.log("Navigating to 127.0.0.1:5173 with domcontentloaded...");
	await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
	await page.waitForTimeout(2000);

	console.log("Loaded title:", await page.title());
	console.log("Url:", page.url());

	const buttons = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim());
	});
	console.log("Found buttons:", buttons);

	// Try clicking demo or login button
	const clicked = await page.evaluate(() => {
		const btns = Array.from(document.querySelectorAll("button"));
		const target = btns.find((b) => {
			const txt = b.textContent?.trim() || "";
			return txt.includes("Демо") || txt.includes("Войти") || txt.includes("Вход");
		});
		if (target) {
			target.click();
			return target.textContent?.trim();
		}
		return null;
	});
	console.log("Clicked button:", clicked);

	await page.waitForTimeout(3000);

	const buttonsAfter = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim());
	});
	console.log("Buttons after click:", buttonsAfter.slice(0, 15));

	await browser.close();
}

run().catch(console.error);
