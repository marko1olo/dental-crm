const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = process.env.CONV_ID || "246b1737-5d91-4b56-8c6c-df40530dca14";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/patient_studio");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(600);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);
	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	try {
		fs.copyFileSync(pDocs, pBrain);
	} catch (_) {}
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
		await page.waitForTimeout(400);
	} catch (e) {
		console.warn("Theme set error:", e.message);
	}
}

async function setupPageAuth(context) {
	await context.addInitScript(() => {
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

async function openModal(page, mode = "view") {
	await page.evaluate((m) => {
		window.location.hash = m === "create" ? "patient-create" : "patient-studio";
		window.dispatchEvent(new CustomEvent("dente:open-patient-studio", { detail: { mode: m } }));
	}, mode);
	await page.waitForTimeout(500);
	await page.waitForSelector('[data-testid="patient-card-modal"], [data-testid="patient-studio-modal"]', { timeout: 10000 });
}

async function run() {
	console.log("=== STARTING PATIENT STUDIO 4-STATE PROOF CAPTURE ===");
	const browser = await chromium.launch({ headless: true });

	try {
		// 1. PC VIEWPORT: 1440x900
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		await setupPageAuth(pcContext);
		const pcPage = await pcContext.newPage();

		console.log("Navigating to PC Light view...");
		await pcPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
		await suppressOverlays(pcPage);
		await openModal(pcPage, "view");
		await setTheme(pcPage, "light");
		await saveProof(pcPage, "patient_studio_pc_light_1440x900.png");

		// PC Dark
		console.log("Switching to PC Dark...");
		await setTheme(pcPage, "dark");
		await saveProof(pcPage, "patient_studio_pc_dark_1440x900.png");

		await pcContext.close();

		// 2. MOBILE VIEWPORT: 390x844 (Apple HIG)
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		await setupPageAuth(mobileContext);
		const mobilePage = await mobileContext.newPage();

		console.log("Navigating to Mobile Light view...");
		await mobilePage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
		await suppressOverlays(mobilePage);
		await openModal(mobilePage, "view");
		await setTheme(mobilePage, "light");
		await saveProof(mobilePage, "patient_studio_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Switching to Mobile Dark...");
		await setTheme(mobilePage, "dark");
		await saveProof(mobilePage, "patient_studio_mobile_dark_390x844.png");

		await mobileContext.close();
		console.log("All 4-state proofs captured successfully!");
	} catch (err) {
		console.error("Error capturing proofs:", err);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
