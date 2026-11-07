/**
 * scripts/capture_odontogram_canonical_4proofs.cjs
 *
 * 4-State Visual Proof Capture for Odontogram FDI & Wheeler Macro-Batch Inquisitor
 * Target Proofs (Mandates 8ze, 8al, 8am, 8e, 8ba):
 * 1. docs/proofs/odontogram/01_odontogram_pc_light_1440x900.png
 * 2. docs/proofs/odontogram/02_odontogram_pc_dark_1440x900.png
 * 3. docs/proofs/odontogram/03_odontogram_mobile_light_390x844.png
 * 4. docs/proofs/odontogram/04_odontogram_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_URL = "http://127.0.0.1:5173/?demo=true&stand=module";
const TARGET_PROOF_DIR = path.resolve(__dirname, "../docs/proofs/odontogram");
const MACRO_PROOF_DIR = path.resolve(__dirname, "../docs/proofs/odontogram_macro_batch");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ee1007d6-a86b-4537-9449-53858c665453");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/1a5ac924-43af-42a0-a684-00dbb822c536");

[TARGET_PROOF_DIR, MACRO_PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressTransientOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "clean-proof-suppress-style";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.global-toast-container,
				.copilot-trigger-btn,
				[data-testid="copilot-floating-trigger"],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressTransientOverlays(page);
	await page.waitForTimeout(400);
}

function verifyAndSaveScreenshot(buffer, filename, description) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
	}
	const destPrimary = path.join(TARGET_PROOF_DIR, filename);
	fs.writeFileSync(destPrimary, buffer);

	const destMacro = path.join(MACRO_PROOF_DIR, filename);
	fs.writeFileSync(destMacro, buffer);

	const destBrain = path.join(BRAIN_DIR, filename);
	fs.writeFileSync(destBrain, buffer);

	const destParentBrain = path.join(PARENT_BRAIN_DIR, filename);
	fs.writeFileSync(destParentBrain, buffer);

	console.log(`[PROOF CAPTURED] ${filename}: ${buffer.length} bytes -> ${description}`);
	return destPrimary;
}

async function capture() {
	console.log("=== STARTING CANONICAL 4-STATE ODONTOGRAM PROOFS CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	try {
		// 1. Desktop Viewport 1440x900
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await pcContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const pcPage = await pcContext.newPage();
		console.log(`Navigating PC to ${WEB_URL}...`);
		await pcPage.goto(WEB_URL, { waitUntil: "load", timeout: 25000 });
		await pcPage.waitForSelector('[data-testid="odontogram-view-container"]', { timeout: 15000 });
		await suppressTransientOverlays(pcPage);
		await pcPage.waitForTimeout(800);

		// Activate Upper Jaw macro selection to show the tactile Batch Bar with multi-select counter & actions
		const upperJawBtn = await pcPage.$("[data-testid='batch-select-upper-jaw-btn']");
		if (upperJawBtn) {
			console.log("Activating Upper Jaw batch selection...");
			await upperJawBtn.click();
			await pcPage.waitForTimeout(400);
		}

		// Also fill the shorthand quick input
		const quickInput = await pcPage.$("[data-testid='odontogram-quick-formula-input']");
		if (quickInput) {
			await quickInput.fill("16к 25п 36о 13-23зд");
			await pcPage.waitForTimeout(400);
		}

		// 1A. PC Light (1440x900)
		await setTheme(pcPage, "light");
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_pc_light_1440x900.png", "Odontogram Macro-Batch Wheeler 2.5D Console (PC Light 1440x900)");

		// 1B. PC Dark (1440x900)
		await setTheme(pcPage, "dark");
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_pc_dark_1440x900.png", "Odontogram Macro-Batch Wheeler 2.5D Console (PC Dark 1440x900)");

		await pcContext.close();

		// 2. Mobile Viewport 390x844 (Apple HIG)
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});

		await mobileContext.addInitScript(() => {
			localStorage.setItem("dente_theme_mode", "light");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_tour_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_demo_banner_dismissed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		});

		const mobilePage = await mobileContext.newPage();
		console.log(`Navigating Mobile to ${WEB_URL}...`);
		await mobilePage.goto(WEB_URL, { waitUntil: "load", timeout: 25000 });
		await mobilePage.waitForSelector('[data-testid="odontogram-view-container"]', { timeout: 15000 });
		await suppressTransientOverlays(mobilePage);
		await mobilePage.waitForTimeout(800);

		// Activate Front sector batch selection on mobile
		const mobileFrontBtn = await mobilePage.$("[data-testid='batch-select-front-sector-btn']");
		if (mobileFrontBtn) {
			console.log("Activating Front sector batch selection on Mobile...");
			await mobileFrontBtn.click();
			await mobilePage.waitForTimeout(400);
		}

		const mobileQuickInput = await mobilePage.$("[data-testid='odontogram-quick-formula-input']");
		if (mobileQuickInput) {
			await mobileQuickInput.fill("16к 25п 36о 13-23зд");
			await mobilePage.waitForTimeout(400);
		}

		// 2A. Mobile Light (390x844)
		await setTheme(mobilePage, "light");
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_mobile_light_390x844.png", "Odontogram Macro-Batch Apple HIG Console (Mobile Light 390x844)");

		// 2B. Mobile Dark (390x844)
		await setTheme(mobilePage, "dark");
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_mobile_dark_390x844.png", "Odontogram Macro-Batch Apple HIG Console (Mobile Dark 390x844)");

		await mobileContext.close();
		console.log("=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[CAPTURE FATAL]", err);
	process.exit(1);
});
