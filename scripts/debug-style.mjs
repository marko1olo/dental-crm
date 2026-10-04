import { chromium } from "playwright";

async function run() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	await page.goto("http://127.0.0.1:5175/", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if (await quickDemoBtn.count() > 0) {
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);
		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if (await enterRoleBtn.count() > 0) {
			await enterRoleBtn.click();
			await page.waitForTimeout(2000);
		}
	}

	await page.evaluate(() => {
		window.location.hash = "communications";
	});
	await page.waitForTimeout(1500);

	const chatTab = page.getByRole("button", { name: /Чат клиники \/ Интерком/i });
	await chatTab.click({ force: true });
	await page.waitForSelector('[data-testid="staff-messenger-panel"]', { timeout: 10000 });

	const buttons = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('button[data-testid^="staff-chat-channel-"]')).map(b => ({
			testId: b.getAttribute("data-testid"),
			text: b.textContent.trim(),
			className: b.className
		}));
	});
	console.log("CHANNELS FOUND:", JSON.stringify(buttons, null, 2));

	await browser.close();
}

run().catch(console.error);
