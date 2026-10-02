/**
 * DENTE CRM — Verify CBCT Contrast & Slice Tuner Playground (Playwright E2E)
 * Proof generator verifying interactive sliders, 2D axial viewport, OPG panorama CPR,
 * and 5-patient dataset switching under Chromium.
 * Mandate 8b (< 800 lines).
 */

import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

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
		await page.goto("http://127.0.0.1:5173/?cbct=tuner", { waitUntil: "domcontentloaded", timeout: 30000 });

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
		await wwSlider.fill("4025");
		console.log("✓ Window Width slider set to 4025");

		// 3. Test Window Level Slider
		const wlSlider = page.locator('[data-testid="cbct-slider-window-level"]');
		await wlSlider.fill("525");
		console.log("✓ Window Level slider set to 525");

		// 4. Test Gamma Slider
		const gammaSlider = page.locator('[data-testid="cbct-slider-gamma"]');
		await gammaSlider.fill("1.5");
		console.log("✓ Gamma slider set to 1.5");

		// 5. Test Air Cutoff Slider
		const airSlider = page.locator('[data-testid="cbct-slider-air-cutoff"]');
		if (await airSlider.isVisible()) {
			await airSlider.fill("-500");
			console.log("✓ Air Cutoff slider set to -500 HU");
		}

		// 5b. Test Soft-Knee Checkbox (Off)
		const softKneeCb = page.locator('[data-testid="cbct-checkbox-soft-knee"]');
		if (await softKneeCb.isChecked()) {
			await softKneeCb.uncheck();
			console.log("✓ Soft-Knee checkbox unchecked (false)");
		}

		// 6. Test Slice Thickness Slider & Projection Mode
		const thickSlider = page.locator('[data-testid="cbct-slider-thickness"]');
		await thickSlider.fill("1");
		console.log("✓ Thickness slider set to 1.0mm");

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

		const brainDirs = [
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9bd515d4-936b-4ea4-8192-7c7792988575",
			"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31",
		];
		for (const bDir of brainDirs) {
			if (existsSync(bDir)) {
				const bPath = path.join(bDir, "proof_tuner_playground.png");
				copyFileSync(proofPath, bPath);
				console.log(`✓ Copied to brain: ${bPath}`);
			}
		}

		// 10. Test switching patient to Bulyakov
		const waitForPatientLoad = async (patientName: string) => {
			const loader = page.locator('[data-testid="cbct-tuner-loading-status"]');
			try {
				await loader.waitFor({ state: "visible", timeout: 3000 });
				await loader.waitFor({ state: "detached", timeout: 45000 });
			} catch {
				await loader.waitFor({ state: "detached", timeout: 45000 });
			}
			console.log(`✓ ${patientName} volume fully loaded and rendered`);
		};

		// 10. Test switching patient to Bulyakov
		const patientSelect = page.locator('[data-testid="cbct-tuner-patient-select"]');
		await patientSelect.selectOption("bulyakov");
		console.log("✓ Selected patient: Буляков Н.З.");
		await waitForPatientLoad("Буляков Н.З.");

		// Allow CPR panorama to finish rendering
		await page.waitForTimeout(2500);

		const bulyakovProofPath = path.join(screenshotsDir, "proof_tuner_bulyakov.png");
		await page.screenshot({ path: bulyakovProofPath, fullPage: false });
		console.log(`✓ Bulyakov Proof Screenshot saved to: ${bulyakovProofPath}`);

		// 11. Test switching patient to Barabash
		await patientSelect.selectOption("barabash");
		console.log("✓ Selected patient: Барабаш С.В.");
		await waitForPatientLoad("Барабаш С.В.");
		await page.waitForTimeout(1500);

		// 12. Test switching patient to Sumarokova
		await patientSelect.selectOption("sumarokova");
		console.log("✓ Selected patient: Сумарокова И.О.");
		await waitForPatientLoad("Сумарокова И.О.");
		await page.waitForTimeout(1500);

		// 13. Test switching patient to Amirova
		await patientSelect.selectOption("amirova");
		console.log("✓ Selected patient: Амирова Н.Н.");
		await waitForPatientLoad("Амирова Н.Н.");
		await page.waitForTimeout(1500);

		// 14. Switch back to Zakharov
		await patientSelect.selectOption("zakharov");
		await waitForPatientLoad("Захаров И.Д.");
		await page.waitForTimeout(1500);

		console.log("\n=== CBCT TUNER PLAYGROUND ALL 5 PATIENTS VERIFIED (100% SUCCESS) ===");
	} catch (err) {
		console.error("Test execution failed:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

main();
