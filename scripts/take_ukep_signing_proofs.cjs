const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "76480d22-918a-49a9-879a-4fdeda097c2e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/ukep");
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
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
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
		localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000001");
		localStorage.setItem("dente_clinic_token", "test-clinic-token-proof");
		localStorage.setItem("dente_staff_token", "test-staff-token-proof");
		localStorage.setItem("dente_active_session_token", "test-staff-token-proof");
		localStorage.setItem("dente_user_id", "doc-1");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_user_name", "Д-р Орлов А.В. (Главный врач)");
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
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			theme: "light",
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	});
}

async function run() {
	console.log("=== STARTING RED TEAM UKEP SIGNING VISUAL PROOF CAPTURE ===");

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

		console.log("Navigating PC page to http://127.0.0.1:5174/?ukep=1#ukep ...");
		await pcPage.goto("http://127.0.0.1:5174/?ukep=1#ukep", { waitUntil: "domcontentloaded", timeout: 15000 });
		await pcPage.waitForTimeout(2000);
		await suppressOverlays(pcPage);

		// Ждем появления модалки УКЭП
		await pcPage.waitForSelector('[data-testid="ukep-signing-modal-root"]', { timeout: 10000 });

		// Light PC
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "01_ukep_signing_pc_light_1440x900.png");

		// Dark PC
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "02_ukep_signing_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. Мобильная среда (390x844 Apple HIG iPhone 14/15)
		console.log("\n--- 2. Mobile Smartphone 390x844 Context ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await setupPageAuth(mobileContext);
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating Mobile page to http://127.0.0.1:5174/?ukep=1#ukep ...");
		await mobilePage.goto("http://127.0.0.1:5174/?ukep=1#ukep", { waitUntil: "domcontentloaded", timeout: 15000 });
		await mobilePage.waitForTimeout(2000);
		await suppressOverlays(mobilePage);

		await mobilePage.waitForSelector('[data-testid="ukep-signing-modal-root"]', { timeout: 10000 });

		// Light Mobile
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "03_ukep_signing_mobile_light_390x844.png");

		// Dark Mobile
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "04_ukep_signing_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n=== ALL 4 UKEP SIGNING VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
