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
	console.log("Navigating to http://127.0.0.1:5173...");
	await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(3000);

	// 1. Click 'Быстрый вход в Демо-тур (Без пароля)'
	const demoTourBtn = page.locator("button:has-text('Быстрый вход в Демо-тур')").first();
	if (await demoTourBtn.count() > 0 && await demoTourBtn.isVisible()) {
		console.log("Clicking demo tour entry button...");
		await demoTourBtn.click();
		await page.waitForTimeout(1500);
	}

	// 2. Click 'Войти в демо-тур'
	const launchBtn = page.locator("button:has-text('Войти в демо-тур')").first();
	if (await launchBtn.count() > 0 && await launchBtn.isVisible()) {
		console.log("Clicking launch demo tour button...");
		await launchBtn.click();
		await page.waitForTimeout(5000);
	}

	console.log("URL after launch:", page.url());

	// Close copilot drawer if open
	await page.evaluate(() => {
		if (window.__denteCopilot && typeof window.__denteCopilot.close === "function") {
			window.__denteCopilot.close();
		}
		try {
			const appStore = window.useAppStore;
			if (appStore && typeof appStore.getState === "function") {
				appStore.getState().setCurrentView("visit");
			}
		} catch (_) {}
	});
	await page.waitForTimeout(2000);

	// Also click 'Приём' in nav if present
	const visitTab = page.locator("button:has-text('Приём'), [role='tab']:has-text('Приём'), a:has-text('Приём')").first();
	if (await visitTab.count() > 0 && await visitTab.isVisible()) {
		console.log("Clicking visit tab...");
		await visitTab.click();
		await page.waitForTimeout(3000);
	}

	const headers = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("h1, h2, h3, h4, .panel-heading")).map((el) => el.textContent?.trim()).filter(Boolean);
	});
	console.log("Headers on page:", headers);

	const buttons = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()).filter(Boolean);
	});
	console.log("Buttons on page:", buttons.slice(0, 25));

	await browser.close();
}

main().catch(console.error);
