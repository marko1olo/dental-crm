/**
 * scripts/take_schedule_4state_proofs.cjs
 * Visual Proof Pipeline for Schedule: 4-State Visual Proof (PC & Mobile, Light & Dark).
 *
 * 1. docs/proofs/schedule_mobile/pc_schedule_light_1440x900.png
 * 2. docs/proofs/schedule_mobile/pc_schedule_dark_1440x900.png
 * 3. docs/proofs/schedule_mobile/mobile_schedule_light_390x844.png
 * 4. docs/proofs/schedule_mobile/mobile_schedule_dark_390x844.png
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
			toothNumber: "24",
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
			toothNumber: "16",
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
			status: "completed",
			state: "completed",
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

async function setupPageRoutesAndStorage(page) {
	await page.route(
		(url) => {
			const parsed = typeof url === "string" ? new URL(url) : url;
			return parsed.pathname.startsWith("/api/") || parsed.pathname === "/api";
		},
		(route) => {
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
		}
	);

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_workspace_perspective", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_demo_showcase", "false");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
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

		const injectTourSuppressionStyle = () => {
			const style = document.createElement("style");
			style.textContent = `
				[data-testid="doctor-training-coach-mark-card"],
				[data-testid="guided-tour-spotlight-overlay"],
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			if (document.head) {
				document.head.appendChild(style);
			} else {
				document.addEventListener("DOMContentLoaded", () => {
					document.head?.appendChild(style);
				});
			}
		};
		injectTourSuppressionStyle();
	});
}

async function setTheme(page, themeId, isDark) {
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
	await page.waitForTimeout(600);
}

async function capture(page, targetPath) {
	await page.screenshot({ path: targetPath, fullPage: false });
	const buf = fs.readFileSync(targetPath);
	const sizeKb = (buf.length / 1024).toFixed(1);
	const hash = crypto.createHash("md5").update(buf).digest("hex");
	console.log(`  -> Captured: ${path.basename(targetPath)} (${sizeKb} KB, md5: ${hash.slice(0, 8)})`);
	if (buf.length < 20 * 1024) {
		throw new Error(`Screenshot ${targetPath} is too small: ${sizeKb} KB (< 20 KB)`);
	}
	return { path: targetPath, sizeKb, hash };
}

async function main() {
	const proofDir = path.resolve(__dirname, "../docs/proofs/schedule");
	const legacyProofDir = path.resolve(__dirname, "../docs/proofs/schedule_mobile");
	if (!fs.existsSync(proofDir)) {
		fs.mkdirSync(proofDir, { recursive: true });
	}
	if (!fs.existsSync(legacyProofDir)) {
		fs.mkdirSync(legacyProofDir, { recursive: true });
	}

	console.log("[Visual Proof] Launching Chromium...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. PC View (1440x900)
		console.log("\n--- Phase 1: PC Desktop Schedule (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log(`[Browser PC Console] ${msg.type()}: ${msg.text()}`));
		pcPage.on("pageerror", (err) => console.error(`[Browser PC Error]: ${err.message}`));
		await setupPageRoutesAndStorage(pcPage);

		console.log("  -> Navigating to http://127.0.0.1:5173...");
		await pcPage.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 35000 });
		await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await pcPage.waitForTimeout(1000);

		console.log("  -> Switching to schedule view on PC...");
		await pcPage.evaluate(() => { window.location.hash = "schedule"; });
		await pcPage.waitForTimeout(1000);
		await pcPage.waitForSelector('[data-testid="schedule-view"], [data-testid="schedule-filter-strip"], .schedule-filter-strip', {
			timeout: 30000,
			state: "visible",
		});
		await pcPage.waitForTimeout(1500);

		// PC Light
		console.log("  -> Switching to Light theme...");
		await setTheme(pcPage, "light", false);
		const pcLight = await capture(pcPage, path.join(proofDir, "schedule_pc_light_1440x900.png"));
		fs.copyFileSync(pcLight.path, path.join(proofDir, "pc_schedule_light_1440x900.png"));
		fs.copyFileSync(pcLight.path, path.join(legacyProofDir, "pc_schedule_light_1440x900.png"));
		fs.copyFileSync(pcLight.path, path.join(proofDir, "pc_light_1440x900.png"));

		// PC Dark
		console.log("  -> Switching to Dark theme...");
		await setTheme(pcPage, "dark", true);
		const pcDark = await capture(pcPage, path.join(proofDir, "schedule_pc_dark_1440x900.png"));
		fs.copyFileSync(pcDark.path, path.join(proofDir, "pc_schedule_dark_1440x900.png"));
		fs.copyFileSync(pcDark.path, path.join(legacyProofDir, "pc_schedule_dark_1440x900.png"));
		fs.copyFileSync(pcDark.path, path.join(proofDir, "pc_dark_1440x900.png"));

		await pcContext.close();

		// 2. Mobile View (390x844)
		console.log("\n--- Phase 2: Mobile Apple HIG Agenda View (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			userAgent:
				"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		});
		const mobilePage = await mobileContext.newPage();
		mobilePage.on("console", (msg) => console.log(`[Browser Mobile Console] ${msg.type()}: ${msg.text()}`));
		mobilePage.on("pageerror", (err) => console.error(`[Browser Mobile Error]: ${err.message}`));
		await setupPageRoutesAndStorage(mobilePage);

		console.log("  -> Navigating to http://127.0.0.1:5173 on Mobile...");
		await mobilePage.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 35000 });
		await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await mobilePage.waitForTimeout(1000);

		console.log("  -> Switching to mobile schedule view...");
		await mobilePage.evaluate(() => { window.location.hash = "schedule"; });
		await mobilePage.waitForTimeout(1000);
		
		console.log("  -> Waiting for [data-testid=\"schedule-mobile-agenda-view\"]...");
		await mobilePage.waitForSelector('[data-testid="schedule-mobile-agenda-view"]', { timeout: 30000, state: "visible" });
		await mobilePage.waitForTimeout(1500);

		// Mobile Light
		console.log("  -> Switching to Mobile Light theme...");
		await setTheme(mobilePage, "light", false);
		const apptCard = await mobilePage.$('[data-testid="schedule-mobile-appt-card"], .schedule-mobile-card');
		if (apptCard) {
			console.log("  -> Tapping mobile appointment card to open Bottom Sheet...");
			await apptCard.click();
			await mobilePage.waitForTimeout(800);
		}
		const mobLight = await capture(mobilePage, path.join(proofDir, "schedule_mobile_light_390x844.png"));
		fs.copyFileSync(mobLight.path, path.join(proofDir, "mobile_schedule_light_390x844.png"));
		fs.copyFileSync(mobLight.path, path.join(legacyProofDir, "mobile_schedule_light_390x844.png"));
		fs.copyFileSync(mobLight.path, path.join(proofDir, "mobile_light_390x844.png"));

		// Mobile Dark
		console.log("  -> Switching to Mobile Dark theme...");
		await setTheme(mobilePage, "dark", true);
		const mobDark = await capture(mobilePage, path.join(proofDir, "schedule_mobile_dark_390x844.png"));
		fs.copyFileSync(mobDark.path, path.join(proofDir, "mobile_schedule_dark_390x844.png"));
		fs.copyFileSync(mobDark.path, path.join(legacyProofDir, "mobile_schedule_dark_390x844.png"));
		fs.copyFileSync(mobDark.path, path.join(proofDir, "mobile_dark_390x844.png"));

		await mobileContext.close();

		console.log("\n[Visual Proof] ALL 4 PROOFS CAPTURED & VALIDATED (>20 KB) SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[Visual Proof] ERROR:", err);
	process.exit(1);
});
