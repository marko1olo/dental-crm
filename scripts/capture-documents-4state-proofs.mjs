import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/documents");
if (!existsSync(PROOFS_DIR)) {
	mkdirSync(PROOFS_DIR, { recursive: true });
}

// 1. Get real auth token from API server
console.log("[AUTH] Logging in via http://127.0.0.1:4100/api/auth/login...");
const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
});
const auth = await loginRes.json();
console.log(`[AUTH] Authenticated user: ${auth.user.fullName}, role: ${auth.user.role}`);

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const browserPath = possibleBrowserPaths.find((p) => existsSync(p));
console.log(`[BROWSER] Found browser executable: ${browserPath}`);

const launchOptions = {
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
};
if (browserPath) {
	launchOptions.executablePath = browserPath;
}

const browser = await chromium.launch(launchOptions);

const configs = [
	{
		name: "pc_light_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		name: "pc_dark_1440x900",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		name: "mobile_light_390x844",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		name: "mobile_dark_390x844",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

for (const cfg of configs) {
	console.log(`[CAPTURE] Capturing ${cfg.name}...`);
	const context = await browser.newContext({
		viewport: cfg.viewport,
		isMobile: cfg.isMobile,
		hasTouch: cfg.isMobile,
		locale: "ru-RU",
	});

	await context.addInitScript(({ cTok, sTok, uid, fn, theme }) => {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
		localStorage.setItem("dente_user_id", uid);
		localStorage.setItem("dente_user_name", fn);
		localStorage.setItem("dente_user_role", "doctor");
		localStorage.setItem("dente_role", "doctor");
		localStorage.setItem("dente_perspective", "doctor");
		localStorage.setItem("dente-theme", theme);
		localStorage.setItem("dente_theme", theme);
		localStorage.setItem("theme", theme);
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_active_patient_id", "01a00000-0000-0000-0000-000000000001");

		document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
		document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
	}, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		uid: auth.user.id,
		fn: auth.user.fullName,
		theme: cfg.theme,
	});

	const page = await context.newPage();
	page.on("pageerror", (err) => console.log(`[PAGE ERROR ${cfg.name}]:`, err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log(`[BROWSER CONSOLE ERROR ${cfg.name}]:`, msg.text());
		}
	});

	await page.goto("http://127.0.0.1:5173/?demo=true#documents", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});

	// Wait for splash screen to disappear
	await page.waitForSelector(':has-text("Загрузка CRM")', { state: "detached", timeout: 15000 }).catch(() => {});

	// Ensure theme is applied on root
	await page.evaluate(({ theme }) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.remove("light", "dark");
		document.documentElement.classList.add(theme);
		window.location.hash = "#documents";
	}, { theme: cfg.theme });

	// Wait for documents container to render and finish suspense loading
	await page.waitForSelector('#documents:not([aria-busy="true"])', { timeout: 15000 }).catch((e) => {
		console.log(`[WARN] Timeout waiting for #documents:not([aria-busy="true"]): ${e.message}`);
	});

	await page.waitForTimeout(3000);

	const targetPath = path.join(PROOFS_DIR, `${cfg.name}.png`);
	await page.screenshot({ path: targetPath, fullPage: false });

	const stats = statSync(targetPath);
	console.log(`[SAVED] ${targetPath} (${Math.round(stats.size / 1024)} KB)`);

	if (stats.size < 20 * 1024) {
		throw new Error(`[ERROR] Screenshot ${cfg.name} is too small: ${stats.size} bytes (< 20 KB floor)!`);
	}

	await context.close();
}

await browser.close();
console.log("[SUCCESS] All 4 visual proof states captured cleanly!");
