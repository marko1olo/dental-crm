import fs, { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/mdlp");
const CONV_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\d5390e57-3220-40f6-a5be-e5bfa009f88f";

if (!existsSync(PROOFS_DIR)) mkdirSync(PROOFS_DIR, { recursive: true });
if (!existsSync(CONV_DIR)) mkdirSync(CONV_DIR, { recursive: true });

// 1. Authenticate via Fastify API on 4100
console.log("[AUTH] Logging in via http://127.0.0.1:4100/api/auth/login...");
let auth = { clinicToken: "mock-clinic-token", staffToken: "mock-staff-token", user: { id: "u-1", fullName: "Д-р Смирнов А.П.", role: "doctor" } };
try {
	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	if (loginRes.ok) {
		auth = await loginRes.json();
		console.log(`[AUTH] Authenticated user: ${auth.user.fullName}, role: ${auth.user.role}`);
	}
} catch (e) {
	console.log("[AUTH] Using fallback auth headers for dev server");
}

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
		name: "mdlp_pc_light_1440x900",
		alias: "mdlp_pc_light",
		viewport: { width: 1440, height: 900 },
		theme: "light",
		isMobile: false,
	},
	{
		name: "mdlp_pc_dark_1440x900",
		alias: "mdlp_pc_dark",
		viewport: { width: 1440, height: 900 },
		theme: "dark",
		isMobile: false,
	},
	{
		name: "mdlp_mobile_light_390x844",
		alias: "mdlp_mobile_light",
		viewport: { width: 390, height: 844 },
		theme: "light",
		isMobile: true,
	},
	{
		name: "mdlp_mobile_dark_390x844",
		alias: "mdlp_mobile_dark",
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
	const targetPath = path.join(PROOFS_DIR, `${cfg.name}.png`);
	const aliasPath = path.join(PROOFS_DIR, `${cfg.alias}.png`);
	const convTargetPath = path.join(CONV_DIR, `${cfg.name}.png`);
	const convAliasPath = path.join(CONV_DIR, `${cfg.alias}.png`);

	console.log(`\n[CAPTURE] Capturing ${cfg.name}...`);
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
	}, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		uid: auth.user.id,
		fn: auth.user.fullName,
		theme: cfg.theme,
	});

	const page = await context.newPage();
	page.on("pageerror", (err) => console.log(`[PAGE ERROR ${cfg.name}]:`, err.message));

	let ready = false;
	for (let attempt = 1; attempt <= 3 && !ready; attempt++) {
		try {
			console.log(`[NAVIGATE] Attempt ${attempt} loading http://127.0.0.1:5173/?demo=true&mdlp=1 for ${cfg.name}...`);
			await page.goto("http://127.0.0.1:5173/?demo=true&mdlp=1", {
				waitUntil: "commit",
				timeout: 30000,
			});
			await page.waitForTimeout(1000);

			console.log(`[WAIT] Waiting for modal mounting for ${cfg.name}...`);
			await page.waitForTimeout(2000);
			await suppressOverlays(page);

			try {
				await page.waitForSelector('.mdlp-scanning-modal, [data-testid="mdlp-scanning-modal-container"]', { state: "visible", timeout: 45000 });
			} catch (e) {
				console.log(`[WAIT] First modal wait timed out, checking DOM...`);
			}
			
			const hasBoot = await page.evaluate(() => !!document.querySelector('.boot-state'));
			if (hasBoot) {
				console.log(`[RETRY] .boot-state still detected in DOM for ${cfg.name}, waiting for detachment...`);
				await page.waitForSelector('.boot-state', { state: "detached", timeout: 30000 }).catch(() => {});
			}

			await page.waitForSelector('.mdlp-scanning-modal, [data-testid="mdlp-scanning-modal-container"]', { state: "visible", timeout: 30000 });
			ready = true;
			console.log(`[READY] Modal is confirmed visible and boot-state detached for ${cfg.name}!`);
		} catch (e) {
			console.log(`[WARN] Attempt ${attempt} failed for ${cfg.name}: ${e.message}`);
			await page.waitForTimeout(2000);
		}
	}

	if (!ready) {
		throw new Error(`CRITICAL: Failed to mount .mdlp-scanning-modal for ${cfg.name}! Boot screen was not dismissed.`);
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

	// Click quick shift carpules to populate items
	try {
		const btn = page.locator('[data-testid="mdlp-shift-carpules-batch-btn"]');
		await btn.scrollIntoViewIfNeeded({ timeout: 5000 });
		await btn.click({ force: true, timeout: 5000 });
		await page.waitForTimeout(800);
	} catch (e) {
		console.log(`[WARN] Quick carpules batch click failed for ${cfg.name}: ${e.message}`);
	}

	await page.waitForTimeout(1200);

	await page.screenshot({ path: targetPath, fullPage: false });
	fs.copyFileSync(targetPath, aliasPath);
	fs.copyFileSync(targetPath, convTargetPath);
	fs.copyFileSync(targetPath, convAliasPath);

	const s = statSync(targetPath);
	console.log(`[PROOF SAVED] ${cfg.name}.png (${s.size} bytes)`);
	if (s.size < 20000) {
		console.error(`[CRITICAL WARNING] Screenshot size ${s.size} is below 20KB threshold!`);
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] All 4-State MDLP Proofs Captured!");
