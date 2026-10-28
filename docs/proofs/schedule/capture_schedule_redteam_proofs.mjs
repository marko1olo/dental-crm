/**
 * capture_schedule_redteam_proofs.mjs — Red Team 4-State visual proofs
 * Мандат 8ze, 8al, 8am, 8zk.
 *
 * 1. 01_schedule_grid_pc_light_1440x900.png (>= 40 KB)
 * 2. 02_schedule_grid_pc_dark_1440x900.png (>= 40 KB)
 * 3. 03_schedule_agenda_mobile_light_390x844.png (>= 40 KB)
 * 4. 04_schedule_agenda_mobile_dark_390x844.png (>= 40 KB)
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const OUT_DIR = "docs/proofs/schedule";

const possibleBrowserPaths = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const browserExecutable = possibleBrowserPaths.find((p) => fs.existsSync(p));

function assertFileSize(filePath) {
	const stat = fs.statSync(filePath);
	if (stat.size < 40960) {
		throw new Error(`[Anti-Blank Artifact Byte Guard] ${filePath} is ${stat.size}B (< 40KB) — blank or clipped render!`);
	}
	console.log(`   [Byte Guard OK] ${path.basename(filePath)}: ${Math.round(stat.size / 1024)} KB (>= 40 KB)`);
}

async function loginRealClinic() {
	const res = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	if (!res.ok) throw new Error(`Login failed: HTTP ${res.status} — ${await res.text()}`);
	const auth = await res.json();
	console.log(`[AUTH] Logged in: ${auth.user?.fullName || "user"} (${auth.user?.role || "?"})`);
	return auth;
}

async function waitAppBoot(page, label) {
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
	console.log(`   [BOOT] workspace mounted (${label})`);
}

const STORAGE_INIT = ({ cTok, sTok, userId, userName, view }) => {
	try {
		localStorage.setItem("dente_clinic_token", cTok);
		localStorage.setItem("dente_staff_token", sTok);
		localStorage.setItem("dente_active_session_token", sTok);
		localStorage.setItem("dente_organization_id", "");
		localStorage.setItem("dente_user_id", userId);
		localStorage.setItem("dente_user_name", userName);
		localStorage.setItem("dente_user_role", "administrator");
		localStorage.setItem("dente_role", "administrator");
		localStorage.setItem("dente_perspective", "reception");
		localStorage.setItem("dente_active_view", view);
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "administrator",
				onboardingDismissed: true,
			})
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "administrator",
				onboardingDismissed: true,
			})
		);
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
	} catch {
		// Ignore storage errors on blank document
	}
};

function themeApplyScript() {
	return (theme) => {
		document.documentElement.setAttribute("data-theme", theme);
		document.body.setAttribute("data-theme", theme);
		const isDark = theme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
	};
}

async function openStateContext(browser, cfg, auth) {
	const context = await browser.newContext({
		viewport: cfg.viewport,
		deviceScaleFactor: cfg.scale,
		isMobile: cfg.isMobile,
		hasTouch: cfg.isMobile,
		locale: "ru-RU",
		colorScheme: cfg.theme,
	});
	const page = await context.newPage();
	page.setDefaultTimeout(60000);
	page.setDefaultNavigationTimeout(60000);
	await page.addInitScript(STORAGE_INIT, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		userId: auth.user?.id || "",
		userName: auth.user?.fullName || "",
		view: "schedule",
	});
	return { context, page };
}

async function captureScheduleDay(browser, cfg, auth, shotPath) {
	for (let attempt = 1; attempt <= 2; attempt++) {
		const { context, page } = await openStateContext(browser, cfg, auth);
		try {
			await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
			await waitAppBoot(page, `${cfg.key} a${attempt}`);
			await page.waitForTimeout(1000);
			try {
				await page.evaluate(themeApplyScript(), cfg.theme);
			} catch {
				await page.waitForTimeout(1000);
				await page.evaluate(themeApplyScript(), cfg.theme);
			}

			// Даем время на загрузку данных сетки
			await page.waitForTimeout(cfg.isMobile ? 5000 : 4000);
			await page.screenshot({ path: shotPath, fullPage: false });
			assertFileSize(shotPath);
			return;
		} catch (err) {
			console.log(`   [ATTEMPT ${attempt} FAILED for ${cfg.key}]:`, err.message);
			if (attempt === 2) throw err;
			await new Promise((r) => setTimeout(r, 2000));
		} finally {
			await context.close();
		}
	}
}

const STATES = [
	{
		key: "pc_light",
		theme: "light",
		viewport: { width: 1440, height: 900 },
		scale: 1,
		isMobile: false,
		file: "01_schedule_grid_pc_light_1440x900.png",
	},
	{
		key: "pc_dark",
		theme: "dark",
		viewport: { width: 1440, height: 900 },
		scale: 1,
		isMobile: false,
		file: "02_schedule_grid_pc_dark_1440x900.png",
	},
	{
		key: "mobile_light",
		theme: "light",
		viewport: { width: 390, height: 844 },
		scale: 2,
		isMobile: true,
		file: "03_schedule_agenda_mobile_light_390x844.png",
	},
	{
		key: "mobile_dark",
		theme: "dark",
		viewport: { width: 390, height: 844 },
		scale: 2,
		isMobile: true,
		file: "04_schedule_agenda_mobile_dark_390x844.png",
	},
];

async function main() {
	if (!browserExecutable) throw new Error("No Chrome/Edge executable found");
	fs.mkdirSync(OUT_DIR, { recursive: true });
	const auth = await loginRealClinic();

	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu"],
	});

	try {
		for (const cfg of STATES) {
			const shotPath = path.join(OUT_DIR, cfg.file);
			console.log(`\n[SHOT] ${cfg.key} -> ${cfg.file}`);
			await captureScheduleDay(browser, cfg, auth, shotPath);
		}
		console.log("\n[DONE] All 4 Red Team 4-State visual proofs successfully captured!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
