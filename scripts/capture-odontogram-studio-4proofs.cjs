/**
 * scripts/capture-odontogram-studio-4proofs.cjs
 * 4-State Visual Proofs for Odontogram Studio & Pediatric FDI 51-85 Wheeler 2.5D
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_URL = "http://127.0.0.1:5173/#odontogram";
const PROOF_DIR = path.resolve(__dirname, "../docs/proofs/odontogram");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/04b24212-7d34-4a22-b9b2-5e9280b13eb0");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/07663fdc-eba5-48a1-bbb4-3c4b8f181006");

[PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR].forEach((dir) => {
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
	const destPrimary = path.join(PROOF_DIR, filename);
	fs.writeFileSync(destPrimary, buffer);

	const destBrain = path.join(BRAIN_DIR, filename);
	fs.writeFileSync(destBrain, buffer);

	const destParentBrain = path.join(PARENT_BRAIN_DIR, filename);
	try {
		fs.writeFileSync(destParentBrain, buffer);
	} catch (_) {}

	console.log(`[PROOF CAPTURED] ${filename}: ${buffer.length} bytes -> ${description}`);
	return destPrimary;
}

async function capture() {
	console.log("=== STARTING ODONTOGRAM STUDIO 4-STATE PROOFS CAPTURE ===");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	try {
		// 1. PC 1440x900
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
		});

		const pcPage = await pcContext.newPage();
		console.log(`Navigating PC to ${WEB_URL}...`);
		await pcPage.goto(WEB_URL, { waitUntil: "load", timeout: 20000 });
		await pcPage.waitForSelector('[data-testid="odontogram-studio-modal"]', { timeout: 15000 });
		await suppressTransientOverlays(pcPage);
		await pcPage.waitForTimeout(800);

		// 1A. PC Light (1440x900) Adult Dentition
		await setTheme(pcPage, "light");
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_studio_pc_light_1440x900.png", "Odontogram Studio Full Wheeler 2.5D Arch (PC Light 1440x900)");

		// 1B. PC Dark (1440x900) Adult Dentition
		await setTheme(pcPage, "dark");
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_studio_pc_dark_1440x900.png", "Odontogram Studio Full Wheeler 2.5D Arch (PC Dark 1440x900)");

		// 1C. Switch to Pediatric Dentition (FDI 51-85)
		const pedBtn = await pcPage.$("button:has-text('Молочный')");
		if (pedBtn) {
			await pedBtn.click();
			await pcPage.waitForTimeout(500);
			await setTheme(pcPage, "light");
			const pedLightBuf = await pcPage.screenshot({ fullPage: false });
			verifyAndSaveScreenshot(pedLightBuf, "03_odontogram_pediatric_pc_light_1440x900.png", "Odontogram Pediatric FDI 51-85 Wheeler 2.5D (PC Light 1440x900)");

			await setTheme(pcPage, "dark");
			const pedDarkBuf = await pcPage.screenshot({ fullPage: false });
			verifyAndSaveScreenshot(pedDarkBuf, "06_odontogram_pediatric_pc_dark_1440x900.png", "Odontogram Pediatric FDI 51-85 Wheeler 2.5D (PC Dark 1440x900)");
		}

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
		});

		const mobilePage = await mobileContext.newPage();
		console.log(`Navigating Mobile to ${WEB_URL}...`);
		await mobilePage.goto(WEB_URL, { waitUntil: "load", timeout: 20000 });
		await mobilePage.waitForSelector('[data-testid="odontogram-studio-modal"]', { timeout: 15000 });
		await suppressTransientOverlays(mobilePage);
		await mobilePage.waitForTimeout(800);

		// 2A. Mobile Light (390x844)
		await setTheme(mobilePage, "light");
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileLightBuf, "04_odontogram_studio_mobile_light_390x844.png", "Odontogram Studio Apple HIG (Mobile Light 390x844)");

		// 2B. Mobile Dark (390x844)
		await setTheme(mobilePage, "dark");
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileDarkBuf, "05_odontogram_studio_mobile_dark_390x844.png", "Odontogram Studio Apple HIG (Mobile Dark 390x844)");

		await mobileContext.close();
		console.log("=== ALL ODONTOGRAM STUDIO PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("[CAPTURE FATAL]", err);
	process.exit(1);
});
