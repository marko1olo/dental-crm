import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu"],
	});
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await ctx.newPage();
	page.on("console", (msg) => {
		if (msg.type() === "error") console.log("[BROWSER CONSOLE ERROR]:", msg.text());
	});
	page.on("pageerror", (err) => console.log("[BROWSER PAGE ERROR]:", err.message, "\nSTACK:\n", err.stack));

	await page.goto("http://127.0.0.1:5173/?demo=true&patient_modal=1#patient-card", { waitUntil: "commit" });
	await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { state: "attached", timeout: 30000 });
	await page.waitForTimeout(1000);

	console.log("Clicking Documents tab...");
	const docsTab = page.locator('[data-testid="tab-documents"], [data-tab="documents"], button:has-text("Документы")').first();
	await docsTab.click();
	await page.waitForTimeout(2000);
	await browser.close();
}

main().catch(console.error);
