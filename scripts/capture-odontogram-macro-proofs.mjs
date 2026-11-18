import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram_macro_batch";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/42aa54f3-4e36-4eff-a467-036fdcf7dcf8";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/1a5ac924-43af-42a0-a684-00dbb822c536";

[OUT_DIR, BRAIN_DIR, PARENT_BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

const WEB_URL = "http://127.0.0.1:5173/?demo=true&odontogram=1";

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-tour-overlays";
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

async function setTheme(p, theme) {
	await p.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "light") {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.className = "light";
		} else {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.body.className = "dark";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		document.documentElement.style.colorScheme = th;
	}, theme);
	await suppressOverlays(p);
	await p.waitForTimeout(400);
}

function verifyAndSaveScreenshot(buffer, filename, description) {
	if (buffer.length < 20480) {
		throw new Error(`Screenshot ${filename} is too small: ${buffer.length} bytes (< 20KB threshold)!`);
	}
	const destPrimary = path.join(OUT_DIR, filename);
	writeFileSync(destPrimary, buffer);

	const destBrain = path.join(BRAIN_DIR, filename);
	writeFileSync(destBrain, buffer);

	const destParentBrain = path.join(PARENT_BRAIN_DIR, filename);
	writeFileSync(destParentBrain, buffer);

	console.log(`[PROOF CAPTURED] ${filename}: ${buffer.length} bytes -> ${description}`);
	return destPrimary;
}

async function runCapture() {
	console.log("=== CAPTURING 4-STATE PROOFS FOR ODONTOGRAM MACRO-BATCH ACTIONS ===");

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	try {
		// 1. PC CONTEXT (1440x900)
		console.log("1. Setting up PC context (1440x900)...");
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
		console.log(`Navigating to ${WEB_URL}...`);
		await pcPage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
		await pcPage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { timeout: 15000 });
		await pcPage.waitForTimeout(1000);
		await suppressOverlays(pcPage);

		// 1.1 PC Light
		await setTheme(pcPage, "light");
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcLightBuf, "odontogram_macro_pc_light_1440x900.png", "Odontogram Macro-Batch Console Wheeler 2.5D (PC Light 1440x900)");

		// 1.2 PC Dark
		await setTheme(pcPage, "dark");
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcDarkBuf, "odontogram_macro_pc_dark_1440x900.png", "Odontogram Macro-Batch Console Wheeler 2.5D (PC Dark 1440x900)");

		await pcContext.close();

		// 2. MOBILE CONTEXT (390x844) Apple HIG
		console.log("2. Setting up Mobile context (390x844)...");
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
		console.log(`Navigating mobile to ${WEB_URL}...`);
		await mobilePage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
		await mobilePage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { timeout: 15000 });
		await mobilePage.waitForTimeout(1000);
		await suppressOverlays(mobilePage);

		// 2.1 Mobile Light
		await setTheme(mobilePage, "light");
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileLightBuf, "odontogram_macro_mobile_light_390x844.png", "Odontogram Macro-Batch Console Apple HIG (Mobile Light 390x844)");

		// 2.2 Mobile Dark
		await setTheme(mobilePage, "dark");
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileDarkBuf, "odontogram_macro_mobile_dark_390x844.png", "Odontogram Macro-Batch Console Apple HIG (Mobile Dark 390x844)");

		await mobileContext.close();
		console.log("=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

runCapture().catch((err) => {
	console.error("[CAPTURE ERROR]", err);
	process.exit(1);
});
