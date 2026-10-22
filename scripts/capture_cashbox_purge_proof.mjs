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
	console.log(">>> Launching Chromium for Cashbox Purge Proof...");
	const browser = await chromium.launch({
		channel: "chrome",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// ═══════════════════════════════════════════════════════════
		// 1. PC CONTEXT (1440 x 900)
		// ═══════════════════════════════════════════════════════════
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const pcPage = await pcContext.newPage();

		console.log(">>> Loading http://localhost:5173/ ...");
		await pcPage.goto("http://localhost:5173/", { timeout: 35000 });

		console.log(">>> Waiting for boot-state detachment...");
		await pcPage.waitForSelector('main.boot-state', { state: "detached", timeout: 30000 });

		console.log(">>> Waiting for auth-segmented-nav...");
		await pcPage.waitForSelector('.auth-segmented-nav', { timeout: 15000 });

		console.log(">>> Clicking Demo Tour tab...");
		await pcPage.click('.auth-segmented-btn--highlight, .auth-segmented-btn:has-text("Демо-тур")');
		await pcPage.waitForTimeout(800);

		console.log(">>> Clicking Launch Demo button...");
		const launchBtn = await pcPage.waitForSelector('.auth-submit-btn--glow', { timeout: 15000 });
		await launchBtn.click();

		console.log(">>> Waiting for AuthHub detachment...");
		await pcPage.waitForSelector('.auth-segmented-nav', { state: "detached", timeout: 30000 });
		await pcPage.waitForSelector('nav, [data-testid="workspace-sidebar"], .app-header', { timeout: 30000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		console.log(">>> Navigating to #finance...");
		await pcPage.evaluate(() => {
			window.location.hash = "finance";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// Try opening Cashbox or Payment modal
		const optionsBtn = await pcPage.$('[data-testid="finance-toolbar-options-btn"]');
		if (optionsBtn) {
			console.log(">>> Clicking finance options menu...");
			await optionsBtn.click();
			await pcPage.waitForTimeout(400);
			const cashboxBtn = await pcPage.$('[data-testid="btn-finance-open-cashbox"]');
			if (cashboxBtn) {
				await cashboxBtn.click();
				await pcPage.waitForTimeout(600);
			}
		}

		const paymentTrigger = await pcPage.$('[data-testid="btn-finance-open-cashbox"], [data-testid="btn-open-payment-modal"], [data-testid="btn-fast-checkout"], button:has-text("Касса"), button:has-text("Принять оплату")');
		if (paymentTrigger) {
			console.log(">>> Triggering checkout/cashbox modal...");
			await paymentTrigger.click();
			await pcPage.waitForTimeout(800);
		}

		// ─── PC LIGHT ───
		console.log(">>> Capturing PC Light (1440x900)...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			if (document.body) document.body.className = "light";
		});
		await pcPage.waitForTimeout(600);
		await saveProof(pcPage, "proof_cashbox_purge_pc_light.png");

		// ─── PC DARK ───
		console.log(">>> Capturing PC Dark (1440x900)...");
		await pcPage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			if (document.body) document.body.className = "dark";
		});
		await pcPage.waitForTimeout(600);
		await saveProof(pcPage, "proof_cashbox_purge_pc_dark.png");

		// Save state for mobile context
		const storageState = await pcContext.storageState();
		await pcContext.close();

		// ═══════════════════════════════════════════════════════════
		// 2. MOBILE CONTEXT (390 x 844)
		// ═══════════════════════════════════════════════════════════
		console.log(">>> Launching Mobile Context (390x844)...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			storageState,
		});
		const mobilePage = await mobileContext.newPage();

		console.log(">>> Loading mobile app at #finance...");
		await mobilePage.goto("http://localhost:5173/#finance", { timeout: 35000 });
		await mobilePage.waitForSelector('main.boot-state', { state: "detached", timeout: 30000 });
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		// Trigger mobile pay drawer if button present
		const mobilePayBtn = await mobilePage.$('[data-testid="btn-mobile-fast-pay"], [data-testid="btn-open-payment-modal"], button:has-text("Оплата"), button:has-text("Касса")');
		if (mobilePayBtn) {
			console.log(">>> Opening mobile payment drawer...");
			await mobilePayBtn.click();
			await mobilePage.waitForTimeout(800);
		}

		// ─── MOBILE LIGHT ───
		console.log(">>> Capturing Mobile Light (390x844)...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			if (document.body) document.body.className = "light";
		});
		await mobilePage.waitForTimeout(600);
		await saveProof(mobilePage, "proof_cashbox_purge_mobile_light.png");

		// ─── MOBILE DARK ───
		console.log(">>> Capturing Mobile Dark (390x844)...");
		await mobilePage.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			if (document.body) document.body.className = "dark";
		});
		await mobilePage.waitForTimeout(600);
		await saveProof(mobilePage, "proof_cashbox_purge_mobile_dark.png");

		await mobileContext.close();
		console.log(">>> ALL 4-STATE CASHBOX PURGE PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error(">>> Execution failed:", err);
	process.exit(1);
});
