const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

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
			city: "Москва",
			timezone: "Europe/Moscow",
			defaultCurrency: "RUB",
		},
		chairs: [
			{
				id: "chair-1",
				organizationId: "00000000-0000-0000-0000-000000000001",
				name: "Кресло 1 (Терапия)",
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
				name: "Кресло 2 (Хирургия)",
				room: "2",
				defaultDoctorId: "doc-2",
				active: true,
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: true,
			},
		],
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "doctor",
				specialty: "Терапевт",
				active: true,
			},
			{
				id: "doc-2",
				fullName: "Д-р Морозов Сергей Игоревич",
				role: "doctor",
				specialty: "Хирург",
				active: true,
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
			birthDate: "1992-09-23",
			phone: "+7 (916) 555-88-99",
			email: "barabash@example.ru",
			notes: "Ортодонтическое лечение, брекет-система Damon Q.",
			administrativeProfile: "vip",
			createdAt: `${todayDate}T08:30:00.000Z`,
			updatedAt: `${todayDate}T08:30:00.000Z`,
		},
		{
			id: "pat-3",
			organizationId: "00000000-0000-0000-0000-000000000001",
			fullName: "Кузнецов Дмитрий Сергеевич",
			status: "active",
			birthDate: "1978-11-05",
			phone: "+7 (903) 777-11-22",
			email: "kuznetsov@example.ru",
			notes: "Имплантация Nobel Biocare 3.6, 4.6.",
			administrativeProfile: "debtor",
			createdAt: `${todayDate}T09:00:00.000Z`,
			updatedAt: `${todayDate}T09:00:00.000Z`,
		},
	],
	appointments: [
		{
			id: "app-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-1",
			patientName: "Смирнов Алексей Васильевич",
			patientPhone: "+7 (999) 123-45-67",
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			doctorId: "doc-1",
			doctorUserId: "doc-1",
			doctorName: "Д-р Воронов Алексей Владимирович",
			startTime: `${todayDate}T09:00:00+03:00`,
			endTime: `${todayDate}T10:00:00+03:00`,
			startsAt: `${todayDate}T09:00:00+03:00`,
			endsAt: `${todayDate}T10:00:00+03:00`,
			status: "arrived",
			reason: "Лечение кариеса 2.6 (световая пломба)",
			serviceTitle: "Лечение кариеса 2.6 (световая пломба)",
			amountRub: 7500,
			colorTag: "#0d9488",
			confirmed: true,
			urgent: false,
		},
		{
			id: "app-2",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-2",
			patientName: "Барабаш Светлана Викторовна",
			patientPhone: "+7 (916) 555-88-99",
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			doctorId: "doc-1",
			doctorUserId: "doc-1",
			doctorName: "Д-р Воронов Алексей Владимирович",
			startTime: `${todayDate}T10:30:00+03:00`,
			endTime: `${todayDate}T11:30:00+03:00`,
			startsAt: `${todayDate}T10:30:00+03:00`,
			endsAt: `${todayDate}T11:30:00+03:00`,
			status: "in_treatment",
			reason: "Активация брекет-системы Damon Q",
			serviceTitle: "Активация брекет-системы Damon Q",
			amountRub: 4500,
			colorTag: "#3b82f6",
			confirmed: true,
			urgent: false,
		},
		{
			id: "app-3",
			organizationId: "00000000-0000-0000-0000-000000000001",
			patientId: "pat-3",
			patientName: "Кузнецов Дмитрий Сергеевич",
			patientPhone: "+7 (903) 777-11-22",
			chairId: "chair-2",
			chairName: "Кресло 2 (Хирургия)",
			doctorId: "doc-2",
			doctorUserId: "doc-2",
			doctorName: "Д-р Морозов Сергей Игоревич",
			startTime: `${todayDate}T11:00:00+03:00`,
			endTime: `${todayDate}T12:30:00+03:00`,
			startsAt: `${todayDate}T11:00:00+03:00`,
			endsAt: `${todayDate}T12:30:00+03:00`,
			status: "planned",
			reason: "Установка формирователя десны 4.6",
			serviceTitle: "Установка формирователя десны 4.6",
			amountRub: 12000,
			colorTag: "#f59e0b",
			confirmed: false,
			urgent: false,
		},
	],
	doctors: [
		{
			id: "doc-1",
			fullName: "Д-р Воронов Алексей Владимирович",
			specialty: "Стоматолог-терапевт, ортопед",
			phone: "+7 (901) 111-22-33",
			active: true,
		},
		{
			id: "doc-2",
			fullName: "Д-р Морозов Сергей Игоревич",
			specialty: "Стоматолог-хирург, имплантолог",
			phone: "+7 (902) 222-33-44",
			active: true,
		},
	],
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

async function capture() {
	const outDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\35e6e164-3cba-4cc2-a7cd-b89928703666";
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
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
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
			localStorage.setItem(
				"dente_quest_tour_progress_v1",
				JSON.stringify({
					isDismissedPermanently: true,
					isTourActive: false,
					tracksProgress: {
						solo_doctor: { completed: true, completedStepIds: [] },
						reception_admin: { completed: true, completedStepIds: [] },
						imaging_diagnostics: { completed: true, completedStepIds: [] },
					},
				})
			);
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

		console.log("Navigating to http://127.0.0.1:5173/#schedule ...");
		await page.goto("http://127.0.0.1:5173/#schedule", {
			waitUntil: "commit",
			timeout: 30000,
		});
		await page.waitForTimeout(3500);

		// Dismiss any possible modal/onboarding/PIN prompt
		const dismissBtn = page.locator('button:has-text("Пропустить"), .staff-pin-cancel-btn').first();
		if (await dismissBtn.count() > 0) {
			await dismissBtn.click().catch(() => {});
		}

		// 1. Schedule Light
		console.log("Capturing Schedule Light...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.style.colorScheme = "light";
			localStorage.setItem("dente_theme_mode", "light");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("light");
			}
		});
		await page.waitForTimeout(1000);
		const schedLightPath = path.join(outDir, "current_schedule_light.png");
		await page.screenshot({ path: schedLightPath });
		console.log("Saved", schedLightPath, "size:", (fs.readFileSync(schedLightPath).length / 1024).toFixed(1), "KB");

		// 2. Schedule Dark
		console.log("Capturing Schedule Dark...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
			localStorage.setItem("dente_theme_mode", "dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("dark");
			}
		});
		await page.waitForTimeout(1000);
		const schedDarkPath = path.join(outDir, "current_schedule_dark.png");
		await page.screenshot({ path: schedDarkPath });
		console.log("Saved", schedDarkPath, "size:", (fs.readFileSync(schedDarkPath).length / 1024).toFixed(1), "KB");

		// 3. Patients Light
		console.log("Navigating to Patients Light...");
		const patBtn = page.locator('button:has-text("Пациенты"), [data-view="patients"], a[href="#patients"]').first();
		if (await patBtn.count() > 0) {
			await patBtn.click().catch(() => {});
		} else {
			await page.evaluate(() => { window.location.hash = "#patients"; });
		}
		await page.waitForSelector('.patient-card', { timeout: 20000 }).catch((e) => console.log("Timeout waiting for .patient-card:", e.message));
		await page.waitForTimeout(2000);

		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.style.colorScheme = "light";
			localStorage.setItem("dente_theme_mode", "light");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("light");
			}
		});
		await page.waitForTimeout(1000);
		const patLightPath = path.join(outDir, "current_patients_light.png");
		await page.screenshot({ path: patLightPath });
		console.log("Saved", patLightPath, "size:", (fs.readFileSync(patLightPath).length / 1024).toFixed(1), "KB");

		// 4. Patients Dark
		console.log("Capturing Patients Dark...");
		await page.evaluate(() => {
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.documentElement.style.colorScheme = "dark";
			localStorage.setItem("dente_theme_mode", "dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("dark");
			}
		});
		await page.waitForTimeout(1000);
		const patDarkPath = path.join(outDir, "current_patients_dark.png");
		await page.screenshot({ path: patDarkPath });
		console.log("Saved", patDarkPath, "size:", (fs.readFileSync(patDarkPath).length / 1024).toFixed(1), "KB");

	} finally {
		await browser.close();
	}
}

capture().catch((e) => {
	console.error(e);
	process.exit(1);
});
