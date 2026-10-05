/**
 * scripts/capture_all_5_departments_clean.mjs
 * Captures all 5 departments of 3D CBCT Studio Picasso in Light and Dark themes (10 screenshots total)
 * Resolution: 1440x900
 */

import { existsSync, mkdirSync, statSync, copyFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BROWSER_CANDIDATES = [
	process.env.BROWSER_BIN,
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const CHROME_PATH = BROWSER_CANDIDATES.find((p) => p && existsSync(p)) || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/cbct_departments");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/427def17-4b4d-4fe8-adfd-59b7f7177a50");
const SUBAGENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/b36b11d2-6adf-48f9-8341-ec798abe11e7");
const PUBLIC_DIR = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots");

for (const d of [OUT_DIR, BRAIN_DIR, SUBAGENT_BRAIN_DIR, PUBLIC_DIR]) {
	if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: "2026-10-03",
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			mode: "small_clinic",
			defaultVisitMinutes: 45,
			scheduleDefaults: {
				workingDays: [1, 2, 3, 4, 5, 6],
				workdayStart: "08:00",
				workdayEnd: "21:00",
				appointmentBufferMinutes: 10,
			},
			timezone: "Europe/Moscow",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "surgeon", "implantologist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кабинет 1",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: true,
			},
		],
	},
	shiftIntelligence: {
		modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
		doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-zakharov",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Захаров Иван Дмитриевич",
			status: "active",
			birthDate: "1980-05-15",
			phone: "+7 (999) 000-11-22",
			notes: "Пациент направлен на 3D КЛКТ для дентальной имплантации",
			administrativeProfile: "normal",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	patientInsights: [], recommendedActions: [], appointments: [],
	clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
	payments: [], billingSummary: { totalPlannedRub: 0, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 0, taxDeductionEligibleRub: 0, draftDocumentAmountRub: 0, openTreatmentItems: 0, unpaidDocuments: 0 },
	communicationTemplates: [], communicationTasks: [], communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function main() {
	console.log("=== CBCT 5 DEPARTMENTS (10 SCREENSHOTS: LIGHT & DARK) PROOF CAPTURE ===");
	console.log("Chrome executable:", CHROME_PATH);

	let browser = null;

	try {
		browser = await chromium.launch({
			headless: true,
			executablePath: CHROME_PATH,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-web-security",
				"--ignore-gpu-blocklist",
				"--use-gl=angle",
				"--enable-webgl",
				"--disable-dev-shm-usage",
			],
		});

		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			serviceWorkers: "block",
		});

		const page = await context.newPage();

		// Intercept API routes
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			let pathname = "";
			try { pathname = new URL(url).pathname; } catch {}
			if (
				pathname.startsWith("/src/") ||
				pathname.startsWith("/@") ||
				pathname.includes("node_modules") ||
				url.endsWith(".ts") ||
				url.endsWith(".tsx") ||
				url.endsWith(".js") ||
				url.endsWith(".mjs")
			) {
				return route.continue();
			}
			if (url.includes("/api/dashboard")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
			}
			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
					}),
				});
			}
			if (url.includes("/api/auth/staff/unlock")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
				});
			}
			if (url.includes("/api/schedule")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
			if (url.includes("/api/patients")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
			if (url.includes("/api/imaging/studies")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([
						{
							id: "study-zakharov-cbct",
							patientId: "pat-zakharov",
							patientName: "Захаров Иван Дмитриевич",
							modality: "CT",
							seriesDescription: "3D КЛКТ Захаров (312 срезов)",
							status: "completed",
							createdAt: new Date().toISOString(),
						},
					]),
				});
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}) });
		});

		// LocalStorage pre-seeding
		await page.addInitScript(() => {
			try {
				const OrigWebSocket = window.WebSocket;
				window.WebSocket = function (url, protocols) {
					if (typeof url === "string" && (url.includes("5173") || url.includes("vite"))) {
						return { send() {}, close() {}, addEventListener() {}, removeEventListener() {}, readyState: 1 };
					}
					return new OrigWebSocket(url, protocols);
				};
			} catch {}

			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem(
				"dente_quest_progress_v2",
				JSON.stringify({
					isDismissedPermanently: true,
					isTourActive: false,
					tracksProgress: {
						solo_doctor: { completed: true, completedStepIds: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
						reception_admin: { completed: true, completedStepIds: [] },
						imaging_diagnostics: { completed: true, completedStepIds: [] },
					},
				}),
			);
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		});

		page.on("pageerror", (err) => console.error("[Browser Page Error]", err.message));

		console.log("Navigating to http://127.0.0.1:5173/#imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);

		// Dismiss any possible overlays or coach marks before opening modal
		await page.evaluate(() => {
			document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});

		// Open Modal
		console.log("Locating 'КЛКТ Студия 3D' button...");
		const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
		await openMprBtn.waitFor({ state: "visible", timeout: 15000 });
		try {
			await openMprBtn.click({ force: true, timeout: 5000 });
		} catch {
			await page.evaluate(() => {
				const b = document.querySelector("[data-testid='imaging-open-3d-mpr']");
				if (b) b.click();
			});
		}

		const modal = page.locator("[data-testid='cbct-studio-modal']").first();
		await modal.waitFor({ state: "visible", timeout: 20000 });
		console.log("[UI AUDIT] CbctMprImplantStudioModal mounted successfully.");

		// Load Demo Volume via native 'cbct-btn-load-demo-empty' button
		console.log("Clicking 'cbct-btn-load-demo-empty' to trigger native 312 slices loader...");
		const loadDemoBtn = modal.locator("[data-testid='cbct-btn-load-demo-empty']").first();
		await loadDemoBtn.waitFor({ state: "visible", timeout: 15000 });
		await loadDemoBtn.click({ force: true });
		console.log("Clicked 'Демо-исследование' button. Waiting for dropzone to detach/hide...");

		// Wait until dropzone is hidden (meaning volume has mounted into viewports)
		await modal.locator("[data-testid='cbct-empty-volume-dropzone']").first().waitFor({ state: "hidden", timeout: 45000 });
		console.log("[VOLUME MOUNTED] Real 312 slices volume mounted into viewports!");
		await page.waitForTimeout(4000);

		// Helper to save screenshot to all dirs
		async function saveScreenshot(fileName, description) {
			const pOut = path.join(OUT_DIR, fileName);
			const pBrain = path.join(BRAIN_DIR, fileName);
			const pSubagent = path.join(SUBAGENT_BRAIN_DIR, fileName);
			const pPublic = path.join(PUBLIC_DIR, fileName);
			if (existsSync(pOut)) {
				try { unlinkSync(pOut); } catch {}
			}
			await page.screenshot({ path: pOut, fullPage: false, animations: "allow" });
			copyFileSync(pOut, pBrain);
			copyFileSync(pOut, pSubagent);
			copyFileSync(pOut, pPublic);
			const sizeKb = (statSync(pOut).size / 1024).toFixed(1);
			console.log(`[CAPTURED] ${fileName} (${sizeKb} KB) - ${description}`);
			return { fileName, pOut, pBrain, sizeKb };
		}

		// Helper to apply theme
		async function applyTheme(theme) {
			console.log(`\n========================================`);
			console.log(`APPLYING THEME: ${theme.toUpperCase()}`);
			console.log(`========================================`);
			await page.evaluate((t) => {
				document.documentElement.setAttribute("data-theme", t);
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(t);
				localStorage.setItem("dente_theme", t);
				localStorage.setItem("dente_theme_mode", t);
				const m = document.querySelector('[data-testid="cbct-studio-modal"]');
				if (m) {
					m.setAttribute("data-theme", t);
				}
			}, theme);
			await page.waitForTimeout(1000);
		}

		async function clearOverlays() {
			await page.evaluate(() => {
				document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
			});
		}

		const themes = ["light", "dark"]; // LIGHT THEME FIRST as user ordered!
		const capturedResults = [];

		for (const theme of themes) {
			await applyTheme(theme);
			await clearOverlays();

			// ==========================================
			// 1. DEPARTMENT 1: MPR Quad (Axial, Coronal, Sagittal, 3D/Pano)
			// ==========================================
			console.log(`\n[${theme.toUpperCase()}] Department 1: MPR Quad`);
			await clearOverlays();
			const tabMpr = page.locator("button:has-text('MPR 3D'), [data-testid='cbct-nav-tab-mpr-3d'], [data-testid='cbct-mode-diagnostic-btn']").first();
			await tabMpr.waitFor({ state: "visible", timeout: 10000 });
			await tabMpr.click({ force: true });
			await page.waitForTimeout(2000);

			// Ensure quadrant 4 is unmaximized if previously maximized
			const collapseBtn = page.locator("[data-testid='btn-viewport-collapse-volume3d'], [data-testid='btn-viewport-collapse-panoramic']").first();
			if (await collapseBtn.isVisible()) {
				await collapseBtn.click({ force: true });
				await page.waitForTimeout(1000);
			}

			const res1 = await saveScreenshot(
				`01_mpr_quad_${theme}.png`,
				`Department 1: MPR Quad 2x2 Orthogonal Viewports (${theme})`
			);
			capturedResults.push(res1);

			// ==========================================
			// 2. DEPARTMENT 2: Panoramic ОПТГ 50/50
			// ==========================================
			console.log(`\n[${theme.toUpperCase()}] Department 2: Panoramic ОПТГ 50/50`);
			await clearOverlays();
			const tabPano = page.locator("button:has-text('Панорама'), [data-testid='cbct-nav-tab-panorama'], [data-testid='cbct-mode-panoramic-btn']").first();
			await tabPano.waitFor({ state: "visible", timeout: 10000 });
			await tabPano.click({ force: true });
			await page.waitForTimeout(2000);

			// Select Maxilla (Upper Jaw)
			const switchMaxillaBtn = page.locator("[data-testid='cbct-jaw-switch-maxilla-btn'], [data-testid='cbct-axial-switch-maxilla-btn']").first();
			if (await switchMaxillaBtn.isVisible()) {
				await switchMaxillaBtn.click({ force: true });
				await page.waitForTimeout(1500);
			}

			const res2 = await saveScreenshot(
				`02_panoramic_optg_50_50_${theme}.png`,
				`Department 2: Panoramic ОПТГ 50/50 Jaw & Cross-sections (${theme})`
			);
			capturedResults.push(res2);

			// ==========================================
			// 3. DEPARTMENT 3: Implantology Studio
			// ==========================================
			console.log(`\n[${theme.toUpperCase()}] Department 3: Implantology Studio`);
			await clearOverlays();
			const tabImplant = page.locator("button:has-text('Имплантация'), [data-testid='cbct-nav-tab-implant'], [data-testid='cbct-mode-implant-btn']").first();
			await tabImplant.waitFor({ state: "visible", timeout: 10000 });
			await tabImplant.click({ force: true });
			await page.waitForTimeout(2000);

			// Click Tooth 26 for ridge telemetry if available
			const tooth26Btn = page.locator("[data-testid='cbct-ridge-tooth-26-btn']").first();
			if (await tooth26Btn.isVisible()) {
				await tooth26Btn.click({ force: true });
				await page.waitForTimeout(800);
			}

			const res3 = await saveScreenshot(
				`03_implant_studio_${theme}.png`,
				`Department 3: Implantology Studio with Ridge Telemetry (${theme})`
			);
			capturedResults.push(res3);

			// ==========================================
			// 4. DEPARTMENT 4: Endodontic Studio
			// ==========================================
			console.log(`\n[${theme.toUpperCase()}] Department 4: Endodontic Studio`);
			await clearOverlays();
			const tabEndo = page.locator("button:has-text('Эндодонтия'), [data-testid='cbct-nav-tab-endo'], [data-testid='cbct-mode-endo-btn']").first();
			await tabEndo.waitFor({ state: "visible", timeout: 10000 });
			await tabEndo.click({ force: true });
			await page.waitForTimeout(2000);

			const res4 = await saveScreenshot(
				`04_endo_studio_${theme}.png`,
				`Department 4: Endodontic Root Canal Zoom & Unsharp Filter (${theme})`
			);
			capturedResults.push(res4);

			// ==========================================
			// 5. DEPARTMENT 5: Fullscreen 3D Volume Viewport
			// ==========================================
			console.log(`\n[${theme.toUpperCase()}] Department 5: Fullscreen 3D Volume Viewport`);
			await clearOverlays();
			// Return to MPR mode
			await tabMpr.click({ force: true });
			await page.waitForTimeout(1500);

			// Switch 4th quadrant to Volume 3D
			const btnVolume3D = page.locator("[data-testid='cbct-btn-mode-volume3d']").first();
			if (await btnVolume3D.isVisible()) {
				await btnVolume3D.click({ force: true });
				await page.waitForTimeout(1500);
			}

			// Maximize 3D Volume Viewport
			const expand3DBtn = page.locator("[data-testid='btn-viewport-expand-volume3d']").first();
			if (await expand3DBtn.isVisible()) {
				await expand3DBtn.click({ force: true });
			} else {
				// Double click container
				const container3D = page.locator("[data-testid='cbct-viewport-container-volume3d']").first();
				if (await container3D.isVisible()) {
					await container3D.dblclick({ force: true });
				}
			}
			await page.waitForTimeout(3000); // Allow WebGL 3D raymarching to render fully

			const res5 = await saveScreenshot(
				`05_volume3d_viewport_${theme}.png`,
				`Department 5: Fullscreen 3D Volume Skull Viewport (${theme})`
			);
			capturedResults.push(res5);

			// Unmaximize 3D Volume Viewport
			const collapse3DBtn = page.locator("[data-testid='btn-viewport-collapse-volume3d']").first();
			if (await collapse3DBtn.isVisible()) {
				await collapse3DBtn.click({ force: true });
				await page.waitForTimeout(1000);
			}
		}

		console.log("\n============================================================");
		console.log("SUCCESSFULLY CAPTURED ALL 10 SCREENSHOTS!");
		console.log("============================================================");
		for (const r of capturedResults) {
			console.log(`- ${r.fileName} (${r.sizeKb} KB): ${r.pOut}`);
		}
	} catch (err) {
		console.error("[Capture Script Failed]:", err);
		process.exit(1);
	} finally {
		if (browser) await browser.close().catch(() => {});
	}
}

main();
