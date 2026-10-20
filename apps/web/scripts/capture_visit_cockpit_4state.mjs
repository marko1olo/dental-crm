import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/1e3c39bb-24e7-47ee-ab41-d665a545c6c6";
if (!existsSync(BRAIN_DIR)) {
	mkdirSync(BRAIN_DIR, { recursive: true });
}

const edgePaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

const executablePath = edgePaths.find((p) => existsSync(p));

const MOCK_USER = {
	id: "user-1",
	orgId: "org-1",
	name: "Доктор Иванов И.И.",
	fullName: "Доктор Иванов И.И.",
	role: "doctor",
	email: "doctor@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-1",
	fullName: "Кузнецов Алексей Сергеевич",
	name: "Кузнецов Алексей Сергеевич",
	phone: "+7 (999) 123-45-67",
	birthDate: "1988-04-12",
	allergies: "Без отягощенного аллергоанамнеза",
	balanceKopecks: 0,
};

const MOCK_APPOINTMENT = {
	id: "appt-1",
	patientId: "pat-1",
	patientName: "Кузнецов Алексей Сергеевич",
	patientPhone: "+7 (999) 123-45-67",
	doctorUserId: "user-1",
	doctorId: "user-1",
	doctorName: "Доктор Иванов И.И.",
	chairId: "chair-1",
	chairNumber: 1,
	startsAt: "2026-10-13T10:00:00.000Z",
	endsAt: "2026-10-13T11:00:00.000Z",
	startTime: "2026-10-13T10:00:00.000Z",
	endTime: "2026-10-13T11:00:00.000Z",
	status: "in_treatment",
	reason: "Лечение кариеса зуба 16",
};

const MOCK_VISIT = {
	id: "visit-1",
	organizationId: "org-1",
	patientId: "pat-1",
	appointmentId: "appt-1",
	status: "draft",
	revision: 1,
	complaint: "Жалоб на момент осмотра активно не предъявляет (профилактический осмотр).",
	anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
	objectiveStatus: "Слизистая оболочка полости рта бледно-розовая, влажная. Онкоскрининг отрицательный.",
	diagnosis: "K02.1 Кариес дентина (зуб 16)",
	treatmentPlan: "Выполнено: [A16.07.002.011] Пломбирование светоотверждаемым композитом (зуб 16) — 4200 ₽\nВыполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 16) — 800 ₽",
	doctorSummary: "Проведено лечение кариеса зуба 16 под местной анестезией.",
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
};

const MOCK_CATALOG = [
	{ id: "srv-1", code804n: "A16.07.002.011", code: "A16.07.002.011", title: "Пломбирование светоотверждаемым композитом", priceRub: 4200, active: true },
	{ id: "srv-2", code804n: "A25.07.001", code: "A25.07.001", title: "Местная анестезия (Артикаин)", priceRub: 800, active: true },
	{ id: "srv-3", code804n: "A06.07.001", code: "A06.07.001", title: "Прицельный рентгеновский снимок", priceRub: 450, active: true },
	{ id: "srv-4", code804n: "A16.07.051", code: "A16.07.051", title: "Изоляция коффердамом", priceRub: 600, active: true },
];

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "Стоматологическая клиника «DENTE»",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		staff: [MOCK_USER],
		profile: {
			name: "Стоматологическая клиника «DENTE»",
			address: "ул. Стоматологическая, 10",
			phone: "+7 (495) 000-00-00",
			mode: "clinic",
			timezone: "Europe/Moscow",
			defaultVisitMinutes: 30,
		},
		chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
	},
	activeDoctor: MOCK_USER,
	activePatient: MOCK_PATIENT,
	activeAppointment: MOCK_APPOINTMENT,
	activeVisit: MOCK_VISIT,
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [MOCK_APPOINTMENT],
	patients: [MOCK_PATIENT],
	serviceCatalog: MOCK_CATALOG,
	waitlist: [],
	imagingStudies: [],
	recentPatients: [MOCK_PATIENT],
	todayStats: { revenue: 154000, appointments: 8, newPatients: 2 },
	notifications: [],
};

async function capture() {
	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const configs = [
		{
			id: "pc_light",
			filename: "visit_cockpit_pc_light.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "light",
		},
		{
			id: "pc_dark",
			filename: "visit_cockpit_pc_dark.png",
			width: 1440,
			height: 900,
			isMobile: false,
			theme: "dark",
		},
		{
			id: "mobile_light",
			filename: "visit_cockpit_mobile_light.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "light",
		},
		{
			id: "mobile_dark",
			filename: "visit_cockpit_mobile_dark.png",
			width: 390,
			height: 844,
			isMobile: true,
			theme: "dark",
		},
	];

	for (const cfg of configs) {
		const context = await browser.newContext({
			viewport: { width: cfg.width, height: cfg.height },
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
		});

		const page = await context.newPage();

		await page.addInitScript(({ theme, isMobile }) => {
			localStorage.setItem("dente_clinic_token", "demo-token-123");
			localStorage.setItem("dente_staff_token", "demo-staff-123");
			localStorage.setItem("dente_theme_mode", theme);
			localStorage.setItem("dente_active_view", "visit");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ theme, onboardingDismissed: true }));
			localStorage.setItem("dente_selected_patient_id", "pat-1");

			const applyTheme = () => {
				if (document.documentElement) {
					document.documentElement.setAttribute("data-theme", theme);
					if (theme === "dark") {
						document.documentElement.classList.add("dark");
					} else {
						document.documentElement.classList.remove("dark");
					}
				}
			};
			applyTheme();
			window.addEventListener("DOMContentLoaded", applyTheme);
		}, { theme: cfg.theme, isMobile: cfg.isMobile });

		// API routes mocks to ensure fast deterministic hydration
		await page.route("**/api/**", async (route) => {
			const method = route.request().method();
			const url = route.request().url();

			if (url.includes("/api/auth/user/me") || url.includes("/api/auth/me")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
			}
			if (url.includes("/api/auth/staff")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_USER]) });
			}
			if (url.includes("/api/dashboard")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD) });
			}
			if (url.includes("/api/settings/clinic/profile")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD.clinicSettings.profile) });
			}
			if (url.includes("/api/settings/preferences")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ theme: cfg.theme, language: "ru" }) });
			}
			if (url.includes("/api/system/health")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }) });
			}
			if (url.includes("/api/patients/pat-1") || url.includes("/api/patients")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [MOCK_PATIENT], patient: MOCK_PATIENT, total: 1 }) });
			}
			if (url.includes("/api/visits")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visit: MOCK_VISIT, items: [MOCK_VISIT] }) });
			}

			if (method === "GET") {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], total: 0 }) });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) });
		});

		console.log(`Navigating to ${cfg.id}...`);
		await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 25000 });
		await page.waitForTimeout(2000);

		// Dismiss onboarding or demo banner if present
		try {
			const demoBtn = page.locator(".wizard-mode-card--demo, button:has-text('Демо-режим'), button:has-text('Попробовать демо')");
			if (await demoBtn.count() > 0 && await demoBtn.first().isVisible()) {
				await demoBtn.first().click();
				await page.waitForTimeout(1500);
			}
		} catch (_) {}

		// If visit-view is present or needs selection
		try {
			const intakeCard = page.locator(".intake-patient-row, button:has-text('Кузнецов')");
			if (await intakeCard.count() > 0 && await intakeCard.first().isVisible()) {
				await intakeCard.first().click();
				await page.waitForTimeout(1000);
			}
		} catch (_) {}

		// Force active view to visit in store if still needed
		await page.evaluate(() => {
			try {
				const appStore = window.__denteAppStore || window.useAppStore;
				if (appStore && typeof appStore.getState === "function") {
					appStore.getState().setCurrentView("visit");
				}
			} catch (_) {}
		});
		await page.waitForTimeout(1000);

		// Apply theme attribute
		await page.evaluate(({ theme }) => {
			document.documentElement.setAttribute("data-theme", theme);
			if (theme === "dark") {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}, { theme: cfg.theme });

		await page.waitForTimeout(1000);

		const targetPath = path.join(BRAIN_DIR, cfg.filename);
		await page.screenshot({ path: targetPath, fullPage: false });
		const stats = statSync(targetPath);
		console.log(`Captured ${cfg.filename}: ${stats.size} bytes (>= 20480: ${stats.size >= 20480})`);

		await context.close();
	}

	await browser.close();
	console.log("All 4 screenshots captured successfully!");
}

capture().catch((err) => {
	console.error("Screenshot capture error:", err);
	process.exit(1);
});
