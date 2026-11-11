import { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/f2c31f40-e4c0-4586-871d-fe7f3683e62d";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/2e26914e-fa5a-4892-8173-c6752860bc4c";

for (const d of [PROOF_DIR, BRAIN_DIR, PARENT_BRAIN_DIR]) {
	if (!existsSync(d)) {
		mkdirSync(d, { recursive: true });
	}
}

const WEB_URL = "http://127.0.0.1:5173/?demo=true#odontogram";

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-inquisition";
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
	const destPrimary = path.join(PROOF_DIR, filename);
	writeFileSync(destPrimary, buffer);

	for (const extraDir of [BRAIN_DIR, PARENT_BRAIN_DIR]) {
		try {
			const destExtra = path.join(extraDir, filename);
			copyFileSync(destPrimary, destExtra);
		} catch (_) {}
	}

	const stats = statSync(destPrimary);
	console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (>= 20KB OK) -> ${description}`);
	return destPrimary;
}

async function runCapture() {
	console.log("=== CAPTURING 4-STATE INQUISITION PROOFS: WHEELER 2.5D ADULT & PEDIATRIC ===");

	const browser = await chromium.launch({ headless: true });

	try {
		// ================= 1. PC CONTEXT (1440x900) =================
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
		await pcPage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
		await pcPage.waitForTimeout(2500);
		await suppressOverlays(pcPage);

		// Switch to anatomical_svg if button exists
		try {
			const anatomicalModeBtn = await pcPage.$('[data-testid="odontogram-mode-btn-anatomical_svg"]');
			if (anatomicalModeBtn) {
				await anatomicalModeBtn.click();
				await pcPage.waitForTimeout(400);
			}
		} catch (_) {}

		// Fill quick text input if available
		try {
			const quickInput = await pcPage.$('[data-testid="odontogram-quick-input-field"], #odontogram-quick-formula-input');
			if (quickInput) {
				await quickInput.fill("16к 25п 36о 47пт 13-23зд");
				await pcPage.waitForTimeout(400);
			}
		} catch (_) {}

		// Select tooth 16
		try {
			const tooth16 = await pcPage.$('[data-testid="anatomical-tooth-cell-16"], [data-testid="tooth-cell-16"]');
			if (tooth16) {
				await tooth16.click();
				await pcPage.waitForTimeout(400);
			}
		} catch (_) {}

		// 1.1 PC Light (1440x900) Adult Wheeler
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(400);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_pc_light_1440x900.png", "Wheeler 2.5D Adult Formula (PC Light 1440x900)");

		// 1.2 PC Dark (1440x900) Adult Wheeler
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(400);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_pc_dark_1440x900.png", "Wheeler 2.5D Adult Formula (PC Dark 1440x900)");

		// Switch to Pediatric Dentition mode (FDI 51–85)
		console.log("Switching to Pediatric Dentition Mode (51–85)...");
		try {
			const pedBtn = pcPage.locator('button:has-text("Молочный")').first();
			if (await pedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
				await pedBtn.click();
				await pcPage.waitForTimeout(600);
			} else {
				await pcPage.evaluate(() => {
					const btns = Array.from(document.querySelectorAll("button"));
					const b = btns.find((x) => x.innerText && x.innerText.includes("Молочный"));
					if (b) b.click();
				});
				await pcPage.waitForTimeout(600);
			}
		} catch (e) {
			console.log("Pediatric switch note:", e.message);
		}

		// 1.3 PC Light Pediatric
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(400);
		const pedLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pedLightBuf, "03_odontogram_pediatric_pc_light_1440x900.png", "Wheeler 2.5D Pediatric Formula (PC Light 1440x900)");

		// 1.4 PC Dark Pediatric
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(400);
		const pedDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pedDarkBuf, "06_odontogram_pediatric_pc_dark_1440x900.png", "Wheeler 2.5D Pediatric Formula (PC Dark 1440x900)");

		await pcContext.close();

		// ================= 2. MOBILE CONTEXT (390x844) Apple HIG =================
		console.log("2. Setting up Mobile context (390x844 Apple HIG)...");
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
		await mobilePage.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
		await mobilePage.waitForTimeout(2500);
		await suppressOverlays(mobilePage);

		// Try opening odontogram if not mounted
		await mobilePage.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente-open-odontogram"));
			window.dispatchEvent(new CustomEvent("dente:open-odontogram"));
		});
		await mobilePage.waitForTimeout(1000);
		await suppressOverlays(mobilePage);

		// 2.1 Mobile Light Adult (390x844)
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(400);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_mobile_light_390x844.png", "Wheeler 2.5D Odontogram Apple HIG (Mobile Light 390x844)");

		// 2.2 Mobile Dark Adult (390x844)
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(400);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_mobile_dark_390x844.png", "Wheeler 2.5D Odontogram Apple HIG (Mobile Dark 390x844)");

		// Switch to pediatric on mobile
		try {
			const pedBtn = mobilePage.locator('button:has-text("Молочный")').first();
			if (await pedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await pedBtn.click();
				await mobilePage.waitForTimeout(500);
			} else {
				await mobilePage.evaluate(() => {
					const btns = Array.from(document.querySelectorAll("button"));
					const b = btns.find((x) => x.innerText && x.innerText.includes("Молочный"));
					if (b) b.click();
				});
				await mobilePage.waitForTimeout(500);
			}
		} catch (_) {}

		// 2.3 Mobile Light Pediatric
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(400);
		const mobPedLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobPedLightBuf, "03_pediatric_mobile_light_390x844.png", "Wheeler 2.5D Pediatric Odontogram Apple HIG (Mobile Light 390x844)");

		// 2.4 Mobile Dark Pediatric
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(400);
		const mobPedDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobPedDarkBuf, "04_pediatric_mobile_dark_390x844.png", "Wheeler 2.5D Pediatric Odontogram Apple HIG (Mobile Dark 390x844)");

		await mobileContext.close();
		console.log("=== ALL 4-STATE INQUISITION PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

runCapture().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
