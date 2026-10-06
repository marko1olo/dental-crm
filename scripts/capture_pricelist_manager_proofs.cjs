const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleServices = [
	{
		id: "srv-1",
		code: "A01.07.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 1500,
		priceRub: 1500,
		durationMinutes: 30,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-2",
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение среднего кариеса)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4500,
		priceRub: 4500,
		durationMinutes: 45,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-3",
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и ультразвуковое удаление камня",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 5500,
		priceRub: 5500,
		durationMinutes: 45,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
];

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: new Date().toISOString().slice(0, 10),
	clinicSettings: {
		name: "Стоматология ДЕНТЕ Премиум",
		address: "Москва, Столярный переулок, 14",
		phone: "+7 (495) 123-45-67",
		license: "ЛО-77-01-012345 от 12.04.2021",
		chiefDoctor: "Д-р Воронов А. В.",
		profile: {
			id: "c-1",
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
		},
		staff: [
			{
				id: "doc-1",
				fullName: "Д-р Воронов Алексей Владимирович",
				role: "owner",
				specialties: ["therapist", "orthopedist"],
				phone: "+7 (999) 111-22-33",
				active: true,
				color: "#0d9488",
			},
		],
		chairs: [
			{
				id: "chair-1",
				name: "Кабинет 1 (Терапия)",
				room: "1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: false,
			},
		],
	},
	serviceCatalog: sampleServices,
	patients: [],
	appointments: [],
	payments: [],
};

async function setupRouteMocks(page) {
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
						organizationId: "00000000-0000-0000-0000-000000000001",
					},
					clinicToken: "live-inquisition-clinic-token",
					staffToken: "live-inquisition-staff-token",
				}),
			});
		}

		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ ok: true }),
		});
	});
}

async function injectStorage(page) {
	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_clinic_tenant_id", "org_dental_1");
		localStorage.setItem("dente_theme", "light");
		const prefs = {
			version: 1,
			onboardingDismissed: true,
			onboardingDismissedAt: new Date().toISOString(),
		};
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify(prefs));
		localStorage.setItem("dente_onboarding_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
	});
}

async function main() {
	const screenshotsDir = path.resolve("C:/Clinic_MVP/dental-crm/screenshots");
	const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/2df1310a-5223-4e99-ad86-60b76b2a470d");

	for (const dir of [screenshotsDir, brainDir]) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	console.log("[Playwright] Launching Microsoft Edge (channel: 'msedge')...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	await setupRouteMocks(page);
	await injectStorage(page);

	console.log("[Playwright] Navigating to http://127.0.0.1:5173/#settings/prices...");
	await page.goto("http://127.0.0.1:5173/#settings/prices", { waitUntil: "domcontentloaded" });
	await wait(2500);

	// Clean any tour banners or overlays
	await page.evaluate(() => {
		document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"]').forEach((el) => el.remove());
	});
	await wait(500);

	// Ensure Settings prices tab is active
	await page.evaluate(() => {
		window.location.hash = "settings/prices";
	});
	await wait(1000);

	console.log("[Playwright] Waiting for open-service-pricelist-modal-btn...");
	await page.waitForSelector('[data-testid="open-service-pricelist-modal-btn"]', { timeout: 15000 });

	console.log("[Playwright] Clicking open-service-pricelist-modal-btn...");
	await page.click('[data-testid="open-service-pricelist-modal-btn"]', { force: true });
	await wait(800);

	console.log("[Playwright] Waiting for .service-pricelist-modal...");
	await page.waitForSelector('.service-pricelist-modal', { timeout: 10000 });
	await wait(500);

	// 1. LIGHT THEME (1440x900)
	console.log("[Playwright] Setting Light theme...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
		document.body.setAttribute("data-theme", "light");
	});
	await wait(500);

	const lightShotPath = path.join(screenshotsDir, "proof_service_pricelist_manager_pc_light.png");
	await page.screenshot({ path: lightShotPath, fullPage: false });
	fs.copyFileSync(lightShotPath, path.join(brainDir, "proof_service_pricelist_manager_pc_light.png"));
	console.log(`[Screenshot Saved] -> ${lightShotPath} (${fs.statSync(lightShotPath).size} bytes)`);

	// 2. DARK THEME (1440x900)
	console.log("[Playwright] Setting Dark theme...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		document.body.setAttribute("data-theme", "dark");
	});
	await wait(500);

	const darkShotPath = path.join(screenshotsDir, "proof_service_pricelist_manager_pc_dark.png");
	await page.screenshot({ path: darkShotPath, fullPage: false });
	fs.copyFileSync(darkShotPath, path.join(brainDir, "proof_service_pricelist_manager_pc_dark.png"));
	console.log(`[Screenshot Saved] -> ${darkShotPath} (${fs.statSync(darkShotPath).size} bytes)`);

	await browser.close();
	console.log("[Playwright] All screenshots captured successfully!");
}

main().catch((err) => {
	console.error("[Playwright Error]:", err);
	process.exit(1);
});
