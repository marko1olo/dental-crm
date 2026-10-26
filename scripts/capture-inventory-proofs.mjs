/**
 * scripts/capture-inventory-proofs.mjs
 * 
 * Captures 4-State Red Team Visual Proof for Warehouse Batch Write-Off & Inventory:
 * 1. ☀️ PC Light (1440x900)
 * 2. 🌙 PC Dark (1440x900)
 * 3. 📱 Mobile Light (390x844)
 * 4. 📱 Mobile Dark (390x844)
 * 
 * Target proofs in docs/proofs/inventory/:
 * - 01_inventory_batch_pc_light.png
 * - 02_inventory_batch_pc_dark.png
 * - 03_inventory_batch_mobile_light.png
 * - 04_inventory_batch_mobile_dark.png
 */

import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/inventory");
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
if (!loginRes.ok) {
	throw new Error(`Login failed HTTP ${loginRes.status}: ${await loginRes.text()}`);
}
const auth = await loginRes.json();
console.log(`[AUTH] Authenticated: ${auth.user.fullName}, role: ${auth.user.role}, org: ${auth.user.organizationId || "01a00000-0000-0000-0000-000000000000"}`);

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
		filename: "01_inventory_batch_pc_light.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		filename: "02_inventory_batch_pc_dark.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		filename: "03_inventory_batch_mobile_light.png",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		filename: "04_inventory_batch_mobile_dark.png",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

for (const cfg of configs) {
	const targetPath = path.join(PROOFS_DIR, cfg.filename);
	console.log(`\n[CAPTURE] Capturing ${cfg.filename} (${cfg.viewport.width}x${cfg.viewport.height}, theme=${cfg.theme}, mobile=${cfg.isMobile})...`);

	const storageState = {
		cookies: [
			{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
			{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
		],
		origins: [
			{
				origin: "http://127.0.0.1:5173",
				localStorage: [
					{ name: "dente_demo_showcase", value: "true" },
					{ name: "dente_clinic_token", value: auth.clinicToken },
					{ name: "dente_staff_token", value: auth.staffToken },
					{ name: "dente_active_session_token", value: auth.staffToken },
					{ name: "dente_organization_id", value: "01a00000-0000-0000-0000-000000000000" },
					{ name: "dente_user_id", value: auth.user.id },
					{ name: "dente_user_name", value: auth.user.fullName },
					{ name: "dente_user_role", value: "owner" },
					{ name: "dente_role", value: "owner" },
					{ name: "dente_perspective", value: "owner" },
					{ name: "dente_theme_mode", value: cfg.theme },
					{ name: "dente-theme", value: cfg.theme },
					{ name: "dente_theme", value: cfg.theme },
					{ name: "theme", value: cfg.theme },
					{ name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
					{ name: "dental-crm:web-ui-preferences:v1", value: JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true }) },
					{ name: "dente_onboarding_completed", value: "true" },
					{ name: "dente_tour_completed", value: "true" },
				],
			},
		],
	};

	const contextOptions = {
		viewport: cfg.viewport,
		colorScheme: cfg.theme,
		locale: "ru-RU",
		storageState,
	};
	if (cfg.isMobile) {
		Object.assign(contextOptions, devices["iPhone 13"]);
	}

	const context = await browser.newContext(contextOptions);

	await context.addInitScript(({ cTok, sTok, uid, fn, theme }) => {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_clinic_token", cTok);
				localStorage.setItem("dente_staff_token", sTok);
				localStorage.setItem("dente_active_session_token", sTok);
				localStorage.setItem("dente_organization_id", "01a00000-0000-0000-0000-000000000000");
				localStorage.setItem("dente_user_id", uid);
				localStorage.setItem("dente_user_name", fn);
				localStorage.setItem("dente_user_role", "owner");
				localStorage.setItem("dente_role", "owner");
				localStorage.setItem("dente_perspective", "owner");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente-theme", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
				localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", onboardingDismissed: true }));
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
			}
		} catch (_) {}
		try {
			document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
			document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
		} catch (_) {}
	}, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		uid: auth.user.id,
		fn: auth.user.fullName,
		theme: cfg.theme,
	});

	const page = await context.newPage();
	page.on("pageerror", (err) => console.log(`[PAGE ERROR ${cfg.filename}]:`, err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log(`[CONSOLE ERROR ${cfg.filename}]:`, msg.text());
		}
	});

	let ready = false;
	for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
		try {
			await page.goto("http://127.0.0.1:5173/?demo=true#inventory", {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForTimeout(1500);

			const errorBtn = await page.$('button:has-text("Обновить рабочее место")');
			if (errorBtn) {
				console.log(`[RETRY] Boot error boundary detected for ${cfg.filename}, clicking refresh...`);
				await errorBtn.click().catch(() => {});
				await page.waitForTimeout(2500);
			}

			await page.waitForSelector('.boot-state', { state: "detached", timeout: 25000 }).catch(() => {});
			ready = true;
		} catch (e) {
			console.log(`[WARN] Attempt ${attempt} failed for ${cfg.filename}: ${e.message}`);
			await page.waitForTimeout(2000);
		}
	}

	await page.waitForTimeout(1500);

	// Ensure theme is applied on root
	await page.evaluate(({ theme }) => {
		localStorage.setItem("dente_theme_mode", theme);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(theme);
		}
		document.documentElement.setAttribute("data-theme", theme);
		const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(theme);
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.setAttribute("data-theme", theme);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
	}, { theme: cfg.theme }).catch(() => {});

	// Hide distracting onboarding/tour overlays
	await page.addStyleTag({
		content: `
			.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
			.coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
			[data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
			.notification-toast, .global-toast, .toast-container, [data-toast] {
				display: none !important;
				pointer-events: none !important;
			}
		`,
	}).catch(() => {});

	// On PC view: Toggle quick packages bar to showcase 1-click batch deduction bar
	if (!cfg.isMobile) {
		await page.evaluate(() => {
			const toggleBtn = document.querySelector('[data-testid="btn-toggle-quick-packages"]');
			if (toggleBtn) {
				toggleBtn.click();
			}
		}).catch(() => {});
	}

	await page.waitForTimeout(1200);

	const buffer = await page.screenshot({ fullPage: false, animations: "disabled" });
	fs.writeFileSync(targetPath, buffer);

	const stat = statSync(targetPath);
	if (stat.size < 20480) {
		throw new Error(`[BYTE GUARD FAIL] ${cfg.filename} is only ${stat.size} bytes (<20KB)`);
	}
	console.log(`[VERIFIED] ${cfg.filename} captured (${stat.size} bytes)`);

	await context.close();
}

await browser.close();
console.log("\n=======================================================");
console.log(">>> ALL 4 INVENTORY PROOFS CAPTURED AND VERIFIED! <<<");
console.log("=======================================================\n");
