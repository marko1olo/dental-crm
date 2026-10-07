/**
 * scripts/audit_finance_settings_layout.cjs
 *
 * Playwright visual audit capture script for:
 * 1. #invoices (InvoicesView / FinanceInvoicesModal)
 * 2. RetailProductsModal (Showcase modal)
 * 3. #inventory (Warehouse / InventoryView)
 * 4. #lab_orders (Dental Lab Orders Page)
 * 5. #settings/prices (Settings Hub & SettingsPricesTab)
 *
 * Captures 4 states: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDirs = [
	path.resolve(__dirname, "../docs/screenshots/audit_finance_settings"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/81f6573b-5c98-4e4b-bdcb-1855e4e6f583"),
];

for (const dir of outputDirs) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

const todayDate = new Date().toLocaleDateString("en-CA");

const mockInvoices = [
	{
		id: "inv-1",
		number: "СЧ-2026-001",
		date: todayDate,
		patientId: "pat-1",
		patientName: "Ковалёв Роман Станиславович",
		patientPhone: "+7 (999) 888-77-66",
		doctorName: "Д-р Воронов А. В.",
		status: "paid",
		totalAmountRub: 6300,
		paidAmountRub: 6300,
		paymentMethod: "Банковская карта (МИР)",
		createdAt: new Date(Date.now() - 3600000).toISOString(),
		paidAt: new Date(Date.now() - 1800000).toISOString(),
		items: [
			{
				id: "li-1",
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой (композит светового отверждения)",
				quantity: 1,
				priceRub: 5400,
			},
			{
				id: "li-2",
				code: "A16.07.004",
				name: "Анестезия инфильтрационная артикаиновая (Ubistesin Forte)",
				quantity: 1,
				priceRub: 900,
			},
		],
	},
	{
		id: "inv-2",
		number: "СЧ-2026-002",
		date: todayDate,
		patientId: "pat-2",
		patientName: "Смирнова Екатерина Васильевна",
		patientPhone: "+7 (916) 234-56-78",
		doctorName: "Д-р Воронов А. В.",
		status: "pending",
		totalAmountRub: 32000,
		paidAmountRub: 0,
		createdAt: new Date().toISOString(),
		items: [
			{
				id: "li-3",
				code: "A16.07.006.002",
				name: "Протезирование зуба коронкой из диоксида циркония e.max",
				quantity: 1,
				priceRub: 32000,
			},
		],
	},
	{
		id: "inv-3",
		number: "СЧ-2026-003",
		date: todayDate,
		patientId: "pat-3",
		patientName: "Волков Денис Андреевич",
		patientPhone: "+7 (926) 345-67-89",
		doctorName: "Д-р Громов К. Д.",
		status: "warranty_100",
		totalAmountRub: 0,
		paidAmountRub: 0,
		createdAt: new Date(Date.now() - 86400000).toISOString(),
		notes: "Гарантийный случай 100% (Мандат 8e)",
		items: [
			{
				id: "li-4",
				code: "A16.07.002.001",
				name: "Гарантийная пришлифовка и полировка пломбы",
				quantity: 1,
				priceRub: 0,
			},
		],
	},
	{
		id: "inv-4",
		number: "СЧ-2026-004",
		date: todayDate,
		patientId: "pat-4",
		patientName: "Иванова Ольга Сергеевна",
		patientPhone: "+7 (903) 456-78-90",
		doctorName: "Д-р Морозова Е. И.",
		status: "pending",
		totalAmountRub: 8500,
		paidAmountRub: 3500,
		createdAt: new Date(Date.now() - 7200000).toISOString(),
		items: [
			{
				id: "li-5",
				code: "A16.07.030.001",
				name: "Эндодонтическое лечение 2-канального зуба",
				quantity: 1,
				priceRub: 8500,
			},
		],
	},
];

const mockLabOrders = [
	{
		id: "lab-1",
		orderNumber: "ЗТЛ-2026-101",
		patientId: "pat-1",
		patientName: "Ковалёв Роман Станиславович",
		patientPhone: "+7 (999) 888-77-66",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "crown_zirconia",
		material: "Диоксид циркония Multi-Layer",
		toothFdi: "16",
		status: "in_progress",
		laboratoryName: "Дентал-Арт Лаб",
		priceRub: 14500,
		createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
		dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
		colorVita: "A2",
		shadeTarget: "A2",
	},
	{
		id: "lab-2",
		orderNumber: "ЗТЛ-2026-102",
		patientId: "pat-2",
		patientName: "Смирнова Екатерина Васильевна",
		patientPhone: "+7 (916) 234-56-78",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "clasp_denture",
		material: "Бюгель с замками Bredent",
		toothFdi: "Верхняя челюсть",
		status: "ready_in_clinic",
		laboratoryName: "Орто-Мастер",
		priceRub: 28000,
		createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
		dueDate: new Date().toISOString(),
		colorVita: "A3",
	},
	{
		id: "lab-3",
		orderNumber: "ЗТЛ-2026-103",
		patientId: "pat-3",
		patientName: "Волков Денис Андреевич",
		patientPhone: "+7 (926) 345-67-89",
		doctorName: "Д-р Громов К. Д.",
		doctorId: "doc-surgeon",
		constructionType: "surgical_guide",
		material: "Фотополимер Formlabs Dental SG",
		toothFdi: "46, 47",
		status: "sent_to_lab",
		laboratoryName: "3D СтомЛаб",
		priceRub: 9000,
		createdAt: new Date(Date.now() - 86400000).toISOString(),
		dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
	},
	{
		id: "lab-4",
		orderNumber: "ЗТЛ-2026-104",
		patientId: "pat-4",
		patientName: "Иванова Ольга Сергеевна",
		patientPhone: "+7 (903) 456-78-90",
		doctorName: "Д-р Воронов А. В.",
		doctorId: "doc-1",
		constructionType: "crown_emax",
		material: "IPS e.max Press LT",
		toothFdi: "21",
		status: "fitted",
		laboratoryName: "Дентал-Арт Лаб",
		priceRub: 16000,
		createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
		dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
		colorVita: "B1",
	},
];

const mockInventoryItems = [
	{
		id: "inv-item-1",
		name: "Ультракаин Д-С форте 1:100 000 (Sanofi)",
		category: "anesthesia",
		stockQuantity: 45,
		criticalThreshold: 20,
		unitCostRub: "140",
		unit: "амп",
		unitOfMeasure: "амп",
		sku: "SKU-DS-01",
		barcode: "460123456701",
		lotNumber: "B2026-09",
		expirationDate: "2027-08-31",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "inv-item-2",
		name: "Filtek Ultimate Body A2 шприц 4г (3M ESPE)",
		category: "composite",
		stockQuantity: 6,
		criticalThreshold: 3,
		unitCostRub: "2900",
		unit: "шпр",
		unitOfMeasure: "шпр",
		sku: "SKU-FLT-A2",
		barcode: "460123456702",
		lotNumber: "F-9912",
		expirationDate: "2027-04-30",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "inv-item-3",
		name: "OptiBond FL адгезивный набор (Kerr)",
		category: "therapy",
		stockQuantity: 2,
		criticalThreshold: 5,
		unitCostRub: "7800",
		unit: "набор",
		unitOfMeasure: "набор",
		sku: "SKU-OPT-FL",
		barcode: "460123456703",
		lotNumber: "OB-441",
		expirationDate: "2026-12-31",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "inv-item-4",
		name: "Перчатки нитриловые неопудренные р-р M (100 шт)",
		category: "disposables",
		stockQuantity: 12,
		criticalThreshold: 5,
		unitCostRub: "480",
		unit: "упак",
		unitOfMeasure: "упак",
		sku: "SKU-GLV-M",
		barcode: "460123456704",
		lotNumber: "GL-110",
		expirationDate: "2029-01-01",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "inv-item-5",
		name: "Имплантат Dentium SuperLine 4.0 x 10 mm",
		category: "surgery",
		stockQuantity: 8,
		criticalThreshold: 4,
		unitCostRub: "5500",
		unit: "шт",
		unitOfMeasure: "шт",
		sku: "SKU-DNT-4010",
		barcode: "460123456705",
		lotNumber: "DNT-774",
		expirationDate: "2028-11-20",
		updatedAt: new Date().toISOString(),
	},
	{
		id: "inv-item-6",
		name: "Эндодонтические файлы ProTaper Gold Starter Kit",
		category: "endo",
		stockQuantity: 4,
		criticalThreshold: 2,
		unitCostRub: "3300",
		unit: "упак",
		unitOfMeasure: "упак",
		sku: "SKU-PTG-01",
		barcode: "460123456706",
		lotNumber: "PT-2026",
		expirationDate: "2028-06-30",
		updatedAt: new Date().toISOString(),
	},
];

const mockServices = [
	{
		id: "srv-1",
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой (светоотверждаемый композит)",
		category: "therapy",
		basePriceRub: 4500,
		estimatedDurationMin: 45,
		isActive: true,
	},
	{
		id: "srv-2",
		code: "A16.07.004",
		title: "Анестезия инфильтрационная артикаиновая",
		category: "anesthesia",
		basePriceRub: 900,
		estimatedDurationMin: 10,
		isActive: true,
	},
	{
		id: "srv-3",
		code: "A16.07.006.002",
		title: "Протезирование зуба коронкой из диоксида циркония e.max",
		category: "orthopedics",
		basePriceRub: 32000,
		estimatedDurationMin: 60,
		isActive: true,
	},
	{
		id: "srv-4",
		code: "B01.065.001",
		title: "Прием (осмотр, консультация) врача-стоматолога первичный",
		category: "consultation",
		basePriceRub: 1500,
		estimatedDurationMin: 30,
		isActive: true,
	},
	{
		id: "srv-5",
		code: "A16.07.054",
		title: "Профессиональная гигиена полости рта и зубов (AirFlow + ультразвук)",
		category: "hygiene",
		basePriceRub: 6000,
		estimatedDurationMin: 60,
		isActive: true,
	},
	{
		id: "srv-6",
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала",
		category: "therapy",
		basePriceRub: 3200,
		estimatedDurationMin: 45,
		isActive: true,
	},
	{
		id: "srv-7",
		code: "A16.07.007",
		title: "Пломбирование корневого канала зуба (гуттаперча)",
		category: "therapy",
		basePriceRub: 2800,
		estimatedDurationMin: 40,
		isActive: true,
	},
	{
		id: "srv-8",
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области",
		category: "surgery",
		basePriceRub: 25000,
		estimatedDurationMin: 90,
		isActive: true,
	},
];

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
	serviceCatalog: mockServices,
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

async function main() {
	console.log("=== CAPTURING LIVE AUDIT SCREENSHOTS FOR FINANCE, INVENTORY, LAB & SETTINGS ===");

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

	console.log(`>>> Launching browser (executable: ${executablePath || "bundled"})...`);
	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		async function createConfiguredContext(isMobile, theme) {
			const viewport = isMobile
				? { width: 390, height: 844 }
				: { width: 1440, height: 900 };

			const context = await browser.newContext({
				viewport,
				deviceScaleFactor: 2,
				isMobile: !!isMobile,
				hasTouch: !!isMobile,
			});

			await context.addInitScript(
				({ selectedTheme, invoices }) => {
					localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
					localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
					localStorage.setItem("dente_active_role", "owner");
					localStorage.setItem("dente_demo_showcase", "true");
					localStorage.setItem("dente_tour_completed", "true");
					localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
					localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
					localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissed: true, completedStepIds: ["step1", "step2", "step3", "step4"] }));
					localStorage.setItem(
						"dente_ui_preferences_v1",
						JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
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
						}),
					);
					localStorage.setItem(
						"dental-crm:web-ui-preferences:v1",
						JSON.stringify({
							version: 1,
							uiLanguage: "ru",
							selectedWorkspaceRole: "owner",
							selectedPatientId: "pat-1",
							onboardingDismissed: true,
							onboardingStep: "done",
						}),
					);
					localStorage.setItem("dente_theme_mode", selectedTheme);
					localStorage.setItem("dente_billing_invoices", JSON.stringify(invoices));
					localStorage.setItem(
						"dente-workspace-profile",
						JSON.stringify({
							state: {
								clinicName: "Стоматология ДЕНТЕ Премиум",
								currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
								flags: { disableTour: true },
							},
						}),
					);
				},
				{
					selectedTheme: theme,
					invoices: mockInvoices,
				},
			);

			// Intercept API routes
			await context.route("**/api/**", async (route) => {
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
				if (url.includes("/api/invoices")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockInvoices),
					});
				}
				if (url.includes("/api/clinical/lab-orders")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockLabOrders),
					});
				}
				if (url.includes("/api/inventory") || url.includes("/api/warehouse")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockInventoryItems),
					});
				}
				if (url.includes("/api/patients")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockDashboard.patients),
					});
				}
				if (url.includes("/api/services") || url.includes("/api/catalog")) {
					return route.fulfill({
						status: 200,
						contentType: "application/json",
						body: JSON.stringify(mockServices),
					});
				}
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([]),
				});
			});

			return context;
		}

		async function capturePage(page, filename, theme) {
			await page.evaluate((th) => {
				document.documentElement.classList.remove("light", "dark");
				document.documentElement.classList.add(th);
				document.documentElement.setAttribute("data-theme", th);
				const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
				localStorage.setItem("dente_theme_mode", th);
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(th);
				}
				// remove overlays
				document.querySelectorAll(
					'[data-testid="guided-tour-spotlight-overlay"], .tour-spotlight-root, .tour-backdrop-clickable-zone, [data-testid="toast-container"] > *, .global-toast, .toast-notification, [role="alert"], .coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal'
				).forEach((el) => el.remove());
			}, theme);

			await page.waitForTimeout(600);

			const primaryPath = path.join(outputDirs[0], filename);
			await page.screenshot({ path: primaryPath, fullPage: false });

			for (let i = 1; i < outputDirs.length; i++) {
				fs.copyFileSync(primaryPath, path.join(outputDirs[i], filename));
			}

			console.log(`[CAPTURED] -> ${filename}`);
		}

		const configs = [
			{ name: "pc_light", isMobile: false, theme: "light" },
			{ name: "pc_dark", isMobile: false, theme: "dark" },
			{ name: "mobile_light", isMobile: true, theme: "light" },
			{ name: "mobile_dark", isMobile: true, theme: "dark" },
		];

		for (const cfg of configs) {
			console.log(`\n========================================`);
			console.log(`=== BATCH: ${cfg.name.toUpperCase()} ===`);
			console.log(`========================================`);

			// ─── 1. INVOICES (#invoices) ───
			{
				const context = await createConfiguredContext(cfg.isMobile, cfg.theme);
				const page = await context.newPage();
				console.log(`[${cfg.name}] Navigating to #invoices...`);
				await page.goto("http://127.0.0.1:5173/#invoices", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForSelector(".finance-monolithic-toolbar", { timeout: 20000 }).catch(() => {});
				await page.waitForTimeout(1000);

				const hasInvoicesModal = await page.$('[data-testid="modal-finance-invoices"]');
				if (!hasInvoicesModal) {
					const openBtn = await page.$('[data-testid="btn-finance-open-invoices"]');
					if (openBtn) {
						await openBtn.click();
						await page.waitForTimeout(1000);
					}
				}
				await page.waitForSelector('[data-testid="modal-finance-invoices"], [data-testid^="invoice-card-"]', { timeout: 10000 }).catch(() => {});
				await capturePage(page, `invoices_${cfg.name}.png`, cfg.theme);
				await context.close();
			}

			// ─── 2. RETAIL PRODUCTS MODAL (PC & Mobile) ───
			{
				const context = await createConfiguredContext(cfg.isMobile, cfg.theme);
				const page = await context.newPage();
				console.log(`[${cfg.name}] Opening RetailProductsModal...`);
				await page.goto("http://127.0.0.1:5173/#finance", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForSelector(".finance-monolithic-toolbar", { timeout: 20000 }).catch(() => {});
				await page.waitForTimeout(800);

				const optionsBtn = await page.waitForSelector('[data-testid="finance-toolbar-options-btn"]', { timeout: 10000 }).catch(() => null);
				if (optionsBtn) {
					await optionsBtn.click();
					await page.waitForTimeout(600);
					const cashboxBtn = await page.waitForSelector('[data-testid="btn-finance-open-cashbox"]', { timeout: 5000 }).catch(() => null);
					if (cashboxBtn) {
						await cashboxBtn.click();
						await page.waitForTimeout(1000);
						const retailBtn = await page.waitForSelector('[data-testid="btn-open-retail-showcase"]', { timeout: 8000 }).catch(() => null);
						if (retailBtn) {
							await retailBtn.scrollIntoViewIfNeeded();
							await retailBtn.click({ force: true });
							await page.waitForSelector('[data-testid="retail-products-modal"]', { timeout: 8000 }).catch(() => {});
							await page.waitForTimeout(800);
						}
					}
				}
				await capturePage(page, `retail_showcase_${cfg.name}.png`, cfg.theme);
				await context.close();
			}

			// ─── 3. INVENTORY (#inventory) ───
			{
				const context = await createConfiguredContext(cfg.isMobile, cfg.theme);
				const page = await context.newPage();
				console.log(`[${cfg.name}] Navigating to #inventory...`);
				await page.goto("http://127.0.0.1:5173/#inventory", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForSelector('[data-testid="inventory-table"], .mobile-inventory-container, [data-testid^="inventory-item-"]', { timeout: 15000 }).catch(() => {});
				await page.waitForTimeout(1000);
				await capturePage(page, `inventory_${cfg.name}.png`, cfg.theme);
				await context.close();
			}

			// ─── 4. LAB ORDERS (#lab_orders) ───
			{
				const context = await createConfiguredContext(cfg.isMobile, cfg.theme);
				const page = await context.newPage();
				console.log(`[${cfg.name}] Navigating to #lab_orders...`);
				await page.goto("http://127.0.0.1:5173/#lab_orders", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForSelector('[data-testid^="lab-order-card-"], .lab-orders-container, [data-testid="btn-lab-new-order"]', { timeout: 15000 }).catch(() => {});
				await page.waitForTimeout(1000);
				await capturePage(page, `lab_orders_${cfg.name}.png`, cfg.theme);
				await context.close();
			}

			// ─── 5. SETTINGS PRICES (#settings/prices) ───
			{
				const context = await createConfiguredContext(cfg.isMobile, cfg.theme);
				const page = await context.newPage();
				console.log(`[${cfg.name}] Navigating to #settings/prices...`);
				await page.goto("http://127.0.0.1:5173/#settings/prices", { waitUntil: "domcontentloaded", timeout: 30000 });
				await page.waitForSelector('[data-testid="settings-view"]', { timeout: 20000 }).catch(() => {});
				await page.waitForTimeout(1000);

				if (!cfg.isMobile) {
					const ownerPricesBtn = await page.$('[data-testid="owner-tab-prices"]');
					if (ownerPricesBtn) {
						await ownerPricesBtn.click().catch(() => {});
						await page.waitForTimeout(800);
					} else {
						const genericPricesBtn = await page.$('[data-testid="settings-tab-prices"], button[data-tab="prices"]');
						if (genericPricesBtn) {
							await genericPricesBtn.click().catch(() => {});
							await page.waitForTimeout(800);
						}
					}
					await page.waitForSelector('.pricelist-studio-container, .pricelist-monolithic-toolbar', { timeout: 10000 }).catch(() => {});
					await page.evaluate(() => {
						const el = document.querySelector('.pricelist-studio-container') || document.querySelector('.pricelist-monolithic-toolbar');
						if (el) {
							el.scrollIntoView({ behavior: 'instant', block: 'start' });
						}
					});
				} else {
					await page.waitForSelector('.mobile-settings-prices, [data-testid="mobile-settings-prices"]', { timeout: 10000 }).catch(() => {});
				}
				await page.waitForTimeout(800);
				await capturePage(page, `settings_prices_${cfg.name}.png`, cfg.theme);
				await context.close();
			}
		}

		console.log("\n>>> ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN CAPTURE SCRIPT:", err);
	process.exit(1);
});
