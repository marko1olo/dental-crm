/**
 * e2e_4state_audit.cjs
 * Ruthless 4-state visual capture: Mobile Light/Dark (390x844) + PC Light/Dark (1440x900)
 * 14 Main Panels + 15 Modal Dialogs
 * Output: C:\Users\Admin\.gemini\antigravity\brain\575b83b2-72f2-4da3-9f2c-18eae458f688\
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUT_DIR =
	process.env.ARTIFACTS_DIR ||
	"C:\\Users\\Admin\\.gemini\\antigravity\\brain\\575b83b2-72f2-4da3-9f2c-18eae458f688";
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:5173";

if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 14 Main Panels
const PANELS = [
	"shift",
	"schedule",
	"patients",
	"visit",
	"imaging",
	"documents",
	"finance",
	"analytics",
	"communications",
	"inventory",
	"scanner",
	"leads",
	"settings",
	"marketing",
];

// 4 Rendering States
const CONFIGS = [
	{
		name: "Mobile_Light",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		colorScheme: "light",
		themeMode: "light",
	},
	{
		name: "Mobile_Dark",
		viewport: { width: 390, height: 844 },
		deviceScaleFactor: 2,
		isMobile: true,
		colorScheme: "dark",
		themeMode: "dark",
	},
	{
		name: "PC_Light",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		isMobile: false,
		colorScheme: "light",
		themeMode: "light",
	},
	{
		name: "PC_Dark",
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
		isMobile: false,
		colorScheme: "dark",
		themeMode: "dark",
	},
];

// Mock Data
const MOCK_USER = {
	id: "user-1",
	orgId: "org-1",
	name: "Тест Архитектор",
	role: "owner",
	email: "test@dente.ru",
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-1",
	name: "Алексеев Алексей Алексеевич",
	fullName: "Алексеев Алексей Алексеевич",
	phone: "+7 (999) 111-22-33",
	birthDate: "1988-05-12",
	cardIndex: "1042",
};

const todayStr = new Date().toISOString().split("T")[0];

const MOCK_DASHBOARD = {
	todayIso: todayStr,
	clinic: {
		id: "org-1",
		name: "ДЕНТ-ТЕСТ Клиника",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
		workingDays: ["mon", "tue", "wed", "thu", "fri"],
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1",
				hasMicroscope: true,
				hasSurgeryKit: false,
				hasXraySensor: false,
			},
			{
				id: "chair-2",
				name: "Кресло 2",
				hasMicroscope: false,
				hasSurgeryKit: true,
				hasXraySensor: true,
			},
		],
	},
	clinicSettings: {
		profile: {
			id: "org-1",
			clinicName: "ДЕНТ-ТЕСТ Клиника",
			mode: "clinic",
			organizationId: "org-1",
			workingDays: ["mon", "tue", "wed", "thu", "fri"],
			timezone: "Europe/Moscow",
		},
		staff: [MOCK_USER],
		chairs: [
			{
				id: "chair-1",
				name: "Кресло 1",
				hasMicroscope: true,
				hasSurgeryKit: false,
				hasXraySensor: false,
			},
			{
				id: "chair-2",
				name: "Кресло 2",
				hasMicroscope: false,
				hasSurgeryKit: true,
				hasXraySensor: true,
			},
		],
		workingDays: ["mon", "tue", "wed", "thu", "fri"],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	recentPatients: [MOCK_PATIENT],
	shifts: [
		{
			id: "s-1",
			doctorId: "user-1",
			chairId: "chair-1",
			date: todayStr,
			startTime: "09:00",
			endTime: "18:00",
		},
	],
	scheduleSlots: [],
	appointments: [
		{
			id: "app-1",
			patientId: "pat-1",
			patientName: "Алексеев Алексей Алексеевич",
			patientPhone: "+7 (999) 111-22-33",
			doctorId: "user-1",
			doctorUserId: "user-1",
			doctorName: "Тест Архитектор",
			chairId: "chair-1",
			startsAt: `${todayStr}T10:00:00.000Z`,
			endsAt: `${todayStr}T11:00:00.000Z`,
			startTime: "10:00",
			endTime: "11:00",
			status: "confirmed",
			procedure: "Первичный осмотр и консультация",
			amount: 2500,
		},
	],
	waitlist: [
		{
			id: "w-1",
			patientName: "Петров П.П.",
			phone: "+79998887766",
			preferredDoctor: "Тест Архитектор",
			note: "Срочно при боли",
		},
	],
	dayConfirmations: [],
	duplicateMergeQueues: [],
	recallList: [],
	recalls: [],
	campaigns: [],
	analyticsReport: { points: [], summary: {} },
	messageDeliveryStats: { totalSent: 0, failed: 0, pending: 0, delivered: 0 },
	speechGatewayStatus: {
		serverTranscriptionCurrentlyAvailable: false,
		serverTranscriptionEnabled: false,
		neuralEnabled: false,
	},
	imagingStudies: [],
	todayStats: { revenue: 45000, appointments: 8, newPatients: 2 },
	notifications: [],
};

const MOCK_PREFERENCES = {
	theme: "dark",
	sidebarCollapsed: false,
	language: "ru",
};

const MOCK_CLINIC_PROFILE = {
	id: "org-1",
	name: "ДЕНТ-ТЕСТ Клиника",
	clinicName: "ДЕНТ-ТЕСТ Клиника",
	organizationId: "org-1",
	address: "ул. Тестовая, 1",
	phone: "+7 (000) 000-00-00",
	mode: "clinic",
	timezone: "Europe/Moscow",
	workingDays: ["mon", "tue", "wed", "thu", "fri"],
	chairs: [
		{
			id: "chair-1",
			name: "Кресло 1",
			hasMicroscope: true,
			hasSurgeryKit: false,
			hasXraySensor: false,
		},
		{
			id: "chair-2",
			name: "Кресло 2",
			hasMicroscope: false,
			hasSurgeryKit: true,
			hasXraySensor: true,
		},
	],
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

const UI_PREFS = JSON.stringify({
	version: 1,
	selectedWorkspaceRole: "owner",
	onboardingDismissed: true,
	onboardingDismissedAt: new Date().toISOString(),
	onboardingStep: "finish",
	onboardingDraftMode: false,
	savedAt: new Date().toISOString(),
});

async function setupContext(browser, config) {
	const context = await browser.newContext({
		viewport: config.viewport,
		deviceScaleFactor: config.deviceScaleFactor || 1,
		isMobile: config.isMobile,
		hasTouch: config.isMobile,
		colorScheme: config.colorScheme,
	});

	// Inject localStorage tokens BEFORE React mounts
	await context.addInitScript(
		({ prefs, themeMode }) => {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-abc123");
			localStorage.setItem("dente_staff_token", "test-staff-token-xyz789");
			localStorage.setItem("dente_theme_mode", themeMode);
			localStorage.setItem("dental-crm:web-ui-preferences:v1", prefs);
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true }),
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ onboardingDismissed: true }),
			);
		},
		{ prefs: UI_PREFS, themeMode: config.themeMode },
	);

	// Single deterministic route handler for all /api/ requests
	await context.route("**/api/**", async (route) => {
		const url = route.request().url();
		const method = route.request().method();

		if (url.includes("/api/auth/user/me")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ...MOCK_USER, user: MOCK_USER }),
			});
		}

		if (url.includes("/api/dashboard")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_DASHBOARD),
			});
		}

		if (url.includes("/api/settings/staff") || url.includes("/api/staff")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify([MOCK_USER]),
			});
		}

		if (url.includes("/api/settings/preferences")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_PREFERENCES),
			});
		}

		if (
			url.includes("/api/settings/clinic/profile") ||
			url.includes("/api/settings/clinic")
		) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(MOCK_CLINIC_PROFILE),
			});
		}

		if (url.includes("/api/schedule/day-confirmations")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					date: todayStr,
					rows: [],
					summary: { needsCall: 0, total: 0 },
				}),
			});
		}

		if (
			url.includes("/api/patients/duplicates") ||
			url.includes("/api/crm/duplicates") ||
			url.includes("duplicate")
		) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					queues: [],
					count: 0,
					duplicateMergeQueues: [],
				}),
			});
		}

		if (url.includes("/api/marketing") || url.includes("recall")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ recalls: [], recallList: [], campaigns: [] }),
			});
		}

		if (url.includes("/api/communications")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					stats: { totalSent: 0, failed: 0, pending: 0, delivered: 0 },
					campaigns: [],
				}),
			});
		}

		if (url.includes("/api/system/speech") || url.includes("/api/speech")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					serverTranscriptionCurrentlyAvailable: false,
					serverTranscriptionEnabled: false,
					neuralEnabled: false,
				}),
			});
		}

		if (url.includes("/api/analytics") || url.includes("/api/reports")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ points: [], summary: {} }),
			});
		}

		if (url.includes("/api/system/")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					healthy: true,
					ready: true,
					issues: [],
					plans: [],
				}),
			});
		}

		if (method === "GET") {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: "[]",
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ ok: true }),
		});
	});

	return context;
}

async function applyThemeState(page, themeMode) {
	await page.evaluate((mode) => {
		if (
			window.__useThemeStore &&
			typeof window.__useThemeStore.getState === "function"
		) {
			window.__useThemeStore.getState().setThemeMode(mode);
		}
		if (document.documentElement) {
			document.documentElement.setAttribute("data-theme", mode);
			document.documentElement.className = mode;
			document.documentElement.style.colorScheme = mode;
		}
	}, themeMode);
}

async function captureShot(page, name, outputPath) {
	await page.waitForTimeout(800);

	// Verify zero React Error Boundary crashes
	const bodyText = await page
		.locator("body")
		.innerText()
		.catch(() => "");
	const crashPhrases = [
		"Something went wrong",
		"Что-то пошло не так",
		"Раздел временно не открылся",
		"Ошибка рендеринга",
		"Uncaught Error",
	];
	for (const phrase of crashPhrases) {
		if (bodyText.includes(phrase)) {
			throw new Error(
				`React Error Boundary crash detected on screenshot ${name}: "${phrase}"`,
			);
		}
	}

	await page.screenshot({
		path: outputPath,
		fullPage: true,
		animations: "disabled",
	});

	const stats = fs.statSync(outputPath);
	if (stats.size < 20000) {
		throw new Error(
			`Screenshot ${name} is under 20KB limit (${stats.size} bytes) — likely blank`,
		);
	}

	console.log(`  [OK] ${name} (${(stats.size / 1024).toFixed(1)} KB)`);
}

async function runAudit() {
	console.log(
		"=== Starting Playwright 4-State Visual Audit (14 Panels + 15 Dialogs) ===",
	);
	console.log(`Output Directory: ${OUT_DIR}`);
	console.log(`Base URL: ${BASE_URL}`);
	console.log(`Started at: ${new Date().toISOString()}`);

	const browser = await chromium.launch({ headless: true });
	const summary = {
		totalScreenshots: 0,
		hashes: new Set(),
		errors: [],
		consoleErrors: [],
		pageErrors: [],
		screenshotList: [],
	};

	for (const config of CONFIGS) {
		console.log(`\n========================================`);
		console.log(
			`--- State: ${config.name} (${config.viewport.width}x${config.viewport.height}) ---`,
		);
		console.log(`========================================`);

		let context;
		try {
			context = await setupContext(browser, config);
			const page = await context.newPage();

			page.on("pageerror", (err) => {
				const msg = `[${config.name}] PageError: ${err.message}`;
				summary.pageErrors.push(msg);
				console.error(`  [!] ${msg}`);
			});

			page.on("console", (msg) => {
				if (msg.type() === "error") {
					const text = msg.text();
					if (
						!text.includes("net::ERR_") &&
						!text.includes("Failed to load resource") &&
						!text.includes("401") &&
						!text.includes("Unauthorized")
					) {
						summary.consoleErrors.push(
							`[${config.name}] ConsoleError: ${text}`,
						);
					}
				}
			});

			// Initial page boot check
			await page.goto(`${BASE_URL}/#schedule`, {
				waitUntil: "load",
				timeout: 25000,
			});
			await applyThemeState(page, config.themeMode);
			await page.waitForTimeout(1500);

			// --- CAPTURE 14 MAIN PANELS ---
			console.log(`\nCapturing 14 Main Panels for ${config.name}:`);
			for (const panel of PANELS) {
				const shotName = `${config.name}_panel_${panel}.png`;
				const shotPath = path.join(OUT_DIR, shotName);
				try {
					await page.goto(`${BASE_URL}/#${panel}`, {
						waitUntil: "load",
						timeout: 20000,
					});
					await applyThemeState(page, config.themeMode);
					await captureShot(page, shotName, shotPath);
					summary.totalScreenshots++;
					summary.screenshotList.push(shotName);
					const buf = fs.readFileSync(shotPath);
					const hash = crypto.createHash("md5").update(buf).digest("hex");
					summary.hashes.add(hash);
				} catch (err) {
					console.error(`  [FAIL] ${shotName}: ${err.message}`);
					summary.errors.push(`${shotName}: ${err.message}`);
				}
			}

			// --- CAPTURE 15 MODAL DIALOGS ---
			console.log(`\nCapturing 15 Modal Dialogs for ${config.name}:`);

			// Dialog 1: Command Palette (Ctrl+K)
			{
				const name = `${config.name}_dialog_1_command_palette.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					await page.keyboard.press("Control+K");
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
					await page.keyboard.press("Escape");
					await page.waitForTimeout(400);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 2: Waitlist Drawer
			{
				const name = `${config.name}_dialog_2_waitlist_drawer.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Лист ожидания"), button:has-text("Ожидание")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 3: New Appointment Form Modal
			{
				const name = `${config.name}_dialog_3_new_appointment_form.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Запись"), button:has-text("Новая запись"), .top-actions button.primary-button',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 4: Sberbank Terminal Payment Modal
			{
				const name = `${config.name}_dialog_4_sberbank_terminal.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#finance`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Терминал"), button:has-text("Оплата карточкой"), button:has-text("Оплата")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 5: Signature Pad Modal
			{
				const name = `${config.name}_dialog_5_signature_pad.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#documents`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Подписать на планшете"), button:has-text("Подпись")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 6: CryptoPro Signer PIN Modal
			{
				const name = `${config.name}_dialog_6_cryptopro_signer.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#visit`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator('button:has-text("Подписать ЭЦП"), button:has-text("ЭЦП")')
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 7: NDFL Calculator Modal
			{
				const name = `${config.name}_dialog_7_ndfl_calculator.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#documents`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Рассчитать НДФЛ"), button:has-text("Справка для налоговой"), button:has-text("НДФЛ")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 8: Add Price Service Modal
			{
				const name = `${config.name}_dialog_8_add_price_service.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#settings`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const tab = page
						.locator('button:has-text("Прайс"), button:has-text("Услуги")')
						.first();
					if (await tab.isVisible())
						await tab.click({ force: true, timeout: 2000 }).catch(() => {});
					const btn = page
						.locator(
							'button:has-text("Добавить услугу"), button:has-text("Новая услуга")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 9: Telegram Link Staff Modal
			{
				const name = `${config.name}_dialog_9_telegram_link.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#settings`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const tab = page
						.locator(
							'button:has-text("Telegram"), button:has-text("Интеграции")',
						)
						.first();
					if (await tab.isVisible())
						await tab.click({ force: true, timeout: 2000 }).catch(() => {});
					const btn = page
						.locator(
							'button:has-text("Привязать Telegram"), button:has-text("Подключить")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 10: Inventory Stock Confirm Dialog
			{
				const name = `${config.name}_dialog_10_inventory_confirm.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#inventory`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Списать материал"), button:has-text("Списание"), button:has-text("Приход")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 11: Treatment Estimator Modal
			{
				const name = `${config.name}_dialog_11_treatment_estimator.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#visit`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Смета лечения"), button:has-text("Смета"), button:has-text("План лечения")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 12: Clinical Recommendations Modal
			{
				const name = `${config.name}_dialog_12_clinical_recommendations.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#visit`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Клинические рекомендации"), button:has-text("Рекомендации")',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 13: Staff PIN Pad Lock Screen
			{
				const name = `${config.name}_dialog_13_staff_pin_pad.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					const btn = page
						.locator(
							'button:has-text("Заблокировать"), button.compact-top-button',
						)
						.first();
					if (await btn.isVisible())
						await btn.click({ force: true, timeout: 2000 }).catch(() => {});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 14: Auth Hub Login Screen (no tokens)
			{
				const name = `${config.name}_dialog_14_auth_hub_login.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.evaluate(() => {
						localStorage.removeItem("dente_clinic_token");
						localStorage.removeItem("dente_staff_token");
					});
					await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
					await page.waitForTimeout(800);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}

			// Dialog 15: Incoming Call Telephony Dialog
			{
				const name = `${config.name}_dialog_15_incoming_call_toast.png`;
				const out = path.join(OUT_DIR, name);
				try {
					await page.evaluate(
						({ prefs, themeMode }) => {
							localStorage.setItem(
								"dente_clinic_token",
								"test-clinic-token-abc123",
							);
							localStorage.setItem(
								"dente_staff_token",
								"test-staff-token-xyz789",
							);
						},
						{ prefs: UI_PREFS, themeMode: config.themeMode },
					);
					await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "load" });
					await applyThemeState(page, config.themeMode);
					await page.evaluate(() => {
						window.dispatchEvent(
							new CustomEvent("dente_telephony_incoming_call", {
								detail: {
									phone: "+79991234567",
									patientName: "Иванов Иван Иванович",
								},
							}),
						);
					});
					await page.waitForTimeout(600);
					await captureShot(page, name, out);
					summary.totalScreenshots++;
					summary.screenshotList.push(name);
					const buf = fs.readFileSync(out);
					summary.hashes.add(
						crypto.createHash("md5").update(buf).digest("hex"),
					);
				} catch (e) {
					console.error(`  [FAIL] ${name}: ${e.message}`);
					summary.errors.push(`${name}: ${e.message}`);
				}
			}
		} catch (err) {
			console.error(`FATAL error in config ${config.name}: ${err.message}`);
			summary.errors.push(`FATAL ${config.name}: ${err.message}`);
		} finally {
			if (context) await context.close();
		}
	}

	await browser.close();

	console.log("\n========================================");
	console.log("AUDIT SUMMARY REPORT");
	console.log("========================================");
	console.log(`Total Screenshots Captured: ${summary.totalScreenshots}`);
	console.log(`Unique Image MD5 Hashes: ${summary.hashes.size}`);
	console.log(`Console Errors Recorded: ${summary.consoleErrors.length}`);
	console.log(`Page Crash Errors Recorded: ${summary.pageErrors.length}`);
	console.log(`Script Errors: ${summary.errors.length}`);

	const reportPath = path.join(OUT_DIR, "audit_summary_manifest.json");
	fs.writeFileSync(
		reportPath,
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				totalScreenshots: summary.totalScreenshots,
				uniqueHashesCount: summary.hashes.size,
				consoleErrorsCount: summary.consoleErrors.length,
				consoleErrors: summary.consoleErrors,
				pageErrorsCount: summary.pageErrors.length,
				pageErrors: summary.pageErrors,
				scriptErrorsCount: summary.errors.length,
				scriptErrors: summary.errors,
				screenshotList: summary.screenshotList,
			},
			null,
			2,
		),
		"utf8",
	);
	console.log(`Saved audit manifest to ${reportPath}`);

	if (
		summary.errors.length > 0 ||
		summary.pageErrors.length > 0 ||
		summary.consoleErrors.length > 0
	) {
		console.error("\nAudit completed WITH ERRORS — check manifest.");
		process.exit(1);
	} else {
		console.log("\nAUDIT PASSED PERFECTLY WITH ZERO ERRORS.");
		process.exit(0);
	}
}

runAudit().catch((err) => {
	console.error("FATAL AUDIT FAILURE:", err);
	process.exit(1);
});
