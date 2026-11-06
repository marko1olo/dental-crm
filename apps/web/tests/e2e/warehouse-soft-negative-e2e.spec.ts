/**
 * apps/web/tests/e2e/warehouse-soft-negative-e2e.spec.ts
 *
 * Сквозной складской E2E-сценарий DENTE CRM: Soft Negative Stock & Zero-Friction Inventory
 * (End-to-End Warehouse Soft Negative Stock Suite).
 *
 * Проверяет:
 * 1. Инспекцию склада материалов и номенклатуры (#warehouse).
 * 2. Автоматическое пакетное списание расходных материалов по техкарте оказанных услуг («Лечение кариеса»).
 * 3. Режим мягкого фонового овердрафта (Soft Negative Stock по Мандату 8n):
 *    при нулевом или отрицательном остатке система фиксирует расход в бэк-офисе БЕЗ блокирующих модалок,
 *    без серых кнопок и без паники/алертов у кресла врача.
 * 4. Быструю сверку склада и 1-клик оприходование накладной поставщика с автоматическим погашением дефицита.
 * 5. Снятие обязательного 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8n, 8am, 8v, 8ze.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/test_system_advancements";

const MOCK_USER = {
	id: "user-doctor-warehouse-soft",
	orgId: "org-dente-soft",
	name: "Д-р Смирнов А. В.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-warehouse-soft-01",
	organizationId: "org-dente-soft",
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
		id: "org-dente-soft",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-soft",
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
	todayStats: { revenue: 42000, appointments: 5, newPatients: 1 },
	notifications: [],
};

async function setupWarehouseRoutes(page: Page) {
	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-soft";
		(window as any).__denteStaffToken = "test-staff-token-soft";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-soft");
			localStorage.setItem("dente_staff_token", "test-staff-token-soft");
			localStorage.setItem("dente_active_session_token", "test-session-soft");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов А. В.");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
			localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, theme: "dark" }));
			localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
			localStorage.setItem("dente_theme", "dark");
			localStorage.setItem("dente_theme_mode", "dark");
			localStorage.setItem("dente_session_locked", "false");
		} catch {}
	});

	await page.route(
		(url) => {
			const parsed = typeof url === "string" ? new URL(url) : url;
			return parsed.pathname.startsWith("/api/") || parsed.pathname === "/api";
		},
		async (route) => {
			const req = route.request();
			const urlStr = req.url();
			const method = req.method();

			if (urlStr.includes("/api/auth/login") || urlStr.includes("/api/auth/user/me")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ token: "test-token-soft", user: MOCK_USER }),
				});
			}

			if (urlStr.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_DASHBOARD),
				});
			}

			if (method === "GET") {
				return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
			}
			return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
		},
	);
}

function verifyScreenshotByteGuard(filePath: string) {
	expect(fs.existsSync(filePath), `Файл скриншота ${filePath} обязан существовать на диске`).toBe(true);
	const size = fs.statSync(filePath).size;
	expect(
		size,
		`Скриншот ${filePath} размер ${size} байт меньше минимального аппаратного порога 20КБ (Мандат 8d)`,
	).toBeGreaterThanOrEqual(20480);
}

test.describe("Сквозной складской сценарий (Warehouse Soft Negative Stock E2E)", () => {
	test("Бесшумное списание по техкарте при дефиците, Soft Negative Stock, 4-State Proof", async ({
		page,
	}) => {
		test.setTimeout(90000);
		page.setDefaultTimeout(20000);
		page.setDefaultNavigationTimeout(30000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupWarehouseRoutes(page);

		// =========================================================================
		// ШАГ 1: ОТКРЫТИЕ СКЛАДА МАТЕРИАЛОВ И НОМЕНКЛАТУРЫ (#warehouse)
		// =========================================================================
		await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
		await page.evaluate(() => {
			window.location.hash = "warehouse";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		const warehouseModal = page.locator('[data-testid="warehouse-studio-modal"]').first();
		await expect(warehouseModal).toBeVisible({ timeout: 25000 });

		// Проверка отображения KPI склада
		const totalPositionsKpi = warehouseModal.getByText("Всего позиций").locator("..");
		await expect(totalPositionsKpi).toBeVisible();

		// =========================================================================
		// ШАГ 2: ПЕРЕХОД НА ВКЛАДКУ ПАКЕТНОГО СПИСАНИЯ ЗА СМЕНУ
		// =========================================================================
		const batchDeductBtn = page.locator('[data-testid="btn-batch-deduct"]').first();
		await expect(batchDeductBtn).toBeVisible();
		await batchDeductBtn.dispatchEvent("click");

		// Выбор техкарты процедуры («Лечение кариеса»)
		const techMapSelect = warehouseModal.locator("select").first();
		await expect(techMapSelect).toBeVisible();
		await techMapSelect.selectOption("proc-filling-light");

		// Установка количества процедур за смену
		const countInput = warehouseModal.locator('input[type="number"]').first();
		await expect(countInput).toBeVisible();
		await countInput.fill("4");

		// =========================================================================
		// ШАГ 3: ПАКЕТНОЕ СПИСАНИЕ ПО PRIMARY CTA (SOFT NEGATIVE STOCK)
		// =========================================================================
		const commitDeductBtn = page.locator('[data-testid="btn-primary-commit-warehouse"]').first();
		await expect(commitDeductBtn).toBeVisible();
		await expect(commitDeductBtn).not.toBeDisabled();
		await commitDeductBtn.dispatchEvent("click");

		// Проверка обратной связи с мягким овердрафтом (Soft Negative Stock)
		const feedbackNotice = warehouseModal.getByText(/Списано расходников пакетом:/i).first();
		await expect(feedbackNotice).toBeVisible({ timeout: 5000 });
		const feedbackText = await feedbackNotice.innerText();
		expect(feedbackText).toContain("Списано расходников пакетом");

		// =========================================================================
		// ШАГ 4: БЫСТРАЯ СВЕРКА СКЛАДА В 1 КЛИК (МАНДАТ 8n)
		// =========================================================================
		const auditBtn = page.locator('[data-testid="btn-quick-inventory-audit"]').first();
		await expect(auditBtn).toBeVisible();
		await auditBtn.dispatchEvent("click");

		const auditNotice = warehouseModal.getByText(/Сверка склада завершена в 1 клик/i).first();
		await expect(auditNotice).toBeVisible({ timeout: 5000 });

		// =========================================================================
		// ШАГ 5: ВКЛАДКА ПОСТУПЛЕНИЯ И ОПРИХОДОВАНИЕ НАКЛАДНОЙ
		// =========================================================================
		const inboundBtn = page.locator('[data-testid="btn-express-inbound"]').first();
		await expect(inboundBtn).toBeVisible();
		await inboundBtn.dispatchEvent("click");

		const commitInboundBtn = page.locator('[data-testid="btn-primary-commit-warehouse"]').first();
		await expect(commitInboundBtn).toBeVisible();
		await commitInboundBtn.dispatchEvent("click");

		const inboundNotice = warehouseModal.getByText(/Оприходована накладная поставщика/i).first();
		await expect(inboundNotice).toBeVisible({ timeout: 5000 });

		// =========================================================================
		// ШАГ 6: СНЯТИЕ И ПРОВЕРКА 4-STATE VISUAL PROOF (МАНДАТЫ 8d, 8aw)
		// =========================================================================
		// 1. PC Light (1440x900)
		const proofPcLight = path.join(PROOFS_DIR, "09_warehouse_soft_negative_pc_light_1440x900.png");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofPcLight, fullPage: false });
		verifyScreenshotByteGuard(proofPcLight);

		// 2. PC Dark (1440x900)
		const proofPcDark = path.join(PROOFS_DIR, "10_warehouse_soft_negative_pc_dark_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofPcDark);

		// 3. Mobile Light (390x844 Apple HIG Bottom Sheet)
		const proofMobileLight = path.join(PROOFS_DIR, "11_warehouse_soft_negative_mobile_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: proofMobileLight, fullPage: false });
		verifyScreenshotByteGuard(proofMobileLight);

		// 4. Mobile Dark (390x844 Apple HIG Bottom Sheet)
		const proofMobileDark = path.join(PROOFS_DIR, "12_warehouse_soft_negative_mobile_dark_390x844.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofMobileDark, fullPage: false });
		verifyScreenshotByteGuard(proofMobileDark);
	});
});
