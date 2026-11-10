const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "13e59011-6736-4b27-825a-088e16a45d73";
const PORT = process.env.PORT || "5175";
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
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
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_active_org_id", "org-1");
		localStorage.setItem("dente_demo_showcase", "true");
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
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. CHAIRSIDE HUD (1440x900)
		// ==========================================
		const hudContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		await setupPageAuth(hudContext);

		const hudPage = await hudContext.newPage();
		console.log(`Navigating to ${BASE_URL}/?demo=true&hud=open...`);
		await hudPage.goto(`${BASE_URL}/?demo=true&hud=open`, { waitUntil: "commit", timeout: 30000 });
		await hudPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
		await hudPage.waitForTimeout(2000);

		await hudPage.evaluate(() => {
			if (window.__denteCopilot?.openHud) {
				window.__denteCopilot.openHud();
			}
			window.dispatchEvent(new CustomEvent("dente:open-copilot-hud", {
				detail: { activeTooth: 16 }
			}));
		});

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

		// ==========================================
		// 2. MOBILE HUD (390x844)
		// ==========================================
		console.log("Capturing Mobile Chairside HUD (390x844)...");
		await hudPage.setViewportSize({ width: 390, height: 844 });
		await hudPage.waitForTimeout(800);

		console.log("Capturing 06_copilot_chairside_hud_mobile_light_390x844.png...");
		await setTheme(hudPage, "light");
		await saveProof(hudPage, "06_copilot_chairside_hud_mobile_light_390x844.png");

		console.log("Capturing 07_copilot_chairside_hud_mobile_dark_390x844.png...");
		await setTheme(hudPage, "dark");
		await saveProof(hudPage, "07_copilot_chairside_hud_mobile_dark_390x844.png");

		await hudContext.close();

		console.log("[HUD & Mobile Proof Runner] Completed successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[HUD & Mobile Proof ERROR]:", err);
	process.exit(1);
});
