import { chromium } from "playwright";

async function run() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const page = await browser.newPage();
	await page.goto("http://127.0.0.1:5173/");
	await page.waitForTimeout(2000);

	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);
		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await page.waitForTimeout(2000);
		}
	}

	await page.evaluate(() => {
		window.location.hash = "communications";
	});
	await page.waitForTimeout(2000);

	const chatTab = page.getByRole("button", { name: /Чат клиники \/ Интерком/i });
	await chatTab.click({ force: true });
	await page.waitForTimeout(2000);

	const btns = await page.evaluate(() => {
		return Array.from(document.querySelectorAll('[data-testid^="staff-chat-channel-"]')).map((el) => ({
			testId: el.getAttribute("data-testid"),
			className: el.className,
			bg: window.getComputedStyle(el).backgroundColor,
			color: window.getComputedStyle(el).color,
			text: el.innerText.trim(),
		}));
	});

	console.log("Channels:", JSON.stringify(btns, null, 2));
	await browser.close();
}

run().catch(console.error);
