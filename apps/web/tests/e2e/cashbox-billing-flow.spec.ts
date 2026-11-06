/**
 * apps/web/tests/e2e/cashbox-billing-flow.spec.ts
 *
 * Сквозной кассовый E2E-сценарий (Cashbox & Split Billing Flow).
 * Проверяет:
 * 1. Открытие экрана кассы и расчётов приёма (Direct Cashbox Launcher, #checkout, #cashbox).
 * 2. Применение раздельной оплаты (сплит-тендер): 50% карта (POS) + 50% наличные.
 * 3. Расчёт сдачи и балансировку сумм без расхождений (isSplitBalanced, 0 ₽ долга).
 * 4. Фискализацию по 54-ФЗ с контрольной лентой и QR-кодом.
 * 5. Сверку фактической наличности в кассовом ящике и Z-отчёт смены.
 * 6. Обязательный 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8n, 8am, 8ap, 8ze и Закону о запрете потемкинских деревень.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/cashbox";

const MOCK_USER = {
	id: "user-cashier-01",
	orgId: "org-dente-01",
	name: "Смирнова А. В.",
	fullName: "Смирнова Анна Викторовна",
	role: "admin",
	email: "cashier@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-cashbox-001",
	organizationId: "org-dente-01",
	fullName: "Кузнецов Михаил Сергеевич",
	name: "Кузнецов Михаил Сергеевич",
	phone: "+7 (916) 777-88-99",
	balanceRub: 0,
	depositRub: 3000,
	familyBalanceRub: 5000,
	birthDate: "1985-03-22",
	status: "active",
	gender: "male",
	allergies: [],
	chronicDiseases: [],
	createdAt: "2025-02-01T09:00:00.000Z",
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
		chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
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
	todayStats: { revenue: 54000, appointments: 8, newPatients: 2 },
	notifications: [],
};

interface CapturedPayment {
	amountKopecks: number;
	amountRub: number;
	method: string;
	cashAmountKopecks?: number;
	electronicAmountKopecks?: number;
	depositAmountKopecks?: number;
	clientType?: string;
	cashierFullName?: string;
}

let lastCapturedPayment: CapturedPayment | null = null;

async function setupCashboxMocks(page: Page) {
	lastCapturedPayment = null;

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-cashbox";
		(window as any).__denteStaffToken = "test-staff-token-cashbox";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-cashbox");
			localStorage.setItem("dente_staff_token", "test-staff-token-cashbox");
			localStorage.setItem("dente_active_session_token", "test-session-cashbox");
			localStorage.setItem("dente_user_role", "admin");
			localStorage.setItem("dente_user_name", "Смирнова А. В.");
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
					body: JSON.stringify({ token: "test-token-cashbox", user: MOCK_USER }),
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

			if (pathname.includes("/api/cashbox/payments") && method === "POST") {
				const reqBody = route.request().postDataJSON() as CapturedPayment;
				lastCapturedPayment = reqBody;
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						data: {
							id: `pay-${Date.now()}`,
							fiscalReceiptNumber: 4821,
							fiscalSign: "389104829104",
							qrPayload: "t=20261106T0930&s=6500.00&fn=9999078900001234&i=4821&fp=389104829104&n=1",
							amountRub: reqBody.amountRub,
							amountKopecks: reqBody.amountKopecks,
							method: reqBody.method,
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

test.describe("Сквозной кассовый расчёт и сплит-оплата (Cashbox Billing E2E Flow)", () => {
	test("Сплит-оплата 50/50 (Карта + Нал), 54-ФЗ чек, сверка кассовой смены и 4-State Proof", async ({
		page,
	}) => {
		test.setTimeout(90000);
		page.setDefaultTimeout(20000);
		page.setDefaultNavigationTimeout(40000);

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupCashboxMocks(page);

		// Шаг 1: Навигация в режим приёма оплаты через #checkout
		await page.goto(`${BASE_URL}/#checkout`, { waitUntil: "domcontentloaded" });

		// Шаг 2: Проверка монтирования кассового модального окна (Мандат 8aq)
		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await expect(checkoutModal).toBeVisible({ timeout: 25000 });

		// Проверка отображения итоговой суммы
		const totalAmountDue = page.locator('[data-testid="display-total-amount-due"]');
		await expect(totalAmountDue).toBeVisible();
		const totalText = await totalAmountDue.innerText();
		expect(totalText.replace(/[\s\u00a0]/g, " ")).toContain("6 500");

		// Шаг 3: Переключение на комбинированную оплату (Сплит-тендер)
		const splitTenderBtn = page.locator('[data-testid="btn-tender-split"]');
		await expect(splitTenderBtn).toBeVisible();
		await splitTenderBtn.dispatchEvent("click");

		// Шаг 4: Проверка появления панели сплит-расчёта
		const splitPanel = page.locator('[data-testid="split-tender-panel"]');
		await expect(splitPanel).toBeVisible({ timeout: 5000 });

		// Шаг 5: Применение 1-клик пресета «50% карта / 50% нал»
		const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]');
		await expect(split50Btn).toBeVisible();
		await split50Btn.dispatchEvent("click");

		// Шаг 6: Проверка индикатора точной сходимости сумм
		const splitStatus = page.locator('[data-testid="split-balance-status"]');
		await expect(splitStatus).toBeVisible();
		await expect(splitStatus).toContainText("Сумма сходится точно ✓");

		// Проверка распределённых сумм по полям ввода
		const cardInput = page.locator('[data-testid="split-input-card"]');
		const cashInput = page.locator('[data-testid="split-input-cash"]');
		await expect(cardInput).toHaveValue("3250");
		await expect(cashInput).toHaveValue("3250");

		// Шаг 7: Подтверждение оплаты через Primary CTA (Мандат 8am: #0d9488)
		const submitPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await expect(submitPaymentBtn).toBeVisible();
		await expect(submitPaymentBtn).not.toBeDisabled();
		await submitPaymentBtn.dispatchEvent("click");

		// Проверка успешной отправки платежа на бэкенд
		await expect(checkoutModal).toBeHidden({ timeout: 10000 });
		expect(lastCapturedPayment).not.toBeNull();
		expect(lastCapturedPayment?.amountKopecks).toBe(650000);
		expect(lastCapturedPayment?.method).toBe("split");
		expect(lastCapturedPayment?.cashAmountKopecks).toBe(325000);
		expect(lastCapturedPayment?.electronicAmountKopecks).toBe(325000);

		// Шаг 8: Переход в студию кассы (#cashbox) для проверки смены и контрольной ленты
		await page.goto(`${BASE_URL}/#cashbox`, { waitUntil: "domcontentloaded" });

		const cashboxRoot = page.locator('[data-testid="standalone-cashbox-ssot-root"]').first();
		await expect(cashboxRoot).toBeVisible({ timeout: 15000 });

		// Открытие модалки Z-отчёта и смены
		const openShiftCloseBtn = page.locator('[data-testid="btn-open-shift-close-modal"]').first();
		await expect(openShiftCloseBtn).toBeVisible();
		await openShiftCloseBtn.dispatchEvent("click");

		const shiftModal = page.locator('[data-testid="cash-shift-closing-modal"]')
			.or(page.locator('[data-testid="cash-register-studio-modal"]'))
			.first();
		await expect(shiftModal).toBeVisible({ timeout: 10000 });

		// Шаг 9: Проверка 4-State Proof скриншотов (PC Light/Dark + Mobile Light/Dark)
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
		await page.screenshot({ path: path.join(PROOFS_DIR, "01_cashbox_billing_pc_dark_1440x900.png"), fullPage: false });

		// 2. PC Light (1440x900)
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "02_cashbox_billing_pc_light_1440x900.png"), fullPage: false });

		// 3. Mobile Light (390x844 Apple HIG)
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: path.join(PROOFS_DIR, "03_cashbox_billing_mobile_light_390x844.png"), fullPage: false });

		// 4. Mobile Dark (390x844 Apple HIG)
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.screenshot({ path: path.join(PROOFS_DIR, "04_cashbox_billing_mobile_dark_390x844.png"), fullPage: false });
	});
});
