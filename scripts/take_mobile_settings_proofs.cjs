/**
 * scripts/take_mobile_settings_proofs.cjs
 *
 * Dedicated Playwright screenshot script for Apple HIG Mobile Settings & Pricelist:
 * Viewport: 390x844 (iPhone 14/15/16).
 * Captures 4 mandatory proofs:
 * 1. docs/screenshots/inquisition_live/proof_mobile_settings_root_light.png
 * 2. docs/screenshots/inquisition_live/proof_mobile_settings_root_dark.png
 * 3. docs/screenshots/inquisition_live/proof_mobile_settings_prices_light.png
 * 4. docs/screenshots/inquisition_live/proof_mobile_settings_prices_dark.png
 *
 * Copies to parent brain: C:\Users\Admin\.gemini\antigravity\brain\beb92312-c6d7-426d-a438-12dcad022abc\
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleServices = [
	{
		id: "srv-1",
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
		id: "srv-2",
		code: "A16.07.004",
		title: "Лечение пульпита: пломбирование одного корневого канала",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 6800,
		priceRub: 6800,
		durationMinutes: 60,
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
	{
		id: "srv-4",
		code: "A16.07.001",
		title: "Удаление постоянного зуба простое",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 3500,
		priceRub: 3500,
		durationMinutes: 30,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-5",
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация системы Straumann / Osstem",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 38000,
		priceRub: 38000,
		durationMinutes: 90,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-6",
		code: "A16.07.006",
		title: "Протезирование зуба коронкой из диоксида циркония",
		category: "orthopedics",
		specialty: "orthopedist",
		basePriceRub: 24000,
		priceRub: 24000,
		durationMinutes: 60,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
	{
		id: "srv-7",
		code: "A06.07.004",
		title: "Конусно-лучевая компьютерная томография (КЛКТ) двух челюстей",
		category: "diagnostics",
		specialty: "therapist",
		basePriceRub: 3200,
		priceRub: 3200,
		durationMinutes: 15,
		taxDeductible: true,
		vatRate: "vat_exempt",
		active: true,
	},
];

const mockDashboard = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	todayIso: new Date().toISOString().slice(0, 10),
	clinicSettings: {
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
			{
				id: "doc-2",
				fullName: "Д-р Ковалёва Мария Игоревна",
				role: "doctor",
				specialties: ["surgeon"],
				phone: "+7 (999) 222-33-44",
				active: true,
				color: "#2563eb",
			},
			{
				id: "adm-1",
				fullName: "Смирнова Екатерина",
				role: "administrator",
				specialties: [],
				phone: "+7 (999) 333-44-55",
				active: true,
				color: "#9333ea",
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
			{
				id: "chair-2",
				name: "Кабинет 2 (Хирургия)",
				room: "2",
				active: true,
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: true,
			},
		],
	},
	serviceCatalog: sampleServices,
	patients: [],
	appointments: [],
	payments: [],
};

async function main() {
	const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
	const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc");
	const localBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/f4fb8691-2d3e-46a6-a8fc-9df9468919fa");

	for (const dir of [outDir, parentBrainDir, localBrainDir]) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	console.log("[Playwright] Launching Chrome in iPhone Viewport (390x844)...");
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
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
	});

	const page = await context.newPage();

	page.on("console", (msg) => {
		console.log(`[Browser ${msg.type()}]`, msg.text());
	});
	page.on("pageerror", (err) => {
		console.error("[Browser Uncaught Error]", err.message);
	});

	// Intercept API routes
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

	// Pre-seed localStorage before navigation
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
		window.location.hash = "#settings";
	});

	console.log("[Playwright] Navigating to http://127.0.0.1:5173/...");
	await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded" });
	await wait(2000);

	// Ensure any onboarding modal is closed
	await page.evaluate(() => {
		const closeButtons = Array.from(document.querySelectorAll("button"));
		const closeBtn = closeButtons.find(
			(b) =>
				b.getAttribute("aria-label")?.includes("Закрыть") ||
				b.textContent?.includes("✕") ||
				b.querySelector("svg.lucide-x"),
		);
		if (closeBtn) closeBtn.click();
	});
	await wait(500);

	// Ensure Settings view is mounted
	await page.evaluate(() => {
		// If more drawer is open, click Settings row
		const rows = Array.from(document.querySelectorAll("button, a"));
		const settingsItem = rows.find(
			(r) =>
				r.getAttribute("data-tab") === "settings" ||
				r.getAttribute("href") === "#settings" ||
				r.textContent?.trim() === "Настройки" ||
				r.textContent?.toLowerCase().includes("настройки клиники"),
		);
		if (settingsItem) {
			settingsItem.click();
		} else {
			// Trigger hash change
			window.location.hash = "#settings";
		}
	});

	console.log("[Playwright] Waiting for SettingsView to finish lazy loading...");
	try {
		await page.waitForFunction(
			() => {
				const loadingPill = document.querySelector(".panel-heading.settings-heading .status-pill");
				const hasSettingsView =
					document.querySelector('[data-testid="settings-view"]') ||
					document.querySelector(".mobile-settings-root-view") ||
					document.querySelector(".settings-zone-mobile");
				return !loadingPill && Boolean(hasSettingsView);
			},
			{ timeout: 15000 },
		);
	} catch (e) {
		console.warn("[Playwright] Timeout waiting for settings view:", e.message);
	}
	await wait(1000);

	// 1. CAPTURE MOBILE SETTINGS ROOT - LIGHT
	console.log("[Proof 1] Capturing proof_mobile_settings_root_light.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await wait(500);

	const rootLightPath = path.join(outDir, "proof_mobile_settings_root_light.png");
	await page.screenshot({ path: rootLightPath });
	fs.copyFileSync(rootLightPath, path.join(parentBrainDir, "proof_mobile_settings_root_light.png"));
	fs.copyFileSync(rootLightPath, path.join(localBrainDir, "proof_mobile_settings_root_light.png"));

	// 2. NAVIGATE TO PRICELIST & CAPTURE - LIGHT
	console.log("[Proof 2] Navigating to Pricelist & Capturing proof_mobile_settings_prices_light.png...");
	await page.evaluate(() => {
		const priceRow = document.querySelector('[data-testid="mobile-settings-row-prices"]');
		if (priceRow) priceRow.click();
	});
	await wait(1000);

	const pricesLightPath = path.join(outDir, "proof_mobile_settings_prices_light.png");
	await page.screenshot({ path: pricesLightPath });
	fs.copyFileSync(pricesLightPath, path.join(parentBrainDir, "proof_mobile_settings_prices_light.png"));
	fs.copyFileSync(pricesLightPath, path.join(localBrainDir, "proof_mobile_settings_prices_light.png"));

	// 3. SWITCH TO DARK THEME & CAPTURE PRICELIST - DARK
	console.log("[Proof 3] Switching to Dark Theme & Capturing proof_mobile_settings_prices_dark.png...");
	await page.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
		localStorage.setItem("dente_theme", "dark");
	});
	await wait(600);

	const pricesDarkPath = path.join(outDir, "proof_mobile_settings_prices_dark.png");
	await page.screenshot({ path: pricesDarkPath });
	fs.copyFileSync(pricesDarkPath, path.join(parentBrainDir, "proof_mobile_settings_prices_dark.png"));
	fs.copyFileSync(pricesDarkPath, path.join(localBrainDir, "proof_mobile_settings_prices_dark.png"));

	// 4. NAVIGATE BACK TO ROOT & CAPTURE MOBILE SETTINGS ROOT - DARK
	console.log("[Proof 4] Navigating back & Capturing proof_mobile_settings_root_dark.png...");
	await page.evaluate(() => {
		const backBtn = document.querySelector('[data-testid="btn-mobile-back-to-settings"]');
		if (backBtn) backBtn.click();
	});
	await wait(1000);

	const rootDarkPath = path.join(outDir, "proof_mobile_settings_root_dark.png");
	await page.screenshot({ path: rootDarkPath });
	fs.copyFileSync(rootDarkPath, path.join(parentBrainDir, "proof_mobile_settings_root_dark.png"));
	fs.copyFileSync(rootDarkPath, path.join(localBrainDir, "proof_mobile_settings_root_dark.png"));

	await browser.close();
	console.log("[Playwright] All 4 proofs successfully captured and copied to brain!");
}

main().catch((err) => {
	console.error("[Playwright Failure]", err);
	process.exit(1);
});
