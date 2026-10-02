import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

async function main() {
	console.log("=== CAPTURING IPHONE 14 MOBILE TUNER CONTROLS PROOF ===");

	const outDir = path.resolve("docs/screenshots/adaptivity");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
	});

	// iPhone 14: 390x844, scale 3, touch
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 3,
		isMobile: true,
		hasTouch: true,
	});

	const page = await context.newPage();

	try {
		console.log("Navigating to http://127.0.0.1:5173/?cbct=tuner on iPhone 14 (390x844)...");
		await page.goto("http://127.0.0.1:5173/?cbct=tuner", { waitUntil: "domcontentloaded", timeout: 25000 });

		const tunerContainer = page.locator('[data-testid="cbct-tuner-playground"]');
		await tunerContainer.waitFor({ state: "visible", timeout: 15000 });

		// Wait for patient volume extraction to settle
		const loader = page.locator('[data-testid="cbct-tuner-loading-status"]');
		try {
			await loader.waitFor({ state: "detached", timeout: 30000 });
		} catch {}
		await page.waitForTimeout(1500);

		// Switch to Controls tab
		const tabControls = page.locator('[data-testid="cbct-tuner-tab-controls"]');
		await tabControls.waitFor({ state: "visible", timeout: 10000 });
		await tabControls.click();
		await page.waitForTimeout(1000);

		const outPath = path.join(outDir, "cbct_tuner_iphone14_controls.png");
		await page.screenshot({ path: outPath, fullPage: false });
		console.log(`✓ Saved iPhone 14 controls screenshot: ${outPath}`);

		const brainDirs = [
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9bd515d4-936b-4ea4-8192-7c7792988575",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31",
		];
		for (const bDir of brainDirs) {
			if (existsSync(bDir)) {
				const bPath = path.join(bDir, "cbct_tuner_iphone14_controls.png");
				copyFileSync(outPath, bPath);
				console.log(`✓ Copied to brain: ${bPath}`);
			}
		}
	} catch (err) {
		console.error("Capture failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
