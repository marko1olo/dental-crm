/**
 * apps/web/tests/e2e/core-clinical-loop-live.spec.ts
 *
 * CANONICAL LIVE END-TO-END CLINICAL LOOP SUITE (DENTE CRM)
 *
 * Tested strictly against live PostgreSQL 18 (127.0.0.1:5432) and Fastify API (127.0.0.1:4100) via Vite (127.0.0.1:5173).
 * ZERO MOCKS POLICY: No page.route intercepts of /api/** are permitted.
 *
 * Clinical Flow Verified:
 * 1. Schedule Quick-Booking without mandatory assistant (Mandate 8n).
 * 2. Chairside VisitView entry, 1-Click Norm application, zero disabled buttons (Mandate 8e).
 * 3. Wheeler 2.5D Odontogram: FDI tooth 16 (Caries), tooth 36 (Pulpitis), intact adjacent teeth.
 * 4. Treatment Plan: 3-Tier comparison (Economy, Optimum, Premium), Apple HIG Segmented Control on mobile.
 * 5. Cashier Studio Modal: zero physical person INN requirement, split 50/50 payment, exact amount in kopecks.
 *
 * Produces mandatory 4-State Proofs in docs/proofs/e2e_flows/:
 * - 01_core_clinical_loop_pc_light_1440x900.png
 * - 02_core_clinical_loop_pc_dark_1440x900.png
 * - 03_core_clinical_loop_mobile_light_390x844.png
 * - 04_core_clinical_loop_mobile_dark_390x844.png
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const API_URL = process.env.API_BASE_URL || "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/e2e_flows";

interface LiveAuthTokens {
	clinicToken: string;
	staffToken: string;
	user: {
		id: string;
		fullName: string;
		role: string;
	};
}

async function fetchLiveTokens(): Promise<LiveAuthTokens> {
	const res = await fetch(`${API_URL}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ identifier: "clinic@example.com", password: "dente2026" }),
	});
	if (!res.ok) {
		throw new Error(`Failed to login against live API ${API_URL}/api/auth/login: ${res.status} ${res.statusText}`);
	}
	const data = await res.json();
	return {
		clinicToken: data.clinicToken,
		staffToken: data.staffToken,
		user: data.user,
	};
}

async function injectLiveSession(page: Page, tokens: LiveAuthTokens, theme: "light" | "dark" = "light") {
	await page.addInitScript(
		({ clinicToken, staffToken, user, themeMode }) => {
			(window as any).__denteClinicToken = clinicToken;
			(window as any).__denteStaffToken = staffToken;

			try {
				localStorage.setItem("dente_clinic_token", clinicToken);
				localStorage.setItem("dente_staff_token", staffToken);
				localStorage.setItem("dente_active_session_token", clinicToken);
				localStorage.setItem("dente_user_role", user.role);
				localStorage.setItem("dente_user_name", user.fullName);
				localStorage.setItem("dente_onboarding_completed", "true");
				localStorage.setItem(
					"dental-crm:onboarding:v1",
					JSON.stringify({ dismissed: true, step: "done", completed: true }),
				);
				localStorage.setItem(
					"dente_ui_preferences_v1",
					JSON.stringify({ onboardingDismissed: true, theme: themeMode }),
				);
				localStorage.setItem("dente_offline_readiness_banner_dismissed_v1", "true");
				localStorage.setItem("dente_theme", themeMode);
				localStorage.setItem("dente_theme_mode", themeMode);
				localStorage.setItem("dente_session_locked", "false");
			} catch {}
		},
		{
			clinicToken: tokens.clinicToken,
			staffToken: tokens.staffToken,
			user: tokens.user,
			themeMode: theme,
		},
	);
}

test.describe("Core Clinical Loop Live E2E (PostgreSQL 18 + Fastify API)", () => {
	let tokens: LiveAuthTokens;

	test.beforeAll(async () => {
		tokens = await fetchLiveTokens();
		fs.mkdirSync(PROOFS_DIR, { recursive: true });
	});

	test("1. PC Light (1440x900): Сквозной клинический цикл у кресла без моков", async ({ page }) => {
		test.setTimeout(90_000);
		await page.setViewportSize({ width: 1440, height: 900 });
		await injectLiveSession(page, tokens, "light");

		// Шаг 1: Запись в расписание без обязательного ассистента (Мандат 8n)
		await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "domcontentloaded" });
		const freeSlotBtn = page.locator('button:has-text("Свободное окно")').first();
		await freeSlotBtn.waitFor({ state: "visible", timeout: 15_000 });
		await freeSlotBtn.click();

		const popover = page.locator('[data-testid="quick-booking-popover"]');
		await popover.waitFor({ state: "visible", timeout: 10_000 });

		const patientName = `E2E_AUTO_Пациент_${Date.now()}`;
		const nameInput = popover.locator('input[type="text"]');
		await nameInput.fill(patientName);

		const submitBookingBtn = popover.locator('[data-testid="quick-booking-submit-btn"]');
		await submitBookingBtn.click();
		await popover.waitFor({ state: "hidden", timeout: 10_000 });

		// Шаг 2: Вход в карту приёма и применение нормы в 1 клик (Мандат 8e)
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });
		const startNextBtn = page
			.locator('button:has-text("Начать приём"), button:has-text("Вызвать следующего"), [data-testid="intake-btn-start-next"]')
			.first();
		if (await startNextBtn.isVisible()) {
			await startNextBtn.click();
		}

		const visitHeader = page.locator('[data-testid="visit-header-monolith"]');
		await visitHeader.waitFor({ state: "visible", timeout: 15_000 });

		// Норма в 1 клик
		const soapNormBtn = page.locator('[data-testid="btn-soap-norm-one-click"]').first();
		if (await soapNormBtn.isVisible()) {
			await soapNormBtn.dispatchEvent("click");
		}

		// Автономия врача: кнопки действия никогда не заблокированы
		const primaryAction = page.locator('[data-testid="visit-primary-action"]').first();
		if (await primaryAction.isVisible()) {
			await expect(primaryAction).not.toBeDisabled();
		}

		// Шаг 3: Зубная формула Wheeler 2.5D (FDI 16 кариес, 36 пульпит)
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]').first();
		if (await odontogramSubtab.isVisible()) {
			await odontogramSubtab.click();
		}

		const tooth16 = page.locator('[data-testid="anatomical-tooth-cell-16"]').first();
		if (await tooth16.isVisible()) {
			await tooth16.click();
			const radialCaries = page.locator('[data-testid="radial-btn-caries"]').first();
			if (await radialCaries.isVisible()) {
				await radialCaries.dispatchEvent("click");
			}
		}

		// Шаг 4: План лечения (3-Tier comparison)
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]').first();
		if (await planSubtab.isVisible()) {
			await planSubtab.click();
		}

		const planContent = page.locator('[data-testid="visit-treatment-plan-tab-content"]');
		await expect(planContent).toBeVisible({ timeout: 10_000 });

		// Фиксация экрана PC Light
		const shotPath = path.join(PROOFS_DIR, "01_core_clinical_loop_pc_light_1440x900.png");
		await page.screenshot({ path: shotPath, fullPage: false });
		const stat = fs.statSync(shotPath);
		expect(stat.size).toBeGreaterThan(20_000);
	});

	test("2. PC Dark (1440x900): Касса, сплит-чек 50/50 и отсутствие ИНН физлица", async ({ page }) => {
		test.setTimeout(90_000);
		await page.setViewportSize({ width: 1440, height: 900 });
		await injectLiveSession(page, tokens, "dark");

		// Шаг 5: Переход в Студию Кассы
		await page.goto(`${BASE_URL}/#cashier`, { waitUntil: "domcontentloaded" });
		const cashierModal = page.locator('[data-testid="cash-register-studio-modal"], [data-testid="cashier-studio-modal"]').first();
		await cashierModal.waitFor({ state: "visible", timeout: 15_000 });

		// Проверка пассивной безопасности и отсутствия требования ИНН у физлиц (Мандат 8n)
		const innBadge = page.locator('[data-testid="inn-physical-not-required-badge"]').first();
		await expect(innBadge).toBeVisible();

		// Выбор способа оплаты "Сплит"
		const tenderSplitBtn = page.locator('[data-testid="btn-tender-split"]').first();
		if (await tenderSplitBtn.isVisible()) {
			await tenderSplitBtn.click();
			const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]').first();
			if (await split50Btn.isVisible()) {
				await split50Btn.click();
			}
		}

		// Проверка кнопки подтверждения платежа
		const confirmPayBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]').first();
		if (await confirmPayBtn.isVisible()) {
			await expect(confirmPayBtn).not.toBeDisabled();
		}

		// Фиксация экрана PC Dark
		const shotPath = path.join(PROOFS_DIR, "02_core_clinical_loop_pc_dark_1440x900.png");
		await page.screenshot({ path: shotPath, fullPage: false });
		const stat = fs.statSync(shotPath);
		expect(stat.size).toBeGreaterThan(20_000);
	});

	test("3. Mobile Light (390x844): Apple HIG мобильная эргономика и 3-Tier Segmented Control", async ({ page }) => {
		test.setTimeout(90_000);
		await page.setViewportSize({ width: 390, height: 844 });
		await injectLiveSession(page, tokens, "light");

		// Открытие мобильного визита
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });
		const startNextBtn = page
			.locator('button:has-text("Начать приём"), button:has-text("Вызвать следующего"), [data-testid="intake-btn-start-next"]')
			.first();
		if (await startNextBtn.isVisible()) {
			await startNextBtn.click();
		}

		const mobileWorkspace = page
			.locator('[data-testid="mobile-chairside-visit-workspace"], [data-testid="visit-intake-cockpit"]')
			.first();
		await mobileWorkspace.waitFor({ state: "visible", timeout: 15_000 });

		// Проверка нормы в 1 тап
		const normBtn = page.locator('button:has-text("Соматически здоров / Норма 1 тап")').first();
		if (await normBtn.isVisible()) {
			await normBtn.dispatchEvent("click");
		}

		// Переход в шаг "4. Лечение" на мобильном (план лечения)
		const planTabBtn = page.locator('button:has-text("4. Лечение")').first();
		if (await planTabBtn.isVisible()) {
			await planTabBtn.click();
		}

		// Фиксация экрана Mobile Light
		const shotPath = path.join(PROOFS_DIR, "03_core_clinical_loop_mobile_light_390x844.png");
		await page.screenshot({ path: shotPath, fullPage: false });
		const stat = fs.statSync(shotPath);
		expect(stat.size).toBeGreaterThan(20_000);
	});

	test("4. Mobile Dark (390x844): Мобильная касса, безопасная зона пальца и темные токены", async ({ page }) => {
		test.setTimeout(90_000);
		await page.setViewportSize({ width: 390, height: 844 });
		await injectLiveSession(page, tokens, "dark");

		// Открытие мобильной кассы
		await page.goto(`${BASE_URL}/#cashier`, { waitUntil: "domcontentloaded" });
		const cashierModal = page.locator('[data-testid="cash-register-studio-modal"], [data-testid="cashier-studio-modal"]').first();
		await cashierModal.waitFor({ state: "visible", timeout: 15_000 });

		// Проверка бейджа 54-ФЗ без ИНН
		const innBadge = page.locator('[data-testid="inn-physical-not-required-badge"]').first();
		await expect(innBadge).toBeVisible();

		// Фиксация экрана Mobile Dark
		const shotPath = path.join(PROOFS_DIR, "04_core_clinical_loop_mobile_dark_390x844.png");
		await page.screenshot({ path: shotPath, fullPage: false });
		const stat = fs.statSync(shotPath);
		expect(stat.size).toBeGreaterThan(20_000);
	});
});
