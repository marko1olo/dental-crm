const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "fe642dbc-172b-4611-aeb6-da8e1a5c658c";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/implants");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);
	const size = fs.statSync(pDocs).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
}

async function setTheme(page, theme) {
	try {
		await page.evaluate((th) => {
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(th);
			}
			document.documentElement.setAttribute("data-theme", th);
			const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.classList.toggle("dark", isDark);
			document.body.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			try {
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_theme", th);
			} catch (_) {}
		}, theme);
	} catch (_) {}
	await page.waitForTimeout(500);
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Воронов А. В.");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_mode", "true");
		localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_demo_mode", "true");
	});
}

async function run() {
	console.log("=== STARTING IMPLANTS & SURGERY 4-STATE VISUAL PROOF CAPTURE ===");
	
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// 1. Десктопная среда (1440x900)
		console.log("\n--- 1. Desktop PC 1440x900 Context ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupPageAuth(pcContext);
		const pcPage = await pcContext.newPage();

		console.log("Navigating PC page to http://127.0.0.1:5173/?implant=1#implant ...");
		await pcPage.goto("http://127.0.0.1:5173/?implant=1#implant", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});

		console.log("Waiting for ChairsideSurgeryHubModal in DOM...");
		await pcPage.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', {
			state: "visible",
			timeout: 25000,
		});
		await pcPage.waitForTimeout(600);

		// Снимок 1: PC Light (1440x900)
		console.log("Capturing 01_implant_catalog_pc_light_1440x900.png...");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_implant_catalog_pc_light_1440x900.png");

		// Снимок 2: PC Dark (1440x900)
		console.log("Capturing 02_implant_catalog_pc_dark_1440x900.png...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_implant_catalog_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. Мобильная среда (390x844)
		console.log("\n--- 2. Mobile 390x844 Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupPageAuth(mobileContext);
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating Mobile page to http://127.0.0.1:5173/?implant=1#implant ...");
		await mobilePage.goto("http://127.0.0.1:5173/?implant=1#implant", {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});

		console.log("Waiting for Mobile ChairsideSurgeryHubModal in DOM...");
		await mobilePage.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', {
			state: "visible",
			timeout: 25000,
		});
		await mobilePage.waitForTimeout(600);

		// Снимок 3: Mobile Light (390x844)
		console.log("Capturing 03_implant_catalog_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_implant_catalog_mobile_light_390x844.png");

		// Снимок 4: Mobile Dark (390x844)
		console.log("Capturing 04_implant_catalog_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_implant_catalog_mobile_dark_390x844.png");

		await mobileContext.close();
		await browser.close();

		console.log("\n=== ALL 4 IMPLANT 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED! ===");
	} catch (err) {
		console.error("CAPTURE ERROR:", err);
		if (browser) await browser.close();
		process.exit(1);
	}
}

run();
