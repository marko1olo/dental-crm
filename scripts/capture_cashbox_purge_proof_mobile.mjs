import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const DIR1 = path.resolve(process.cwd(), "docs/screenshots/inquisition_live");
const DIR2 = path.resolve(process.cwd(), "docs/proofs/finance");
fs.mkdirSync(DIR1, { recursive: true });
fs.mkdirSync(DIR2, { recursive: true });

async function suppressOverlays(page) {
	await page.evaluate(() => {
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]',
		).forEach((el) => el.remove());
	});
}

async function saveProof(page, filename) {
	const p1 = path.join(DIR1, filename);
	const p2 = path.join(DIR2, filename);
	await page.screenshot({ path: p1, fullPage: false });
	fs.copyFileSync(p1, p2);
	console.log(`>>> [SAVED PROOF] ${filename} (${fs.statSync(p1).size} bytes)`);
}

async function main() {
	console.log(">>> Launching Mobile Capture for Cashbox Purge Proof...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const page = await context.newPage();

		console.log(">>> Loading mobile app at http://localhost:5173/ ...");
		await page.goto("http://localhost:5173/", { timeout: 35000 });

		console.log(">>> Waiting for boot-state detachment...");
		await page.waitForSelector('main.boot-state', { state: "detached", timeout: 30000 });

		console.log(">>> Waiting for auth-segmented-nav...");
		await page.waitForSelector('.auth-segmented-nav', { timeout: 15000 });

		console.log(">>> Clicking Demo Tour tab on mobile...");
		await page.click('.auth-segmented-btn--highlight, .auth-segmented-btn:has-text("Демо-тур")');
		await page.waitForTimeout(800);

		console.log(">>> Clicking Launch Demo button on mobile...");
		const launchBtn = await page.waitForSelector('.auth-submit-btn--glow', { timeout: 15000 });
		await launchBtn.click();

		console.log(">>> Waiting for AuthHub detachment on mobile...");
		await page.waitForSelector('.auth-segmented-nav', { state: "detached", timeout: 30000 });
		await page.waitForTimeout(2000);
		await suppressOverlays(page);

		// Switch to finance view or check cash shift
		console.log(">>> Navigating to #finance on mobile...");
		await page.evaluate(() => {
			window.location.hash = "finance";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await page.waitForTimeout(2000);
		await suppressOverlays(page);

		// ─── MOBILE LIGHT ───
		console.log(">>> Capturing Mobile Light (390x844)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			if (document.body) document.body.className = "light";
		});
		await page.waitForTimeout(600);
		await saveProof(page, "proof_cashbox_purge_mobile_light.png");

		// ─── MOBILE DARK ───
		console.log(">>> Capturing Mobile Dark (390x844)...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			if (document.body) document.body.className = "dark";
		});
		await page.waitForTimeout(600);
		await saveProof(page, "proof_cashbox_purge_mobile_dark.png");

		await context.close();
		console.log(">>> Mobile proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(">>> Mobile capture failed:", err);
	process.exit(1);
});
