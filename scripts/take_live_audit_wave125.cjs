const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e1164d8d-2730-485e-9afe-aa0a260df89f";

const MOCK_USER = {
	id: "doc-1",
	orgId: "org-1",
	name: "Лечащий врач",
	fullName: "Лечащий врач",
	role: "doctor",
	email: "doctor@dente.ru",
	active: true,
	pin: null,
};

const MOCK_CHAIRS = [
	{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true, room: "Кабинет 1" },
	{ id: "chair-2", name: "Кресло 2 (Хирургия)", active: true, room: "Кабинет 2" },
];

const TODAY = new Date().toISOString().slice(0, 10);

const MOCK_APPOINTMENTS = [
	{
		id: "appt-1",
		patientId: "pat-1",
		patientName: "Алексеев Владимир Сергеевич",
		patientPhone: "+7 916 555-12-34",
		doctorId: "doc-1",
		doctorName: "Лечащий врач",
		chairId: "chair-1",
		chairNumber: 1,
		startsAt: `${TODAY}T10:00:00.000Z`,
		endsAt: `${TODAY}T11:00:00.000Z`,
		startTime: `${TODAY}T10:00:00.000Z`,
		endTime: `${TODAY}T11:00:00.000Z`,
		status: "in_progress",
		reason: "Лечение глубокого кариеса зуба 46",
	},
	{
		id: "appt-2",
		patientId: "pat-2",
		patientName: "Соколова Анна Михайловна",
		patientPhone: "+7 925 444-55-66",
		doctorId: "doc-1",
		doctorName: "Лечащий врач",
		chairId: "chair-1",
		chairNumber: 1,
		startsAt: `${TODAY}T11:30:00.000Z`,
		endsAt: `${TODAY}T12:30:00.000Z`,
		startTime: `${TODAY}T11:30:00.000Z`,
		endTime: `${TODAY}T12:30:00.000Z`,
		status: "confirmed",
		reason: "Первичная консультация и КЛКТ",
	},
	{
		id: "appt-3",
		patientId: "pat-3",
		patientName: "Морозов Дмитрий Павлович",
		patientPhone: "+7 903 777-88-99",
		doctorId: "doc-1",
		doctorName: "Лечащий врач",
		chairId: "chair-2",
		chairNumber: 2,
		startsAt: `${TODAY}T14:00:00.000Z`,
		endsAt: `${TODAY}T15:30:00.000Z`,
		startTime: `${TODAY}T14:00:00.000Z`,
		endTime: `${TODAY}T15:30:00.000Z`,
		status: "confirmed",
		reason: "Дентальная имплантация в области 36",
	},
];

const MOCK_PATIENT = {
	id: "pat-1",
	fullName: "Алексеев Владимир Сергеевич",
	name: "Алексеев Владимир Сергеевич",
	phone: "+7 916 555-12-34",
	balanceKopecks: 1250000,
	birthDate: "1988-04-12",
	gender: "male",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "Стоматология ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		staff: [MOCK_USER],
		profile: {
			name: "Стоматология ДЕНТЕ",
			address: "ул. Клиническая, 15",
			phone: "+7 495 123-45-67",
			mode: "clinic",
			timezone: "Europe/Moscow",
			defaultVisitMinutes: 30,
		},
		chairs: MOCK_CHAIRS,
	},
	staff: [MOCK_USER],
	shifts: [
		{
			id: "shift-1",
			staffId: "doc-1",
			chairId: "chair-1",
			date: TODAY,
			startTime: "09:00",
			endTime: "21:00",
		},
	],
	scheduleSlots: [],
	appointments: MOCK_APPOINTMENTS,
	patients: [MOCK_PATIENT],
	waitlist: [],
	imagingStudies: [],
	recentPatients: [MOCK_PATIENT],
	todayStats: { revenue: 184000, appointments: 6, newPatients: 2 },
	notifications: [],
};

async function main() {
	if (!fs.existsSync(OUT_DIR)) {
		fs.mkdirSync(OUT_DIR, { recursive: true });
	}

	console.log(`Starting Vite dev server on port ${PORT}...`);
	const vite = spawn("npx", ["vite", "--port", String(PORT), "--host", "127.0.0.1"], {
		cwd: "C:/Clinic_MVP/dental-crm/apps/web",
		shell: true,
		stdio: "pipe",
	});

	let ready = false;
	for (let i = 0; i < 40; i++) {
		try {
			const res = await fetch(BASE_URL);
			if (res.ok) {
				ready = true;
				break;
			}
		} catch {
			await new Promise((r) => setTimeout(r, 500));
		}
	}

	if (!ready) {
		console.error("Vite server failed to start");
		vite.kill();
		process.exit(1);
	}

	console.log("Vite dev server is ready! Launching Chrome headless...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	async function setupPage(viewport, theme) {
		const context = await browser.newContext({
			viewport: { width: viewport.width, height: viewport.height },
			isMobile: viewport.isMobile,
			hasTouch: viewport.isMobile,
		});
		const page = await context.newPage();

		await page.addInitScript(
			({ th }) => {
				localStorage.setItem("dente_clinic_token", "live-clinic-token-12345");
				localStorage.setItem("dente_staff_token", "live-staff-token-12345");
				localStorage.setItem("dente_active_role", "doctor");
				localStorage.setItem("dente_theme_mode", th);
				localStorage.setItem("dente_active_view", "schedule");
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ theme: th, onboardingDismissed: true, compactSchedule: true })
				);
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
				localStorage.setItem(
					"dente-workspace-profile",
					JSON.stringify({
						state: {
							clinicName: "Стоматология ДЕНТЕ",
							currentDoctor: { id: "doc-1", fullName: "Лечащий врач", role: "doctor" },
							flags: { disableTour: true },
						},
					})
				);

				const applyTheme = () => {
					if (document.documentElement) {
						document.documentElement.setAttribute("data-theme", th);
						if (th === "dark") {
							document.documentElement.classList.add("dark");
						} else {
							document.documentElement.classList.remove("dark");
						}
					}
				};
				applyTheme();
				window.addEventListener("DOMContentLoaded", applyTheme);
			},
			{ th: theme }
		);

		// Route Interceptions
		await page.route("**/api/**", async (route) => {
			const url = route.request().url();
			const method = route.request().method();

			if (url.includes("/api/dashboard")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD) });
			}
			if (url.includes("/api/auth/staff") || url.includes("/api/v1/staff")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_USER]) });
			}
			if (url.includes("/api/auth/user/me") || url.includes("/api/v1/auth/me")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
			}
			if (url.includes("/api/chairs") || url.includes("/api/v1/chairs")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CHAIRS) });
			}
			if (url.includes("/api/shifts") || url.includes("/api/v1/shifts")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD.shifts) });
			}
			if (url.includes("/api/appointments") || url.includes("/api/v1/appointments")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_APPOINTMENTS) });
			}
			if (url.includes("/api/patients") || url.includes("/api/v1/patients")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_PATIENT]) });
			}
			if (url.includes("/api/settings/clinic/profile")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD.clinicSettings.profile) });
			}
			if (url.includes("/api/settings/preferences")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ theme, sidebarCollapsed: false, language: "ru" }) });
			}
			if (url.includes("/api/system/")) {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }) });
			}

			if (method === "GET") {
				return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [], total: 0 }) });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true }) });
		});

		return { context, page };
	}

	// Warm-up: load page once to let Vite compile all chunks
	console.log("Warming up Vite bundles...");
	const warmupPage = await browser.newPage();
	try {
		await warmupPage.goto(`${BASE_URL}/#schedule`, { waitUntil: "load", timeout: 20000 });
		await warmupPage.waitForTimeout(4000);
	} catch (e) {
		console.log("Warmup catch:", e.message);
	}
	await warmupPage.close();

	// 1. PC Light Schedule (1440x900)
	console.log("Capturing 01_schedule_1440x900_light...");
	const pcLight = await setupPage({ width: 1440, height: 900, isMobile: false }, "light");
	await pcLight.page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load", timeout: 15000 });
	await pcLight.page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
	await pcLight.page.waitForTimeout(3500);

	const demoBtn = pcLight.page.locator(".wizard-mode-card--demo, button:has-text('Демо'), button:has-text('Пропустить')");
	if (await demoBtn.count() > 0 && await demoBtn.first().isVisible()) {
		await demoBtn.first().click();
		await pcLight.page.waitForTimeout(1500);
	}

	const path01 = path.join(OUT_DIR, "01_schedule_1440x900_light.png");
	await pcLight.page.screenshot({ path: path01, fullPage: false });
	fs.copyFileSync(path01, path.join(BRAIN_DIR, "01_schedule_1440x900_light.png"));
	console.log(`Saved 01_schedule_1440x900_light: ${fs.statSync(path01).size} bytes`);
	await pcLight.context.close();

	// 2. PC Light Visit (1440x900)
	console.log("Capturing 02_visit_1440x900_light...");
	const pcVisit = await setupPage({ width: 1440, height: 900, isMobile: false }, "light");
	await pcVisit.page.goto(`${BASE_URL}/#visit`, { waitUntil: "load", timeout: 15000 });
	await pcVisit.page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
	await pcVisit.page.waitForTimeout(3500);

	const path02 = path.join(OUT_DIR, "02_visit_1440x900_light.png");
	await pcVisit.page.screenshot({ path: path02, fullPage: false });
	fs.copyFileSync(path02, path.join(BRAIN_DIR, "02_visit_1440x900_light.png"));
	console.log(`Saved 02_visit_1440x900_light: ${fs.statSync(path02).size} bytes`);
	await pcVisit.context.close();

	// 3. Mobile Light Schedule (390x844)
	console.log("Capturing 03_schedule_390x844_mobile_light...");
	const mobLight = await setupPage({ width: 390, height: 844, isMobile: true }, "light");
	await mobLight.page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load", timeout: 15000 });
	await mobLight.page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
	await mobLight.page.waitForTimeout(3500);

	const path03 = path.join(OUT_DIR, "03_schedule_390x844_mobile_light.png");
	await mobLight.page.screenshot({ path: path03, fullPage: false });
	fs.copyFileSync(path03, path.join(BRAIN_DIR, "03_schedule_390x844_mobile_light.png"));
	console.log(`Saved 03_schedule_390x844_mobile_light: ${fs.statSync(path03).size} bytes`);
	await mobLight.context.close();

	// 4. Mobile Dark Schedule (390x844)
	console.log("Capturing 04_schedule_390x844_mobile_dark...");
	const mobDark = await setupPage({ width: 390, height: 844, isMobile: true }, "dark");
	await mobDark.page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load", timeout: 15000 });
	await mobDark.page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
	await mobDark.page.waitForTimeout(3500);

	const path04 = path.join(OUT_DIR, "04_schedule_390x844_mobile_dark.png");
	await mobDark.page.screenshot({ path: path04, fullPage: false });
	fs.copyFileSync(path04, path.join(BRAIN_DIR, "04_schedule_390x844_mobile_dark.png"));
	console.log(`Saved 04_schedule_390x844_mobile_dark: ${fs.statSync(path04).size} bytes`);
	await mobDark.context.close();

	// 5. PC Dark Schedule (1440x900)
	console.log("Capturing 05_schedule_1440x900_dark...");
	const pcDark = await setupPage({ width: 1440, height: 900, isMobile: false }, "dark");
	await pcDark.page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load", timeout: 15000 });
	await pcDark.page.waitForSelector(".boot-state", { state: "detached", timeout: 10000 }).catch(() => {});
	await pcDark.page.waitForTimeout(3500);

	const path05 = path.join(OUT_DIR, "05_schedule_1440x900_dark.png");
	await pcDark.page.screenshot({ path: path05, fullPage: false });
	fs.copyFileSync(path05, path.join(BRAIN_DIR, "05_schedule_1440x900_dark.png"));
	console.log(`Saved 05_schedule_1440x900_dark: ${fs.statSync(path05).size} bytes`);
	await pcDark.context.close();

	await browser.close();
	vite.kill();
	console.log("ALL WAVE 125 LIVE SCREENSHOTS CAPTURED SUCCESSFULLY!");
	process.exit(0);
}

main().catch((err) => {
	console.error("Capture script error:", err);
	process.exit(1);
});
