/**
 * capture_schedule_proofs.mjs — Red Team 4-State visual proofs для домена
 * «Расписание и запись на приём». Съёмка ТОЛЬКО через живой контур:
 * React → /api/dashboard (PostgreSQL) → сетка расписания.
 *
 * Честный контур (Zero-Mocks Invariant):
 *  1. Логин реального аккаунта клиники POST /api/auth/login (clinic@example.com).
 *  2. Хеш #schedule — живая сетка из БД: кресла, врачи, приёмы дня.
 *  3. Никаких *-preview.html песочниц — только живое приложение 5173.
 *
 * Каждый PNG проходит аппаратный порог ≥ 20KB (Anti-Blank Artifact Byte Guard).
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
	if (stat.size < 20480) {
		throw new Error(`[Anti-Blank Artifact Byte Guard] ${filePath} is ${stat.size}B (< 20KB) — blank render!`);
	}
	console.log(`   [Byte Guard OK] ${path.basename(filePath)}: ${Math.round(stat.size / 1024)} KB`);
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
	await page.waitForSelector(".app-shell, .app-root, main.app-shell, #root .panel, #root header", { timeout: 45000 });
	console.log(`   [BOOT] workspace mounted (${label})`);
}

const STORAGE_INIT = ({ cTok, sTok, userId, userName, view }) => {
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
	localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
		version: 1,
		uiLanguage: "ru",
		selectedWorkspaceRole: "administrator",
		onboardingDismissed: true,
	}));
	localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
		version: 1,
		uiLanguage: "ru",
		selectedWorkspaceRole: "administrator",
		onboardingDismissed: true,
	}));
	localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
	localStorage.setItem("dente_onboarding_completed", "true");
	localStorage.setItem("dente_tour_completed", "true");
	localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
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
	page.on("pageerror", (err) => console.log(`   [PAGE ERROR ${cfg.key}]:`, err.message));
	await page.addInitScript(STORAGE_INIT, {
		cTok: auth.clinicToken,
		sTok: auth.staffToken,
		userId: auth.user?.id || "",
		userName: auth.user?.fullName || "",
		view: "schedule",
	});
	return { context, page };
}

/** Сетка дня (ПК): ждём канву сетки расписания с реальными приёмами из БД. */
async function captureScheduleDay(browser, cfg, auth, shotPath) {
	const { context, page } = await openStateContext(browser, cfg, auth);
	try {
		await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitAppBoot(page, cfg.key);
		await page.evaluate(themeApplyScript(), cfg.theme);
		if (cfg.isMobile) {
			await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"], [data-testid="schedule-view"]', { timeout: 30000 });
		} else {
			// Корень расписания: лента/сетка/кресла — любой честный режим дня
			// с приёмами из /api/dashboard (PostgreSQL).
			await page.waitForSelector('[data-testid="schedule-view"]', { timeout: 30000 });
		}
		await page.waitForTimeout(2500);
		await page.screenshot({ path: shotPath, fullPage: false });
		assertFileSize(shotPath);
	} finally {
		await context.close();
	}
}

const STATES = [
	{ key: "pc_light", theme: "light", viewport: { width: 1440, height: 900 }, scale: 1, isMobile: false, file: "schedule_pc_light_1440x900.png" },
	{ key: "pc_dark", theme: "dark", viewport: { width: 1440, height: 900 }, scale: 1, isMobile: false, file: "schedule_pc_dark_1440x900.png" },
	{ key: "mobile_light", theme: "light", viewport: { width: 390, height: 844 }, scale: 2, isMobile: true, file: "schedule_mobile_light_390x844.png" },
	{ key: "mobile_dark", theme: "dark", viewport: { width: 390, height: 844 }, scale: 2, isMobile: true, file: "schedule_mobile_dark_390x844.png" },
];

async function main() {
	if (!browserExecutable) throw new Error("No Chrome/Edge executable found");
	fs.mkdirSync(OUT_DIR, { recursive: true });
	const auth = await loginRealClinic();
	for (const cfg of STATES) {
		const shotPath = path.join(OUT_DIR, cfg.file);
		console.log(`\n[SHOT] ${cfg.key} -> ${cfg.file}`);
		const browser = await chromium.launch({
			executablePath: browserExecutable,
			headless: true,
			args: ["--no-sandbox", "--disable-gpu"],
		});
		try {
			await captureScheduleDay(browser, cfg, auth, shotPath);
		} finally {
			await browser.close();
		}
	}
	console.log("\n[DONE] 4-State schedule proofs captured through the live circuit.");
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
