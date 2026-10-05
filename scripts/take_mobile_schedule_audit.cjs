/**
 * scripts/take_mobile_schedule_audit.cjs
 * Red Team Mobile HIG Screenshot Pipeline for Schedule & Reception.
 *
 * Captures live high-resolution screenshots on iOS emulator (390x844):
 * 1. mobile_schedule_light_390x844.png - Vertical Agenda view (Light theme)
 * 2. mobile_schedule_dark_390x844.png - Vertical Agenda view (Dark theme)
 * 3. mobile_schedule_sheet_light_390x844.png - Native iOS Bottom Sheet Drawer (Light theme)
 * 4. mobile_schedule_sheet_dark_390x844.png - Native iOS Bottom Sheet Drawer (Dark theme)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: todayDate,
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
			phone: "+7 (495) 123-45-67",
			address: "Москва, Столярный переулок, 14",
			inn: "7701234567",
			updatedAt: new Date().toISOString(),
		},
		staff: [
			{
				id: "doc-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "orthopedist"],
				active: true,
				color: "#0d9488",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: "doc-2",
				organizationId: "00000000-0000-0000-0000-000000000001",
				fullName: "Д-р Смирнова Елена Викторовна",
				role: "doctor",
				specialties: ["surgery"],
				active: true,
				color: "#0284c7",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		],
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кабинет 1 (Терапия)",
				room: "1",
				defaultDoctorId: "doc-1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: false,
			},
			{
				id: "chair-2",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кабинет 2 (Хирургия)",
				room: "2",
				defaultDoctorId: "doc-2",
				active: true,
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: true,
			},
		],
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [],
		modeHints: [],
		soloDoctorMode: false,
	},
	shiftIntelligence: {
		modeFit: {
			mode: "small_clinic",
			title: "Оптимальный режим",
			fitScore: 100,
			blockers: [],
			upgrades: [],
			lowFrictionNextStep: "ready",
		},
		doctorLoads: [],
		assistantLoads: [],
		chairLoads: [],
		roleQueues: [],
		scheduleWarnings: [],
	},
	patients: [
		{
			id: "pat-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Смирнов Алексей Васильевич",
			status: "active",
			birthDate: "1985-04-12",
			phone: "+7 (999) 123-45-67",
			email: "smirnov@example.ru",
			notes: "Аллергия на лидокаин. Лечение по ДМС Согаз.",
			administrativeProfile: "normal",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
		},
		{
			id: "pat-2",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Барабаш Светлана Викторовна",
			status: "active",
			birthDate: "1992-09-14",
			phone: "+7 (999) 765-43-21",
			email: "barabash@example.ru",
			notes: "Плановая имплантация 1.6 Straumann BLX",
			administrativeProfile: "normal",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
		},
		{
			id: "pat-3",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Ковалев Дмитрий Сергеевич",
			status: "active",
			birthDate: "1978-11-20",
			phone: "+7 (903) 555-88-99",
			email: "kovalev@example.ru",
			notes: "Контрольный осмотр после профгигиены",
			administrativeProfile: "normal",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
		},
	],
	patientInsights: [],
	recommendedActions: [],
	appointments: [
		{
			id: "app-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			doctorId: "doc-1",
			chairId: "chair-1",
			status: "arrived",
			state: "arrived",
			priority: "normal",
			intent: "treatment",
			startsAt: `${todayDate}T09:00:00.000Z`,
			endsAt: `${todayDate}T10:00:00.000Z`,
			startTime: `${todayDate}T09:00:00.000Z`,
			endTime: `${todayDate}T10:00:00.000Z`,
			serviceTitle: "Лечение пульпита 2.4 (Эндодонтия)",
			reason: "Лечение пульпита 2.4",
			serviceCategories: ["therapy"],
			createdByUserId: "doc-1",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
			patientName: "Смирнов Алексей Васильевич",
			doctorName: "Д-р Воронов А.В.",
		},
		{
			id: "app-2",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-2",
			doctorUserId: "doc-2",
			doctorId: "doc-2",
			chairId: "chair-2",
			status: "in_treatment",
			state: "in_treatment",
			priority: "normal",
			intent: "surgery",
			startsAt: `${todayDate}T10:30:00.000Z`,
			endsAt: `${todayDate}T11:45:00.000Z`,
			startTime: `${todayDate}T10:30:00.000Z`,
			endTime: `${todayDate}T11:45:00.000Z`,
			serviceTitle: "Установка имплантата Straumann BLX 1.6",
			reason: "Имплантация 1.6",
			serviceCategories: ["surgery"],
			createdByUserId: "doc-2",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
			patientName: "Барабаш Светлана Викторовна",
			doctorName: "Д-р Смирнова Е.В.",
		},
		{
			id: "app-3",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-3",
			doctorUserId: "doc-1",
			doctorId: "doc-1",
			chairId: "chair-1",
			status: "confirmed",
			state: "confirmed",
			priority: "normal",
			intent: "consultation",
			startsAt: `${todayDate}T12:00:00.000Z`,
			endsAt: `${todayDate}T12:45:00.000Z`,
			startTime: `${todayDate}T12:00:00.000Z`,
			endTime: `${todayDate}T12:45:00.000Z`,
			serviceTitle: "Консультация и составление плана",
			reason: "Консультация",
			serviceCategories: ["therapy"],
			createdByUserId: "doc-1",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
			patientName: "Ковалев Дмитрий Сергеевич",
			doctorName: "Д-р Воронов А.В.",
		},
	],
	appointmentReadiness: [],
	scheduleSuggestions: [],
	activeVisit: null,
	visitCloseChecklist: {
		visitId: "v-none",
		readyToSign: false,
		score: 0,
		nextAction: "none",
		blockingItems: 0,
		items: [],
	},
	documents: [],
	imagingStudies: [],
	protocolTemplates: [],
	serviceCatalog: [],
	treatmentPlanItems: [],
	treatmentPlanScenarios: [],
	clinicalRules: [],
	clinicalRuleEvaluations: [],
	clinicalRuleSummary: {
		activeRules: 0,
		evaluatedRules: 0,
		unresolved: 0,
		blockers: 0,
		warnings: 0,
		requiredServices: 0,
		coveredRules: 0,
	},
	payments: [],
	billingSummary: {
		totalPaid: 0,
		totalDebt: 0,
		todayRevenue: 0,
	},
	unallocatedPayments: [],
	patientBalances: [],
	priceCatalog: [],
	discounts: [],
	perToothBillingSummary: {
		teeth: {},
		totalInvoiced: 0,
		totalPaid: 0,
	},
};

async function main() {
	const outDirs = [
		path.resolve(__dirname, "../docs/screenshots/mobile_schedule"),
		path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a5df8874-6c52-4faf-8859-181ece860cdf"),
	];

	for (const dir of outDirs) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	console.log("[Mobile HIG Inquisitor] Launching Chrome (iPhone 14/15 390x844 emulation)...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		userAgent:
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
	});

	const page = await context.newPage();

	// Intercept API routes
	await page.route("**/api/**", (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		}
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: {
						id: "doc-1",
						fullName: "Д-р Воронов Алексей Владимирович",
						role: "owner",
						active: true,
						organizationId: "00000000-0000-0000-0000-000000000001",
					},
				}),
			});
		}
		if (url.includes("/api/auth/staff/unlock")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					token: "audit-token-staff",
					user: {
						id: "doc-1",
						fullName: "Д-р Воронов Алексей Владимирович",
						role: "owner",
					},
				}),
			});
		}
		if (url.includes("/api/schedule")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.appointments),
			});
		}
		if (url.includes("/api/patients")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard.patients),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
		});
	});

	// Pre-seed localStorage before navigation
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem(
			"dente_ui_preferences_v1",
			JSON.stringify({
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			})
		);
		localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({
				dismissed: true,
				step: "done",
				completed: true,
				onboardingDismissed: true,
				onboardingStep: "done",
				version: 1,
			})
		);
		localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				onboardingDismissed: true,
				onboardingStep: "done",
			})
		);
		localStorage.setItem(
			"dente-workspace-profile",
			JSON.stringify({
				state: {
					clinicName: "Стоматология ДЕНТЕ Премиум",
					currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
					flags: { disableTour: true },
				},
			})
		);
	});

	// Navigate to Schedule
	console.log("  -> Navigating to http://127.0.0.1:5173/#schedule...");
	await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
	
	// Wait for mobile agenda view to mount and be visible
	console.log("  -> Waiting for [data-testid=\"schedule-mobile-agenda-view\"]...");
	await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { timeout: 30000, state: "visible" });
	console.log("  -> Found [data-testid=\"schedule-mobile-agenda-view\"] and it is visible!");
	await page.waitForTimeout(1000);

	const capturedFiles = [];

	// Helper to switch theme
	async function setTheme(themeId, isDark) {
		await page.evaluate(
			({ themeId, isDark }) => {
				document.documentElement.setAttribute("data-theme", themeId);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(themeId);
				}
				localStorage.setItem("dente_theme_mode", themeId);
			},
			{ themeId, isDark }
		);
		await page.waitForTimeout(800);
	}

	// Helper to capture and save
	async function capture(filename) {
		const targetPath = path.join(outDirs[0], filename);
		await page.screenshot({ path: targetPath, fullPage: false });

		const buf = fs.readFileSync(targetPath);
		const sizeKb = (buf.length / 1024).toFixed(1);
		const hash = crypto.createHash("md5").update(buf).digest("hex");

		if (buf.length < 20 * 1024) {
			throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< 20 KB)`);
		}

		for (let i = 1; i < outDirs.length; i++) {
			fs.copyFileSync(targetPath, path.join(outDirs[i], filename));
		}

		capturedFiles.push({
			name: filename,
			path: targetPath,
			sizeKb,
			hash: hash.slice(0, 10),
		});
		console.log(`     [OK] Captured ${filename} (${sizeKb} KB, MD5: ${hash.slice(0, 10)})`);
	}

	// 1. Mobile Schedule Light (Agenda view)
	console.log("\n[1/4] Capturing Mobile Schedule Agenda (Light theme, 390x844)...");
	await setTheme("light", false);
	await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { state: "visible", timeout: 10000 });
	await capture("mobile_schedule_light_390x844.png");

	// 2. Open Bottom Sheet Drawer in Light Theme
	console.log("\n[2/4] Opening Mobile Bottom Sheet Drawer in Light theme...");
	const apptCard = page.locator('[data-testid="schedule-mobile-appt-card"]').first();
	await apptCard.waitFor({ timeout: 5000 });
	await apptCard.click();
	await page.waitForSelector('[data-testid="schedule-grid-mobile-bottom-sheet"]', { state: "visible", timeout: 10000 });
	console.log("  -> [data-testid=\"schedule-grid-mobile-bottom-sheet\"] is OPEN (Light theme)!");
	await page.waitForTimeout(600);
	await capture("mobile_schedule_sheet_light_390x844.png");

	// 3. Switch to Dark Theme while Bottom Sheet is open
	console.log("\n[3/4] Switching to Dark theme for Bottom Sheet Drawer...");
	await setTheme("dark", true);
	await page.waitForSelector('[data-testid="schedule-grid-mobile-bottom-sheet"]', { state: "visible", timeout: 10000 });
	await page.waitForTimeout(600);
	await capture("mobile_schedule_sheet_dark_390x844.png");

	// 4. Close Bottom Sheet and Capture Dark Agenda View
	console.log("\n[4/4] Closing Bottom Sheet and capturing Mobile Schedule Agenda (Dark theme)...");
	const closeBtn = page.locator('[data-testid="schedule-grid-mobile-bottom-sheet"] button[aria-label="Закрыть"]').first();
	await closeBtn.click();
	await page.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { state: "visible", timeout: 10000 });
	await page.waitForTimeout(600);
	await capture("mobile_schedule_dark_390x844.png");

	await browser.close();

	console.log("\n========================================================");
	console.log("[Mobile HIG Inquisitor] ALL 4 SCREENSHOTS CAPTURED SUCCESSFULLY!");
	console.log("========================================================");
	for (const f of capturedFiles) {
		console.log(`- ${f.name}: ${f.sizeKb} KB (MD5: ${f.hash}) -> ${f.path}`);
	}
}

main().catch((err) => {
	console.error("[Mobile HIG Inquisitor] FATAL ERROR:", err);
	process.exit(1);
});
