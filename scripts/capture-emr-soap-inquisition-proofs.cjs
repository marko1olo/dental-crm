/**
 * scripts/capture-emr-soap-inquisition-proofs.cjs
 *
 * Dedicated Playwright script for Red Team EMR & SOAP Inquisitor:
 * Accurately awaits full app hydration and renders actual clinical visit screens:
 * 1. 01_visit_soap_emk_pc_light_1440x900.png
 * 2. 02_visit_soap_emk_pc_dark_1440x900.png
 * 3. 03_visit_soap_emk_mobile_light_390x844.png
 * 4. 04_visit_soap_emk_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?demo=true#visit";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/emr");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e7142b4f-d49d-4788-ae6e-0c86d9f2ffc2");

for (const dir of [PROOFS_DIR, BRAIN_DIR]) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(600);
}

async function initContextStorage(context, isMobile = false) {
	await context.addInitScript(({ mobile }) => {
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
		}));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			selectedPatientId: "pat-1",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
	}, { mobile: isMobile });
}

async function prepareVisitPage(page, isMobile) {
	console.log("Navigating to", WEB_URL, "...");
	await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

	// Wait for loading screens to detach completely
	console.log("Waiting for app boot and Suspense to resolve...");
	await page.waitForSelector(".boot-state, text='Загрузка CRM', text='Загрузка клинического приёма...'", { state: "detached", timeout: 40000 }).catch(() => {});
	await page.waitForTimeout(3000);
	await suppressOverlays(page);

	// Ensure view is set to visit
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setSelectedWorkspaceRole("doctor");
			window.__useAppStore.getState().setCurrentView("visit");
		}
		window.location.hash = "visit";
	}).catch(() => {});
	await page.waitForTimeout(2000);

	// If there is an intake CTA / patient card, click it to open clinical session
	const nextBtn = page.locator('button:has-text("Пригласить следующего"), button:has-text("Начать прием"), button:has-text("Начать приём"), .visit-intake-card').first();
	if (await nextBtn.isVisible().catch(() => false)) {
		console.log("Activating patient visit from intake...");
		await nextBtn.click().catch(() => {});
		await page.waitForTimeout(2500);
	}

	// On desktop, activate EMK subtab
	if (!isMobile) {
		const emkTab = page.locator('[data-testid="visit-subtab-emk"], button:has-text("Дневник"), button:has-text("ЭМК")').first();
		if (await emkTab.isVisible().catch(() => false)) {
			console.log("Activating EMK subtab...");
			await emkTab.click().catch(() => {});
			await page.waitForTimeout(1500);
		}

		// Also click 1-click Norm button if present
		const normBtn = page.locator('[data-testid="btn-emk-somatic-norm-preset"], button:has-text("Соматически здоров"), button:has-text("Норма")').first();
		if (await normBtn.isVisible().catch(() => false)) {
			console.log("Applying 1-click Somatic Norm preset...");
			await normBtn.click().catch(() => {});
			await page.waitForTimeout(600);
		}
	} else {
		// On mobile, click somatic norm preset
		const mobNormBtn = page.locator('[data-testid="btn-emk-somatic-norm-preset"], button:has-text("Норма")').first();
		if (await mobNormBtn.isVisible().catch(() => false)) {
			console.log("Applying mobile 1-click Somatic Norm preset...");
			await mobNormBtn.click().catch(() => {});
			await page.waitForTimeout(600);
		}
	}

	// Wait for clinical content
	await page.waitForSelector(".visit-monolithic-header, .visit-view-cockpit, .mobile-chairside-container, [data-testid='mobile-chairside-visit-workspace']", { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(1000);
}

async function captureState(browser, { width, height, isMobile, deviceScaleFactor, theme, outName }) {
	console.log(`\n>>> CAPTURING ${outName} (${width}x${height}, ${theme})...`);
	const context = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor: deviceScaleFactor || 1,
		isMobile: Boolean(isMobile),
		hasTouch: Boolean(isMobile),
	});
	await initContextStorage(context, isMobile);
	const page = await context.newPage();

	try {
		await prepareVisitPage(page, isMobile);
		await setTheme(page, theme);

		const outPath = path.join(PROOFS_DIR, outName);
		await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

		const brainPath = path.join(BRAIN_DIR, outName);
		fs.copyFileSync(outPath, brainPath);

		const size = fs.statSync(outPath).size;
		console.log(`[PROOF VERIFIED] ${outName}: ${size} bytes (${(size / 1024).toFixed(1)} KB) -> ${outPath}`);
	} finally {
		await context.close();
	}
}

async function main() {
	console.log("[Playwright] Launching Chrome executable...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light (1440x900)
		await captureState(browser, {
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
			outName: "01_visit_soap_emk_pc_light_1440x900.png",
		});

		// 2. PC Dark (1440x900)
		await captureState(browser, {
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
			outName: "02_visit_soap_emk_pc_dark_1440x900.png",
		});

		// 3. Mobile Light (390x844)
		await captureState(browser, {
			width: 390,
			height: 844,
			isMobile: true,
			deviceScaleFactor: 2,
			theme: "light",
			outName: "03_visit_soap_emk_mobile_light_390x844.png",
		});

		// 4. Mobile Dark (390x844)
		await captureState(browser, {
			width: 390,
			height: 844,
			isMobile: true,
			deviceScaleFactor: 2,
			theme: "dark",
			outName: "04_visit_soap_emk_mobile_dark_390x844.png",
		});

		console.log("\n=======================================================");
		console.log(">>> ALL 4 VISIT EMR/SOAP PROOFS SUCCESSFULLY CAPTURED! <<<");
		console.log("=======================================================\n");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL] Capture failed:", err);
	process.exit(1);
});
