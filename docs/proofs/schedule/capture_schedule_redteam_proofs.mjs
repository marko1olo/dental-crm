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
const WEB_BASE = process.env.APP_BASE || "http://127.0.0.1:5173";
const OUT_DIR = "docs/proofs/schedule";

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const browserExecutable = possibleBrowserPaths.find((p) => fs.existsSync(p));

function assertFileSize(filePath) {
	const stat = fs.statSync(filePath);
	if (stat.size < 40960) {
		throw new Error(`[Anti-Blank Artifact Byte Guard] ${filePath} is ${stat.size}B (< 40KB) — blank or clipped render!`);
	}
	console.log(`   [Byte Guard OK] ${path.basename(filePath)}: ${Math.round(stat.size / 1024)} KB (>= 40 KB)`);
}

async function getAuthTokens() {
	try {
		const res = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
		});
		const data = await res.json();
		if (data.ok) return data;
	} catch (e) {
		console.log("[Auth] Error logging in:", e.message);
	}
	return null;
}

async function injectStorage(context, auth, theme = "light") {
	await context.addCookies([
		{ name: "dente_clinic_token", value: auth.clinicToken, url: WEB_BASE },
		{ name: "dente_staff_token", value: auth.staffToken, url: WEB_BASE },
	]);
	await context.addInitScript(
		({ clinicToken, staffToken, user, th }) => {
			try {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_session_token", staffToken);
				localStorage.setItem("dente_organization_id", "");
				localStorage.setItem("dente_active_role", user.role || "administrator");
				localStorage.setItem("dente_role", user.role || "administrator");
				localStorage.setItem("dente_user_role", user.role || "administrator");
				localStorage.setItem("dente_active_user_id", user.id || "");
				localStorage.setItem("dente_user_id", user.id || "");
				localStorage.setItem("dente_user_name", user.fullName || "");
				localStorage.setItem("dente_perspective", "reception");
				localStorage.setItem("dente_active_view", "schedule");
				localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_theme", th);
				localStorage.setItem("theme", th);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_tour_dismissed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_demo_banner_dismissed", "true");
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
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
			} catch (_) {}
		},
		{
			clinicToken: auth.clinicToken,
			staffToken: auth.staffToken,
			user: auth.user,
			th: theme,
		}
	);
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.shepherd-element {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll(".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		try {
			localStorage.setItem("dente_theme", th);
			localStorage.setItem("dente_theme_mode", th);
			localStorage.setItem("theme", th);
		} catch (_) {}
	}, theme);
	await suppressOverlays(page);
	await page.waitForTimeout(600);
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

	const auth = await getAuthTokens();
	if (!auth) throw new Error("Failed to authenticate via Fastify API");
	console.log(`[AUTH] Logged in: ${auth.user?.fullName || "user"} (${auth.user?.role || "?"})`);

	const browser = await chromium.launch({
		executablePath: browserExecutable,
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
		],
	});

	try {
		for (const cfg of STATES) {
			const shotPath = path.join(OUT_DIR, cfg.file);
			console.log(`\n[SHOT] ${cfg.key} -> ${cfg.file}`);

			const context = await browser.newContext({
				viewport: cfg.viewport,
				deviceScaleFactor: cfg.scale,
				isMobile: cfg.isMobile,
				hasTouch: cfg.isMobile,
				locale: "ru-RU",
				colorScheme: cfg.theme,
			});

			await injectStorage(context, auth, cfg.theme);
			const page = await context.newPage();

			try {
				await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 35000 });

				// Wait for initial loading splash to disappear and CRM shell to hydrate
				for (let i = 0; i < 30; i++) {
					await page.waitForTimeout(500);
					try {
						const text = await page.evaluate(() => document.body ? document.body.innerText : "");
						if (!text.includes("Загрузка CRM") && !text.includes("Подготовка модулей") && text.length > 200) break;
					} catch (_) {
						// Context destroyed due to router redirect, will retry next tick
					}
				}

				// Wait for schedule-specific layout to be mounted
				if (cfg.isMobile) {
					await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"], .schedule-mobile-agenda, [data-testid="schedule-mobile-add-btn"]', { timeout: 15000 }).catch(() => {});
				} else {
					await page.waitForSelector('.schedule-unified-toolbar, [data-testid="schedule-toolbar-primary-quick-booking-btn"], .schedule-grid, [data-testid="schedule-view"]', { timeout: 15000 }).catch(() => {});
				}

				await suppressOverlays(page);
				await setTheme(page, cfg.theme);
				await page.waitForTimeout(cfg.isMobile ? 3000 : 2500);

				// Detect BootErrorBoundary and auto-recover if backend was momentarily busy
				const isBootError = await page.evaluate(() => {
					const t = document.body ? document.body.innerText : "";
					return t.includes("Не удалось открыть рабочее место") || !!document.querySelector(".boot-state-error");
				});
				if (isBootError) {
					console.log(`   ⚠️ [Auto-Retry] BootError detected for ${cfg.key}, refreshing session...`);
					await page.waitForTimeout(2000);
					await page.reload({ waitUntil: "domcontentloaded", timeout: 35000 });
					for (let i = 0; i < 30; i++) {
						await page.waitForTimeout(500);
						const text = await page.evaluate(() => document.body ? document.body.innerText : "");
						if (!text.includes("Загрузка CRM") && !text.includes("Не удалось открыть") && text.length > 200) break;
					}
					await suppressOverlays(page);
					await setTheme(page, cfg.theme);
					await page.waitForTimeout(2500);
				}

				await page.screenshot({ path: shotPath, fullPage: false, animations: "disabled" });
				assertFileSize(shotPath);

				// Also write non-grid naming alias per Orchestrator instruction
				const altName = cfg.file.replace("_grid_", "_").replace("_agenda_", "_");
				if (altName !== cfg.file) {
					const altPath = path.join(OUT_DIR, altName);
					fs.copyFileSync(shotPath, altPath);
					console.log(`   [Alias OK] ${altName}`);
				}
			} finally {
				await context.close();
			}
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
