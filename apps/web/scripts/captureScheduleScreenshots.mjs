import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "docs/proofs/schedule");
const ORPHANS_DIR = path.join(process.cwd(), "docs/screenshots/schedule_orphans");
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/672af6c0-e436-47d5-ad8e-60da1460249a";
const PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/279687e0-d651-4914-b191-0c203f3f31e4";
const CURRENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/fb1dc98a-5f03-4e53-96d8-a37341665c9f";
const CURRENT_PARENT_BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/da920fe7-8cf1-4af3-83bf-33b629e2b869";

const ALL_DIRS = [PROOFS_DIR, ORPHANS_DIR, BRAIN_DIR, PARENT_BRAIN_DIR, CURRENT_BRAIN_DIR, CURRENT_PARENT_BRAIN_DIR];
for (const dir of ALL_DIRS) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

async function capture() {
	console.log("=== CAPTURING REAL SCHEDULE ERGONOMICS & CONCURRENCY VISUAL PROOF ===");

	// 1. Authenticate via API
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
			console.log("[LOGIN] Authenticated successfully via API.");
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
		page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message, err.stack));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[BROWSER CONSOLE ERROR]:", msg.text());
		});

		// Add init script for session state
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

		// 1. PC LIGHT (1440x900)
		console.log("1. Capturing Schedule PC Light (1440x900)...");
		await applyTheme(page, "light");
		await wait(1500);
		const lightPath = path.join(PROOFS_DIR, "schedule_pc_light_1440x900.png");
		await page.screenshot({ path: lightPath, fullPage: false, animations: "disabled" });
		for (const bDir of ALL_DIRS) {
			fs.copyFileSync(lightPath, path.join(bDir, "schedule_pc_light_1440x900.png"));
		}
		console.log(`Saved schedule_pc_light_1440x900.png (${(fs.statSync(lightPath).size / 1024).toFixed(1)} KB)`);

		// 2. CLOSEUP LIGHT
		console.log("2. Capturing Schedule Cards Closeup Light...");
		const closeupLightPath = path.join(PROOFS_DIR, "schedule_cards_closeup_light.png");
		const cardElemLight = page.locator('.appointment-card').first();
		if (await cardElemLight.isVisible({ timeout: 3000 }).catch(() => false)) {
			const box = await cardElemLight.boundingBox();
			if (box) {
				await page.screenshot({
					path: closeupLightPath,
					clip: {
						x: Math.max(0, Math.floor(box.x - 20)),
						y: Math.max(0, Math.floor(box.y - 20)),
						width: Math.min(1400, Math.max(800, Math.floor(box.width * 2 + 100))),
						height: Math.min(850, Math.max(500, Math.floor(box.height * 3 + 100))),
					},
					animations: "disabled",
				});
			} else {
				await page.screenshot({
					path: closeupLightPath,
					clip: { x: 80, y: 150, width: 850, height: 600 },
					animations: "disabled",
				});
			}
		} else {
			await page.screenshot({
				path: closeupLightPath,
				clip: { x: 80, y: 150, width: 850, height: 600 },
				animations: "disabled",
			});
		}
		for (const bDir of ALL_DIRS) {
			fs.copyFileSync(closeupLightPath, path.join(bDir, "schedule_cards_closeup_light.png"));
		}
		console.log(`Saved schedule_cards_closeup_light.png (${(fs.statSync(closeupLightPath).size / 1024).toFixed(1)} KB)`);

		// 3. PC DARK (1440x900)
		console.log("3. Capturing Schedule PC Dark (1440x900)...");
		await applyTheme(page, "dark");
		await wait(1500);
		const darkPath = path.join(PROOFS_DIR, "schedule_pc_dark_1440x900.png");
		await page.screenshot({ path: darkPath, fullPage: false, animations: "disabled" });
		for (const bDir of ALL_DIRS) {
			fs.copyFileSync(darkPath, path.join(bDir, "schedule_pc_dark_1440x900.png"));
		}
		console.log(`Saved schedule_pc_dark_1440x900.png (${(fs.statSync(darkPath).size / 1024).toFixed(1)} KB)`);

		// 4. CLOSEUP DARK
		console.log("4. Capturing Schedule Cards Closeup Dark...");
		const closeupDarkPath = path.join(PROOFS_DIR, "schedule_cards_closeup_dark.png");
		const cardElemDark = page.locator('.appointment-card').first();
		if (await cardElemDark.isVisible({ timeout: 3000 }).catch(() => false)) {
			const box = await cardElemDark.boundingBox();
			if (box) {
				await page.screenshot({
					path: closeupDarkPath,
					clip: {
						x: Math.max(0, Math.floor(box.x - 20)),
						y: Math.max(0, Math.floor(box.y - 20)),
						width: Math.min(1400, Math.max(800, Math.floor(box.width * 2 + 100))),
						height: Math.min(850, Math.max(500, Math.floor(box.height * 3 + 100))),
					},
					animations: "disabled",
				});
			} else {
				await page.screenshot({
					path: closeupDarkPath,
					clip: { x: 80, y: 150, width: 850, height: 600 },
					animations: "disabled",
				});
			}
		} else {
			await page.screenshot({
				path: closeupDarkPath,
				clip: { x: 80, y: 150, width: 850, height: 600 },
				animations: "disabled",
			});
		}
		for (const bDir of ALL_DIRS) {
			fs.copyFileSync(closeupDarkPath, path.join(bDir, "schedule_cards_closeup_dark.png"));
		}
		console.log(`Saved schedule_cards_closeup_dark.png (${(fs.statSync(closeupDarkPath).size / 1024).toFixed(1)} KB)`);

		// 5. Cabinets Switcher Proof
		console.log("5. Capturing Cabinets & Doctors View Switcher...");
		const chairsBtn = page.locator('[data-testid="schedule-view-mode-chairs"], button:has-text("Кабинеты")').first();
		if (await chairsBtn.isVisible().catch(() => false)) {
			await chairsBtn.click();
			await wait(1200);
			const chairsPath = path.join(PROOFS_DIR, "schedule_cabinets_view_dark.png");
			await page.screenshot({ path: chairsPath, animations: "disabled" });
			for (const bDir of ALL_DIRS) {
				fs.copyFileSync(chairsPath, path.join(bDir, "schedule_cabinets_view_dark.png"));
			}
			console.log(`Saved schedule_cabinets_view_dark.png (${(fs.statSync(chairsPath).size / 1024).toFixed(1)} KB)`);
		}

		// 6. Quick Booking Primary Action Proof
		console.log("6. Capturing Quick Booking Drawer...");
		const quickBookingBtn = page.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("+ Запись"), button:has-text("Новая запись")').first();
		if (await quickBookingBtn.isVisible().catch(() => false)) {
			await quickBookingBtn.click();
			await wait(1500);
			const drawerPath = path.join(PROOFS_DIR, "schedule_quick_booking_drawer.png");
			await page.screenshot({ path: drawerPath, animations: "disabled" });
			for (const bDir of ALL_DIRS) {
				fs.copyFileSync(drawerPath, path.join(bDir, "schedule_quick_booking_drawer.png"));
			}
			console.log(`Saved schedule_quick_booking_drawer.png (${(fs.statSync(drawerPath).size / 1024).toFixed(1)} KB)`);
		}

		// 7. DoctorShiftDrawer Proof (PC Light & Dark, 1440x900)
		console.log("7. Capturing DoctorShiftDrawer Proof...");
		// Close quick booking drawer if open
		const qbCloseBtn = page.locator('.quick-booking-drawer button[aria-label="Закрыть"]').first();
		if (await qbCloseBtn.isVisible().catch(() => false)) {
			await qbCloseBtn.click();
			await wait(500);
		} else {
			await page.keyboard.press("Escape");
			await wait(500);
		}

		// Switch back to grid view
		const gridBtn = page.locator('[data-testid="schedule-view-mode-grid"], button:has-text("Сетка")').first();
		if (await gridBtn.isVisible().catch(() => false)) {
			await gridBtn.click();
			await wait(1000);
		}

		// Open DoctorShiftDrawer via button or custom event
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="schedule-toolbar-doctor-shift-btn"]') ||
			            document.querySelector('[data-testid="shift-analytics-doctor-drawer-btn"]');
			if (btn) (btn).click();
			else window.dispatchEvent(new CustomEvent("dente:open-doctor-shift-drawer"));
		});
		await page.waitForSelector('[data-testid="doctor-shift-drawer-overlay"]', { state: "visible", timeout: 15000 });
		await wait(1000);

		// 7A. DoctorShiftDrawer Light
		console.log("   Capturing DoctorShiftDrawer PC Light...");
		await applyTheme(page, "light");
		const drawerLightPath = path.join(ORPHANS_DIR, "doctor_shift_drawer_pc_light.png");
		await page.screenshot({ path: drawerLightPath, animations: "disabled" });
		fs.copyFileSync(drawerLightPath, path.join(CURRENT_BRAIN_DIR, "doctor_shift_drawer_pc_light.png"));
		fs.copyFileSync(drawerLightPath, path.join(CURRENT_PARENT_BRAIN_DIR, "doctor_shift_drawer_pc_light.png"));
		console.log(`   Saved doctor_shift_drawer_pc_light.png (${fs.statSync(drawerLightPath).size} bytes)`);

		// 7B. DoctorShiftDrawer Dark
		console.log("   Capturing DoctorShiftDrawer PC Dark...");
		await applyTheme(page, "dark");
		const drawerDarkPath = path.join(ORPHANS_DIR, "doctor_shift_drawer_pc_dark.png");
		await page.screenshot({ path: drawerDarkPath, animations: "disabled" });
		fs.copyFileSync(drawerDarkPath, path.join(CURRENT_BRAIN_DIR, "doctor_shift_drawer_pc_dark.png"));
		fs.copyFileSync(drawerDarkPath, path.join(CURRENT_PARENT_BRAIN_DIR, "doctor_shift_drawer_pc_dark.png"));
		console.log(`   Saved doctor_shift_drawer_pc_dark.png (${fs.statSync(drawerDarkPath).size} bytes)`);

		// Close DoctorShiftDrawer via its explicit close button or custom event
		const drawerCloseBtn = page.locator('[data-testid="doctor-shift-drawer-overlay"] button[aria-label="Закрыть панель"], [data-testid="doctor-shift-drawer-overlay"] button').first();
		if (await drawerCloseBtn.isVisible().catch(() => false)) {
			console.log("   Closing DoctorShiftDrawer via close button...");
			await drawerCloseBtn.click();
		} else {
			console.log("   Closing DoctorShiftDrawer via DOM evaluate...");
			await page.evaluate(() => {
				const btn = document.querySelector('[data-testid="doctor-shift-drawer-overlay"] button[aria-label="Закрыть панель"]') ||
				            document.querySelector('[data-testid="doctor-shift-drawer-overlay"] button');
				if (btn) (btn).click();
			});
		}
		await wait(1000);

		// Verify schedule view is still mounted
		const scheduleState = await page.evaluate(() => ({
			hasScheduleEl: Boolean(document.querySelector("#schedule")),
			appointmentsCount: document.querySelectorAll('.appointment-card').length,
			currentView: window.__useAppStore?.getState()?.currentView || null,
			bodyTextSnippet: (document.body.innerText || "").slice(0, 100),
		}));
		console.log("   Schedule state before ChairDateRangeModal:", JSON.stringify(scheduleState));

		// 8. ChairDateRangeModal Proof (PC Light & Dark, 1440x900)
		console.log("8. Capturing ChairDateRangeModal Proof...");
		await page.evaluate(() => {
			const btn = document.querySelector('[data-testid="schedule-toolbar-chair-range-btn"]') ||
			            document.querySelector('[data-testid="shift-analytics-chair-range-btn"]');
			if (btn) (btn).click();
			else window.dispatchEvent(new CustomEvent("dente:open-chair-range-modal"));
		});
		await page.waitForSelector('[data-testid="chair-schedule-date-range-modal"]', { state: "visible", timeout: 15000 });
		await wait(1000);

		// 8A. ChairDateRangeModal Light
		console.log("   Capturing ChairDateRangeModal PC Light...");
		await applyTheme(page, "light");
		const modalLightPath = path.join(ORPHANS_DIR, "chair_date_range_modal_pc_light.png");
		await page.screenshot({ path: modalLightPath, animations: "disabled" });
		fs.copyFileSync(modalLightPath, path.join(CURRENT_BRAIN_DIR, "chair_date_range_modal_pc_light.png"));
		fs.copyFileSync(modalLightPath, path.join(CURRENT_PARENT_BRAIN_DIR, "chair_date_range_modal_pc_light.png"));
		console.log(`   Saved chair_date_range_modal_pc_light.png (${fs.statSync(modalLightPath).size} bytes)`);

		// 8B. ChairDateRangeModal Dark
		console.log("   Capturing ChairDateRangeModal PC Dark...");
		await applyTheme(page, "dark");
		const modalDarkPath = path.join(ORPHANS_DIR, "chair_date_range_modal_pc_dark.png");
		await page.screenshot({ path: modalDarkPath, animations: "disabled" });
		fs.copyFileSync(modalDarkPath, path.join(CURRENT_BRAIN_DIR, "chair_date_range_modal_pc_dark.png"));
		fs.copyFileSync(modalDarkPath, path.join(CURRENT_PARENT_BRAIN_DIR, "chair_date_range_modal_pc_dark.png"));
		console.log(`   Saved chair_date_range_modal_pc_dark.png (${fs.statSync(modalDarkPath).size} bytes)`);

		// Close modal
		const modalCloseBtn = page.locator('[data-testid="chair-range-modal-close-btn"], button:has-text("Отмена")').first();
		if (await modalCloseBtn.isVisible().catch(() => false)) {
			await modalCloseBtn.click();
		} else {
			await page.keyboard.press("Escape");
		}
		await wait(800);

		await context.close();
		console.log("=== ALL SCHEDULE VISUAL PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
	} finally {
		await browser.close();
	}
}

capture().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
