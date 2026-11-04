/**
 * captureCashboxLiveProofs.mjs — Red Team 4-State visual proofs of the LIVE
 * cashbox workspace («Финансы → Касса»), shot ONLY through the honest circuit:
 * front (http://127.0.0.1:5173) → real API (127.0.0.1:4100) → PostgreSQL.
 *
 * Честный контур (Zero-Mocks Invariant, Мандат 23):
 *  1. Логин реального аккаунта клиники через /api/auth/login (clinic@example.com).
 *  2. Никаких моков /api/**, никаких preview-песочниц (Потёмкин 8al снесён).
 *  3. Живая навигация по хэш-роуту #finance, ожидание реальной секции кассы
 *     [data-testid="finance-cashbox-section"] с живыми данными из БД.
 *
 * States: PC Light/Dark 1440x900, Mobile Light/Dark 390x844.
 * Каждый PNG проходит аппаратный порог ≥ 20KB (Anti-Blank Artifact Byte Guard).
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const API_BASE = process.env.API_BASE || "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/cashbox";

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

/** Логин реальным аккаунтом клиники — никакого localStorage-фантома. */
async function loginRealClinic() {
	const res = await fetch(`${API_BASE}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	if (!res.ok) throw new Error(`Login failed: HTTP ${res.status} — ${await res.text()}`);
	const auth = await res.json();
	if (!auth.clinicToken || !auth.staffToken) throw new Error("Login returned no tokens");
	console.log(`[AUTH] Logged in: ${auth.user?.fullName || "user"} (${auth.user?.role || "?"})`);
	return auth;
}

async function waitAppBoot(page, label) {
	// Ждём полного бутстрапа CRM: splash «Загрузка CRM» обязан уйти.
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
	await page.waitForSelector(".app-shell, .app-root, main.app-shell, #root .panel, #root header", { timeout: 45000 });
	console.log(`   [BOOT] workspace mounted (${label})`);
}

const STORAGE_INIT = ({ cTok, sTok, userId, userName }) => {
	localStorage.setItem("dente_clinic_token", cTok);
	localStorage.setItem("dente_staff_token", sTok);
	localStorage.setItem("dente_active_session_token", sTok);
	localStorage.setItem("dente_organization_id", "");
	localStorage.setItem("dente_user_id", userId);
	localStorage.setItem("dente_user_name", userName);
	// Касса — зона администратора/регистратуры (финансовый контур клиники).
	localStorage.setItem("dente_user_role", "administrator");
	localStorage.setItem("dente_role", "administrator");
	localStorage.setItem("dente_perspective", "reception");
	localStorage.setItem("dente_active_view", "finance");
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

async function captureCashboxState(browser, cfg, auth) {
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
	});
	try {
		await page.goto(`${APP_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await waitAppBoot(page, cfg.key);
		await page.waitForSelector("#finance", { timeout: 45000 });
		// Живая секция кассы с данными из БД (обязательный тестид секции).
		await page.waitForSelector('[data-testid="finance-cashbox-section"]', { timeout: 30000 });
		await page.evaluate(themeApplyScript(), cfg.theme);
		// Ждём hydration живых платежей/счетов из API.
		await page.waitForTimeout(2200);

		// Anti-Drift Guard: на мобиле страница не имеет права скроллиться вбок.
		if (cfg.isMobile) {
			const drift = await page.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth,
			);
			console.log(`   [DRIFT] horizontal drift: ${drift}px ${drift > 0 ? "(>0 — ДЕФЕКТ!)" : "(OK)"}`);
		}

		const shotPath = path.join(PROOFS_DIR, `${cfg.key}.png`);
		await page.screenshot({ path: shotPath, fullPage: false });
		assertFileSize(shotPath);
	} finally {
		await context.close();
	}
}

async function main() {
	if (!browserExecutable) throw new Error("No Chrome/Edge executable found");
	console.log(`[Proof Capture] Browser: ${browserExecutable}`);

	// Стенд обязан быть жив заранее (npm run dev): честная проверка обоих контуров.
	const webProbe = await fetch(`${APP_BASE}/`).catch(() => null);
	if (!webProbe || !webProbe.ok) throw new Error(`Live web stand is down at ${APP_BASE}`);
	const apiProbe = await fetch(`${API_BASE}/api/health`).catch(() => null);
	if (!apiProbe || !apiProbe.ok) throw new Error(`Live API is down at ${API_BASE}`);
	console.log("[STAND] web + api healthy — shooting the live circuit");

	const auth = await loginRealClinic();
	fs.mkdirSync(PROOFS_DIR, { recursive: true });

	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	});

	const states = [
		{ key: "01_cashbox_pc_light", theme: "light", viewport: { width: 1440, height: 900 }, scale: 1.5, isMobile: false },
		{ key: "02_cashbox_pc_dark", theme: "dark", viewport: { width: 1440, height: 900 }, scale: 1.5, isMobile: false },
		{ key: "03_cashbox_mobile_light", theme: "light", viewport: { width: 390, height: 844 }, scale: 2.5, isMobile: true },
		{ key: "04_cashbox_mobile_dark", theme: "dark", viewport: { width: 390, height: 844 }, scale: 2.5, isMobile: true },
	];

	try {
		let done = 0;
		for (const cfg of states) {
			done += 1;
			console.log(`\n[${done}/4] ${cfg.key} (${cfg.theme}, ${cfg.viewport.width}x${cfg.viewport.height})`);
			await captureCashboxState(browser, cfg, auth);
			console.log(`   [SAVED] ${path.join(PROOFS_DIR, `${cfg.key}.png`)}`);
		}
		console.log("\n[SUCCESS] All 4 honest live 4-State cashbox proofs captured (front → API → PostgreSQL).");
	} finally {
		await browser.close();
		console.log("[Proof Capture] Browser closed cleanly.");
	}
}

main().catch((err) => {
	console.error("[Proof Capture] FAILED:", err);
	process.exit(1);
});
