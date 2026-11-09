const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "d2b0c89e-8ca0-4f0c-9986-9fb713a44427";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/copilot");
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
	console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 25000}`);
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
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.body.classList.add("light");
			document.body.classList.remove("dark");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(500);
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_active_user_id", "user-1");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_active_org_id", "org-1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			onboardingDraftMode: false,
		}));
	});
}

async function run() {
	console.log("[HUD & Mobile Proof Runner] Launching Playwright...");
	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. CHAIRSIDE HUD (1440x900)
		// ==========================================
		const hudContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(hudContext);

		const hudPage = await hudContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?hud=open...");
		await hudPage.goto("http://127.0.0.1:5173/?hud=open", { waitUntil: "domcontentloaded", timeout: 30000 });
		await hudPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 20000 });
		await hudPage.waitForTimeout(1000);

		// HUD Light
		console.log("Capturing 04_copilot_chairside_hud_pc_light_1440x900.png...");
		await setTheme(hudPage, "light");
		await saveProof(hudPage, "04_copilot_chairside_hud_pc_light_1440x900.png");

		// HUD Dark
		console.log("Capturing 05_copilot_chairside_hud_pc_dark_1440x900.png...");
		await setTheme(hudPage, "dark");
		await saveProof(hudPage, "05_copilot_chairside_hud_pc_dark_1440x900.png");

		await hudContext.close();

		// ==========================================
		// 2. MOBILE VIEWPORT (390x844)
		// ==========================================
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
		});
		await setupPageAuth(mobileContext);

		const mobilePage = await mobileContext.newPage();
		console.log("Navigating to http://127.0.0.1:5173/?copilot=1 (Mobile)...");
		await mobilePage.goto("http://127.0.0.1:5173/?copilot=1", { waitUntil: "domcontentloaded", timeout: 30000 });
		await mobilePage.waitForSelector('[data-testid="chairside-copilot-studio-root"]', { state: "visible", timeout: 20000 });
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing 08_copilot_studio_mobile_light_390x844.png...");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "08_copilot_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing 09_copilot_studio_mobile_dark_390x844.png...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "09_copilot_studio_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("[HUD & Mobile Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[HUD & Mobile Proof ERROR]:", err);
	process.exit(1);
});
