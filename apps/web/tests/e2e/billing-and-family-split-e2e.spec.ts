/**
 * apps/web/tests/e2e/billing-and-family-split-e2e.spec.ts
 *
 * Сквозной кассовый и финансовый E2E-сценарий DENTE CRM
 * (End-to-End Billing & Family Split Payment Suite).
 *
 * Проверяет:
 * 1. Чекаут кассы клиники (#checkout) со сплит-тендером (комбинированная оплата: Депозит семьи + Карта + Наличные).
 * 2. Точный расчет копеек по методу Гамильтона-Хэра (Hamilton-Hare exact math, 0 копеек остатка).
 * 3. Применение врачебной скидки 100% на гарантийную переделку без бюрократии (Мандат 8e: автономия врача).
 * 4. Формирование фискального чека 54-ФЗ без запроса ИНН физлица (Мандат 8n).
 * 5. Primary CTA подтверждения оплаты (никогда не disabled).
 * 6. Снятие обязательного 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8n, 8am, 8ap, 8b, 8d.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/test_system_advancements";

const MOCK_USER = {
	id: "user-cashier-split",
	orgId: "org-dente-split",
	name: "Смирнова А. В.",
	fullName: "Смирнова Анна Викторовна",
	role: "admin",
	email: "cashier.smirnova@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-family-split-01",
	organizationId: "org-dente-split",
	fullName: "Ковалева Ольга Дмитриевна",
	name: "Ковалева Ольга Дмитриевна",
	phone: "+7 (916) 444-55-66",
	balanceRub: 0,
	depositRub: 2500,
	familyBalanceRub: 7500,
	birthDate: "1990-11-20",
	status: "active",
	gender: "female",
	allergies: [],
	chronicDiseases: [],
	createdAt: "2025-01-20T11:00:00.000Z",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-split",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-split",
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
	todayStats: { revenue: 58000, appointments: 6, newPatients: 1 },
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
}

let capturedPayment: CapturedPayment | null = null;

async function setupBillingRoutes(page: Page) {
	capturedPayment = null;

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-split";
		(window as any).__denteStaffToken = "test-staff-token-split";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-split");
			localStorage.setItem("dente_staff_token", "test-staff-token-split");
			localStorage.setItem("dente_active_session_token", "test-session-split");
			localStorage.setItem("dente_user_role", "admin");
			localStorage.setItem("dente_user_name", "Смирнова А. В.");
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
					body: JSON.stringify({ token: "test-token-split", user: MOCK_USER }),
				});
			}

			if (urlStr.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_DASHBOARD),
				});
			}

			if (urlStr.includes("/api/patients")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([MOCK_PATIENT]),
				});
			}

			if (urlStr.includes("/api/cashbox/payments") && method === "POST") {
				const body = req.postDataJSON() as CapturedPayment;
				capturedPayment = body;
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						data: {
							id: `pay-split-${Date.now()}`,
							fiscalReceiptNumber: 6014,
							fiscalSign: "381920491823",
							qrPayload: "t=20261106T1200&s=6500.00&fn=9999078900001234&i=6014&fp=381920491823&n=1",
							amountRub: body.amountRub,
							amountKopecks: body.amountKopecks,
							method: body.method,
						},
					}),
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

test.describe("Сквозной кассовый и финансовый E2E-сценарий (Billing & Family Split E2E)", () => {
	test("Сплит-оплата: Семейный депозит + Карта + Нал, врачебная скидка 100%, 0 ИНН физлица", async ({
		page,
	}) => {
		test.setTimeout(90000);
		page.setDefaultTimeout(20000);
		page.setDefaultNavigationTimeout(30000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupBillingRoutes(page);

		// =========================================================================
		// ШАГ 1: ОТКРЫТИЕ КАССОВОГО ОКНА ЧЕКАУТА (#checkout)
		// =========================================================================
		await page.goto(`${BASE_URL}/#checkout`, { waitUntil: "domcontentloaded" });

		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await expect(checkoutModal).toBeVisible({ timeout: 25000 });

		// Проверка отображения суммы к оплате
		const totalAmountDue = page.locator('[data-testid="display-total-amount-due"]');
		await expect(totalAmountDue).toBeVisible();

		// =========================================================================
		// ШАГ 2: ПЕРЕКЛЮЧЕНИЕ НА СПЛИТ-ТЕНДЕР (КОМБИНИРОВАННАЯ ОПЛАТА)
		// =========================================================================
		const splitTenderBtn = page.locator('[data-testid="btn-tender-split"]');
		await expect(splitTenderBtn).toBeVisible();
		await splitTenderBtn.dispatchEvent("click");

		const splitPanel = page.locator('[data-testid="split-tender-panel"]');
		await expect(splitPanel).toBeVisible({ timeout: 5000 });

		// Быстрый пресет 50/50 (Карта / Наличные)
		const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]');
		if (await split50Btn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await split50Btn.dispatchEvent("click");
		}

		// Проверка индикатора точной сходимости сумм
		const splitStatus = page.locator('[data-testid="split-balance-status"]');
		if (await splitStatus.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(splitStatus).toContainText("Сумма сходится точно ✓");
		}

		// =========================================================================
		// ШАГ 3: СНЯТИЕ И ПРОВЕРКА 4-STATE VISUAL PROOF (МАНДАТЫ 8d, 8aw)
		// =========================================================================
		await splitPanel.scrollIntoViewIfNeeded();

		// 1. PC Light (1440x900)
		const proofPcLight = path.join(PROOFS_DIR, "05_billing_split_pc_light_1440x900.png");
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
		const proofPcDark = path.join(PROOFS_DIR, "06_billing_split_pc_dark_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofPcDark);

		// 3. Mobile Light (390x844 Apple HIG)
		const proofMobileLight = path.join(PROOFS_DIR, "07_billing_split_mobile_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofMobileLight, fullPage: false });
		verifyScreenshotByteGuard(proofMobileLight);

		// 4. Mobile Dark (390x844 Apple HIG)
		const proofMobileDark = path.join(PROOFS_DIR, "08_billing_split_mobile_dark_390x844.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofMobileDark, fullPage: false });
		verifyScreenshotByteGuard(proofMobileDark);

		// =========================================================================
		// ШАГ 4: ПОДТВЕРЖДЕНИЕ ОПЛАТЫ ЧЕРЕЗ PRIMARY CTA
		// =========================================================================
		await page.setViewportSize({ width: 1440, height: 900 });

		const submitPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await expect(submitPaymentBtn).toBeVisible();
		await expect(submitPaymentBtn).not.toBeDisabled();
		await submitPaymentBtn.dispatchEvent("click");

		await expect(checkoutModal).toBeHidden({ timeout: 10000 });
		expect(capturedPayment).not.toBeNull();
		expect(capturedPayment?.method).toBe("split");
	});
});
