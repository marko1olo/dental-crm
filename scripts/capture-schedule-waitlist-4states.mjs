/**
 * scripts/capture-schedule-waitlist-4states.mjs
 * Red Team 4-State Visual Proof Capture for Schedule & Waitlist QuickFill:
 * - 01_schedule_waitlist_pc_light_1440x900.png
 * - 02_schedule_waitlist_pc_dark_1440x900.png
 * - 03_schedule_waitlist_mobile_light_390x844.png
 * - 04_schedule_waitlist_mobile_dark_390x844.png
 */

import { existsSync, mkdirSync, copyFileSync, statSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/schedule");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/73106a46-d93f-4ae0-9751-7250aeab3e39");

for (const d of [PROOF_DIR, BRAIN_DIR]) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const baseUrl = new URL(url).origin;
		const res = await fetch(baseUrl, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

async function ensureViteServer() {
	if (await isPortResponding(APP_BASE, 2000)) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}
	console.log("[Vite] Spawning dev server on port 5173...");
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");
	const proc = spawn(process.execPath, ["--max-old-space-size=2048", viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
		detached: true,
	});
	proc.unref();

	for (let i = 0; i < 50; i++) {
		await wait(600);
		if (await isPortResponding(APP_BASE, 1000)) {
			console.log(`[Vite] Server ready in ${(i + 1) * 600}ms!`);
			return proc;
		}
	}
	throw new Error("[Vite] Failed to start dev server within 30 seconds!");
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "redteam-clean-style";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.global-toast-container,
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
					opacity: 0 !important;
				}
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
	} catch (_) {}
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("theme", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await suppressOverlays(page);
	await wait(600);
}

async function saveProof(page, filename, description) {
	const filepath = path.join(PROOF_DIR, filename);
	await suppressOverlays(page);
	await wait(400);

	if (existsSync(filepath)) {
		try { unlinkSync(filepath); } catch {}
	}
	await page.screenshot({ path: filepath, fullPage: false, animations: "disabled" });

	const stats = statSync(filepath);
	if (stats.size < 20000) {
		throw new Error(`[BLANK PROOF DETECTED] ${filename} is only ${stats.size} bytes (< 20KB)!`);
	}
	console.log(`[PROOF CAPTURED] ${filename} (${Math.round(stats.size / 1024)} KB) -> ${description}`);

	const brainPath = path.join(BRAIN_DIR, filename);
	try {
		copyFileSync(filepath, brainPath);
	} catch (e) {
		console.warn(`[WARN] Brain copy failed:`, e.message);
	}
	return filepath;
}

async function triggerWaitlistOpen(page) {
	console.log("   Waiting for Waitlist Drawer to mount...");
	await wait(1500);
	const drawer = page.locator('[data-testid="waitlist-drawer"]').first();
	if (!(await drawer.isVisible().catch(() => false))) {
		const openBtn = page.locator('button:has-text("Открыть лист ожидания"), button:has-text("Открыть лист")').first();
		if (await openBtn.isVisible().catch(() => false)) {
			console.log("   Clicking 'Открыть лист' fallback button...");
			await openBtn.click();
			await wait(1000);
		}
	}
	await page.waitForSelector('[data-testid="waitlist-drawer"]', { state: "visible", timeout: 25000 });
	await suppressOverlays(page);
	await wait(800);
}

async function main() {
	console.log("=== STARTING SCHEDULE WAITLIST 4-STATE VISUAL PROOFS ===");

	await ensureViteServer();

	const browser = await chromium.launch({
		headless: true,
		channel: "msedge",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
	});

	// --- 1. PC CONTEXT (1440x900) ---
	console.log("\n--- Phase 1: PC Desktop (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	await pcContext.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-token");
		localStorage.setItem("dente_staff_token", "demo-token");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_nav", "schedule");
		localStorage.setItem("dente_last_view", "schedule");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
	});

	const pcPage = await pcContext.newPage();
	await pcPage.goto(`${APP_BASE}/?demo=true&waitlist-matches=true&drawer=true&target-slot=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
	await wait(2500);
	await suppressOverlays(pcPage);

	await triggerWaitlistOpen(pcPage);

	// Proof 1: PC Light 1440x900
	await setTheme(pcPage, "light");
	await saveProof(pcPage, "01_schedule_waitlist_pc_light_1440x900.png", "☀️ PC Light (1440x900) Schedule + Waitlist QuickFill");

	// Proof 2: PC Dark 1440x900
	await setTheme(pcPage, "dark");
	await saveProof(pcPage, "02_schedule_waitlist_pc_dark_1440x900.png", "🌙 PC Dark (1440x900) Schedule + Waitlist QuickFill");

	await pcContext.close();

	// --- 2. MOBILE CONTEXT (390x844 iPhone 14 Pro Apple HIG) ---
	console.log("\n--- Phase 2: Mobile Apple HIG (390x844) ---");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
	});
	await mobileContext.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-token");
		localStorage.setItem("dente_staff_token", "demo-token");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_active_nav", "schedule");
		localStorage.setItem("dente_last_view", "schedule");
		localStorage.setItem("dente_theme_mode", "light");
		localStorage.setItem("dente_theme", "light");
	});

	const mobilePage = await mobileContext.newPage();
	await mobilePage.goto(`${APP_BASE}/?demo=true&waitlist-matches=true&drawer=true&target-slot=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
	await wait(2500);
	await suppressOverlays(mobilePage);

	await triggerWaitlistOpen(mobilePage);

	// Proof 3: Mobile Light 390x844
	await setTheme(mobilePage, "light");
	await saveProof(mobilePage, "03_schedule_waitlist_mobile_light_390x844.png", "📱 Mobile Light (390x844) Apple HIG Bottom Sheet QuickFill");

	// Proof 4: Mobile Dark 390x844
	await setTheme(mobilePage, "dark");
	await saveProof(mobilePage, "04_schedule_waitlist_mobile_dark_390x844.png", "🌙 Mobile Dark (390x844) Apple HIG Bottom Sheet QuickFill");

	await mobileContext.close();
	await browser.close();

	console.log("\n=== ALL 4-STATE SCHEDULE & WAITLIST PROOFS CAPTURED SUCCESSFULLY! ===");
}

main().catch((err) => {
	console.error("FATAL ERROR in capture-schedule-waitlist-4states:", err);
	process.exit(1);
});
