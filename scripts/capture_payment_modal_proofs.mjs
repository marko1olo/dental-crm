import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
await mkdir(OUT_DIR, { recursive: true });

async function capture() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
		});
		const page = await context.newPage();
		const url = "http://127.0.0.1:5173/payment_modal_preview.html?theme=light";
		console.log(`Navigating to ${url}...`);
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
		await page.waitForTimeout(1000);

		// Ждем появления модалки оплаты
		await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 10000 });
		await page.waitForTimeout(500);

		// 1. Light Mode
		const lightPath = path.join(OUT_DIR, "proof_payment_buttons_styled_light.png");
		await page.screenshot({ path: lightPath, fullPage: false });
		console.log(`Saved screenshot: ${lightPath}`);

		// 2. Switch to Dark Mode dynamically
		console.log("Switching to dark theme...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.body.className = "theme-dark bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen";
		});
		await page.waitForTimeout(800);

		const darkPath = path.join(OUT_DIR, "proof_payment_buttons_styled_dark.png");
		await page.screenshot({ path: darkPath, fullPage: false });
		console.log(`Saved screenshot: ${darkPath}`);

		await context.close();
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture error:", err);
	process.exit(1);
});
