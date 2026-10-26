const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?demo=true#visit";
const OUT_DIR = path.resolve(__dirname, "../docs/proofs/clinical_visit");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

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
	}, { mobile: isMobile });
}

async function captureState(browser, { width, height, isMobile, deviceScaleFactor, theme, outName }) {
	const context = await browser.newContext({
		viewport: { width, height },
		deviceScaleFactor: deviceScaleFactor || 1,
		isMobile: Boolean(isMobile),
		hasTouch: Boolean(isMobile),
	});
	await initContextStorage(context, isMobile);
	const page = await context.newPage();
	await page.goto(WEB_URL, { waitUntil: "networkidle", timeout: 30000 }).catch(async () => {
		await page.goto(WEB_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
	});
	await page.waitForTimeout(5000);
	await suppressOverlays(page);

	// Ensure view is set to visit
	await page.evaluate(() => {
		if (window.__useAppStore) {
			window.__useAppStore.getState().setSelectedWorkspaceRole("doctor");
			window.__useAppStore.getState().setCurrentView("visit");
		}
		window.location.hash = "visit";
	}).catch(() => {});
	await page.waitForTimeout(3000);

	// If there is an intake next button, click it
	const nextBtn = page.locator('button:has-text("Пригласить следующего"), button:has-text("Начать прием")').first();
	if (await nextBtn.isVisible().catch(() => false)) {
		await nextBtn.click().catch(() => {});
		await page.waitForTimeout(2000);
	}

	// Wait for patient content to appear
	await page.waitForSelector('text=Смирнова Анна Сергеевна, button:has-text("Завершить приём")', { timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(1000);

	await setTheme(page, theme);
	const outPath = path.join(OUT_DIR, outName);
	await page.screenshot({ path: outPath, fullPage: false });
	const size = fs.statSync(outPath).size;
	console.log(`[CAPTURED] ${outName} (${size} bytes) -> path: ${outPath}`);
	await context.close();
}

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	try {
		// 1. PC Light (1440x900)
		await captureState(browser, { width: 1440, height: 900, theme: "light", outName: "01_visit_pc_light.png" });
		// 2. PC Dark (1440x900)
		await captureState(browser, { width: 1440, height: 900, theme: "dark", outName: "02_visit_pc_dark.png" });
		// 3. Mobile Light (390x844)
		await captureState(browser, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, theme: "light", outName: "03_visit_mobile_light.png" });
		// 4. Mobile Dark (390x844)
		await captureState(browser, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, theme: "dark", outName: "04_visit_mobile_dark.png" });
	} finally {
		await browser.close();
	}
}

main().catch(err => { console.error(err); process.exit(1); });
