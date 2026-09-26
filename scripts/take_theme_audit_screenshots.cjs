/**
 * scripts/take_theme_audit_screenshots.cjs
 * Comprehensive Red Team Visual & Atmospheric Themes Screenshot Pipeline.
 *
 * Captures live high-resolution screenshots for ALL 10 DENTE CRM themes:
 * 1.  Light (Базовая светлая)
 * 2.  Dark (Глубокий графитовый)
 * 3.  Ocean (Глубоководный сапфировый)
 * 4.  Sakura (Мягкий пудрово-розовый)
 * 5.  Emerald (Хвойно-изумрудный клинический)
 * 6.  Cyber X-Ray (Рентгенологический КТ)
 * 7.  Night (Ультра-тёмный OLED)
 * 8.  Warm Sand (Тёплый песочный/льняной)
 * 9.  Calm Teal (Спокойный морской бриз)
 * 10. Contrast (Медицинский WCAG AAA)
 *
 * Invariants:
 * - Live frontend on http://127.0.0.1:5173/
 * - Unique MD5 hash per theme
 * - Size >= 40 KB per screenshot (>= 15 KB for contrast)
 * - Multimodal inspection ready
 * - Mandate 8b: <= 800 lines
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const THEMES = [
	{ id: "light", name: "01_light_desktop", isDark: false },
	{ id: "dark", name: "02_dark_desktop", isDark: true },
	{ id: "ocean", name: "03_ocean_desktop", isDark: true },
	{ id: "sakura", name: "04_sakura_desktop", isDark: false },
	{ id: "emerald", name: "05_emerald_desktop", isDark: true },
	{ id: "cyber_xray", name: "06_cyber_xray_desktop", isDark: true },
	{ id: "night", name: "07_night_desktop", isDark: true },
	{ id: "warm_sand", name: "08_warm_sand_desktop", isDark: false },
	{ id: "calm_teal", name: "09_calm_teal_desktop", isDark: false },
	{ id: "contrast", name: "10_contrast_desktop", isDark: false },
];

const MOBILE_THEMES = [
	{ id: "light", name: "01_light_mobile", isDark: false },
	{ id: "dark", name: "02_dark_mobile", isDark: true },
	{ id: "ocean", name: "03_ocean_mobile", isDark: true },
	{ id: "cyber_xray", name: "06_cyber_xray_mobile", isDark: true },
];

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
			notes: "Аллергия на пенициллин. Лечение по ДМС Согаз.",
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
			status: "in_treatment",
			state: "in_treatment",
			priority: "normal",
			intent: "treatment",
			startsAt: `${todayDate}T09:00:00.000Z`,
			endsAt: `${todayDate}T10:15:00.000Z`,
			startTime: `${todayDate}T09:00:00.000Z`,
			endTime: `${todayDate}T10:15:00.000Z`,
			serviceTitle: "Лечение пульпита 2.4 (Кариес/Эндо)",
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
			status: "confirmed",
			state: "confirmed",
			priority: "normal",
			intent: "surgery",
			startsAt: `${todayDate}T11:00:00.000Z`,
			endsAt: `${todayDate}T12:30:00.000Z`,
			startTime: `${todayDate}T11:00:00.000Z`,
			endTime: `${todayDate}T12:30:00.000Z`,
			serviceTitle: "Установка имплантата Straumann BLX 1.6",
			serviceCategories: ["surgery"],
			createdByUserId: "doc-2",
			createdAt: `${todayDate}T08:00:00.000Z`,
			updatedAt: `${todayDate}T08:00:00.000Z`,
			patientName: "Барабаш Светлана Викторовна",
			doctorName: "Д-р Смирнова Е.В.",
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
		totalPlannedRub: 145000,
		totalDiscountRub: 5000,
		totalPaidRub: 65000,
		totalDueRub: 75000,
		taxDeductionEligibleRub: 65000,
		draftDocumentAmountRub: 0,
		openTreatmentItems: 2,
		unpaidDocuments: 1,
	},
	communicationTemplates: [],
	communicationTasks: [],
	communicationEvents: [],
	communicationSummary: {
		openTasks: 0,
		urgentTasks: 0,
		dueToday: 0,
		overdue: 0,
		completedToday: 0,
		appointmentConfirmations: 0,
		paymentReminders: 0,
		postVisitInstructions: 0,
	},
	importBatches: [],
	speechProviders: [],
	auditEvents: [],
	complianceWarnings: [],
};

async function runThemeAudit() {
	const outDirs = [
		path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/themes_audit"),
		path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a1e09b2a-1696-4d06-818f-772083ba5bd8/screenshots"),
		path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a84df016-a7cc-461c-ba80-899ae84de477/screenshots"),
	];

	for (const dir of outDirs) {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	console.log("[Theme Inquisitor] Launching Playwright browser with Chrome...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();

	// Intercept API routes BEFORE navigating
	await page.route("**/api/**", async (route) => {
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
		// Default fallback for other endpoints
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
		});
	});

	// Pre-seed localStorage before navigation via addInitScript
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

	// Navigate to Schedule workspace
	await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
	await page.waitForTimeout(2500);

	const capturedFiles = [];
	const hashes = new Set();

	// 1. Capture Desktop Screenshots for ALL 10 Themes
	console.log("\n[Theme Inquisitor] Capturing Desktop (1440x900) across all 10 themes...");
	await page.setViewportSize({ width: 1440, height: 900 });

	for (const theme of THEMES) {
		console.log(`  -> Switching to theme: ${theme.id} (${theme.name})...`);

		await page.evaluate(
			({ themeId, isDark }) => {
				document.documentElement.setAttribute("data-theme", themeId);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				if (themeId === "contrast") {
					document.documentElement.classList.add("a11y-contrast");
				} else {
					document.documentElement.classList.remove("a11y-contrast");
				}
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(themeId);
				}
				localStorage.setItem("dente_theme_mode", themeId);
			},
			{ themeId: theme.id, isDark: theme.isDark }
		);

		await page.waitForTimeout(800);

		const filename = `${theme.name}.png`;
		const targetPath = path.join(outDirs[0], filename);

		await page.screenshot({ path: targetPath, fullPage: false });

		const buf = fs.readFileSync(targetPath);
		const sizeKb = (buf.length / 1024).toFixed(1);
		const hash = crypto.createHash("md5").update(buf).digest("hex");

		const minSize = theme.id === "contrast" ? 15 * 1024 : 40 * 1024;
		if (buf.length < minSize) {
			throw new Error(`Screenshot ${filename} is too small: ${sizeKb} KB (< ${minSize / 1024} KB)`);
		}
		if (hashes.has(hash)) {
			throw new Error(`Screenshot ${filename} is a duplicate (identical MD5: ${hash})`);
		}
		hashes.add(hash);

		// Mirror to other dirs
		for (let i = 1; i < outDirs.length; i++) {
			fs.copyFileSync(targetPath, path.join(outDirs[i], filename));
		}

		capturedFiles.push({
			theme: theme.id,
			name: filename,
			path: targetPath,
			sizeKb,
			hash: hash.slice(0, 10),
		});
		console.log(`     [OK] ${filename} (${sizeKb} KB, MD5: ${hash.slice(0, 10)})`);
	}

	// 2. Capture Mobile Screenshots for Key Viewports (390x844)
	console.log("\n[Theme Inquisitor] Capturing Mobile (390x844) key states...");
	await page.setViewportSize({ width: 390, height: 844 });

	for (const theme of MOBILE_THEMES) {
		console.log(`  -> Switching mobile to theme: ${theme.id}...`);

		await page.evaluate(
			({ themeId, isDark }) => {
				document.documentElement.setAttribute("data-theme", themeId);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(themeId);
				}
			},
			{ themeId: theme.id, isDark: theme.isDark }
		);

		await page.waitForTimeout(800);

		const filename = `${theme.name}.png`;
		const targetPath = path.join(outDirs[0], filename);

		await page.screenshot({ path: targetPath, fullPage: false });

		const buf = fs.readFileSync(targetPath);
		const sizeKb = (buf.length / 1024).toFixed(1);
		const hash = crypto.createHash("md5").update(buf).digest("hex");

		if (buf.length < 20 * 1024) {
			throw new Error(`Mobile screenshot ${filename} is too small: ${sizeKb} KB (< 20 KB)`);
		}

		for (let i = 1; i < outDirs.length; i++) {
			fs.copyFileSync(targetPath, path.join(outDirs[i], filename));
		}

		capturedFiles.push({
			theme: `${theme.id} (Mobile)`,
			name: filename,
			path: targetPath,
			sizeKb,
			hash: hash.slice(0, 10),
		});
		console.log(`     [OK] ${filename} (${sizeKb} KB, MD5: ${hash.slice(0, 10)})`);
	}

	await browser.close();

	console.log("\n=======================================================");
	console.log(`[Theme Inquisitor] Successfully captured ${capturedFiles.length} visual theme proofs!`);
	console.log("=======================================================\n");

	return capturedFiles;
}

if (require.main === module) {
	runThemeAudit()
		.then((files) => {
			console.log("Captured Registry:");
			console.table(files);
			process.exit(0);
		})
		.catch((err) => {
			console.error("[Theme Inquisitor ERROR]:", err);
			process.exit(1);
		});
}

module.exports = { runThemeAudit };
