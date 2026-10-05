/**
 * scripts/capture_emr_visit_flow_proofs.mjs
 * Red Team Inquisitor Verification & Screenshot Capture for Chairside Visit & EMR 043/y Flow.
 *
 * Captures 1440x900 PC Light & Dark screenshots:
 * - apps/web/public/screenshots/emr_visit_flow/visit_emr_flow_light.png
 * - apps/web/public/screenshots/emr_visit_flow/visit_emr_flow_dark.png
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/emr_visit_flow");
const LIGHT_PATH = path.join(OUT_DIR, "visit_emr_flow_light.png");
const DARK_PATH = path.join(OUT_DIR, "visit_emr_flow_dark.png");

if (!existsSync(OUT_DIR)) {
	mkdirSync(OUT_DIR, { recursive: true });
}

const mockDashboard = {
	clinicName: "ООО «ДЕНТЕ»",
	todayIso: "2026-10-05",
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "ООО «ДЕНТЕ»",
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
				specialties: ["therapist", "surgeon", "orthopedist"],
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
			},
		],
	},
	shiftIntelligence: {
		modeFit: { mode: "small_clinic", title: "Оптимальный режим", fitScore: 100, blockers: [], upgrades: [], lowFrictionNextStep: "ready" },
		doctorLoads: [], assistantLoads: [], chairLoads: [], roleQueues: [], scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Ковалёв Роман Станиславович",
			status: "active",
			birthDate: "1990-04-12",
			phone: "+7 (999) 123-45-67",
			allergies: ["Амоксициллин"],
			administrativeProfile: "normal",
			balanceRub: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	appointments: [
		{
			id: "app-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			doctorId: "doc-1",
			chairId: "chair-1",
			status: "in_treatment",
			state: "in_treatment",
			priority: "normal",
			intent: "treatment",
			startsAt: "2026-10-05T10:00:00.000Z",
			endsAt: "2026-10-05T11:00:00.000Z",
			startTime: "2026-10-05T10:00:00.000Z",
			endTime: "2026-10-05T11:00:00.000Z",
			durationMinutes: 60,
			serviceTitle: "Лечение кариеса зуба 4.6 (O, M)",
			patientName: "Ковалёв Роман Станиславович",
			doctorName: "Д-р Воронов Алексей Владимирович",
			createdByUserId: "doc-1",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	activeVisit: {
		id: "00000000-0000-0000-0000-000000000001",
		appointmentId: "app-1",
		patientId: "pat-1",
		doctorId: "doc-1",
		status: "in_treatment",
		specialty: "therapist",
		diagnosisTooth: "46",
		complaint: "Кратковременная боль в зубе 4.6 от сладкого и холодного.",
		anamnesis: "Соматически здоров. Аллергоанамнез: аллергия на амоксициллин. Перенесенные заболевания: ОРВИ.",
		objectiveStatus: "Зуб 4.6: на окклюзионной и медиальной поверхностях (O, M) глубокая кариозная полость. Зондирование дна слабо болезненно. Перкуссия безболезненна. ЭОД 6 мкА.",
		diagnosis: "K02.1 Кариес дентина (Зуб 4.6)",
		treatmentPlan: "• [A16.07.002] Лечение кариеса с постановкой световой пломбы (зуб 46) — 1 усл. (4 500 ₽)\n• [B01.003.004.004] Анестезия инфильтрационная / проводниковая (зуб 46) — 1 усл. (800 ₽)",
		recommendations: "Ограничить прием жесткой и красящей пищи в течение 2 часов. Профосмотр через 6 месяцев.",
		revision: 1,
		signedAt: null,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
	patientInsights: [], recommendedActions: [],
	clinicalRuleSummary: { activeRules: 0, evaluatedRules: 0, unresolved: 0, blockers: 0, warnings: 0, requiredServices: 0, coveredRules: 0 },
	payments: [],
	billingSummary: { totalPlannedRub: 5300, totalDiscountRub: 0, totalPaidRub: 0, totalDueRub: 5300, taxDeductionEligibleRub: 5300, draftDocumentAmountRub: 0, openTreatmentItems: 2, unpaidDocuments: 0 },
	communicationTemplates: [], communicationTasks: [], communicationEvents: [],
	communicationSummary: { openTasks: 0, urgentTasks: 0, dueToday: 0, overdue: 0, completedToday: 0, appointmentConfirmations: 0, paymentReminders: 0, postVisitInstructions: 0 },
	importBatches: [], speechProviders: [], auditEvents: [], complianceWarnings: [],
};

async function captureScreen(browser, port, theme, outPath) {
	console.log(`\n--- Capturing Theme: ${theme.toUpperCase()} -> ${outPath} ---`);
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		colorScheme: theme === "dark" ? "dark" : "light",
	});

	const page = await context.newPage();

	// Intercept API routes
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/src/")) return route.continue();
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
		if (url.includes("/api/patients")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
		}
		if (url.includes("/api/schedule")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
		}
		if (url.includes("/tooth-states") || url.includes("/api/odontogram")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					states: [{ toothNumber: 46, state: "Caries", surfaces: ["O", "M"] }],
				}),
			});
		}
		if (url.includes("/api/insurance/guarantee-letters")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ success: true }),
		});
	});

	// Seed initial local storage before loading
	await page.addInitScript((th) => {
		const now = new Date().toISOString();
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_quest_progress_v1", JSON.stringify({
			isDismissedPermanently: true,
			isTourActive: false,
			activeTrackId: "solo_doctor",
			currentStepIndex: 3,
			tracksProgress: {
				solo_doctor: { completed: true, completedStepIds: ["s1", "s2", "s3", "s4"] },
				registry: { completed: true, completedStepIds: [] },
				xray_ct: { completed: true, completedStepIds: [] },
			},
		}));
		localStorage.setItem("dente_odontogram_states_pat-1", JSON.stringify([
			{ toothNumber: 46, state: "Caries", surfaces: ["O", "M"] }
		]));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
			version: 1,
			onboardingDismissed: true,
			onboardingDraftMode: false,
			onboardingStep: "done",
			savedAt: now,
		}));
	}, theme);

	await page.goto(`http://127.0.0.1:${port}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2000);

	// Populate state directly into stores
	await page.evaluate(({ dash, th }) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
			document.documentElement.style.colorScheme = "light";
		}

		if (window.__useAppStore) {
			window.__useAppStore.getState().setDashboard(dash);
			window.__useAppStore.getState().setCurrentView("visit");
			window.__useAppStore.getState().setActiveTooth("46");
		}
		if (window.__useVisitStore) {
			window.__useVisitStore.getState().setActiveToothNumber(46);
			window.__useVisitStore.getState().setVisitNoteForm({
				complaint: dash.activeVisit.complaint,
				anamnesis: dash.activeVisit.anamnesis,
				objectiveStatus: dash.activeVisit.objectiveStatus,
				diagnosis: dash.activeVisit.diagnosis,
				treatmentPlan: dash.activeVisit.treatmentPlan,
				recommendations: dash.activeVisit.recommendations,
			});
		}

		// Dismiss any active training tour or dialog
		const dismissBtn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent && b.textContent.includes("Больше не показывать"));
		if (dismissBtn) dismissBtn.click();

		// Dispatch services event for billing widget
		window.dispatchEvent(new CustomEvent("dente-add-services-to-invoice", {
			detail: {
				services: [
					{
						serviceId: "A16.07.002",
						title: "Лечение кариеса с постановкой световой пломбы",
						unitPriceRub: 4500,
						quantity: 1,
						code804n: "A16.07.002",
						toothCode: "46",
					},
					{
						serviceId: "B01.003.004.004",
						title: "Анестезия инфильтрационная / проводниковая",
						unitPriceRub: 800,
						quantity: 1,
						code804n: "B01.003.004.004",
						toothCode: "46",
					},
				],
			},
		}));
	}, { dash: mockDashboard, th: theme });

	await page.waitForTimeout(1500);

	// Ensure visit view is visible and wait for it
	await page.waitForSelector('[data-testid="visit-view"]', { timeout: 10000 });

	await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
	const stats = statSync(outPath);
	const md5 = crypto.createHash("md5").update(readFileSync(outPath)).digest("hex");
	console.log(`[PROOF ${theme.toUpperCase()}] Saved: ${outPath} (${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5})`);

	await context.close();
}

async function main() {
	console.log("=== STARTING ROBUST EMR VISIT FLOW SCREENSHOT CAPTURE ===");
	console.log("Chrome executable:", CHROME_PATH);
	console.log("Light Target:", LIGHT_PATH);
	console.log("Dark Target:", DARK_PATH);

	let viteProc = null;
	let browser = null;
	const port = 5173;

	try {
		let isServerAlive = false;
		try {
			const ping = await fetch(`http://127.0.0.1:${port}/`);
			isServerAlive = ping.ok || ping.status === 200 || ping.status === 304;
		} catch {
			isServerAlive = false;
		}

		if (!isServerAlive) {
			console.log(`Port ${port} not reachable. Spawning local Vite dev server...`);
			const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
			viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
				cwd: path.resolve("C:/Clinic_MVP/dental-crm/apps/web"),
				stdio: "ignore",
			});
			for (let i = 0; i < 40; i++) {
				await new Promise((r) => setTimeout(r, 500));
				try {
					const check = await fetch(`http://127.0.0.1:${port}/`);
					if (check.ok || check.status === 200 || check.status === 304) {
						console.log(`Vite dev server ready on port ${port}.`);
						isServerAlive = true;
						break;
					}
				} catch {}
			}
		}

		browser = await chromium.launch({
			headless: true,
			executablePath: CHROME_PATH,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-web-security",
				"--disable-blink-features=AutomationControlled",
			],
		});

		// 1. Capture Light Mode
		await captureScreen(browser, port, "light", LIGHT_PATH);

		// 2. Capture Dark Mode
		await captureScreen(browser, port, "dark", DARK_PATH);

		console.log("=== SCREENSHOT CAPTURE COMPLETED SUCCESSFULLY ===");
	} finally {
		if (browser) await browser.close();
		if (viteProc) {
			console.log("Stopping spawned Vite process...");
			viteProc.kill();
		}
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR] Screenshot capture failed:", err);
	process.exit(1);
});
