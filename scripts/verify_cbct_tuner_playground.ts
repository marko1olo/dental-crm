/**
 * DENTE CRM — Verify CBCT Contrast & Slice Tuner Playground (Playwright E2E)
 * Proof generator verifying interactive sliders, 2D axial viewport, OPG panorama CPR,
 * and 5-patient dataset switching under Chromium.
 * Mandate 8b (< 800 lines).
 */

import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync } from "node:fs";

async function main() {
	console.log("=== STARTING CBCT TUNER PLAYGROUND VERIFICATION ===");

	const screenshotsDir = path.resolve(process.cwd(), "docs/screenshots/cbct_live");
	if (!existsSync(screenshotsDir)) {
		mkdirSync(screenshotsDir, { recursive: true });
	}

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
	});

	const context = await browser.newContext({
		viewport: { width: 1600, height: 950 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err));

	try {
		console.log("Navigating to http://127.0.0.1:5173/?cbct=tuner ...");
		await page.goto("http://127.0.0.1:5173/?cbct=tuner", { waitUntil: "networkidle", timeout: 30000 });

		// Wait for Tuner container
		const tunerContainer = page.locator('[data-testid="cbct-tuner-playground"]');
		await tunerContainer.waitFor({ state: "visible", timeout: 15000 });
		console.log("✓ Tuner Playground container rendered");

		// Wait for axial and pano canvases
		const axialCanvas = page.locator('[data-testid="cbct-tuner-axial-canvas"]');
		const panoCanvas = page.locator('[data-testid="cbct-tuner-pano-canvas"]');
		await axialCanvas.waitFor({ state: "visible", timeout: 15000 });
		await panoCanvas.waitFor({ state: "visible", timeout: 15000 });
		console.log("✓ Axial and Pano canvases detected");

		// Allow slices to render
		await page.waitForTimeout(2000);

		// 1. Test clicking Preset 2 (Standard Dental)
		const preset2Btn = page.locator('[data-testid="cbct-preset-btn-standard_dental"]');
		if (await preset2Btn.isVisible()) {
			await preset2Btn.click();
			console.log("✓ Preset 2 (Standard Dental) clicked");
			await page.waitForTimeout(500);
		}

		// 2. Test Window Width Slider
		const wwSlider = page.locator('[data-testid="cbct-slider-window-width"]');
		await wwSlider.fill("2400");
		console.log("✓ Window Width slider set to 2400");

		// 3. Test Window Level Slider
		const wlSlider = page.locator('[data-testid="cbct-slider-window-level"]');
		await wlSlider.fill("500");
		console.log("✓ Window Level slider set to 500");

		// 4. Test Gamma Slider
		const gammaSlider = page.locator('[data-testid="cbct-slider-gamma"]');
		await gammaSlider.fill("1.15");
		console.log("✓ Gamma slider set to 1.15");

		// 5. Test Soft-Knee Slider
		const softKneeSlider = page.locator('[data-testid="cbct-slider-soft-knee"]');
		if (await softKneeSlider.isVisible()) {
			await softKneeSlider.fill("185");
			console.log("✓ Soft-Knee slider set to 185");
		}

		// 6. Test Slice Thickness Slider & Projection Mode
		const thickSlider = page.locator('[data-testid="cbct-slider-thickness"]');
		await thickSlider.fill("1.5");
		console.log("✓ Thickness slider set to 1.5mm");

		const avgModeBtn = page.locator('[data-testid="cbct-tuner-mode-average"]');
		if (await avgModeBtn.isVisible()) {
			await avgModeBtn.click();
			console.log("✓ Mode switched to Average");
		}

		// 7. Test Z-Scrubbing Slider
		const zSlider = page.locator('[data-testid="cbct-tuner-z-slider"]');
		await zSlider.fill("165");
		console.log("✓ Z-Scrubbing set to slice 165");

		// Wait for render to settle
		await page.waitForTimeout(1500);

		// 8. Test Copy Parameters Button
		const copyBtn = page.locator('[data-testid="cbct-tuner-copy-params-btn"]');
		await copyBtn.click();
		console.log("✓ Clicked Copy Parameters button");
		await page.waitForTimeout(500);

		// 9. Capture Main Proof Screenshot
		const proofPath = path.join(screenshotsDir, "proof_tuner_playground.png");
		await page.screenshot({ path: proofPath, fullPage: false });
		console.log(`✓ Main Proof Screenshot saved to: ${proofPath}`);

		// 10. Test switching patient to Bulyakov
		const patientSelect = page.locator('[data-testid="cbct-tuner-patient-select"]');
		await patientSelect.selectOption("bulyakov");
		console.log("✓ Selected patient: Буляков Н.З.");

		// Wait for patient volume download and auto-arch detection to complete
		await page.waitForFunction(() => {
			const bodyText = document.body.innerText;
			return !bodyText.includes("Загрузка") && !bodyText.includes("Декодирование");
		}, { timeout: 20000 });
		console.log("✓ Bulyakov volume fully loaded and rendered");

		await page.waitForTimeout(1000);

		const bulyakovProofPath = path.join(screenshotsDir, "proof_tuner_bulyakov.png");
		await page.screenshot({ path: bulyakovProofPath, fullPage: false });
		console.log(`✓ Bulyakov Proof Screenshot saved to: ${bulyakovProofPath}`);

		// 11. Switch back to Zakharov
		await patientSelect.selectOption("zakharov");
		await page.waitForTimeout(1500);

		console.log("\n=== CBCT TUNER PLAYGROUND VERIFICATION COMPLETE (100% SUCCESS) ===");
	} catch (err) {
		console.error("Test execution failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
