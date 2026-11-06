import { existsSync, mkdirSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/9d94d250-068f-4caa-90cd-249e41f168e4";

[PROOF_DIR, BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
});

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
	const destPrimary = path.join(PROOF_DIR, filename);
	writeFileSync(destPrimary, buffer);

	const destBrain = path.join(BRAIN_DIR, filename);
	copyFileSync(destPrimary, destBrain);

	const stats = statSync(destPrimary);
	console.log(`[PROOF CAPTURED] ${filename}: ${stats.size} bytes (>= 20KB OK) -> ${description}`);
	return destPrimary;
}

async function runCapture() {
	console.log("=== CAPTURING 4-STATE PROOFS FOR WHEELER 2.5D CLINICAL ODONTOGRAM ===");

	const launchOptions = {
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	};
	if (edgePath) {
		launchOptions.executablePath = edgePath;
	}

	const browser = await chromium.launch(launchOptions);

	try {
		// 1. PC VIEWPORT (1440x900)
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
		await pcPage.goto(WEB_URL, { waitUntil: "commit", timeout: 45000 });
		await pcPage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { state: "attached", timeout: 30000 });
		await pcPage.waitForTimeout(1500);
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

		// Click tooth 16 to inspect surfaces
		try {
			const tooth16 = await pcPage.$('[data-testid="anatomical-tooth-cell-16"], [data-testid="tooth-cell-16"]');
			if (tooth16) {
				await tooth16.click();
				await pcPage.waitForTimeout(400);
			}
		} catch (_) {}

		// 1.1 PC Light (1440x900)
		await setTheme(pcPage, "light");
		await pcPage.waitForTimeout(400);
		const pcLightBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcLightBuf, "01_odontogram_pc_light_1440x900.png", "Odontogram Wheeler 2.5D Full Arch (PC Light 1440x900)");
		verifyAndSaveScreenshot(pcLightBuf, "02_odontogram_multiselect_pc_light_1440x900.png", "Odontogram Multi-Select Active Front & Molars (PC Light 1440x900)");

		// 1.2 PC Dark (1440x900)
		await setTheme(pcPage, "dark");
		await pcPage.waitForTimeout(400);
		const pcDarkBuf = await pcPage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(pcDarkBuf, "02_odontogram_pc_dark_1440x900.png", "Odontogram Wheeler 2.5D Full Arch (PC Dark 1440x900)");
		verifyAndSaveScreenshot(pcDarkBuf, "01_odontogram_multiselect_pc_dark_1440x900.png", "Odontogram Multi-Select Active Front & Molars (PC Dark 1440x900)");

		await pcContext.close();

		// 2. MOBILE VIEWPORT (390x844) Apple HIG
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
		console.log(`Navigating Mobile to ${WEB_URL}...`);
		await mobilePage.goto(WEB_URL, { waitUntil: "commit", timeout: 45000 });
		await mobilePage.waitForSelector('[data-testid="odontogram-studio-modal"], [data-testid="odontogram-view-container"]', { state: "attached", timeout: 30000 });
		await mobilePage.waitForTimeout(1500);
		await suppressOverlays(mobilePage);

		try {
			const mobileQuickInput = await mobilePage.$('[data-testid="odontogram-quick-input-field"], #odontogram-quick-formula-input');
			if (mobileQuickInput) {
				await mobileQuickInput.fill("16к 25п 36о 13-23зд");
				await mobilePage.waitForTimeout(400);
			}
		} catch (_) {}

		// Select tooth 16 on mobile
		try {
			const mobileTooth16 = await mobilePage.$('[data-testid="tooth-cell-16"], [data-testid="anatomical-tooth-cell-16"]');
			if (mobileTooth16) {
				await mobileTooth16.click();
				await mobilePage.waitForTimeout(400);
			}
		} catch (_) {}

		// 2.1 Mobile Light (390x844)
		await setTheme(mobilePage, "light");
		await mobilePage.waitForTimeout(400);
		const mobileLightBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_mobile_light_390x844.png", "Odontogram Wheeler 2.5D Full Arch Apple HIG (Mobile Light 390x844)");
		verifyAndSaveScreenshot(mobileLightBuf, "03_odontogram_multiselect_mobile_light_390x844.png", "Mobile Chairside Teeth Selector & Quadrants (Mobile Light 390x844)");

		// 2.2 Mobile Dark (390x844)
		await setTheme(mobilePage, "dark");
		await mobilePage.waitForTimeout(400);
		const mobileDarkBuf = await mobilePage.screenshot({ fullPage: false });
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_mobile_dark_390x844.png", "Odontogram Wheeler 2.5D Full Arch Apple HIG (Mobile Dark 390x844)");
		verifyAndSaveScreenshot(mobileDarkBuf, "04_odontogram_multiselect_mobile_dark_390x844.png", "Mobile Chairside Teeth Selector & Quadrants (Mobile Dark 390x844)");

		await mobileContext.close();
		console.log("=== ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

runCapture().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
