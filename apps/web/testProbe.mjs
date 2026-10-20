import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-token");
		localStorage.setItem("dente_staff_token", "demo-token");
		localStorage.setItem("dente_theme", "light");
	});

	const page = await context.newPage();
	await page.goto("http://127.0.0.1:5173/#finance", { waitUntil: "networkidle" });
	await page.waitForTimeout(4000);

	console.log("Current URL:", page.url());
	console.log("Page title:", await page.title());

	const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 800));
	console.log("Body preview:\n", bodyText);

	const tabs = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button")).map((b) => b.innerText).filter(Boolean).slice(0, 20);
	});
	console.log("Buttons:", tabs);

	await browser.close();
}

main().catch(console.error);
