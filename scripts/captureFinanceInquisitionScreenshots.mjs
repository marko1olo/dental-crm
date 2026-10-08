import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve(process.cwd(), "screenshots");
if (!fs.existsSync(SCREENSHOT_DIR)) {
	fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
	console.log("Launching Microsoft Edge via Playwright...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await context.newPage();

		console.log("Navigating to http://localhost:5173/#finance...");
		await page.goto("http://localhost:5173/#finance", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);

		// Ensure patient or data is ready in localStorage if needed
		await page.evaluate(() => {
			window.location.hash = "#finance";
		});
		await page.waitForTimeout(800);

		// 1. Open Cashbox Modal (CashRegisterView)
		console.log("Opening CashRegisterView / Cashbox Modal...");
		const optionsBtn = await page.waitForSelector('[data-testid="finance-toolbar-options-btn"]', { timeout: 8000 }).catch(() => null);
		if (optionsBtn) {
			await optionsBtn.click();
			await page.waitForTimeout(300);
			const cashboxBtn = await page.waitForSelector('[data-testid="btn-finance-open-cashbox"]', { timeout: 5000 });
			await cashboxBtn.click();
		} else {
			console.log("Direct fallback search for cashbox modal trigger...");
		}

		await page.waitForSelector('[data-testid="modal-finance-cashbox"], .cashbox-view', { timeout: 8000 });
		await page.waitForTimeout(500);

		// Theme: Light for CashRegisterView
		console.log("Capturing CashRegisterView PC Light (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await page.waitForTimeout(400);
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "cash_register_pc_light.png"),
			fullPage: false,
		});
		console.log("Saved: screenshots/cash_register_pc_light.png");

		// Theme: Dark for CashRegisterView
		console.log("Capturing CashRegisterView PC Dark (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(400);
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "cash_register_pc_dark.png"),
			fullPage: false,
		});
		console.log("Saved: screenshots/cash_register_pc_dark.png");

		// 2. Open PaymentModal with Split & Deposit
		console.log("Triggering PaymentModal from CashboxView...");
		// Let's add an amount preset or set input so checkout has an amount
		const presetBtn = await page.$('.cashbox-view button:has-text("5 000 ₽"), .cashbox-view button:has-text("+5 000")');
		if (presetBtn) {
			await presetBtn.click();
			await page.waitForTimeout(300);
		}

		const openPaymentBtn = await page.waitForSelector('[data-testid="btn-open-payment-modal"]', { timeout: 5000 });
		await openPaymentBtn.click();
		await page.waitForTimeout(500);

		await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 8000 });
		await page.waitForTimeout(500);

		// Ensure split tab is active
		const splitTab = await page.$('[data-testid="tab-method-split"]');
		if (splitTab) {
			await splitTab.click();
			await page.waitForTimeout(300);
		}

		// Theme: Light for PaymentModal
		console.log("Capturing PaymentModal Split & Deposit PC Light (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		});
		await page.waitForTimeout(400);
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "payment_modal_split_deposit_pc_light.png"),
			fullPage: false,
		});
		console.log("Saved: screenshots/payment_modal_split_deposit_pc_light.png");

		// Theme: Dark for PaymentModal
		console.log("Capturing PaymentModal Split & Deposit PC Dark (1440x900)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(400);
		await page.screenshot({
			path: path.join(SCREENSHOT_DIR, "payment_modal_split_deposit_pc_dark.png"),
			fullPage: false,
		});
		console.log("Saved: screenshots/payment_modal_split_deposit_pc_dark.png");

		console.log("All 4 Edge Playwright screenshots successfully captured!");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Error during Edge screenshot capture:", err);
	process.exit(1);
});
