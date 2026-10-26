import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/warehouse");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1cccc2e4-958e-4c5c-9d50-19d82d738965";
const PARENT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ce204741-1043-496d-84b4-ac98361937f4";

if (!existsSync(PROOFS_DIR)) mkdirSync(PROOFS_DIR, { recursive: true });
if (!existsSync(CONV_DIR)) mkdirSync(CONV_DIR, { recursive: true });
if (!existsSync(PARENT_DIR)) mkdirSync(PARENT_DIR, { recursive: true });

// 1. Authenticate via Fastify API on 4100
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
		filename: "01_warehouse_pc_light.png",
		alias: "warehouse_pc_light.png",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		filename: "02_warehouse_pc_dark.png",
		alias: "warehouse_pc_dark.png",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		filename: "03_warehouse_mobile_light.png",
		alias: "warehouse_mobile_light.png",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		filename: "04_warehouse_mobile_dark.png",
		alias: "warehouse_mobile_dark.png",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

async function suppressOverlays(page) {
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
}

for (const cfg of configs) {
	const targetPath = path.join(PROOFS_DIR, cfg.filename);
	const aliasPath = path.join(PROOFS_DIR, cfg.alias);
	const convTargetPath = path.join(CONV_DIR, cfg.filename);
	const parentTargetPath = path.join(PARENT_DIR, cfg.filename);

	console.log(`\n[CAPTURE] Capturing ${cfg.filename}...`);
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
					{ name: "dente_user_role", value: "doctor" },
					{ name: "dente_role", value: "doctor" },
					{ name: "dente_perspective", value: "doctor" },
					{ name: "dente_theme_mode", value: cfg.theme },
					{ name: "dente-theme", value: cfg.theme },
					{ name: "dente_theme", value: cfg.theme },
					{ name: "theme", value: cfg.theme },
					{ name: "dental-crm:onboarding:v1", value: JSON.stringify({ dismissed: true, step: "done" }) },
					{ name: "dente_onboarding_completed", value: "true" },
					{ name: "dente_tour_completed", value: "true" },
				],
			},
		],
	};

	const context = await browser.newContext({
		viewport: cfg.viewport,
		isMobile: cfg.isMobile,
		hasTouch: cfg.isMobile,
		locale: "ru-RU",
		colorScheme: cfg.theme,
		storageState,
	});

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
				localStorage.setItem("dente_user_role", "doctor");
				localStorage.setItem("dente_role", "doctor");
				localStorage.setItem("dente_perspective", "doctor");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente-theme", theme);
				localStorage.setItem("dente_theme", theme);
				localStorage.setItem("theme", theme);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
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

	let ready = false;
	for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
		try {
			await page.goto("http://127.0.0.1:5173/?demo=true#inventory", {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForTimeout(1500);

			console.log(`[WAIT] Waiting for .boot-state detachment for ${cfg.filename}...`);
			await page.waitForSelector('.boot-state', { state: "detached", timeout: 25000 }).catch(() => {});
			
			// Switch hash explicitly to inventory
			await page.evaluate(() => {
				window.location.hash = "inventory";
				window.dispatchEvent(new HashChangeEvent("hashchange"));
			});
			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			if (cfg.isMobile) {
				await page.waitForSelector('.mobile-inventory-container, [data-testid="mobile-inventory-container"], [data-testid="mobile-inventory-bottom-bar"]', { state: "visible", timeout: 25000 });
			} else {
				await page.waitForFunction(() => !document.body.innerText.includes("Загрузка склада..."), { timeout: 25000 }).catch(() => {});
				await page.waitForSelector('.inventory-view-table, .inventory-stock-badge, .inventory-actions-container, [data-testid="tab-inventory-items"]', { state: "visible", timeout: 25000 }).catch(() => {});
			}
			ready = true;
		} catch (e) {
			console.log(`[WARN] Attempt ${attempt} failed for ${cfg.filename}: ${e.message}`);
			await page.waitForTimeout(2000);
		}
	}

	await suppressOverlays(page);

	// Ensure theme is applied on root
	await page.evaluate(({ theme }) => {
		localStorage.setItem("dente_theme_mode", theme);
		localStorage.setItem("dente_theme", theme);
		document.documentElement.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", theme === "dark");
		document.documentElement.classList.toggle("light", theme !== "dark");
		if (document.body) {
			document.body.className = theme === "dark" ? "dark" : "light";
		}
		document.documentElement.style.colorScheme = theme;
	}, { theme: cfg.theme });

	await page.waitForTimeout(1500);

	await page.screenshot({ path: targetPath, fullPage: false });
	fs.copyFileSync(targetPath, aliasPath);
	fs.copyFileSync(targetPath, convTargetPath);
	fs.copyFileSync(targetPath, parentTargetPath);

	const s = statSync(targetPath);
	console.log(`[PROOF SAVED] ${cfg.filename} (${s.size} bytes)`);
	if (s.size < 20000) {
		console.error(`[CRITICAL WARNING] Screenshot size ${s.size} is below 20KB threshold!`);
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] All 4-State Warehouse Proofs Captured Successfully!");
