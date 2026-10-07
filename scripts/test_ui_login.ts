import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	console.log("Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(1500);

	console.log("Clicking .auth-demo-btn (Быстрый вход в Демо-тур)...");
	await page.locator(".auth-demo-btn").click();
	await page.waitForTimeout(1500);

	console.log("Clicking role launch button in DemoTourSelector...");
	const launchBtn = page.locator(".auth-demo-tour-actions button.auth-submit-btn").first();
	await launchBtn.click();
	console.log("Clicked launch button, waiting 4s for CRM shell...");
	await page.waitForTimeout(4000);

	console.log("Current URL:", page.url());
	await page.screenshot({ path: "docs/screenshots/monolith_inquisition_proofs/demo_tour_launched.png" });
	console.log("Saved demo_tour_launched.png!");

	await browser.close();
}

main().catch(console.error);
