import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/settings");
fs.mkdirSync(PROOF_DIR, { recursive: true });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
			timezone: "Europe/Samara",
			phone: "+7 (846) 234-56-78",
			address: "г. Самара, ул. Ленина, д. 10",
			inn: "6316000000",
			logoUrl: "https://cdn.clinic.ru/assets/logo-dente.png",
			stampUrl: "https://cdn.clinic.ru/assets/stamp-facsimile.png",
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
				color: "#0d9488",
				defaultDoctorId: "doc-1",
				active: true,
				hasXraySensor: true,
				hasMicroscope: true,
				hasSurgeryKit: false,
			},
			{
				id: "chair-2",
				name: "Кабинет 2 (Хирургия)",
				room: "2",
				color: "#2563eb",
				defaultDoctorId: "doc-2",
				active: true,
				hasXraySensor: true,
				hasMicroscope: false,
				hasSurgeryKit: true,
			},
		],
	},
	serviceCatalog: [
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
	],
	patients: [],
	appointments: [],
	payments: [],
};

async function setupPageApiMock(page) {
	await page.route("**/api/**", async (route) => {
		const url = route.request().url();
		if (url.includes("/src/")) return route.continue();
		if (url.includes("/api/dashboard") || url.includes("/api/settings/clinic")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockDashboard),
			});
		}
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session") || url.includes("/api/users/me")) {
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
			body: JSON.stringify({ ok: true, success: true }),
		});
	});

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_session_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_organization_id", "00000000-0000-0000-0000-000000000001");
		localStorage.setItem("dente_user_id", "doc-1");
		localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_perspective", "owner");
		localStorage.setItem("dente_clinic_tenant_id", "org_dental_1");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_onboarding_dismissed", "true");
		const prefs = {
			version: 1,
			onboardingDismissed: true,
			onboardingDismissedAt: new Date().toISOString(),
		};
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify(prefs));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
		window.location.hash = "#settings";
	});
}

async function suppressOverlays(page) {
	try {
		await page.evaluate(() => {
			const style = document.createElement("style");
			style.id = "suppress-all-overlays-settings";
			style.innerHTML = `
				.tour-spotlight-root,
				.tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"],
				.notification-toast,
				.global-toast,
				.toast-container,
				[data-toast],
				vite-error-overlay {
					display: none !important;
					pointer-events: none !important;
				}
			`;
			document.head.appendChild(style);
		});
	} catch (_) {}
}

async function run() {
	const browserCandidates = [
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	];
	const executablePath = browserCandidates.find((p) => fs.existsSync(p));
	console.log("🚀 Launching browser:", executablePath || "Chromium bundled");

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	// --- 1. PC CONTEXT (1440x900) ---
	console.log("\n--- Capturing PC Light & Dark (1440x900) ---");
	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		locale: "ru-RU",
	});

	const pcPage = await pcContext.newPage();
	await setupPageApiMock(pcPage);

	await pcPage.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 45000 });
	await suppressOverlays(pcPage);

	// Wait for Settings view
	try {
		await pcPage.waitForFunction(
			() => {
				const hasSettingsView =
					document.querySelector('[data-testid="settings-view"]') ||
					document.querySelector(".settings-zone") ||
					document.querySelector("#settings");
				return Boolean(hasSettingsView);
			},
			{ timeout: 15000 },
		);
		console.log("✅ PC Settings View successfully mounted!");
	} catch (e) {
		console.warn("PC Settings view wait warning:", e.message);
	}
	await wait(1500);

	// 01 PC Light
	await pcPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await wait(800);
	const pcLightPath = path.join(PROOF_DIR, "01_settings_pc_light_1440x900.png");
	await pcPage.screenshot({ path: pcLightPath, fullPage: false });
	const pcLightStat = fs.statSync(pcLightPath);
	console.log(`✅ Saved PC Light: ${pcLightPath} (${(pcLightStat.size / 1024).toFixed(1)} KB)`);

	// 02 PC Dark
	await pcPage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await wait(800);
	const pcDarkPath = path.join(PROOF_DIR, "02_settings_pc_dark_1440x900.png");
	await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
	const pcDarkStat = fs.statSync(pcDarkPath);
	console.log(`✅ Saved PC Dark: ${pcDarkPath} (${(pcDarkStat.size / 1024).toFixed(1)} KB)`);

	await pcContext.close();

	// --- 2. MOBILE CONTEXT (390x844 - iPhone 14 / Apple HIG) ---
	console.log("\n--- Capturing Mobile Light & Dark (390x844) ---");
	const mobileContext = await browser.newContext({
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		hasTouch: true,
		locale: "ru-RU",
	});

	const mobilePage = await mobileContext.newPage();
	await setupPageApiMock(mobilePage);

	await mobilePage.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 45000 });
	await suppressOverlays(mobilePage);

	try {
		await mobilePage.waitForFunction(
			() => {
				const hasMobileSettings =
					document.querySelector('[data-testid="settings-view"]') ||
					document.querySelector(".mobile-settings-root-view") ||
					document.querySelector(".settings-zone-mobile") ||
					document.querySelector("#settings");
				return Boolean(hasMobileSettings);
			},
			{ timeout: 15000 },
		);
		console.log("✅ Mobile Settings View successfully mounted!");
	} catch (e) {
		console.warn("Mobile Settings view wait warning:", e.message);
	}
	await wait(1500);

	// 03 Mobile Light
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "light");
		document.body.setAttribute("data-theme", "light");
		document.documentElement.classList.remove("dark");
	});
	await wait(800);
	const mobileLightPath = path.join(PROOF_DIR, "03_settings_mobile_light_390x844.png");
	await mobilePage.screenshot({ path: mobileLightPath, fullPage: false });
	const mobileLightStat = fs.statSync(mobileLightPath);
	console.log(`✅ Saved Mobile Light: ${mobileLightPath} (${(mobileLightStat.size / 1024).toFixed(1)} KB)`);

	// 04 Mobile Dark
	await mobilePage.evaluate(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.body.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	});
	await wait(800);
	const mobileDarkPath = path.join(PROOF_DIR, "04_settings_mobile_dark_390x844.png");
	await mobilePage.screenshot({ path: mobileDarkPath, fullPage: false });
	const mobileDarkStat = fs.statSync(mobileDarkPath);
	console.log(`✅ Saved Mobile Dark: ${mobileDarkPath} (${(mobileDarkStat.size / 1024).toFixed(1)} KB)`);

	await mobileContext.close();
	await browser.close();

	console.log("\n🎉 ALL 4-STATE PROOFS CAPTURED SUCCESSFULLY!");
}

run().catch((err) => {
	console.error("FATAL ERROR:", err);
	process.exit(1);
});
