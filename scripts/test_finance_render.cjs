const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: todayDate,
	clinicSettings: {
		profile: {
			id: "c-1",
			organizationId: "00000000-0000-0000-0000-000000000001",
			clinicName: "Стоматология ДЕНТЕ Премиум",
			legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
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
			ogrn: "1217700123456",
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
		],
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [],
		modeHints: [],
		soloDoctorMode: false,
	},
	serviceCatalog: [],
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
			fullName: "Ковалёв Роман Станиславович",
			status: "active",
			birthDate: "1988-04-12",
			phone: "+7 (999) 888-77-66",
			cardNumber: "043/у-2026-102",
			balanceRub: 15000,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	],
	appointments: [],
	payments: [],
	billingSummary: {
		totalBilledRub: 46800,
		totalPaidRub: 9800,
		totalDueRub: 37000,
		patientDepositRub: 5000,
		familyBalanceRub: 12000,
	},
};

(async () => {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

	await context.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1", "step2", "step3", "step4"] }));
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" }));
		localStorage.setItem("dente-workspace-profile", JSON.stringify({
			state: {
				clinicName: "Стоматология ДЕНТЕ Премиум",
				currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
				flags: { disableTour: true },
			},
		}));
	});

	const page = await context.newPage();

	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/src/")) return route.continue();
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
					token: "live-inquisition-staff-token",
					user: {
						id: "doc-1",
						fullName: "Д-р Воронов Алексей Владимирович",
						role: "owner",
					},
				}),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	await page.goto("http://127.0.0.1:5173/#finance");
	for (let i = 0; i < 8; i++) {
		await page.waitForTimeout(1000);
		const text = await page.evaluate(() => document.body.innerText);
		const hasToolbar = await page.$('.finance-monolithic-toolbar');
		console.log(`Sec ${i+1}: toolbar=${!!hasToolbar}, sample text: ${text.slice(0, 100).replace(/\n/g, ' ')}`);
		if (hasToolbar) break;
	}

	await browser.close();
})().catch(console.error);
