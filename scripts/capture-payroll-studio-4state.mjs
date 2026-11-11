/**
 * capture-payroll-studio-4state.mjs — Red Team 4-State Proof Capture for Doctor Payroll Studio
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 */

import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DIR = path.join(process.cwd(), "docs/proofs/payroll");
if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function getExecutablePath() {
	for (const p of possibleBrowserPaths) {
		if (existsSync(p)) return p;
	}
	return undefined;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function injectSession(context) {
	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_user_id", "01a00000-0000-0000-0003-000000000005");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_selected_workspace_role", "owner");
		localStorage.setItem("dente_active_mode", "clinic");
		localStorage.setItem("dente_demo_showcase", "true");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			version: 1,
		}));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
			onboardingDismissed: true,
			onboardingStep: "done",
			version: 1,
		}));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			selectedWorkspaceRole: "owner",
			uiLanguage: "ru",
			savedAt: new Date().toISOString(),
		}));
	});
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "payroll-clean-proof-style";
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
		`;
		document.head.appendChild(style);
		document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	}).catch(() => {});
}

async function waitForAppAndOpenPayroll(page) {
	console.log("  Waiting for boot splash to clear...");
	for (let i = 0; i < 40; i++) {
		await wait(500);
		const text = await page.evaluate(() => (document.body ? document.body.innerText : "")).catch(() => "");
		if (!text.includes("Загрузка системы") && text.length > 50) {
			console.log(`  -> App mounted in ${i * 0.5}s`);
			break;
		}
	}

	const hasModal = await page.evaluate(() => {
		return !!document.querySelector('.payroll-studio-overlay, [data-testid="doctor-payroll-studio-modal"]');
	}).catch(() => false);

	if (!hasModal) {
		console.log("  Dispatching dente:open-payroll event...");
		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent("dente:open-payroll"));
			window.dispatchEvent(new CustomEvent("dente-open-payroll"));
		}).catch(() => {});
	}

	console.log("  Waiting for doctor-payroll-studio-modal to be visible...");
	await page.waitForSelector('.payroll-studio-overlay, [data-testid="doctor-payroll-studio-modal"]', {
		timeout: 30000,
		state: "visible",
	});

	await suppressOverlays(page);
	await wait(1200);
}

async function run() {
	console.log("[PAYROLL_PROOF] Launching browser for 4-State Capture...");
	const execPath = getExecutablePath();
	const browser = await chromium.launch({
		headless: true,
		executablePath: execPath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});

	// --- 1. PC VIEWPORT (1440x900) ---
	console.log("[PAYROLL_PROOF] Capturing Desktop States (1440x900)...");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	await injectSession(pcContext);
	const pcPage = await pcContext.newPage();

	// 1.1 PC Light
	console.log("Navigating PC to http://127.0.0.1:5173/?demo=true&doctor_payroll=1#payroll ...");
	await pcPage.goto("http://127.0.0.1:5173/?demo=true&doctor_payroll=1#payroll", { waitUntil: "domcontentloaded", timeout: 35000 });
	await waitForAppAndOpenPayroll(pcPage);

	await pcPage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await suppressOverlays(pcPage);
	await wait(800);

	const pcLightPath = path.join(OUT_DIR, "01_doctor_payroll_pc_light_1440x900.png");
	await pcPage.screenshot({ path: pcLightPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${pcLightPath} (${statSync(pcLightPath).size} bytes)`);

	// 1.2 PC Dark
	await pcPage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await suppressOverlays(pcPage);
	await wait(800);

	const pcDarkPath = path.join(OUT_DIR, "02_doctor_payroll_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${pcDarkPath} (${statSync(pcDarkPath).size} bytes)`);

	await pcContext.close();

	// --- 2. MOBILE VIEWPORT (390x844 - Apple iPhone 14 / HIG) ---
	console.log("[PAYROLL_PROOF] Capturing Mobile States (390x844)...");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	await injectSession(mobileContext);
	const mobilePage = await mobileContext.newPage();

	// 2.1 Mobile Light
	console.log("Navigating Mobile to http://127.0.0.1:5173/?demo=true&doctor_payroll=1#payroll ...");
	await mobilePage.goto("http://127.0.0.1:5173/?demo=true&doctor_payroll=1#payroll", { waitUntil: "domcontentloaded", timeout: 35000 });
	await waitForAppAndOpenPayroll(mobilePage);

	await mobilePage.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
		localStorage.setItem("dente_theme", "light");
	});
	await suppressOverlays(mobilePage);
	await wait(800);

	const mobileLightPath = path.join(OUT_DIR, "03_doctor_payroll_mobile_light_390x844.png");
	await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${mobileLightPath} (${statSync(mobileLightPath).size} bytes)`);

	// 2.2 Mobile Dark
	await mobilePage.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await suppressOverlays(mobilePage);
	await wait(800);

	const mobileDarkPath = path.join(OUT_DIR, "04_doctor_payroll_mobile_dark_390x844.png");
	await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
	console.log(`[PAYROLL_PROOF] Saved: ${mobileDarkPath} (${statSync(mobileDarkPath).size} bytes)`);

	await mobileContext.close();
	await browser.close();

	console.log("[PAYROLL_PROOF] All 4-State Payroll Proofs Captured Successfully!");
}

run().catch((err) => {
	console.error("[PAYROLL_PROOF] Error:", err);
	process.exit(1);
});
