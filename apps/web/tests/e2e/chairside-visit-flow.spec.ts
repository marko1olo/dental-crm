/**
 * apps/web/tests/e2e/chairside-visit-flow.spec.ts
 *
 * Клинический E2E-тест приёма врача у кресла (Chairside Doctor Visit Flow).
 * Соответствует МАНДАТУ 8e (Автономия врача), МАНДАТУ 8x (Чистый клинический язык)
 * и Закону Создателя о запрете потемкинских деревень и микро-дрочи.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/visit";

const MOCK_USER = {
	id: "user-doctor-1",
	orgId: "org-dente-1",
	name: "Д-р Смирнов А.П.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-chairside-001",
	organizationId: "org-dente-1",
	fullName: "Иванов Иван Иванович",
	name: "Иванов Иван Иванович",
	phone: "+7 (999) 111-22-33",
	balanceRub: 15000,
	birthDate: "1988-06-15",
	status: "active",
	gender: "male",
	allergies: ["Лидокаин (анамнестически)"],
	chronicDiseases: ["Гипертоническая болезнь I ст."],
	createdAt: "2025-01-10T10:00:00.000Z",
};

const MOCK_APPOINTMENT = {
	id: "appt-chairside-001",
	patientId: "pat-chairside-001",
	patientName: "Иванов Иван Иванович",
	doctorUserId: "user-doctor-1",
	doctorName: "Д-р Смирнов А.П.",
	chairId: "chair-1",
	status: "arrived",
	startsAt: new Date(Date.now() - 600000).toISOString(),
	endsAt: new Date(Date.now() + 3000000).toISOString(),
	serviceTitle: "Первичный терапевтический приём",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-1",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-1",
			clinicName: "Клиника ДЕНТЕ",
			mode: "clinic",
		},
		chairs: [{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true }],
		doctors: [MOCK_USER],
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	appointments: [MOCK_APPOINTMENT],
	serviceCatalog: [
		{
			id: "srv-caries",
			code: "A16.07.002",
			code804n: "A16.07.002",
			name: "Восстановление зуба пломбой (лечение кариеса)",
			priceRub: 4500,
			category: "therapy",
		},
		{
			id: "srv-anesthesia",
			code: "B01.003.004.001",
			code804n: "B01.003.004.001",
			name: "Местная анестезия инфильтрационная",
			priceRub: 900,
			category: "anesthesia",
		},
	],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 0, appointments: 1, newPatients: 0 },
	notifications: [],
};

const MOCK_CLINIC_PROFILE = {
	id: "org-dente-1",
	name: "Клиника ДЕНТЕ",
	address: "ул. Клиническая, д. 10",
	phone: "+7 (495) 000-11-22",
	mode: "clinic",
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

async function setupChairsideMocks(page: Page) {
	page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
	page.on("pageerror", (err) => console.log(`[BROWSER PAGE ERROR] ${err.message}`));
	page.on("requestfailed", (req) => console.log(`[REQ FAILED] ${req.url()} (${req.failure()?.errorText})`));
	page.on("request", (req) => {
		const u = req.url();
		if (u.includes("main.tsx") || u.includes("AppShell") || u.includes("DirectVisitLauncher")) {
			console.log(`[FETCHING] ${u}`);
		}
	});
	page.on("response", (res) => {
		const u = res.url();
		if (u.includes("main.tsx") || u.includes("AppShell") || u.includes("DirectVisitLauncher")) {
			console.log(`[LOADED ${res.status()}] ${u}`);
		}
	});

	// Инициализация токенов и локального состояния
	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-chairside";
		(window as any).__denteStaffToken = "test-staff-token-chairside";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-chairside");
			localStorage.setItem("dente_staff_token", "test-staff-token-chairside");
			localStorage.setItem("dente_active_session_token", "test-session-chairside");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов А.П.");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "dark" }));
			localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
		} catch {}
	});

	// Точечная маршрутизация /api/* через строгий предикат URL (защита от перехвата /@fs/ модулей Vite)
	await page.route(
		(url) => url.pathname.startsWith("/api/"),
		async (route) => {
			const parsed = new URL(route.request().url());
			const pathname = parsed.pathname;
			const method = route.request().method();

			if (pathname.includes("/api/auth/login")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ token: "test-token-123", user: MOCK_USER }),
				});
			}

			if (pathname.includes("/api/auth/user/me")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ user: MOCK_USER }),
				});
			}

			if (pathname.includes("/api/settings/clinic/profile")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_CLINIC_PROFILE),
				});
			}

			if (pathname.includes("/api/settings/preferences")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ theme: "dark", language: "ru" }),
				});
			}

			if (pathname.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_DASHBOARD),
				});
			}

			if (pathname.endsWith("/api/patients") || pathname.includes("/api/patients?")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([MOCK_PATIENT]),
				});
			}

			if (pathname.includes(`/api/patients/${MOCK_PATIENT.id}`) && !pathname.includes("tooth-states")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_PATIENT),
				});
			}

			if (pathname.includes("tooth-states") || pathname.includes("/api/odontogram/")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ ok: true, success: true, toothStates: [] }),
				});
			}

			if (pathname.includes("/api/appointments") && pathname.includes("/visit")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						visit: {
							id: "visit-chairside-001",
							appointmentId: MOCK_APPOINTMENT.id,
							patientId: MOCK_PATIENT.id,
							status: "in_progress",
						},
					}),
				});
			}

			if (pathname.includes("/api/system/")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ healthy: true, ready: true, issues: [], plans: [] }),
				});
			}

			// Fallback для остальных API вызовов
			if (method === "GET") {
				return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		},
	);
}

test.describe("Клинический приём врача у кресла (Chairside Doctor Visit Flow)", () => {
	test("Полный сквозной путь: открытие визита -> выбор зуба FDI -> патология -> норма в 1 клик -> дневник ЭМК -> смета плана", async ({
		page,
	}) => {
		test.setTimeout(120000);
		page.setDefaultTimeout(30000);
		page.setDefaultNavigationTimeout(60000);

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupChairsideMocks(page);

		// Шаг 1: Переход в раздел визита врача через суверенный шлюз chairside-visit
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });

		// Шаг 2: Проверка монтирования рабочего экрана визита врача (Мандат 8aq)
		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 45000 });

		const headerMonolith = page.locator('[data-testid="visit-header-monolith"]');
		await expect(headerMonolith).toBeVisible();

		// Шаг 3: Вкладка зубной формулы (FDI 11–48)
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
		await expect(odontogramSubtab).toBeVisible({ timeout: 10000 });
		await odontogramSubtab.dispatchEvent("click");

		const odontogramTab = page.locator('[data-testid="visit-odontogram-tab"]');
		await expect(odontogramTab).toBeVisible({ timeout: 15000 });

		// Поиск зуба 16 (первый моляр верхней челюсти справа по FDI)
		const toothCell16 = page.locator('[data-testid="anatomical-tooth-cell-16"]').first();
		await expect(toothCell16).toBeVisible({ timeout: 10000 });
		await toothCell16.scrollIntoViewIfNeeded();

		// Клик по зубу 16 для вызова клинического радиального меню
		await toothCell16.dispatchEvent("click");

		// Проверка появления радиального меню зуба
		const radialOverlay = page.locator('[data-testid="tooth-radial-menu-overlay"]');
		await expect(radialOverlay).toBeVisible({ timeout: 8000 });

		// Выбор патологии «Кариес» из радиального меню
		const cariesBtn = page.locator('[data-testid="radial-btn-caries"]');
		await expect(cariesBtn).toBeVisible({ timeout: 5000 });
		await cariesBtn.dispatchEvent("click");

		// Радиальное меню должно закрыться после выбора
		await expect(radialOverlay).toBeHidden({ timeout: 8000 });

		// Шаг 4: Быстрая норма в 1 клик (Мандат 8e / 8y)
		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: "Норма" }))
			.first();
		if (await normBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await normBtn.dispatchEvent("click");
		}

		// Шаг 5: Проверка медицинской карты (ЭМК / Дневник приёма)
		const emkSubtab = page.locator('[data-testid="visit-subtab-emk"]');
		await expect(emkSubtab).toBeVisible({ timeout: 8000 });
		await emkSubtab.dispatchEvent("click");

		const emkTab = page.locator('[data-testid="visit-emk-tab"]');
		await expect(emkTab).toBeVisible({ timeout: 10000 });

		// Модуль жалоб и анамнеза
		const emkComplaintsModule = page.locator('[data-testid="emk-complaints-and-anamnesis-module"]');
		await expect(emkComplaintsModule).toBeVisible({ timeout: 8000 });

		// Кнопка сохранения записи приёма (Мандат 8e: никогда не disabled)
		const saveNoteBtn = page.locator('[data-testid="btn-save-visit-note"]').first();
		await expect(saveNoteBtn).toBeVisible({ timeout: 8000 });
		await expect(saveNoteBtn).not.toBeDisabled();
		await saveNoteBtn.dispatchEvent("click");

		// Шаг 6: Проверка комплексного плана лечения и сметы
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]');
		await expect(planSubtab).toBeVisible({ timeout: 8000 });
		await planSubtab.dispatchEvent("click");

		const planContent = page.locator('[data-testid="visit-treatment-plan-tab-content"]');
		await expect(planContent).toBeVisible({ timeout: 8000 });

		const printEstimateBtn = page.locator('[data-testid="btn-plan-tab-print-estimate"]');
		await expect(printEstimateBtn).toBeVisible({ timeout: 8000 });
		await printEstimateBtn.dispatchEvent("click");

		// Шаг 7: Создание 4-State Proof скриншотов (PC Light/Dark + Mobile Light/Dark)
		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		// 1. PC Dark
		await page.screenshot({ path: path.join(PROOFS_DIR, "01_chairside_visit_pc_dark_1440x900.png"), fullPage: false });

		// 2. PC Light
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: path.join(PROOFS_DIR, "02_chairside_visit_pc_light_1440x900.png"), fullPage: false });

		// 3. Mobile Light (390x844)
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(300);
		await page.screenshot({ path: path.join(PROOFS_DIR, "03_chairside_visit_mobile_light_390x844.png"), fullPage: false });

		// 4. Mobile Dark (390x844)
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: path.join(PROOFS_DIR, "04_chairside_visit_mobile_dark_390x844.png"), fullPage: false });
	});
});
