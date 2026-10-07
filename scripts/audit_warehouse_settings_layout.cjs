/**
 * scripts/audit_warehouse_settings_layout.cjs
 *
 * Global Red Team Inquisitor 4: Склад FEFO, ЗТЛ, Прейскурант 804н и Мессенджеры.
 * Captures 16 mandatory screenshots:
 *  - #inventory (Warehouse FEFO, Soft Overdraft, 1-click carpules)
 *  - #lab_orders (Dental lab orders, VITA shades, stages)
 *  - #settings/prices (Pricelist 804n, 1-line toolbar, search >= 38px)
 *  - #settings/messengers (7 channels, AES-256 Vault)
 *
 * Viewports:
 *  - PC Desktop: 1440x900 (Light & Dark)
 *  - Mobile iPhone: 390x844 (Light & Dark)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sampleInventoryItems = [
	{
		id: "inv-1",
		name: "Ультракаин Д-С Форте (Артикаин 1:100 000)",
		category: "anesthesia",
		unit: "карпула",
		stockQuantity: 42,
		minQuantity: 10,
		unitCostRub: "120",
		lotNumber: "LOT-2026-A1",
		expirationDate: "2027-08-15",
		sku: "SKU-0001",
		storageLocation: "Холодильник №1, полка 2",
		active: true,
	},
	{
		id: "inv-2",
		name: "Септанест с адреналином 1:100 000 (Septodont)",
		category: "anesthesia",
		unit: "карпула",
		stockQuantity: 4,
		minQuantity: 15,
		unitCostRub: "115",
		lotNumber: "LOT-2026-S4",
		expirationDate: "2026-11-20",
		sku: "SKU-0002",
		storageLocation: "Холодильник №1, полка 1",
		active: true,
	},
	{
		id: "inv-3",
		name: "Композит Filtek Ultimate Body A2 (3M ESPE)",
		category: "composite",
		unit: "шприц",
		stockQuantity: 6,
		minQuantity: 3,
		unitCostRub: "3850",
		lotNumber: "LOT-3M-99",
		expirationDate: "2028-01-10",
		sku: "SKU-0003",
		storageLocation: "Шкаф терапевта №2",
		active: true,
	},
	{
		id: "inv-4",
		name: "Estelite Asteria Syringe A2B (Tokuyama Dental)",
		category: "composite",
		unit: "шприц",
		stockQuantity: 2,
		minQuantity: 3,
		unitCostRub: "4200",
		lotNumber: "LOT-TOK-02",
		expirationDate: "2027-05-20",
		sku: "SKU-0004",
		storageLocation: "Шкаф терапевта №2",
		active: true,
	},
	{
		id: "inv-5",
		name: "Адгезив Single Bond Universal (3M)",
		category: "therapy",
		unit: "флакон",
		stockQuantity: 5,
		minQuantity: 2,
		unitCostRub: "5400",
		lotNumber: "LOT-SB-88",
		expirationDate: "2027-04-12",
		sku: "SKU-0005",
		storageLocation: "Шкаф терапевта №1",
		active: true,
	},
	{
		id: "inv-6",
		name: "Перчатки нитриловые неопудренные M (Sempercare)",
		category: "disposables",
		unit: "упак.",
		stockQuantity: 120,
		minQuantity: 30,
		unitCostRub: "650",
		lotNumber: "LOT-SEM-11",
		expirationDate: "2029-01-01",
		sku: "SKU-0006",
		storageLocation: "Складской стеллаж А-3",
		active: true,
	},
	{
		id: "inv-7",
		name: "Эндодонтические файлы ProTaper Gold F1 (Dentsply)",
		category: "endo",
		unit: "упак.",
		stockQuantity: 8,
		minQuantity: 4,
		unitCostRub: "2900",
		lotNumber: "LOT-PT-33",
		expirationDate: "2028-03-15",
		sku: "SKU-0007",
		storageLocation: "Эндодонтический бокс",
		active: true,
	},
	{
		id: "inv-8",
		name: "Шовный материал Викрил 4-0 с иглой (Ethicon)",
		category: "surgery",
		unit: "упак.",
		stockQuantity: 18,
		minQuantity: 5,
		unitCostRub: "850",
		lotNumber: "LOT-ETH-77",
		expirationDate: "2027-11-10",
		sku: "SKU-0008",
		storageLocation: "Хирургический стеллаж",
		active: true,
	},
];

const sampleLabOrders = [
	{
		id: "lab-101",
		orderNumber: "ЗТЛ-2026-0042",
		patientId: "pat-1",
		patientName: "Иванов Сергей Павлович",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "crown_zirconia",
		shade: "A2",
		stumpShade: "ND2",
		status: "in_progress",
		stage: "in_progress",
		stageLabel: "В производстве",
		teeth: "16",
		toothFdi: "16",
		laboratoryName: "Лаборатория Дента-Арт",
		deadlineDate: "2026-10-14",
		createdAt: "2026-10-02T10:00:00Z",
		costRub: 14500,
		labComments: "Плечевой уступ 0.8мм, фиссуры без гиперконтурирования",
	},
	{
		id: "lab-102",
		orderNumber: "ЗТЛ-2026-0043",
		patientId: "pat-2",
		patientName: "Смирнова Елена Викторовна",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "crown_emax",
		shade: "A1",
		stumpShade: "ND1",
		status: "fitting",
		stage: "fitting",
		stageLabel: "На примерке",
		teeth: "11, 21",
		toothFdi: "11, 21",
		laboratoryName: "Премиум-Дент CAD/CAM",
		deadlineDate: "2026-10-08",
		createdAt: "2026-10-01T12:00:00Z",
		costRub: 28000,
		labComments: "Виниры e.MAX, прозрачный режущий край 0.5мм",
	},
	{
		id: "lab-103",
		orderNumber: "ЗТЛ-2026-0044",
		patientId: "pat-3",
		patientName: "Кузнецов Дмитрий Романович",
		doctorName: "Д-р Ковалёва М. И.",
		doctorId: "doc-2",
		constructionType: "surgical_guide",
		shade: "-",
		status: "sent",
		stage: "sent",
		stageLabel: "Отправлен в ЗТЛ",
		teeth: "36, 46",
		toothFdi: "36, 46",
		laboratoryName: "Цифра 3D Lab",
		deadlineDate: "2026-10-12",
		createdAt: "2026-10-05T09:30:00Z",
		costRub: 12000,
		labComments: "Хирургический навигационный шаблон под импланты Osstem",
	},
	{
		id: "lab-104",
		orderNumber: "ЗТЛ-2026-0045",
		patientId: "pat-4",
		patientName: "Попова Анна Николаевна",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "metal_ceramic",
		shade: "A3",
		status: "shipped",
		stage: "shipped",
		stageLabel: "В клинике",
		teeth: "24, 25",
		toothFdi: "24, 25",
		laboratoryName: "Лаборатория Дента-Арт",
		deadlineDate: "2026-10-06",
		createdAt: "2026-09-28T14:15:00Z",
		costRub: 16000,
		labComments: "Металлокерамический мост, промывное седловидное пространство",
	},
];

const sampleServices = [
	{
		id: "srv-1",
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (лечение кариеса с использованием световой пломбы)",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 4800,
		priceRub: 4800,
		durationMinutes: 45,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
	},
	{
		id: "srv-2",
		code: "A16.07.004",
		title: "Лечение пульпита: пломбирование одного корневого канала гуттаперчей",
		category: "therapy",
		specialty: "therapist",
		basePriceRub: 7200,
		priceRub: 7200,
		durationMinutes: 60,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
	},
	{
		id: "srv-3",
		code: "A16.07.051",
		title: "Профессиональная комплексная гигиена полости рта и ультразвуковое удаление камня",
		category: "hygiene",
		specialty: "hygienist",
		basePriceRub: 5800,
		priceRub: 5800,
		durationMinutes: 45,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
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
		isActive: true,
	},
	{
		id: "srv-5",
		code: "A16.07.054",
		title: "Внутрикостная дентальная имплантация системы Straumann / Osstem",
		category: "surgery",
		specialty: "surgeon",
		basePriceRub: 42000,
		priceRub: 42000,
		durationMinutes: 90,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
	},
	{
		id: "srv-6",
		code: "A16.07.006",
		title: "Протезирование зуба коронкой из диоксида циркония CAD/CAM",
		category: "prosthetics",
		specialty: "orthopedist",
		basePriceRub: 26000,
		priceRub: 26000,
		durationMinutes: 60,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
	},
	{
		id: "srv-7",
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный с планом лечения",
		category: "consultation",
		specialty: "therapist",
		basePriceRub: 1500,
		priceRub: 1500,
		durationMinutes: 30,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
	},
	{
		id: "srv-8",
		code: "B01.003.004",
		title: "Проводниковая или инфильтрационная анестезия (Ультракаин Д-С Форте)",
		category: "anesthesia",
		specialty: "therapist",
		basePriceRub: 900,
		priceRub: 900,
		durationMinutes: 10,
		taxDeductible: true,
		vatRate: "vat_exempt",
		isActive: true,
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
			organizationId: "org_dental_1",
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
			{ id: "chair-1", name: "Кабинет 1 (Терапия)", room: "1", active: true },
			{ id: "chair-2", name: "Кабинет 2 (Хирургия)", room: "2", active: true },
		],
	},
	serviceCatalog: sampleServices,
	patients: [],
	appointments: [],
	payments: [],
};

async function main() {
	const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/audit_warehouse_settings");
	const parentBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/beb92312-c6d7-426d-a438-12dcad022abc");
	const localBrainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/7c7eaf40-d66f-4fc6-8372-8fcfd227492a");

	for (const dir of [outDir, parentBrainDir, localBrainDir]) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	console.log("[Playwright] Launching Chrome for Red Team Visual Inquest...");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const copyToBrains = (filename) => {
		const src = path.join(outDir, filename);
		if (fs.existsSync(src)) {
			fs.copyFileSync(src, path.join(parentBrainDir, filename));
			fs.copyFileSync(src, path.join(localBrainDir, filename));
		}
	};

	// 1. CAPTURE PC DESKTOP (1440x900)
	console.log("\n=======================================================");
	console.log("--- 1. DESKTOP RUN (1440x900) Light & Dark ---");
	console.log("=======================================================");

	const pcContext = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1.5,
	});
	const pcPage = await pcContext.newPage();

	await pcPage.route("**/*", async (route) => {
		const url = route.request().url();
		if (!url.startsWith("http://127.0.0.1") && !url.startsWith("http://localhost")) {
			return route.fulfill({ status: 404, contentType: "text/plain", body: "" });
		}
		if (url.includes("/src/")) return route.continue();
		if (url.includes("/api/dashboard")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
		}
		if (url.includes("/api/inventory")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleInventoryItems) });
		}
		if (url.includes("/api/clinical/lab-orders")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sampleLabOrders) });
		}
		if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", organizationId: "org_dental_1" },
					clinicToken: "live-inquisition-clinic-token",
					staffToken: "live-inquisition-staff-token",
				}),
			});
		}
		if (url.includes("/api/")) {
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		}
		return route.continue();
	});

	await pcPage.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_clinic_tenant_id", "org_dental_1");
		localStorage.setItem("dente_onboarding_dismissed", "true");
		localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, onboardingDismissed: true }));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
			activeTrackId: "solo_doctor",
			currentStepIndex: 0,
			completedStepIds: ["schedule_booking", "odontogram_norm", "visit_diary_043", "fast_cashier_54fz"],
			isTourActive: false,
			isDismissedPermanently: true,
			tracksProgress: {
				solo_doctor: { completed: true, completedStepIds: ["schedule_booking", "odontogram_norm", "visit_diary_043", "fast_cashier_54fz"] },
				reception_admin: { completed: true, completedStepIds: [] },
				imaging_diagnostics: { completed: true, completedStepIds: [] },
			},
		}));
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
	});

	const dismissOverlays = async (page) => {
		try {
			await page.evaluate(() => {
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem("dente_onboarding_dismissed", "true");

				const tourCard = document.querySelector('[data-testid="clinical-quest-tour-card"], [data-testid="interactive-tour-overlay"]');
				if (tourCard) {
					tourCard.remove();
				}
			});
		} catch (e) {}
	};

	console.log("[PC] Performing initial mount http://127.0.0.1:5173/#inventory...");
	await pcPage.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded" });
	await wait(2200);
	await dismissOverlays(pcPage);

	// Helper to capture a route in PC Light and Dark
	const capturePcRoute = async (hashRoute, baseName, postNavAction) => {
		console.log(`\n[PC] Capturing ${hashRoute}...`);
		await pcPage.evaluate((h) => {
			window.location.hash = h;
		}, hashRoute);
		await wait(1200);
		// LIGHT
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme_mode", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("light");
			}
		});
		await wait(600);
		await dismissOverlays(pcPage);
		await wait(300);
		if (postNavAction) await postNavAction(pcPage);
		await wait(600);
		await dismissOverlays(pcPage);
		await wait(200);

		const lightFile = `proof_${baseName}_pc_light.png`;
		await pcPage.screenshot({ path: path.join(outDir, lightFile), timeout: 10000, animations: "disabled" });
		copyToBrains(lightFile);
		console.log(`  ✓ Captured ${lightFile}`);

		// DARK
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme_mode", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("dark");
			}
		});
		await wait(800);
		await dismissOverlays(pcPage);
		await wait(200);
		const darkFile = `proof_${baseName}_pc_dark.png`;
		await pcPage.screenshot({ path: path.join(outDir, darkFile), timeout: 10000, animations: "disabled" });
		copyToBrains(darkFile);
		console.log(`  ✓ Captured ${darkFile}`);
	};

	// Capture PC Screens:
	// A. #inventory
	await capturePcRoute("#inventory", "inventory", async (page) => {
		await page.waitForSelector('[data-testid="inventory-category-chip-all"], [data-testid="inventory-stock-table"]', { timeout: 8000 }).catch(() => {});
	});

	// B. #lab_orders
	await capturePcRoute("#lab_orders", "lab_orders");

	// C. #settings/prices
	await capturePcRoute("#settings/prices", "prices", async (page) => {
		await wait(500);
		const searchWrapper = await page.$('.pricelist-search-wrapper, [data-testid="settings-prices-table"]');
		if (searchWrapper) {
			await searchWrapper.scrollIntoViewIfNeeded().catch(() => {});
		}
	});

	// D. #settings/messengers
	await capturePcRoute("#settings/messengers", "messengers", async (page) => {
		await wait(500);
	});

	// 2. CAPTURE MOBILE (390x844) iPhone Viewport
	console.log("\n=======================================================");
	console.log("--- 2. MOBILE RUN (390x844) Light & Dark ---");
	console.log("=======================================================");

	await pcPage.setViewportSize({ width: 390, height: 844 });
	await wait(500);

	const captureMobRoute = async (hashRoute, baseName, postNavAction) => {
		console.log(`\n[Mobile] Capturing ${hashRoute}...`);
		await pcPage.evaluate((route) => {
			window.location.hash = route;
		}, hashRoute);
		await wait(1800);
		// LIGHT
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme_mode", "light");
			document.documentElement.setAttribute("data-theme", "light");
			document.documentElement.classList.remove("dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("light");
			}
		});
		await wait(500);
		if (postNavAction) await postNavAction(pcPage);
		await wait(500);

		const lightFile = `proof_${baseName}_mobile_light.png`;
		await dismissOverlays(pcPage);
		await wait(200);
		await pcPage.screenshot({ path: path.join(outDir, lightFile), timeout: 10000, animations: "disabled" });
		copyToBrains(lightFile);
		console.log(`  ✓ Captured ${lightFile}`);

		// DARK
		await pcPage.evaluate(() => {
			localStorage.setItem("dente_theme_mode", "dark");
			document.documentElement.setAttribute("data-theme", "dark");
			document.documentElement.classList.add("dark");
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode("dark");
			}
		});
		await wait(800);
		await dismissOverlays(pcPage);
		await wait(200);
		const darkFile = `proof_${baseName}_mobile_dark.png`;
		await pcPage.screenshot({ path: path.join(outDir, darkFile), timeout: 20000, animations: "disabled" });
		copyToBrains(darkFile);
		console.log(`  ✓ Captured ${darkFile}`);
	};

	// Capture Mobile Screens:
	// A. #inventory
	await captureMobRoute("#inventory", "inventory");

	// B. #lab_orders
	await captureMobRoute("#lab_orders", "lab_orders");

	// C. #settings/prices
	await captureMobRoute("#settings/prices", "prices", async (page) => {
		const row = page.locator('[data-testid="mobile-settings-row-prices"]');
		if ((await row.count()) > 0) {
			await row.first().click().catch(() => {});
			await wait(800);
		}
	});

	// D. #settings/messengers
	await captureMobRoute("#settings/messengers", "messengers", async () => {
		await wait(500);
	});

	await pcContext.close();
	await browser.close();

	console.log("\n=======================================================");
	console.log("✓ ALL 16 INQUISITION SCREENSHOTS CAPTURED SUCCESSFULLY!");
	console.log("=======================================================");
}

main().catch((err) => {
	console.error("[Fatal Capture Error]", err);
	process.exit(1);
});
