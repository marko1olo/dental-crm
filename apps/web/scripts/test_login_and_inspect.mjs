import { chromium } from "playwright";

async function run() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (msg) => console.log("[BROWSER CONSOLE]:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

	console.log("Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
	console.log("Waiting for auth-modal or form...");
	await page.waitForSelector("form, .auth-modal, .auth-view-content", { timeout: 30000 });
	console.log("Auth modal appeared!");
	await page.waitForTimeout(1000);

	console.log("Waiting for submit button...");
	const loginBtn = page.locator("button:has-text('Войти в систему')");
	if (await loginBtn.count() > 0 && await loginBtn.first().isVisible()) {
		console.log("Clicking 'Войти в систему'...");
		await loginBtn.first().click();
		await page.waitForTimeout(3000);
	}

	console.log("Checking visible elements after login...");
	const buttons = await page.locator("button").allInnerTexts();
	console.log("Visible buttons:", buttons.filter(Boolean).slice(0, 25));

	const headings = await page.locator("h1, h2, h3, h4").allInnerTexts();
	console.log("Visible headings:", headings.filter(Boolean).slice(0, 15));

	await browser.close();
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
