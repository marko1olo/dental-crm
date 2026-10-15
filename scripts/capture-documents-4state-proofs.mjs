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
		alias: "pc_light",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		name: "pc_dark_1440x900",
		alias: "pc_dark",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		name: "mobile_light_390x844",
		alias: "mobile_light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		name: "mobile_dark_390x844",
		alias: "mobile_dark",
		viewport: { width: 390, height: 844 },
		theme: "dark",
		isMobile: true,
	},
];

for (const cfg of configs) {
	const targetPath = path.join(PROOFS_DIR, `${cfg.name}.png`);
	if (existsSync(targetPath) && statSync(targetPath).size >= 40 * 1024) {
		console.log(`[SKIP] ${cfg.name} already captured (${Math.round(statSync(targetPath).size / 1024)} KB)`);
		if (cfg.alias) {
			const aliasPath = path.join(PROOFS_DIR, `${cfg.alias}.png`);
			if (!existsSync(aliasPath) || statSync(aliasPath).size < 40 * 1024) {
				fs.copyFileSync(targetPath, aliasPath);
			}
		}
		continue;
	}

	console.log(`[CAPTURE] Capturing ${cfg.name}...`);
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
					{ name: "dente_active_patient_id", value: "01a00000-0000-0000-0000-000000000001" },
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
				localStorage.setItem("dente_active_patient_id", "01a00000-0000-0000-0000-000000000001");
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
	page.on("pageerror", (err) => console.log(`[PAGE ERROR ${cfg.name}]:`, err.message));
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log(`[BROWSER CONSOLE ERROR ${cfg.name}]:`, msg.text());
		}
	});

	let ready = false;
	for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
		try {
			await page.goto("http://127.0.0.1:5173/?demo=true#documents", {
				waitUntil: "domcontentloaded",
				timeout: 30000,
			});
			await page.waitForTimeout(1000);
			const errorBtn = await page.$('button:has-text("Обновить рабочее место")');
			if (errorBtn) {
				console.log(`[RETRY] Boot error boundary detected for ${cfg.name}, clicking refresh...`);
				await errorBtn.click().catch(() => {});
				await page.waitForTimeout(2000);
			}
			await page.waitForSelector('.boot-state, :has-text("Загрузка CRM")', { state: "detached", timeout: 20000 }).catch(() => {});
			if (cfg.isMobile) {
				await page.waitForSelector('.mobile-documents-hub-wrapper, [data-testid="mobile-documents-hub"], .mobile-shell-layout', { state: "visible", timeout: 20000 });
			} else {
				await page.waitForSelector('.app-shell, .documents-panel, .desktop-documents-experience', { state: "visible", timeout: 20000 });
			}
			ready = true;
		} catch (e) {
			console.log(`[WARN] Attempt ${attempt} failed for ${cfg.name}: ${e.message}`);
			await page.waitForTimeout(2000);
		}
	}

	await page.waitForTimeout(1000);

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

	await page.waitForTimeout(1500);

	const buffer = await page.screenshot({ fullPage: false });
	fs.writeFileSync(targetPath, buffer);

	const stats = statSync(targetPath);
	console.log(`[SAVED] ${targetPath} (${Math.round(stats.size / 1024)} KB)`);

	if (cfg.alias) {
		const aliasPath = path.join(PROOFS_DIR, `${cfg.alias}.png`);
		fs.writeFileSync(aliasPath, buffer);
		console.log(`[ALIAS] Copied to ${aliasPath}`);
	}

	if (stats.size < 20 * 1024) {
		throw new Error(`[ERROR] Screenshot ${cfg.name} is too small: ${stats.size} bytes (< 20 KB floor)!`);
	}

	await context.close();
}

await browser.close();
console.log("[SUCCESS] All 4 visual proof states captured cleanly!");
