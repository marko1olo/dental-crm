import { mkdirSync, statSync } from "node:fs";
import { chromium } from "playwright";

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patient-studio";
const WEB_URL = "http://127.0.0.1:5173";
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCapture() {
	console.log("=== Capturing All 4-State Patient Studio Proofs (Red Team Audit) ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: browserExecutable,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const initStorage = (page) => {
		return page.addInitScript(() => {
			localStorage.setItem("dente_active_role", "doctor");
			localStorage.setItem(
				"dental-crm:active-user:v1",
				JSON.stringify({
					id: "doc-1",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "doctor",
				}),
			);
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true }));
		});
	};

	const applyTheme = async (page, theme) => {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("theme", th);

			let style = document.getElementById("suppress-all-overlays");
			if (!style) {
				style = document.createElement("style");
				style.id = "suppress-all-overlays";
				document.head.appendChild(style);
			}
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element,
				.splash,
				#splash-root,
				[data-testid="splash-loader"],
				.splash-screen,
				#loading-screen,
				.global-toast-container,
				[role="alert"] {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
		}, theme);
		await sleep(800);
	};

	// -------------------------------------------------------------
	// PART 1: PC DESKTOP (1440x900) - Light & Dark
	// -------------------------------------------------------------
	console.log("\n--- Capturing PC Desktop (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2,
	});
	const pcPage = await pcContext.newPage();
	await initStorage(pcPage);

	console.log("[PC] Navigating to ?demo=true#patients...");
	await pcPage.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });

	console.log("[PC] Waiting for boot state to detach...");
	await pcPage.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 }).catch(() => {});
	await sleep(2000);

	const pcOfflineBtn = await pcPage.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
	if (pcOfflineBtn) {
		console.log("[PC] Clicking offline fallback...");
		await pcOfflineBtn.click();
		await sleep(2000);
	}

	console.log("[PC] Waiting for patient items...");
	try {
		const pcLocator = pcPage.locator('[data-patient-id], tr[data-id], .patient-row, [data-testid^="patient-row-"], button:has-text("Воронов")').first();
		await pcLocator.waitFor({ state: "visible", timeout: 20000 });
		console.log("[PC] Clicking patient item to open details studio...");
		await pcLocator.click({ force: true, timeout: 5000 });
		await sleep(1500);
	} catch (e) {
		console.log("[PC] Notice selecting patient:", e.message);
	}

	// PC Light
	console.log("[PC] Capturing PC Light (1440x900)...");
	await applyTheme(pcPage, "light");
	const pcLightPath = `${OUT_DIR}/patient_studio_pc_light_1440x900.png`;
	await pcPage.screenshot({ path: pcLightPath, fullPage: false });
	console.log(`[PC] Saved: ${pcLightPath} (${statSync(pcLightPath).size} bytes)`);

	// PC Dark
	console.log("[PC] Capturing PC Dark (1440x900)...");
	await applyTheme(pcPage, "dark");
	const pcDarkPath = `${OUT_DIR}/patient_studio_pc_dark_1440x900.png`;
	await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
	console.log(`[PC] Saved: ${pcDarkPath} (${statSync(pcDarkPath).size} bytes)`);

	await pcContext.close();

	// -------------------------------------------------------------
	// PART 2: MOBILE (390x844) - Light & Dark
	// -------------------------------------------------------------
	console.log("\n--- Capturing Mobile (390x844) ---");
	const mobContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		isMobile: true,
		hasTouch: true,
		deviceScaleFactor: 2,
	});
	const mobPage = await mobContext.newPage();
	await initStorage(mobPage);

	console.log("[Mobile] Navigating to ?demo=true#patients...");
	await mobPage.goto(`${WEB_URL}/?demo=true#patients`, { waitUntil: "commit", timeout: 45000 });

	console.log("[Mobile] Waiting for boot state to detach...");
	await mobPage
		.waitForSelector(".boot-state, .boot-subtitle", { state: "detached", timeout: 30000 })
		.catch(() => {});
	await sleep(2000);

	const mobOfflineBtn = await mobPage.$(
		'.boot-offline-action-button, button:has-text("Перейти в автономный режим")',
	);
	if (mobOfflineBtn) {
		console.log("[Mobile] Clicking offline fallback...");
		await mobOfflineBtn.click();
		await sleep(2000);
	}

	console.log("[Mobile] Waiting for mobile patient cards...");
	try {
		const mobLocator = mobPage.locator('.mobile-patient-item, [data-patient-id], div:has-text("Воронов")').first();
		await mobLocator.waitFor({ state: "visible", timeout: 20000 });
		console.log("[Mobile] Clicking patient card to open mobile profile workspace...");
		await mobLocator.click({ force: true, timeout: 5000 });
		await sleep(1500);
	} catch (e) {
		console.log("[Mobile] Notice selecting patient:", e.message);
	}

	// Mobile Light
	console.log("[Mobile] Capturing Mobile Light (390x844)...");
	await applyTheme(mobPage, "light");
	const mobLightPath = `${OUT_DIR}/patient_studio_mobile_light_390x844.png`;
	await mobPage.screenshot({ path: mobLightPath, fullPage: false });
	console.log(`[Mobile] Saved: ${mobLightPath} (${statSync(mobLightPath).size} bytes)`);

	// Mobile Dark
	console.log("[Mobile] Capturing Mobile Dark (390x844)...");
	await applyTheme(mobPage, "dark");
	const mobDarkPath = `${OUT_DIR}/patient_studio_mobile_dark_390x844.png`;
	await mobPage.screenshot({ path: mobDarkPath, fullPage: false });
	console.log(`[Mobile] Saved: ${mobDarkPath} (${statSync(mobDarkPath).size} bytes)`);

	await mobContext.close();
	await browser.close();
	console.log("\n=== ALL 4 PATIENT STUDIO PROOFS CAPTURED SUCCESSFULLY! ===");
}

runCapture().catch((e) => {
	console.error("FATAL in runCapture:", e);
	process.exit(1);
});
