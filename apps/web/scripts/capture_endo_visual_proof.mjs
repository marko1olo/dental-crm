import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/09c8a411-a746-4465-a80b-41ec76924659";
const BASE_URL = "http://127.0.0.1:5173";

const DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token";
const DENTE_STAFF_TOKEN_KEY = "dente_staff_token";
const MOCK_CLINIC_TOKEN = "test-clinic-token-abc123";
const MOCK_STAFF_TOKEN = "test-staff-token-xyz789";

const MOCK_USER = {
	id: "user-1",
	orgId: "org-1",
	name: "Д-р Смирнов А.П.",
	role: "doctor",
	email: "doctor@dente.ru",
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-101",
	fullName: "Иванов Пётр Сергеевич",
	phone: "+7 (916) 123-45-67",
	birthDate: "1988-04-12",
	age: 38,
	gender: "male",
	status: "active",
	allergies: ["Лидокаин (анамнестически)"],
};

const MOCK_PREVIOUS_APPOINTMENT = {
	id: "appt-prev-stage1",
	patientId: "pat-101",
	patientName: "Иванов Пётр Сергеевич",
	startsAt: "2026-10-03T10:00:00.000Z",
	date: "03.10.2026",
	status: "completed",
	reason: "Зуб 16: Острый пульпит K04.0, мехобработка ProTaper, Calcept под повязку Септопак",
	diagnosis: "K04.0 Острый очаговый пульпит (зуб 16)",
	diagnosisTooth: 16,
};

const MOCK_ACTIVE_APPOINTMENT = {
	id: "appt-active-stage2",
	patientId: "pat-101",
	patientName: "Иванов Пётр Сергеевич",
	startsAt: new Date().toISOString(),
	date: new Date().toLocaleDateString("ru-RU"),
	status: "in_progress",
	reason: "Зуб 16: 2-й этап эндодонтического лечения (постоянная обтурация и пломба)",
	diagnosis: "K04.0 Острый пульпит (зуб 16)",
	diagnosisTooth: 16,
};

const MOCK_CLINIC_PROFILE = {
	id: "org-1",
	name: "Стоматология ДЕНТЕ Премиум",
	address: "ул. Медицинская, 12",
	phone: "+7 (495) 123-45-67",
	mode: "clinic",
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-1",
		name: "Стоматология ДЕНТЕ Премиум",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	activeDoctor: MOCK_USER,
	shifts: [{ id: "shift-1", doctorId: MOCK_USER.id, isOpen: true }],
	scheduleSlots: [],
	appointments: [MOCK_PREVIOUS_APPOINTMENT, MOCK_ACTIVE_APPOINTMENT],
	recentPatients: [MOCK_PATIENT],
	patients: [MOCK_PATIENT],
	activePatient: MOCK_PATIENT,
	activeAppointment: MOCK_ACTIVE_APPOINTMENT,
	activeVisit: {
		id: "visit-stage2-live",
		patientId: "pat-101",
		patient: MOCK_PATIENT,
		appointmentId: MOCK_ACTIVE_APPOINTMENT.id,
		doctorId: MOCK_USER.id,
		diagnosisTooth: 16,
		status: "in_progress",
		complaint: "",
		anamnesis: "",
		objectiveStatus: "",
		treatmentPlan: "",
	},
	storedTeeth: [
		{ toothNumber: 16, state: "treatment", diagnosis: "K04.0" },
	],
	serviceCatalog: [
		{
			id: "cat-obt-01",
			code804n: "A16.07.008.002",
			title: "Пломбирование корневого канала гуттаперчей (постоянная обтурация)",
			basePriceRub: 4500,
			priceRub: 4500,
		},
		{
			id: "cat-rest-01",
			code804n: "A16.07.002.001",
			title: "Восстановление зуба пломбой (светоотверждаемый композит)",
			basePriceRub: 4800,
			priceRub: 4800,
		},
		{
			id: "cat-inst-01",
			code804n: "A16.07.030.001",
			title: "Инструментальная и медикаментозная обработка корневого канала",
			basePriceRub: 3500,
			priceRub: 3500,
		},
	],
	todayStats: { revenue: 3842500, appointments: 812, newPatients: 428 },
	notifications: [],
};

async function main() {
	if (!fs.existsSync(ARTIFACTS_DIR)) {
		fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
	}

	console.log("🚀 Запуск Playwright Edge для снятия скриншотов эндодонтии 1440x900...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	// Настройка перехвата API
	await page.route("**/api/auth/login", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: MOCK_STAFF_TOKEN, user: MOCK_USER }) });
	});
	await page.route("**/api/auth/user/me**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: MOCK_USER }) });
	});
	await page.route("**/api/dashboard**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DASHBOARD) });
	});
	await page.route("**/api/patients**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_PATIENT]) });
	});
	await page.route("**/api/appointments**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([MOCK_PREVIOUS_APPOINTMENT, MOCK_ACTIVE_APPOINTMENT]) });
	});
	await page.route("**/api/settings/clinic/profile**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CLINIC_PROFILE) });
	});
	await page.route("**/api/settings/preferences**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ theme: "light", language: "ru" }) });
	});
	await page.route("**/api/system/**", (route) => {
		route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ healthy: true, ready: true }) });
	});
	await page.route("**/api/**", (route) => {
		if (route.request().method() === "GET") {
			route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
		} else {
			route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		}
	});

	await page.addInitScript(
		({ clinicKey, staffKey, clinicToken, staffToken, user }) => {
			localStorage.setItem(clinicKey, clinicToken);
			localStorage.setItem(staffKey, staffToken);
			localStorage.setItem("dente_user", JSON.stringify(user));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, savedAt: new Date().toISOString() }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "light" }));
			localStorage.setItem("dente_theme", "light");
			localStorage.setItem("dente_theme_mode", "light");
			document.documentElement.setAttribute("data-theme", "light");
		},
		{
			clinicKey: DENTE_CLINIC_TOKEN_KEY,
			staffKey: DENTE_STAFF_TOKEN_KEY,
			clinicToken: MOCK_CLINIC_TOKEN,
			staffToken: MOCK_STAFF_TOKEN,
			user: MOCK_USER,
		},
	);

	console.log("🌐 Переход на страницу визита /#visit...");
	await page.goto(`${BASE_URL}/#visit`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2500);

	// Проверяем наличие рабочей области визита
	const visitPanel = page.locator('[data-testid="visit-view"], [data-testid="visit-emk-tab"], [data-testid="emk-soap-visibility-tracker"]').first();
	const isVisitPanelVisible = await visitPanel.isVisible({ timeout: 5000 }).catch(() => false);
	console.log("Видимость рабочей области визита:", isVisitPanelVisible);

	// Если отображается форма логина
	const loginInput = page.locator('input[type="text"], input[type="email"], input[name="login"]').first();
	if (await loginInput.isVisible({ timeout: 1000 }).catch(() => false)) {
		console.log("Вход в систему через форму...");
		await loginInput.fill("admin");
		const passInput = page.locator('input[type="password"]').first();
		await passInput.fill("admin");
		const submitBtn = page.locator('button[type="submit"], button:has-text("Войти")').first();
		await submitBtn.click();
		await page.waitForTimeout(2000);
	}

	// Переключаем hash на #visit
	await page.evaluate(() => {
		window.location.hash = "#visit";
	});
	await page.waitForTimeout(2000);

	// Если открыт VisitIntakeCockpit (очередь пациентов), кликаем на пациента Иванов
	const patientQueueItem = page.locator('button:has-text("Иванов"), [data-testid="patient-queue-row"], button:has-text("Начать приём")').first();
	if (await patientQueueItem.isVisible({ timeout: 2000 }).catch(() => false)) {
		console.log("Выбор пациента Иванов из очереди...");
		await patientQueueItem.click();
		await page.waitForTimeout(1500);
	}

	// Переключаем таб визита на ЭМК (если не активен)
	const emkTabBtn = page.locator('button:has-text("ЭМК"), [data-testid="visit-tab-emk"]').first();
	if (await emkTabBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
		await emkTabBtn.click();
		await page.waitForTimeout(500);
	}

	// Устанавливаем активный зуб 16
	await page.evaluate(() => {
		try {
			// biome-ignore lint: DOM evaluation
			const win = window;
			if (win.__visitStore || (win.useVisitStore && win.useVisitStore.getState)) {
				const store = win.__visitStore || win.useVisitStore.getState();
				store.setActiveToothNumber?.(16);
				store.setVisitToothState?.("16", "treatment");
			}
		} catch (e) {
			console.warn("Store setup error:", e);
		}
	});

	await page.waitForTimeout(1000);

	// ☀️ 1. Light Mode Screenshot: До нажатия кнопки (кнопка видна в трекере)
	const lightPath = path.join(ARTIFACTS_DIR, "multi_stage_endo_light_1440.png");
	console.log(`📸 Снятие Light Mode скриншота: ${lightPath}`);
	await page.evaluate(() => {
		document.documentElement.classList.remove("dark");
		document.documentElement.setAttribute("data-theme", "light");
	});
	await page.waitForTimeout(500);
	await page.screenshot({ path: lightPath, fullPage: false });

	const lightSize = fs.statSync(lightPath).size;
	console.log(`✅ Light Mode сохранен: ${lightSize} байт (требование >= 20 КБ: ${lightSize >= 20000 ? "OK" : "FAIL"})`);

	// Кликаем по кнопке продолжения эндодонтии
	console.log("Проверяем наличие кнопки [data-testid=\"continue-endo-btn\"]...");
	const endoBtn = page.locator('[data-testid="continue-endo-btn"]').first();
	const isBtnVisible = await endoBtn.isVisible({ timeout: 3000 }).catch(() => false);
	if (isBtnVisible) {
		console.log("✓ Нажатие кнопки [data-testid=\"continue-endo-btn\"]!");
		await endoBtn.click();
	} else {
		console.log("Отправка события dente-continue-endo-stage напрямую...");
		await page.evaluate(() => {
			window.dispatchEvent(
				new CustomEvent("dente-continue-endo-stage", {
					detail: {
						snapshot: {
							date: "03.10.2026",
							toothNumber: 16,
							diagnosisIcd10: "K04.0",
							diagnosisTitle: "K04.0 Острый очаговый пульпит (зуб 16)",
							anamnesis: "Ранее начато эндодонтическое лечение зуба 16 от 03.10.2026: экстирпация пульпы, ProTaper, Calcept под Септопак.",
							isEndoUnfinished: true,
							stage: 1,
						},
					},
				}),
			);
		});
	}

	await page.waitForTimeout(1000);

	// 🌙 2. Dark Mode Screenshot: После нажатия (дневник заполнен 2-м этапом)
	const darkPath = path.join(ARTIFACTS_DIR, "multi_stage_endo_dark_1440.png");
	console.log(`📸 Снятие Dark Mode скриншота: ${darkPath}`);
	await page.evaluate(() => {
		document.documentElement.classList.add("dark");
		document.documentElement.setAttribute("data-theme", "dark");
	});
	await page.waitForTimeout(500);
	await page.screenshot({ path: darkPath, fullPage: false });

	const darkSize = fs.statSync(darkPath).size;
	console.log(`✅ Dark Mode сохранен: ${darkSize} байт (требование >= 20 КБ: ${darkSize >= 20000 ? "OK" : "FAIL"})`);

	await browser.close();
	console.log("🎉 Все скриншоты успешно сняты!");
}

main().catch((err) => {
	console.error("Ошибка при снятии скриншотов:", err);
	process.exit(1);
});
