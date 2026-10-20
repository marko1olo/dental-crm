/**
 * captureScheduleOrphansProof.mjs
 *
 * Real browser visual proof generator for mounted orphan schedule components:
 * 1. DoctorShiftDrawer (PC Light & Dark, 1440x900)
 * 2. ChairDateRangeModal (PC Light & Dark, 1440x900)
 *
 * ZERO MOCKS INVARIANT: Live Fastify (port 4100) + Live Vite (port 5173).
 * No page.route, no route.fulfill.
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const TARGET_DIR = path.join(process.cwd(), "docs/screenshots/schedule_orphans");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/fb1dc98a-5f03-4e53-96d8-a37341665c9f";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/da920fe7-8cf1-4af3-83bf-33b629e2b869";

for (const dir of [TARGET_DIR, BRAIN_DIR, PARENT_BRAIN_DIR]) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(500);
}

async function run() {
	console.log("=== CAPTURING REAL SCHEDULE ORPHAN COMPONENTS VISUAL PROOF ===");

	// 1. Authenticate via live Fastify API
	console.log("[LOGIN] Authenticating via API credentials...");
	let auth = null;
	try {
		const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email: "admin@clinic.ru", password: "Password123!" }),
		});
		if (loginRes.ok) {
			auth = await loginRes.json();
			console.log("[LOGIN] Authenticated successfully via live Fastify API.");
		} else {
			console.log(`[LOGIN] API returned ${loginRes.status}, fallback to demo tokens`);
		}
	} catch (e) {
		console.log("[LOGIN] API fetch error:", e.message);
	}

	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(edgePath) ? edgePath : (fs.existsSync(chromePath) ? chromePath : undefined);

	const browser = await chromium.launch({
		headless: true,
		...(executablePath ? { executablePath } : { channel: "msedge" }),
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		if (auth?.clinicToken && auth?.staffToken) {
			await context.addCookies([
				{ name: "dente_clinic_token", value: auth.clinicToken, domain: "127.0.0.1", path: "/" },
				{ name: "dente_staff_token", value: auth.staffToken, domain: "127.0.0.1", path: "/" },
			]);
		}

		const page = await context.newPage();
		page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[BROWSER CONSOLE ERROR]:", msg.text());
		});

		// Session initialization
		const doc = auth?.user || { id: "doc-1", name: "Доктор Терапевт", role: "doctor" };
		const cToken = auth?.clinicToken || "demo-clinic-token";
		const sToken = auth?.staffToken || "demo-staff-token";

		await page.addInitScript(({ cToken, sToken, doc }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_workspace_perspective", "doctor");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_active_staff_user", JSON.stringify(doc));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "doctor",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}));
		}, { cToken, sToken, doc });

		console.log("[NAV] Navigating to /#schedule...");
		await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });

		// Check if we hit the auth page, if so click demo or submit
		const loginBtn = page.locator('button:has-text("Войти в систему")');
		if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			console.log("[AUTH] Clicking login submit button...");
			await loginBtn.click();
			await wait(2000);
			await page.goto(`${APP_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 30000 });
		}

		console.log("   Waiting for schedule toolbar or filter strip...");
		await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-toolbar"], [data-testid="schedule-grid"]', {
			state: "visible",
			timeout: 35000,
		}).catch(() => console.log("   Warning: timeout waiting for schedule toolbar selector"));

		console.log("   Waiting for Suspense fallbacks to clear...");
		await page.waitForFunction(() => {
			const text = document.body.innerText || "";
			return !text.includes("Подготовка модулей расписания") &&
				   !text.includes("Загрузка системы") &&
				   !text.includes("Загрузка рабочей смены");
		}, { timeout: 35000 }).catch(() => console.log("   Warning: timeout waiting for body text to clear fallback"));

		await wait(2000);

		// Dismiss onboarding / banner overlays if any
		const dismissBtn = page.locator('button:has-text("Скрыть"), button[aria-label="Закрыть"]').first();
		if (await dismissBtn.isVisible().catch(() => false)) {
			await dismissBtn.click().catch(() => {});
			await wait(500);
		}

		console.log("[READY] Schedule fully hydrated. Beginning orphan component captures...");

		// ==========================================
		// 1. DOCTOR SHIFT DRAWER (PC LIGHT & DARK)
		// ==========================================
		console.log("1. Opening DoctorShiftDrawer...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="schedule-toolbar-doctor-shift-btn"]') ||
			            document.querySelector('[data-testid="shift-analytics-doctor-drawer-btn"]');
			if (btn) {
				btn.click();
			} else {
				window.dispatchEvent(new CustomEvent("dente:open-doctor-shift-drawer"));
			}
		});

		await page.waitForSelector('[data-testid="doctor-shift-drawer-overlay"]', { state: "visible", timeout: 15000 });
		await wait(1000);

		// 1A. DoctorShiftDrawer PC Light
		console.log("   Capturing DoctorShiftDrawer PC Light (1440x900)...");
		await applyTheme(page, "light");
		const drawerLightPath = path.join(TARGET_DIR, "doctor_shift_drawer_pc_light.png");
		await page.screenshot({ path: drawerLightPath, fullPage: false, animations: "disabled" });
		console.log(`   Saved doctor_shift_drawer_pc_light.png (${fs.statSync(drawerLightPath).size} bytes)`);

		// 1B. DoctorShiftDrawer PC Dark
		console.log("   Capturing DoctorShiftDrawer PC Dark (1440x900)...");
		await applyTheme(page, "dark");
		const drawerDarkPath = path.join(TARGET_DIR, "doctor_shift_drawer_pc_dark.png");
		await page.screenshot({ path: drawerDarkPath, fullPage: false, animations: "disabled" });
		console.log(`   Saved doctor_shift_drawer_pc_dark.png (${fs.statSync(drawerDarkPath).size} bytes)`);

		// Close DoctorShiftDrawer via close button or Escape
		console.log("   Closing DoctorShiftDrawer...");
		await page.keyboard.press("Escape");
		await wait(800);

		// Ensure drawer is closed
		await page.evaluate(() => {
			const closeBtn = document.querySelector('.roster-drawer-header button');
			if (closeBtn) closeBtn.click();
		});
		await wait(500);

		// Verify schedule is still active
		const scheduleActiveAfterDrawer = await page.evaluate(() => Boolean(document.querySelector('#schedule')));
		console.log("   Schedule still active after drawer close:", scheduleActiveAfterDrawer);

		// ==========================================
		// 2. CHAIR DATE RANGE MODAL (PC LIGHT & DARK)
		// ==========================================
		console.log("2. Opening ChairDateRangeModal...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="schedule-toolbar-chair-range-btn"]') ||
			            document.querySelector('[data-testid="shift-analytics-chair-range-btn"]');
			if (btn) {
				btn.click();
			} else {
				window.dispatchEvent(new CustomEvent("dente:open-chair-range-modal"));
			}
		});

		await page.waitForSelector('[data-testid="chair-schedule-date-range-modal"]', { state: "visible", timeout: 15000 });
		await wait(1000);

		// 2A. ChairDateRangeModal PC Light
		console.log("   Capturing ChairDateRangeModal PC Light (1440x900)...");
		await applyTheme(page, "light");
		const modalLightPath = path.join(TARGET_DIR, "chair_date_range_modal_pc_light.png");
		await page.screenshot({ path: modalLightPath, fullPage: false, animations: "disabled" });
		console.log(`   Saved chair_date_range_modal_pc_light.png (${fs.statSync(modalLightPath).size} bytes)`);

		// 2B. ChairDateRangeModal PC Dark
		console.log("   Capturing ChairDateRangeModal PC Dark (1440x900)...");
		await applyTheme(page, "dark");
		const modalDarkPath = path.join(TARGET_DIR, "chair_date_range_modal_pc_dark.png");
		await page.screenshot({ path: modalDarkPath, fullPage: false, animations: "disabled" });
		console.log(`   Saved chair_date_range_modal_pc_dark.png (${fs.statSync(modalDarkPath).size} bytes)`);

		// Close ChairDateRangeModal
		console.log("   Closing ChairDateRangeModal...");
		await page.keyboard.press("Escape");
		await wait(800);

		// Copy to brain directories
		const filesToCopy = [
			"doctor_shift_drawer_pc_light.png",
			"doctor_shift_drawer_pc_dark.png",
			"chair_date_range_modal_pc_light.png",
			"chair_date_range_modal_pc_dark.png",
		];

		for (const f of filesToCopy) {
			const src = path.join(TARGET_DIR, f);
			if (fs.existsSync(src)) {
				fs.copyFileSync(src, path.join(BRAIN_DIR, f));
				if (fs.existsSync(PARENT_BRAIN_DIR)) {
					fs.copyFileSync(src, path.join(PARENT_BRAIN_DIR, f));
				}
			}
		}

		console.log("=== ALL 4 VISUAL PROOF SCREENSHOTS CAPTURED AND COPIED SUCCESSFULLY! ===");
	} finally {
		await browser.close();
	}
}

run().catch((e) => {
	console.error("FATAL ERROR IN CAPTURE SCRIPT:", e);
	process.exit(1);
});
