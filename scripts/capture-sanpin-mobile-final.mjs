import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/sanpin";
const WEB_URL = "http://127.0.0.1:5173";

await mkdir(PROOFS_DIR, { recursive: true });

async function initContext(context, theme) {
	await context.addInitScript(({ themeMode }) => {
		const dummyUser = {
			id: "demo-doctor-chief",
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
		};
		localStorage.setItem("dente_clinic_token", "demo-clinic-token-12345");
		localStorage.setItem("dente_staff_token", "demo-staff-token-12345");
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(dummyUser));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(dummyUser));
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_offline_autonomy_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_doctor_training_completed", "true");
		localStorage.setItem("dente_training_dismissed", "true");
		localStorage.setItem("dente_theme_mode", themeMode);
		localStorage.setItem("dente_theme", themeMode);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
	}, { themeMode: theme });
}

async function preparePage(page, theme) {
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForTimeout(1500);

	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
		).forEach((el) => el.remove());
	}, theme);

	await page.waitForTimeout(600);
}

async function captureScreen(page, filename) {
	const filePath = path.join(PROOFS_DIR, filename);
	await page.screenshot({ path: filePath, fullPage: false });
	const fileStat = await stat(filePath);
	console.log(`[Screenshot] Saved: ${filePath} (${(fileStat.size / 1024).toFixed(1)} KB)`);
}

async function run() {
	console.log("Launching Edge browser via Playwright...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	} catch {
		browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
	}

	try {
		// 1. Mobile Light (390x844)
		console.log("\n--- Capturing Mobile Light (390x844) ---");
		const contextMobLight = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "light",
		});
		await initContext(contextMobLight, "light");
		const pageMobLight = await contextMobLight.newPage();
		await pageMobLight.goto(`${WEB_URL}/?demo=true#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await preparePage(pageMobLight, "light");
		await captureScreen(pageMobLight, "mobile_light_sanpin_sterilization_390x844.png");
		await contextMobLight.close();

		// 2. Mobile Dark (390x844)
		console.log("\n--- Capturing Mobile Dark (390x844) ---");
		const contextMobDark = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			colorScheme: "dark",
		});
		await initContext(contextMobDark, "dark");
		const pageMobDark = await contextMobDark.newPage();
		await pageMobDark.goto(`${WEB_URL}/?demo=true#scanner`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await preparePage(pageMobDark, "dark");
		await captureScreen(pageMobDark, "mobile_dark_sanpin_sterilization_390x844.png");
		await contextMobDark.close();

		console.log("Both Mobile screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Screenshot capture failed:", err);
	process.exit(1);
});
