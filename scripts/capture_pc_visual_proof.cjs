const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const outputDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\56443678-1290-4ce4-a16f-850bc81e3122";

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: new Date().toLocaleDateString("en-CA"),
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
	},
	appointments: [],
	patients: [],
	stats: { todayVisits: 0, revenue: 0 },
};

async function run() {
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
	page.on('pageerror', err => console.error('PAGE ERROR:', err));

	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		}
		if (url.includes("/api/auth/me") || url.includes("/api/auth/verify")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: "doc-1",
					fullName: "Д-р Воронов Алексей Владимирович",
					role: "owner",
				}),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([]),
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "test-clinic-token");
		localStorage.setItem("dente_staff_token", "test-staff-token");
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

	console.log("Navigating to http://127.0.0.1:5173/#schedule...");
	await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "networkidle", timeout: 25000 });
	await page.waitForTimeout(2000);

	// Capture PC Light
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await page.waitForTimeout(1000);

	const lightPath = path.join(outputDir, "proof_app_pc_light.png");
	await page.screenshot({ path: lightPath, fullPage: false });
	const lightStat = fs.statSync(lightPath);
	console.log(`[VISUAL PROOF] Light Screenshot: ${lightPath} (${lightStat.size} bytes)`);

	// Capture PC Dark
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await page.waitForTimeout(1000);

	const darkPath = path.join(outputDir, "proof_app_pc_dark.png");
	await page.screenshot({ path: darkPath, fullPage: false });
	const darkStat = fs.statSync(darkPath);
	console.log(`[VISUAL PROOF] Dark Screenshot: ${darkPath} (${darkStat.size} bytes)`);

	await browser.close();

	console.log("Visual proof capturing complete!");
}

run().catch((err) => {
	console.error("Error capturing visual proof:", err);
	process.exit(1);
});
