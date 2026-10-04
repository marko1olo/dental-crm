import { chromium } from "playwright";

async function testSettings() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Быстрый вход в Демо-тур
	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		console.log("Clicking quick demo button...");
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);
		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			console.log("Clicking enter role button...");
			await enterRoleBtn.click();
			await page.waitForTimeout(3000);
		}
	}

	// Переключаем роль на Главврач в демо-баре
	const chiefDoctorBtn = page.locator('button:has-text("Главврач")');
	if ((await chiefDoctorBtn.count()) > 0) {
		console.log("Switching role to Главврач...");
		await chiefDoctorBtn.click();
		await page.waitForTimeout(1500);
	}

	// Переключаем hash на #settings
	console.log("Setting hash to #settings/telegram...");
	await page.evaluate(() => {
		window.location.hash = "settings/telegram";
	});
	await page.waitForTimeout(2000);

	console.log("Current URL after hash:", page.url());

	// Кликаем по вкладке Telegram-бот если есть
	const tgTabBtn = page.locator('button:has-text("Telegram-бот")');
	if ((await tgTabBtn.count()) > 0) {
		console.log("Clicking Telegram-бот subtab...");
		await tgTabBtn.first().click();
		await page.waitForTimeout(1500);
	}

	const studioCount = await page.locator(".telegram-studio-root").count();
	console.log(".telegram-studio-root count:", studioCount);

	await page.screenshot({ path: "scripts/test_settings_result.png" });
	console.log("Saved scripts/test_settings_result.png");

	await browser.close();
}

testSettings().catch(console.error);
