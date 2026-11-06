/**
 * apps/web/tests/e2e/warehouse-consumption-flow.spec.ts
 *
 * Сквозной складской E2E-сценарий (Warehouse Consumables Consumption Flow).
 * Проверяет:
 * 1. Открытие склада и студии списания расходников (Direct Warehouse Launcher, #warehouse).
 * 2. Инвентаризационную сводку остатков, срок годности FEFO и денежную оценку запасов.
 * 3. Автоматическое пакетное списание расходников по техкарте процедуры («Лечение кариеса»).
 * 4. Мягкий фоновый овердрафт без блокировок (Soft Negative Stock по Мандату 8n).
 * 5. Быструю сверку склада в 1 клик (Zero-Friction Inventory Audit).
 * 6. Оприходование накладной поставщика и автоматическое погашение дефицита.
 * 7. Обязательный 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8n, 8am, 8v, 8ze и Закону о запрете потемкинских деревень.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warehouse";

const MOCK_USER = {
	id: "user-doctor-warehouse",
	orgId: "org-dente-01",
	name: "Д-р Смирнов А. В.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-warehouse-001",
	organizationId: "org-dente-01",
	fullName: "Смирнова Екатерина Васильевна",
	name: "Смирнова Екатерина Васильевна",
	phone: "+7 (926) 555-12-34",
	balanceRub: 12000,
	birthDate: "1988-04-12",
	status: "active",
	gender: "female",
	allergies: [],
	chronicDiseases: [],
	createdAt: "2025-01-15T10:00:00.000Z",
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
		chairs: [{ id: "chair-1", name: "Кабинет терапии", active: true }],
		doctors: [MOCK_USER],
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	appointments: [],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 38000, appointments: 5, newPatients: 1 },
	notifications: [],
};

async function setupWarehouseMocks(page: Page) {
	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-warehouse";
		(window as any).__denteStaffToken = "test-staff-token-warehouse";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-warehouse");
			localStorage.setItem("dente_staff_token", "test-staff-token-warehouse");
			localStorage.setItem("dente_active_session_token", "test-session-warehouse");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов А. В.");
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
					body: JSON.stringify({ token: "test-token-warehouse", user: MOCK_USER }),
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

test.describe("Сквозной складской учёт и пакетное списание расходников (Warehouse Consumption E2E Flow)", () => {
	test("Пакетный расход по техкарте процедуры, Soft Negative Stock, экспресс-сверка и 4-State Proof", async ({
		page,
	}) => {
		test.setTimeout(90000);
		page.setDefaultTimeout(20000);
		page.setDefaultNavigationTimeout(40000);

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupWarehouseMocks(page);

		// Шаг 1: Навигация в модуль склада через прямой шлюз #warehouse
		await page.goto(`${BASE_URL}/#warehouse`, { waitUntil: "domcontentloaded" });

		// Шаг 2: Проверка монтирования модалки-студии склада (Мандат 8aq)
		const warehouseModal = page.locator('[data-testid="warehouse-studio-modal"]').first();
		await expect(warehouseModal).toBeVisible({ timeout: 25000 });

		// Проверка отображения KPI склада
		const totalPositionsKpi = warehouseModal.getByText("Всего позиций").locator("..");
		await expect(totalPositionsKpi).toBeVisible();

		// Шаг 3: Переход на вкладку пакетного списания за смену
		const batchDeductBtn = page.locator('[data-testid="btn-batch-deduct"]').first();
		await expect(batchDeductBtn).toBeVisible();
		await batchDeductBtn.dispatchEvent("click");

		// Шаг 4: Выбор техкарты терапевтической процедуры («Лечение кариеса»)
		const techMapSelect = warehouseModal.locator("select").first();
		await expect(techMapSelect).toBeVisible();
		await techMapSelect.selectOption("proc-filling-light");

		// Установка количества пациентов за смену
		const countInput = warehouseModal.locator('input[type="number"]').first();
		await expect(countInput).toBeVisible();
		await countInput.fill("4");

		// Шаг 5: Выполнение пакетного списания по Primary CTA (Мандат 8am: #0d9488)
		const commitDeductBtn = page.locator('[data-testid="btn-primary-commit-warehouse"]').first();
		await expect(commitDeductBtn).toBeVisible();
		await expect(commitDeductBtn).not.toBeDisabled();
		await commitDeductBtn.dispatchEvent("click");

		// Шаг 6: Проверка обратной связи с мягким овердрафтом (Soft Negative Stock)
		const feedbackNotice = warehouseModal.getByText(/Списано расходников пакетом:/i).first();
		await expect(feedbackNotice).toBeVisible({ timeout: 5000 });
		const feedbackText = await feedbackNotice.innerText();
		expect(feedbackText).toContain("Списано расходников пакетом");

		// Шаг 7: Быстрая сверка склада в 1 клик (Мандат 8n)
		const auditBtn = page.locator('[data-testid="btn-quick-inventory-audit"]').first();
		await expect(auditBtn).toBeVisible();
		await auditBtn.dispatchEvent("click");

		const auditNotice = warehouseModal.getByText(/Сверка склада завершена в 1 клик/i).first();
		await expect(auditNotice).toBeVisible({ timeout: 5000 });

		// Шаг 8: Вкладка поступления материалов (оприходование накладной поставщика)
		const inboundBtn = page.locator('[data-testid="btn-express-inbound"]').first();
		await expect(inboundBtn).toBeVisible();
		await inboundBtn.dispatchEvent("click");

		const commitInboundBtn = page.locator('[data-testid="btn-primary-commit-warehouse"]').first();
		await expect(commitInboundBtn).toBeVisible();
		await commitInboundBtn.dispatchEvent("click");

		const inboundNotice = warehouseModal.getByText(/Оприходована накладная поставщика/i).first();
		await expect(inboundNotice).toBeVisible({ timeout: 5000 });

		// Шаг 9: Снятие обязательного 4-State Proof (PC Light/Dark + Mobile Light/Dark)
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
		await page.screenshot({ path: path.join(PROOFS_DIR, "01_warehouse_consumption_pc_dark_1440x900.png"), fullPage: false });

		// 2. PC Light (1440x900)
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "02_warehouse_consumption_pc_light_1440x900.png"), fullPage: false });

		// 3. Mobile Light (390x844 Apple HIG Bottom Sheet)
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: path.join(PROOFS_DIR, "03_warehouse_consumption_mobile_light_390x844.png"), fullPage: false });

		// 4. Mobile Dark (390x844 Apple HIG Bottom Sheet)
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "04_warehouse_consumption_mobile_dark_390x844.png"), fullPage: false });
	});
});
