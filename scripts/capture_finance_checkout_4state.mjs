import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/finance");
if (!fs.existsSync(PROOF_DIR)) {
	fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function captureCheckout(browser) {
	console.log("--- Capturing Fast Checkout (4 states) ---");

	// 1. PC Light (1440x900)
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "light",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?checkout=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".fast-checkout-modal-overlay, [data-testid='split-payment-modal'], [data-testid='fast-checkout-modal']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "fast_checkout_pc_light_1440x900.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}

	// 2. PC Dark (1440x900)
	{
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: "dark",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?checkout=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".fast-checkout-modal-overlay, [data-testid='split-payment-modal'], [data-testid='fast-checkout-modal']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "fast_checkout_pc_dark_1440x900.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}

	// 3. Mobile Light (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?checkout=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".fast-checkout-modal-overlay, [data-testid='split-payment-modal'], [data-testid='fast-checkout-modal']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "fast_checkout_mobile_light_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}

	// 4. Mobile Dark (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?checkout=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".fast-checkout-modal-overlay, [data-testid='split-payment-modal'], [data-testid='fast-checkout-modal']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "fast_checkout_mobile_dark_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}
}

async function captureDoctorWallet(browser) {
	console.log("--- Capturing Doctor Payout Mobile Wallet ---");

	// 5. Mobile Wallet Light (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?wallet=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".doctor-wallet-container, [data-testid='doctor-wallet-standalone-workspace']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.body.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "doctor_payout_mobile_light_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}

	// 6. Mobile Wallet Dark (390x844)
	{
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		const page = await context.newPage();
		await page.goto("http://127.0.0.1:5173/?wallet=1", { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForSelector(".doctor-wallet-container, [data-testid='doctor-wallet-standalone-workspace']", { timeout: 15000 });
		await page.waitForTimeout(1500);
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.body.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
		});
		await page.waitForTimeout(500);
		const outPath = path.join(PROOF_DIR, "doctor_payout_mobile_dark_390x844.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log("Saved:", outPath);
		await context.close();
	}
}

async function main() {
	const browser = await chromium.launch({ headless: true, channel: "msedge" });
	try {
		await captureCheckout(browser);
		await captureDoctorWallet(browser);
		console.log("All screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Fatal capture error:", err);
	process.exit(1);
});
