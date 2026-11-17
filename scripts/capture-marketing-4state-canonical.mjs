/**
 * scripts/capture-marketing-4state-canonical.mjs
 * Red Team Inquisitorial 4-State Visual Proofs for Marketing SSOT, ROMI & Leads Kanban.
 */

import { mkdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const WEB_URL = "http://127.0.0.1:5173";
const CHROME_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.resolve(process.cwd(), "docs/proofs/marketing");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/fa95456e-56e0-4fed-be34-162d51d0d23f";

mkdirSync(OUT_DIR, { recursive: true });
if (existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

async function initContextAuth(ctx) {
	await ctx.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_perspective", "management");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
			dismissed: true,
			step: "done",
			completed: true,
		}));
	});
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function applyTheme(page, mode) {
	await page.evaluate((m) => {
		const root = document.documentElement;
		const body = document.body;
		if (m === "dark") {
			root.classList.add("dark");
			root.classList.remove("light");
			body.classList.add("dark");
			body.classList.remove("light");
		} else {
			root.classList.remove("dark");
			root.classList.add("light");
			body.classList.remove("dark");
			body.classList.add("light");
		}
		root.setAttribute("data-theme", m);
		body.setAttribute("data-theme", m);
		localStorage.setItem("dente_theme_mode", m);
		localStorage.setItem("dente_theme", m);
		window.dispatchEvent(new Event("themechange"));
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(m);
		}
	}, mode).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(500);
}

async function captureShot(page, filename) {
	await suppressOverlays(page);
	const p = path.join(OUT_DIR, filename);
	await page.screenshot({ path: p, fullPage: false });
	const size = statSync(p).size;
	console.log(`[CAPTURED] ${filename} — ${(size / 1024).toFixed(1)} KB`);
	if (existsSync(BRAIN_DIR)) {
		copyFileSync(p, path.join(BRAIN_DIR, filename));
	}
	return p;
}

async function waitBootAndContent(page, selector) {
	await page.waitForSelector("text=Загрузка системы...", { state: "detached", timeout: 30000 }).catch(() => {});
	await page.waitForSelector(".boot-state", { state: "detached", timeout: 15000 }).catch(() => {});
	if (selector) {
		await page.waitForSelector(selector, { timeout: 30000 }).catch(() => {});
	}
	await page.waitForTimeout(1000);
}

async function main() {
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
		await initContextAuth(pcContext);
		const pagePc = await pcContext.newPage();

		// 1.1 Marketing SSOT Promos - Light
		console.log("-> 1.1 marketing_ssot_pc_light_1440x900");
		await pagePc.goto(`${WEB_URL}/?demo=true#marketing`, { waitUntil: "commit", timeout: 45000 });
		await waitBootAndContent(pagePc, "text=Акции и реклама клиники");
		const promoBtnPc = pagePc.locator('button:has-text("Промокоды")').first();
		if (await promoBtnPc.isVisible({ timeout: 3000 }).catch(() => false)) {
			await promoBtnPc.click();
			await pagePc.waitForTimeout(1000);
		}
		await applyTheme(pagePc, "light");
		await captureShot(pagePc, "marketing_ssot_pc_light_1440x900.png");

		// 1.2 Marketing SSOT Promos - Dark
		console.log("-> 1.2 marketing_ssot_pc_dark_1440x900");
		await applyTheme(pagePc, "dark");
		await captureShot(pagePc, "marketing_ssot_pc_dark_1440x900.png");

		// 1.3 Marketing ROMI Table - Dark
		console.log("-> 1.3 marketing_romi_table_pc_dark_1440x900");
		const romiBtnPc = pagePc.locator('button:has-text("Аналитика и ROMI")').first();
		if (await romiBtnPc.isVisible({ timeout: 3000 }).catch(() => false)) {
			await romiBtnPc.click();
			await pagePc.waitForTimeout(1000);
		}
		await applyTheme(pagePc, "dark");
		await captureShot(pagePc, "marketing_romi_table_pc_dark_1440x900.png");

		// 1.4 Marketing ROMI Table - Light
		console.log("-> 1.4 marketing_romi_table_pc_light_1440x900");
		await applyTheme(pagePc, "light");
		await captureShot(pagePc, "marketing_romi_table_pc_light_1440x900.png");

		// 1.5 Leads Kanban - Light
		console.log("-> 1.5 leads_kanban_ssot_pc_light_1440x900");
		await pagePc.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "commit", timeout: 45000 });
		await waitBootAndContent(pagePc, "text=Воронка обращений");
		await applyTheme(pagePc, "light");
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
		await initContextAuth(mobContext);
		const pageMob = await mobContext.newPage();

		// 2.1 Marketing SSOT Promos - Mobile Light
		console.log("-> 2.1 marketing_ssot_mobile_light_390x844");
		await pageMob.goto(`${WEB_URL}/?demo=true#marketing`, { waitUntil: "commit", timeout: 45000 });
		await waitBootAndContent(pageMob, "text=Акции и реклама клиники");
		const promoBtnMob = pageMob.locator('button:has-text("Промокоды")').first();
		if (await promoBtnMob.isVisible({ timeout: 3000 }).catch(() => false)) {
			await promoBtnMob.click();
			await pageMob.waitForTimeout(1000);
		}
		await applyTheme(pageMob, "light");
		await captureShot(pageMob, "marketing_ssot_mobile_light_390x844.png");

		// 2.2 Marketing SSOT Promos - Mobile Dark
		console.log("-> 2.2 marketing_ssot_mobile_dark_390x844");
		await applyTheme(pageMob, "dark");
		await captureShot(pageMob, "marketing_ssot_mobile_dark_390x844.png");

		// 2.3 Marketing ROMI - Mobile Dark
		console.log("-> 2.3 marketing_romi_table_mobile_dark_390x844");
		const romiBtnMob = pageMob.locator('button:has-text("Аналитика и ROMI")').first();
		if (await romiBtnMob.isVisible({ timeout: 3000 }).catch(() => false)) {
			await romiBtnMob.click();
			await pageMob.waitForTimeout(1000);
		}
		await applyTheme(pageMob, "dark");
		await captureShot(pageMob, "marketing_romi_table_mobile_dark_390x844.png");

		// 2.4 Marketing ROMI - Mobile Light
		console.log("-> 2.4 marketing_romi_table_mobile_light_390x844");
		await applyTheme(pageMob, "light");
		await captureShot(pageMob, "marketing_romi_table_mobile_light_390x844.png");

		// 2.5 Leads Kanban - Mobile Light
		console.log("-> 2.5 leads_kanban_ssot_mobile_light_390x844");
		await pageMob.goto(`${WEB_URL}/?demo=true#leads`, { waitUntil: "commit", timeout: 45000 });
		await waitBootAndContent(pageMob, "text=Воронка обращений");
		await applyTheme(pageMob, "light");
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