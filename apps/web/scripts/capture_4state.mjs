import { spawn } from "node:child_process";
import * as path from "node:path";
import { chromium } from "playwright";

const PORT = 5198;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ac0ebfe0-b3db-438a-bc2d-a6e0bee44a2a";

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
	startsAt: "2026-08-15T10:00:00.000Z",
	endsAt: "2026-08-15T11:00:00.000Z",
	startTime: "2026-08-15T10:00:00.000Z",
	endTime: "2026-08-15T11:00:00.000Z",
	status: "confirmed",
	reason: "Лечение кариеса зуба 36",
};

const MOCK_PATIENT = {
	id: "pat-1",
	fullName: "Кузнецов Алексей Сергеевич",
	name: "Кузнецов Алексей Сергеевич",
	phone: "+7 (999) 123-45-67",
	balanceKopecks: 0,
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "DENTE Клиника",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		staff: [MOCK_USER],
		profile: {
			name: "DENTE Клиника",
			address: "ул. Стоматологическая, 10",
			phone: "+7 (495) 000-00-00",
			mode: "clinic",
			timezone: "Europe/Moscow",
			defaultVisitMinutes: 30,
		},
		chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
	},
	staff: [MOCK_USER],
	shifts: [],
	scheduleSlots: [],
	appointments: [MOCK_APPOINTMENT],
	patients: [MOCK_PATIENT],
	waitlist: [
		{
			id: "wl-1",
			patientId: "pat-2",
			patientName: "Смирнова Елена",
			priorityLevel: "high",
			preferredDoctorName: "Доктор Иванов И.И.",
			requestedProcedure: "Острая боль, пульпит",
			createdAt: "2026-08-15T08:30:00.000Z",
		},
	],
	imagingStudies: [],
	recentPatients: [MOCK_PATIENT],
	todayStats: { revenue: 154000, appointments: 8, newPatients: 2 },
	notifications: [],
};

async function main() {
	console.log("Starting Vite dev server on port", PORT);
	const vite = spawn("npx", ["vite", "--port", String(PORT), "--host", "127.0.0.1"], {
		cwd: "C:/Clinic_MVP/dental-crm/apps/web",
		shell: true,
		stdio: "pipe",
	});

	let ready = false;
	for (let i = 0; i < 30; i++) {
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

	console.log("Vite is ready. Launching Edge/Chrome...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch {
		browser = await chromium.launch({ channel: "chrome", headless: true });
	}

	const viewports = [
		{ name: "desktop", width: 1440, height: 900, isMobile: false },
		{ name: "mobile", width: 390, height: 844, isMobile: true },
	];

	const themes = ["light", "dark"];

	for (const vp of viewports) {
		for (const th of themes) {
			const context = await browser.newContext({
				viewport: { width: vp.width, height: vp.height },
				isMobile: vp.isMobile,
				hasTouch: vp.isMobile,
			});

			const page = await context.newPage();

			page.on("pageerror", (err) => {
				console.error(`[PAGE ERROR ${vp.name} ${th}]:`, err.message, err.stack);
			});
			page.on("console", (msg) => {
				if (msg.type() === "error") {
					console.error(`[CONSOLE ERROR ${vp.name} ${th}]:`, msg.text());
				}
			});

			await page.addInitScript(({ theme }) => {
				localStorage.setItem("dente_clinic_token", "test-clinic-token-123");
				localStorage.setItem("dente_staff_token", "test-staff-token-456");
				localStorage.setItem("dente_theme_mode", theme);
				localStorage.setItem("dente_active_view", "schedule");
				localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ theme, onboardingDismissed: true }));
				localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true }));
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
			}, { theme: th });

			// Catch-all route FIRST
			await page.route("**/api/**", async (route) => {
				const method = route.request().method();
				if (method === "GET") {
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify({ items: [], total: 0 }),
					});
				} else {
					await route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify({ ok: true, success: true }),
					});
				}
			});

			// Specific routes registered AFTER catch-all so they take precedence
			await page.route("**/api/system/**", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }),
				});
			});

			await page.route("**/api/settings/clinic/profile**", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: "org-1",
						name: "DENTE Клиника",
						address: "ул. Стоматологическая, 10",
						phone: "+7 (495) 000-00-00",
						mode: "clinic",
						features: {
							hasInventoryModule: true,
							hasAnalyticsModule: true,
							hasMarketingModule: true,
							hasPayrollModule: false,
						},
					}),
				});
			});

			await page.route("**/api/settings/preferences**", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ theme: th, sidebarCollapsed: false, language: "ru" }),
				});
			});

			await page.route("**/api/dashboard", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_DASHBOARD),
				});
			});

			await page.route("**/api/auth/staff", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([MOCK_USER]),
				});
			});

			await page.route("**/api/auth/user/me", async (route) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ user: MOCK_USER }),
				});
			});

			// 1. Schedule View
			console.log(`Capturing Schedule ${vp.name} ${th}...`);
			await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
			await page.waitForTimeout(1000);
			const demoBtn = page.locator(".wizard-mode-card--demo");
			if (await demoBtn.isVisible()) {
				await demoBtn.click();
				await page.waitForTimeout(1500);
			}
			const schedPath = path.join(ARTIFACT_DIR, `schedule_${vp.name}_${th}.png`);
			await page.screenshot({ path: schedPath, fullPage: false });

			// 2. Visit 043/u
			console.log(`Capturing Visit ${vp.name} ${th}...`);
			await page.goto(`${BASE_URL}/#visit`, { waitUntil: "load" });
			await page.waitForTimeout(2000);
			const visitPath = path.join(ARTIFACT_DIR, `visit_${vp.name}_${th}.png`);
			await page.screenshot({ path: visitPath, fullPage: false });

			// 3. Finance
			console.log(`Capturing Finance ${vp.name} ${th}...`);
			await page.goto(`${BASE_URL}/#finance`, { waitUntil: "load" });
			await page.waitForTimeout(2000);
			const finPath = path.join(ARTIFACT_DIR, `finance_${vp.name}_${th}.png`);
			await page.screenshot({ path: finPath, fullPage: false });

			await context.close();
		}
	}

	await browser.close();
	vite.kill();
	console.log("Screenshots captured successfully!");
	process.exit(0);
}

main().catch((err) => {
	console.error("Error capturing screenshots:", err);
	process.exit(1);
});
