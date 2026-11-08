/**
 * scripts/capture-marketing-4state-canonical.mjs
 * Red Team Inquisitorial 4-State Visual Proofs for Marketing SSOT, ROMI & Leads Kanban.
 */

import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/marketing");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/f8af5005-9a0e-49e9-9656-7b9b1d99827c";

mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

async function provisionClinic() {
	const uniqueId = Date.now();
	const email = `audit-mkt-${uniqueId}@dente.local`;
	const pin = "1234";

	console.log(`[AUTH] Provisioning clinic: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email,
			password: "Password123!",
			ownerName: "Д-р Смирнов Алексей Петрович",
			ownerPin: pin,
		}),
	});
	if (!initRes.ok) throw new Error(`setup/init failed HTTP ${initRes.status}`);
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: pin }),
	});
	if (!unlockRes.ok) throw new Error(`staff/unlock failed HTTP ${unlockRes.status}`);
	const unlockData = await unlockRes.json();

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		user: unlockData.user || {
			id: initData.ownerUserId,
			fullName: "Д-р Смирнов Алексей Петрович",
			role: "director",
		},
	};
}

function injectStorage(page, { clinicToken, staffToken, user, initialTheme = "light" }) {
	return page.addInitScript(
		({ ct, st, usr, theme }) => {
			localStorage.setItem("dente_clinic_token", ct);
			localStorage.setItem("dente_staff_token", st);
			localStorage.setItem("dente_active_role", "director");
			localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(usr));
			localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(usr));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_theme", theme);
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_doctor_training_completed", "true");
			localStorage.setItem("dente_training_dismissed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "director", onboardingDismissed: true })
			);
		},
		{ ct: clinicToken, st: staffToken, usr: user, theme: initialTheme }
	);
}

async function cleanOverlays(page) {
	await page.evaluate(() => {
		document.querySelectorAll(
			'.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
		).forEach((el) => el.remove());
	});
}

async function applyTheme(page, mode) {
	await page.evaluate((m) => {
		const root = document.documentElement;
		if (m === "dark") {
			root.classList.add("dark");
			root.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
		}
		root.setAttribute("data-theme", m);
		localStorage.setItem("dente_theme_mode", m);
		localStorage.setItem("dente_theme", m);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(m);
		}
	}, mode);
	await page.waitForTimeout(400);
}

async function captureShot(page, filename) {
	await cleanOverlays(page);
	const p = path.join(OUT_DIR, filename);
	await page.screenshot({ path: p, fullPage: false });
	const size = statSync(p).size;
	console.log(`[CAPTURED] ${filename} — ${(size / 1024).toFixed(1)} KB`);
	if (existsSync(BRAIN_DIR)) {
		copyFileSync(p, path.join(BRAIN_DIR, filename));
	}
	return p;
}

async function waitBoot(page) {
	await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 15000 }).catch(() => {});
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(800);
}

async function main() {
	const auth = await provisionClinic();

	console.log(`[BROWSER] Launching Chromium via Playwright...`);
	const browser = await chromium.launch({
		headless: true,
		executablePath: CHROME_PATH,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// ==========================================
		// 1. PC VIEWPORT (1440 x 900)
		// ==========================================
		console.log("\n=== 1. PC PROOFS (1440x900) ===");
		const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const pagePc = await pcContext.newPage();
		await injectStorage(pagePc, auth);

		await pagePc.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await waitBoot(pagePc);

		// 1.1 Marketing SSOT Promos - Light
		console.log("-> 1.1 marketing_ssot_pc_light_1440x900");
		await pagePc.evaluate(() => { window.location.hash = "marketing"; });
		await pagePc.waitForTimeout(1000);
		await applyTheme(pagePc, "light");
		await pagePc.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-nav-promos"]');
			if (btn) btn.click();
		});
		await pagePc.waitForTimeout(800);
		await captureShot(pagePc, "marketing_ssot_pc_light_1440x900.png");

		// 1.2 Marketing SSOT Promos - Dark
		console.log("-> 1.2 marketing_ssot_pc_dark_1440x900");
		await applyTheme(pagePc, "dark");
		await captureShot(pagePc, "marketing_ssot_pc_dark_1440x900.png");

		// 1.3 Marketing ROMI Table - Dark
		console.log("-> 1.3 marketing_romi_table_pc_dark_1440x900");
		await pagePc.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-nav-romi"]');
			if (btn) btn.click();
			else window.location.hash = "romi";
		});
		await pagePc.waitForTimeout(1000);
		await captureShot(pagePc, "marketing_romi_table_pc_dark_1440x900.png");

		// 1.4 Marketing ROMI Table - Light
		console.log("-> 1.4 marketing_romi_table_pc_light_1440x900");
		await applyTheme(pagePc, "light");
		await captureShot(pagePc, "marketing_romi_table_pc_light_1440x900.png");

		// 1.5 Leads Kanban - Light
		console.log("-> 1.5 leads_kanban_ssot_pc_light_1440x900");
		await pagePc.evaluate(() => { window.location.hash = "leads"; });
		await pagePc.waitForTimeout(1500);
		await captureShot(pagePc, "leads_kanban_ssot_pc_light_1440x900.png");

		// 1.6 Leads Kanban - Dark
		console.log("-> 1.6 leads_kanban_ssot_pc_dark_1440x900");
		await applyTheme(pagePc, "dark");
		await captureShot(pagePc, "leads_kanban_ssot_pc_dark_1440x900.png");

		await pcContext.close();

		// ==========================================
		// 2. MOBILE VIEWPORT (390 x 844) Apple HIG
		// ==========================================
		console.log("\n=== 2. MOBILE PROOFS (390x844 Apple HIG) ===");
		const mobContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});
		const pageMob = await mobContext.newPage();
		await injectStorage(pageMob, auth);

		await pageMob.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 45000 });
		await waitBoot(pageMob);

		// 2.1 Marketing SSOT Promos - Mobile Light
		console.log("-> 2.1 marketing_ssot_mobile_light_390x844");
		await pageMob.evaluate(() => { window.location.hash = "marketing"; });
		await pageMob.waitForTimeout(1000);
		await applyTheme(pageMob, "light");
		await pageMob.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-nav-promos"]');
			if (btn) btn.click();
		});
		await pageMob.waitForTimeout(800);
		await captureShot(pageMob, "marketing_ssot_mobile_light_390x844.png");

		// 2.2 Marketing SSOT Promos - Mobile Dark
		console.log("-> 2.2 marketing_ssot_mobile_dark_390x844");
		await applyTheme(pageMob, "dark");
		await captureShot(pageMob, "marketing_ssot_mobile_dark_390x844.png");

		// 2.3 Marketing ROMI - Mobile Dark
		console.log("-> 2.3 marketing_romi_table_mobile_dark_390x844");
		await pageMob.evaluate(() => {
			const btn = document.querySelector('[data-testid="tab-nav-romi"]');
			if (btn) btn.click();
			else window.location.hash = "romi";
		});
		await pageMob.waitForTimeout(1000);
		await captureShot(pageMob, "marketing_romi_table_mobile_dark_390x844.png");

		// 2.4 Marketing ROMI - Mobile Light
		console.log("-> 2.4 marketing_romi_table_mobile_light_390x844");
		await applyTheme(pageMob, "light");
		await captureShot(pageMob, "marketing_romi_table_mobile_light_390x844.png");

		// 2.5 Leads Kanban - Mobile Light
		console.log("-> 2.5 leads_kanban_ssot_mobile_light_390x844");
		await pageMob.evaluate(() => { window.location.hash = "leads"; });
		await pageMob.waitForTimeout(1500);
		await captureShot(pageMob, "leads_kanban_ssot_mobile_light_390x844.png");

		// 2.6 Leads Kanban - Mobile Dark
		console.log("-> 2.6 leads_kanban_ssot_mobile_dark_390x844");
		await applyTheme(pageMob, "dark");
		await captureShot(pageMob, "leads_kanban_ssot_mobile_dark_390x844.png");

		await mobContext.close();

		console.log("\n[SUCCESS] All 12 4-State Visual Proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL]", err);
	process.exit(1);
});
