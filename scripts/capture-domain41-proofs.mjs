import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/02ddb86f-33a8-4b46-83fb-076e22e21bdd";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pricelist";
const SCREENSHOTS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/pricelist";

for (const d of [BRAIN_DIR, PROOFS_DIR, SCREENSHOTS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

if (!edgePath) {
	console.error("Browser executable not found!");
	process.exit(1);
}

console.log(`[CAPTURE] Launching browser at: ${edgePath}`);
const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const configs = [
	{
		filename: "01_pricelist_pc_light_1440x900.png",
		label: "PC Light (1440x900)",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
		deviceScaleFactor: 1,
	},
	{
		filename: "02_pricelist_pc_dark_1440x900.png",
		label: "PC Dark (1440x900)",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
		deviceScaleFactor: 1,
	},
	{
		filename: "03_pricelist_mobile_light_390x844.png",
		label: "Mobile Light (390x844)",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
		deviceScaleFactor: 2,
	},
	{
		filename: "04_pricelist_mobile_dark_390x844.png",
		label: "Mobile Dark (390x844)",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
		deviceScaleFactor: 2,
	},
];

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await page.waitForTimeout(500);
}

for (const cfg of configs) {
	console.log(`\n==================================================`);
	console.log(`📸 Capturing: ${cfg.filename} (${cfg.label})`);
	console.log(`==================================================`);

	const context = await browser.newContext({
		viewport: cfg.viewport,
		deviceScaleFactor: cfg.deviceScaleFactor,
		isMobile: cfg.isMobile,
		hasTouch: cfg.isMobile,
	});

	const page = await context.newPage();

	await page.addInitScript(({ theme }) => {
		window.localStorage.setItem("dente_active_session_token", "mock-session-token");
		window.localStorage.setItem("dente_user_role", "doctor");
		window.localStorage.setItem("dente_offline_mode", "false");
		window.localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
		window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-doctor");
		window.localStorage.setItem("dente_theme_mode", theme);
		window.localStorage.setItem("dente_workspace_perspective", "doctor");
		window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		window.localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}),
		);
	}, { theme: cfg.theme });

	console.log(`[Navigation] Navigating to http://127.0.0.1:5173/#prices ...`);
	await page.goto("http://127.0.0.1:5173/#prices", { waitUntil: "domcontentloaded", timeout: 45000 });

	console.log(`[Mount] Waiting for boot state to clear...`);
	await page.waitForFunction(() => !document.querySelector("main.boot-state"), null, { timeout: 45000 });
	console.log(`[Mount] App mounted!`);
	await page.waitForTimeout(1500);
	await applyTheme(page, cfg.theme);

	// Wait for pricelist studio modal to be visible
	await page.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal', { timeout: 20000 });
	await page.waitForTimeout(800);

	const proofPath = path.join(PROOFS_DIR, cfg.filename);
	const brainPath = path.join(BRAIN_DIR, cfg.filename);
	const screenshotPath = path.join(SCREENSHOTS_DIR, cfg.filename);

	await page.screenshot({ path: proofPath, fullPage: false });
	fs.copyFileSync(proofPath, brainPath);
	fs.copyFileSync(proofPath, screenshotPath);

	const stat = fs.statSync(proofPath);
	console.log(`  ✓ Successfully captured: ${cfg.filename} (${stat.size} bytes)`);

	await context.close();
}

console.log("\n[SUCCESS] All 4-State Visual Proofs for Domain 41 captured successfully!");
await browser.close();
