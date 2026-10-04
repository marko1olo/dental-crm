import { chromium } from "playwright";

async function diagnose() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	console.log("Current URL:", page.url());

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

	console.log("After demo login URL:", page.url());

	// Переключаем hash
	await page.evaluate(() => {
		window.location.hash = "settings";
	});
	await page.waitForTimeout(2000);
	console.log("After #settings URL:", page.url());

	const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
	console.log("Body preview:\n", bodyText);

	await page.screenshot({ path: "scripts/diagnostic_settings.png" });
	console.log("Saved scripts/diagnostic_settings.png");

	await browser.close();
}

diagnose().catch(console.error);
