import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const CURRENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/5b23b30b-d739-49cd-8dde-dbb41cdaaf11";
const DOCS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/pricelist";

for (const d of [CURRENT_BRAIN_DIR, DOCS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));
if (!browserPath) {
	console.error("[FATAL] Browser executable not found!");
	process.exit(1);
}

console.log(`[CAPTURE] Launching browser at: ${browserPath}`);
const browser = await chromium.launch({
	executablePath: browserPath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const configs = [
	{
		key: "pc_light",
		fileName: "01_pricelist_pc_light.png",
		label: "PC Light (1440x900)",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
		deviceScaleFactor: 1,
	},
	{
		key: "pc_dark",
		fileName: "02_pricelist_pc_dark.png",
		label: "PC Dark (1440x900)",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
		deviceScaleFactor: 1,
	},
	{
		key: "mobile_light",
		fileName: "03_pricelist_mobile_light.png",
		label: "Mobile Light (390x844)",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
		deviceScaleFactor: 2,
	},
	{
		key: "mobile_dark",
		fileName: "04_pricelist_mobile_dark.png",
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

try {
	for (const cfg of configs) {
		console.log(`\n==================================================`);
		console.log(`📸 Capturing: ${cfg.label} -> ${cfg.fileName}`);
		console.log(`==================================================`);

		const context = await browser.newContext({
			viewport: cfg.viewport,
			deviceScaleFactor: cfg.deviceScaleFactor,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		const page = await context.newPage();

		await page.addInitScript(({ theme }) => {
			const OriginalWebSocket = window.WebSocket;
			window.WebSocket = function (...args) {
				if (args[0] && String(args[0]).includes(":5173")) {
					return {
						addEventListener() {},
						removeEventListener() {},
						send() {},
						close() {},
					};
				}
				return new OriginalWebSocket(...args);
			};

			window.localStorage.setItem("dente_active_session_token", "mock-session-token");
			window.localStorage.setItem("dente_user_role", "doctor");
			window.localStorage.setItem("dente_offline_mode", "false");
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

		console.log(`[Navigation] Navigating to http://127.0.0.1:5173/?pricelist=1 ...`);
		let loaded = false;
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				await page.goto("http://127.0.0.1:5173/?pricelist=1", { waitUntil: "commit", timeout: 20000 });
				loaded = true;
				break;
			} catch (e) {
				console.warn(`[Navigation] Attempt ${attempt} failed: ${e.message}, retrying...`);
				await page.waitForTimeout(2000);
			}
		}

		if (!loaded) {
			throw new Error("Failed to load http://127.0.0.1:5173/?pricelist=1 after 3 attempts");
		}

		console.log(`[Mount] Waiting for boot state to clear...`);
		await page.waitForFunction(() => !document.querySelector("main.boot-state"), null, { timeout: 45000 });
		console.log(`[Mount] App mounted!`);
		await page.waitForTimeout(1000);
		await applyTheme(page, cfg.theme);

		console.log(`[Selector] Waiting for pricelist modal...`);
		await page.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal, .service-pricelist-modal, .pricelist-modal-container', { timeout: 25000 });
		await page.waitForTimeout(1000);

		const docPath = path.join(DOCS_DIR, cfg.fileName);
		const brainPath = path.join(CURRENT_BRAIN_DIR, cfg.fileName);
		await page.screenshot({ path: docPath, fullPage: false });
		fs.copyFileSync(docPath, brainPath);

		const stats = fs.statSync(docPath);
		console.log(`[SUCCESS] ${cfg.fileName} captured: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

		await context.close();
	}

	console.log("\n==================================================");
	console.log("✓ ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED!");
	console.log("==================================================");
} finally {
	await browser.close();
}
