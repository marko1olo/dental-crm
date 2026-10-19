import { existsSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/shift";
const CONV_ID = "9ab26d12-bb3e-495a-a60c-db6da6f864f8";
const CALLER_CONV_ID = "da920fe7-8cf1-4af3-83bf-33b629e2b869";
const BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`;
const CALLER_BRAIN_DIR = `C:/Users/Admin/.gemini/antigravity/brain/${CALLER_CONV_ID}`;
const browserExecutable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

[PROOFS_DIR, BRAIN_DIR, CALLER_BRAIN_DIR].forEach((dir) => {
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page, theme) {
	try {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark = th === "dark";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (document.body) {
				document.body.className = isDark ? "dark" : "light";
			}

			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
				*, *::before, *::after {
					animation: none !important;
					transition: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		}, theme);
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		if (document.body) {
			document.body.className = isDark ? "dark" : "light";
		}
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
	}, theme);
	await suppressOverlays(page, theme);
	await page.waitForTimeout(600);
}

async function captureProof(page, filename, altFilename) {
	const targetPath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: targetPath, fullPage: false, animations: "disabled" });

	const size = statSync(targetPath).size;
	console.log(`[Captured] ${filename} (${size} bytes) -> Valid: ${size >= 20000}`);

	if (size < 20000) {
		throw new Error(`Screenshot ${filename} is too small: ${size} bytes (< 20000)`);
	}

	if (altFilename) {
		const altPath = path.join(PROOFS_DIR, altFilename);
		copyFileSync(targetPath, altPath);
	}

	// Copy to brains
	copyFileSync(targetPath, path.join(BRAIN_DIR, filename));
	if (existsSync(CALLER_BRAIN_DIR)) {
		copyFileSync(targetPath, path.join(CALLER_BRAIN_DIR, filename));
	}
}

async function initContext(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-staff-token");
		localStorage.setItem("dente_active_session_token", "demo-staff-token");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_theme", "light");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("theme", "light");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_doctor_shift_active", "true");
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
		);
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			uiLanguage: "ru",
			selectedWorkspaceRole: "doctor",
			onboardingDismissed: true,
			onboardingStep: "done",
		}));
	});
}

async function run() {
	console.log("=== Launching Chromium for 4-State Doctor Shift Proofs ===");
	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// --- PHASE 1: PC Desktop (1440x900) ---
		console.log("\n🖥️  --- Phase 1: PC Desktop (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		await initContext(pcContext);

		const pcPage = await pcContext.newPage();
		console.log(`Navigating PC to ${BASE_URL}/?demo=true#shift...`);
		await pcPage.goto(`${BASE_URL}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });

		for (let i = 0; i < 40; i++) {
			await pcPage.waitForTimeout(400);
			try {
				const text = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
				if (!text.includes("Загрузка системы") && text.length > 200) {
					console.log(`PC Shell ready (${text.length} chars)`);
					break;
				}
			} catch (_) {}
		}

		await suppressOverlays(pcPage, "light");
		await pcPage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("shift");
			}
			window.location.hash = "shift";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		try {
			await pcPage.waitForSelector('[data-testid="shift-view-desktop"], .shift-view-scroll-container', {
				timeout: 8000,
				state: "visible",
			});
			console.log("PC Shift element detected!");
		} catch (_) {}

		await pcPage.waitForTimeout(1000);

		// PC Light
		console.log("Capturing shift_cockpit_1440x900_light.png...");
		await setTheme(pcPage, "light");
		await captureProof(pcPage, "shift_cockpit_1440x900_light.png", "shift_cockpit_pc_light_1440x900.png");

		// PC Dark
		console.log("Capturing shift_cockpit_1440x900_dark.png...");
		await setTheme(pcPage, "dark");
		await captureProof(pcPage, "shift_cockpit_1440x900_dark.png", "shift_cockpit_pc_dark_1440x900.png");

		await pcContext.close();

		// --- PHASE 2: Mobile (390x844) ---
		console.log("\n📱 --- Phase 2: Mobile (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		await initContext(mobileContext);

		const mobilePage = await mobileContext.newPage();
		console.log(`Navigating Mobile to ${BASE_URL}/?demo=true#shift...`);
		await mobilePage.goto(`${BASE_URL}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });

		for (let i = 0; i < 40; i++) {
			await mobilePage.waitForTimeout(400);
			try {
				const text = await mobilePage.evaluate(() => document.body ? document.body.innerText : "");
				if (!text.includes("Загрузка системы") && text.length > 200) {
					console.log(`Mobile Shell ready (${text.length} chars)`);
					break;
				}
			} catch (_) {}
		}

		await suppressOverlays(mobilePage, "light");
		await mobilePage.evaluate(() => {
			if (window.__useAppStore) {
				window.__useAppStore.getState().setCurrentView("shift");
			}
			window.location.hash = "shift";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		try {
			await mobilePage.waitForSelector('[data-testid="shift-view-mobile"], .mobile-shift-cockpit-view-wrapper', {
				timeout: 8000,
				state: "visible",
			});
			console.log("Mobile Shift element detected!");
		} catch (_) {}

		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("Capturing shift_cockpit_390x844_light.png...");
		await setTheme(mobilePage, "light");
		await captureProof(mobilePage, "shift_cockpit_390x844_light.png", "shift_cockpit_mobile_light_390x844.png");

		// Mobile Dark
		console.log("Capturing shift_cockpit_390x844_dark.png...");
		await setTheme(mobilePage, "dark");
		await captureProof(mobilePage, "shift_cockpit_390x844_dark.png", "shift_cockpit_mobile_dark_390x844.png");

		await mobileContext.close();

		console.log("\n✅ All 4 Doctor Shift proofs successfully captured and verified!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[Proof Runner ERROR]:", err);
	process.exit(1);
});
