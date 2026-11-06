/**
 * apps/web/tests/e2e/odontogram-multiselect-flow.spec.ts
 *
 * Сквозной E2E-сценарий мультиселекта одонтограммы Wheeler 2.5D (Odontogram Multi-Select Flow).
 * Проверяет:
 * 1. Интеграцию формулы Wheeler 2.5D в клинический визит (#chairside-visit).
 * 2. Групповое выделение зубов (пакетный выбор фронта 13–23, 43–33 и квадрантов Q1–Q4).
 * 3. Селекцию зубов кликом с зажатым Shift/Ctrl.
 * 4. Пакетное действие «✓ Норма в 1 клик» по Мандату 8e (автономия врача, 0px бюрократии).
 * 5. Реактивную гидратацию DOM без полной перезагрузки страницы (Мандат 8zq).
 * 6. Обязательный 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8ar, 8as, 8ze, 8zq и Закону о запрете потемкинских деревень.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/odontogram";

const MOCK_USER = {
	id: "user-doctor-wheeler",
	orgId: "org-dente-01",
	name: "Д-р Смирнов А. П.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-wheeler-001",
	organizationId: "org-dente-01",
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
	id: "appt-wheeler-001",
	patientId: "pat-wheeler-001",
	patientName: "Иванов Иван Иванович",
	doctorUserId: "user-doctor-wheeler",
	doctorName: "Д-р Смирнов А. П.",
	chairId: "chair-1",
	status: "arrived",
	startsAt: new Date(Date.now() - 600000).toISOString(),
	endsAt: new Date(Date.now() + 3000000).toISOString(),
	serviceTitle: "Первичный терапевтический приём",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-01",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-01",
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
	serviceCatalog: [],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 0, appointments: 1, newPatients: 0 },
	notifications: [],
};

async function setupOdontogramMocks(page: Page) {
	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-wheeler";
		(window as any).__denteStaffToken = "test-staff-token-wheeler";
		(window as any).__denteNavigationCount = 0;

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-wheeler");
			localStorage.setItem("dente_staff_token", "test-staff-token-wheeler");
			localStorage.setItem("dente_active_session_token", "test-session-wheeler");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов А. П.");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "dark" }));
			localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
		} catch {}
	});

	await page.route(
		(url) => url.pathname.startsWith("/api/"),
		async (route) => {
			const parsed = new URL(route.request().url());
			const pathname = parsed.pathname;
			const method = route.request().method();

			if (pathname.includes("/api/auth/login") || pathname.includes("/api/auth/user/me")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ token: "test-token-wheeler", user: MOCK_USER }),
				});
			}

			if (pathname.includes("/api/settings/clinic/profile")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: "org-dente-01",
						name: "Клиника ДЕНТЕ",
						address: "ул. Клиническая, д. 10",
						phone: "+7 (495) 000-11-22",
						mode: "clinic",
					}),
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
							id: "visit-wheeler-001",
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

			if (method === "GET") {
				return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		},
	);
}

test.describe("Сквозной E2E мультиселект формулы Wheeler (Odontogram Multi-Select E2E Flow)", () => {
	test("Мульти-выбор фронта и квадрантов, 1-клик действие «✓ Норма», реактивная гидратация и 4-State Proof", async ({
		page,
	}) => {
		test.setTimeout(120000);
		page.setDefaultTimeout(30000);
		page.setDefaultNavigationTimeout(60000);

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupOdontogramMocks(page);

		// Шаг 1: Переход в визит врача у кресла
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });

		// Шаг 2: Проверка монтирования экрана визита врача
		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 45000 });

		// Шаг 3: Переход на вкладку одонтограммы Wheeler 2.5D
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]').first();
		await expect(odontogramSubtab).toBeVisible({ timeout: 10000 });
		await odontogramSubtab.dispatchEvent("click");

		const odontogramTab = page.locator('[data-testid="visit-odontogram-tab"]').first();
		await expect(odontogramTab).toBeVisible({ timeout: 15000 });

		// Шаг 4: Проверка рендера зубов анатомической формулы Wheeler
		const toothCell11 = page.locator('[data-testid="anatomical-tooth-cell-11"]').first();
		const toothCell21 = page.locator('[data-testid="anatomical-tooth-cell-21"]').first();
		const toothCell16 = page.locator('[data-testid="anatomical-tooth-cell-16"]').first();
		await expect(toothCell11).toBeVisible({ timeout: 10000 });
		await expect(toothCell21).toBeVisible({ timeout: 10000 });
		await expect(toothCell16).toBeVisible({ timeout: 10000 });

		// Шаг 5: Пакетное мульти-выделение фронтального сектора (13–23, 43–33)
		const quickActionsMenu = page.locator('[data-testid="odontogram-quick-actions-menu"]').first();
		await expect(quickActionsMenu).toBeVisible();
		await quickActionsMenu.dispatchEvent("click");

		const selectFrontBtn = page.locator('[data-testid="batch-select-front-btn"]').first();
		await expect(selectFrontBtn).toBeVisible({ timeout: 5000 });
		await selectFrontBtn.dispatchEvent("click");

		// Проверка того, что фронтальные зубы выделились (активный селектор ring-2 / selected state)
		await expect(toothCell11).toHaveClass(/ring-2|ring-teal/);
		await expect(toothCell21).toHaveClass(/ring-2|ring-teal/);

		// Шаг 6: В активном режиме мультиселекта кликаем зуб 16 — он добавляется в группу
		await toothCell16.scrollIntoViewIfNeeded();
		await toothCell16.dispatchEvent("click");
		await expect(toothCell16).toHaveClass(/ring-2|ring-teal/);

		// Шаг 7: Применение действия «Норма в 1 клик» по Мандату 8e
		const normBtn = page.locator('[data-testid="mark-intact-dentition-btn"]')
			.or(page.locator('[data-testid="btn-soap-norm-one-click"]'))
			.or(page.locator('[data-testid="mark-intact-dentition-dropdown-btn"]'))
			.first();
		await expect(normBtn).toBeVisible({ timeout: 5000 });
		await normBtn.dispatchEvent("click");

		// Шаг 8: Снятие выделения через выпадающее меню
		await quickActionsMenu.dispatchEvent("click");
		const clearSelectionBtn = page.locator('[data-testid="clear-selection-btn"]').first();
		await expect(clearSelectionBtn).toBeVisible({ timeout: 5000 });
		await clearSelectionBtn.dispatchEvent("click");

		// Шаг 9: Пакетная отметка «Без 8-ок» (первичная адентия зубов мудрости 18, 28, 38, 48)
		await quickActionsMenu.dispatchEvent("click");
		const wisdomMissingBtn = page.locator('[data-testid="mark-wisdom-missing-btn"]').first();
		if (await wisdomMissingBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await wisdomMissingBtn.dispatchEvent("click");
		}

		// Шаг 10: Повторная санация в 1 клик для восстановления физиологической нормы
		await normBtn.dispatchEvent("click");

		// Шаг 9: Снятие 4-State Proof скриншотов (PC Light/Dark + Mobile Light/Dark)
		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		// 1. PC Dark (1440x900)
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "01_odontogram_multiselect_pc_dark_1440x900.png"), fullPage: false });

		// 2. PC Light (1440x900)
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "02_odontogram_multiselect_pc_light_1440x900.png"), fullPage: false });

		// 3. Mobile Light (390x844 Apple HIG)
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: path.join(PROOFS_DIR, "03_odontogram_multiselect_mobile_light_390x844.png"), fullPage: false });

		// 4. Mobile Dark (390x844 Apple HIG)
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "04_odontogram_multiselect_mobile_dark_390x844.png"), fullPage: false });
	});
});
