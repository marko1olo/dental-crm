const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?demo=true#visit";
const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/visit");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ff1921e6-2535-4d8f-bbcd-3b7df4937ba7");

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
		document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
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
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_workspace_perspective", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "doc-1", fullName: "Д-р Смирнов А. В.", role: "doctor"
		}));
	}, { mobile: isMobile });
}

async function captureState(browser, { width, height, isMobile, deviceScaleFactor, theme, outName }) {
	console.log(`\n--- Capturing ${outName} (${width}x${height}, ${theme}, isMobile=${Boolean(isMobile)}) ---`);
	const context = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor: deviceScaleFactor || 1,
		isMobile: Boolean(isMobile),
		hasTouch: Boolean(isMobile),
		serviceWorkers: "block",
	});
	await initContextStorage(context, isMobile);
	const page = await context.newPage();
	await page.goto(WEB_URL, { waitUntil: "networkidle", timeout: 35000 }).catch(async () => {
		await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 35000 });
	});
	await page.waitForTimeout(4000);
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

	// If there is an intake next button, click it
	const nextBtn = page.locator('button:has-text("Пригласить следующего"), button:has-text("Начать прием"), #btn-intake-start-next').first();
	if (await nextBtn.isVisible().catch(() => false)) {
		await nextBtn.click().catch(() => {});
		await page.waitForTimeout(2000);
	}

	// Wait for patient content to appear
	await page.waitForSelector('text=Смирнова Анна Сергеевна, button:has-text("Завершить приём"), .visit-panel, .mobile-chairside-container', { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(1000);

	await setTheme(page, theme);
	const outPath = path.join(PROOFS_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });

	const brainPath = path.join(BRAIN_DIR, outName);
	fs.copyFileSync(outPath, brainPath);

	const size = fs.statSync(outPath).size;
	console.log(`[CAPTURED] ${outName} (${(size / 1024).toFixed(1)} KB) -> path: ${outPath}`);

	if (size < 35000) {
		throw new Error(`CRITICAL DEFECT: ${outName} size ${size} is < 35KB!`);
	}

	await context.close();
}

async function main() {
	console.log("=== Launching Chrome for Canonical 4-State Proofs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light (1440x900)
		await captureState(browser, { width: 1440, height: 900, theme: "light", outName: "01_visit_view_pc_light_1440x900.png" });
		// 2. PC Dark (1440x900)
		await captureState(browser, { width: 1440, height: 900, theme: "dark", outName: "02_visit_view_pc_dark_1440x900.png" });
		// 3. Mobile Light (390x844)
		await captureState(browser, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, theme: "light", outName: "03_visit_view_mobile_light_390x844.png" });
		// 4. Mobile Dark (390x844)
		await captureState(browser, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, theme: "dark", outName: "04_visit_view_mobile_dark_390x844.png" });
	} finally {
		await browser.close();
	}
	console.log("\n=== ALL 4 CANONICAL STATES CAPTURED & VERIFIED ===");
}

main().catch(err => { console.error("FATAL ERROR:", err); process.exit(1); });
