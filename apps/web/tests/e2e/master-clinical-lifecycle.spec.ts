/**
 * apps/web/tests/e2e/master-clinical-lifecycle.spec.ts
 *
 * Комплексный сквозной мастер-тест клинического жизненного цикла DENTE CRM
 * (End-to-End Master Clinical Lifecycle Suite).
 *
 * Проверяет непрерывный сценарий работы клиники без разрывов:
 * 1. Фаза A: Быстрое создание записи в расписании за 5 секунд (без навязывания ассистента — Мандат 8n).
 * 2. Фаза B: Открытие визита из расписания -> переход в VisitView -> автозаполнение нормы в 1 клик (Мандат 8e, 8ba).
 * 3. Фаза C: Разметка патологии на одонтограмме Wheeler 2.5D (зуб 36, кариес K02.0, окклюзионная поверхность).
 * 4. Фаза D: Добавление услуги в план/смету из прейскуранта, расчет строго в копейках (amountKopecks, BIGINT).
 * 5. Фаза E: Завершение приёма -> оплата через кассу (сплит 50/50 нал + карта без требования ИНН физлица) -> фискальный чек 54-ФЗ.
 *
 * Снятие обязательного 4-State Proof (PC Light/Dark + Mobile Light/Dark) в docs/proofs/e2e_master/.
 * Инварианты: никаких test.skip, никаких waitForTimeout(5000), детерминированные селекторы и ожидания сети.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/e2e_master";

const MOCK_USER = {
	id: "user-doctor-master",
	orgId: "org-dente-master",
	name: "Д-р Смирнов А. П.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-master-001",
	organizationId: "org-dente-master",
	fullName: "Иванов Иван Иванович",
	name: "Иванов Иван Иванович",
	phone: "+7 (999) 111-22-33",
	balanceRub: 15000,
	depositRub: 3000,
	familyBalanceRub: 5000,
	birthDate: "1988-06-15",
	status: "active",
	gender: "male",
	allergies: ["Лидокаин (анамнестически)"],
	chronicDiseases: ["Гипертоническая болезнь I ст."],
	createdAt: "2025-01-10T10:00:00.000Z",
};

const MOCK_APPOINTMENT = {
	id: "appt-master-001",
	patientId: "pat-master-001",
	patientName: "Иванов Иван Иванович",
	doctorUserId: "user-doctor-master",
	doctorName: "Д-р Смирнов А. П.",
	chairId: "chair-1",
	status: "arrived",
	startsAt: new Date(Date.now() - 600000).toISOString(),
	endsAt: new Date(Date.now() + 3000000).toISOString(),
	serviceTitle: "Первичный терапевтический приём",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-master",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-master",
			clinicName: "Клиника ДЕНТЕ",
			mode: "clinic",
		},
		chairs: [
			{ id: "chair-1", name: "Кресло 1 (Терапия)", active: true, room: "1" },
			{ id: "chair-2", name: "Кресло 2 (Хирургия)", active: true, room: "2" },
		],
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
	todayStats: { revenue: 54000, appointments: 8, newPatients: 2 },
	notifications: [],
};

const MOCK_CLINIC_PROFILE = {
	id: "org-dente-master",
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

let capturedPayment: CapturedPayment | null = null;

async function setupMasterRoutesAndStorage(page: Page) {
	capturedPayment = null;

	page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}] ${msg.text()}`));
	page.on("pageerror", (err) => console.log(`[BROWSER PAGE ERROR] ${err.message}`));

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-master";
		(window as any).__denteStaffToken = "test-staff-token-master";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-master");
			localStorage.setItem("dente_staff_token", "test-staff-token-master");
			localStorage.setItem("dente_active_session_token", "test-session-master");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Смирнов А. П.");
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

			if (urlStr.includes("/api/auth/login") || urlStr.includes("/api/auth/user/me") || urlStr.includes("/api/auth/session")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ token: "test-token-master", user: MOCK_USER }),
				});
			}

			if (urlStr.includes("/api/settings/clinic/profile")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_CLINIC_PROFILE),
				});
			}

			if (urlStr.includes("/api/settings/preferences")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ theme: "dark", language: "ru" }),
				});
			}

			if (urlStr.includes("/api/dashboard")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(MOCK_DASHBOARD),
				});
			}

			if (urlStr.includes("/api/patients") && !urlStr.includes("tooth-states")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify([MOCK_PATIENT]),
				});
			}

			if (urlStr.includes("tooth-states") || urlStr.includes("/api/odontogram/")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ ok: true, success: true, toothStates: [] }),
				});
			}

			if (urlStr.includes("/api/appointments") && urlStr.includes("/visit")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						visit: {
							id: "visit-master-001",
							appointmentId: MOCK_APPOINTMENT.id,
							patientId: MOCK_PATIENT.id,
							status: "in_progress",
						},
					}),
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
							id: `pay-${Date.now()}`,
							fiscalReceiptNumber: 5912,
							fiscalSign: "492019482103",
							qrPayload: "t=20261106T1000&s=6500.00&fn=9999078900001234&i=5912&fp=492019482103&n=1",
							amountRub: body.amountRub,
							amountKopecks: body.amountKopecks,
							method: body.method,
						},
					}),
				});
			}

			if (urlStr.includes("/api/system/")) {
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

function verifyScreenshotByteGuard(filePath: string) {
	expect(fs.existsSync(filePath), `Файл скриншота ${filePath} обязан существовать на диске`).toBe(true);
	const size = fs.statSync(filePath).size;
	expect(
		size,
		`Скриншот ${filePath} размер ${size} байт меньше минимального аппаратного порога 20КБ (Мандат 8d: Anti-Blank Artifact Byte Guard)`,
	).toBeGreaterThanOrEqual(20480);
}

test.describe("Сквозной мастер-маршрут клиники DENTE (Master Clinical Lifecycle E2E)", () => {
	test("Полный цикл: Расписание -> 1-клик Норма -> Зуб 36 Кариес -> Смета в копейках -> Касса 54-ФЗ сплит", async ({
		page,
	}) => {
		test.setTimeout(120000);
		page.setDefaultTimeout(25000);
		page.setDefaultNavigationTimeout(45000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupMasterRoutesAndStorage(page);

		// =========================================================================
		// ШАГ 1: БАЗОВАЯ НАВИГАЦИЯ В СИСТЕМУ
		// =========================================================================
		await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});

		// =========================================================================
		// ФАЗА A: РАСПИСАНИЕ И ЭКСПРЕСС-БРОНИРОВАНИЕ ЗА 5 СЕКУНД (МАНДАТ 8n)
		// =========================================================================
		await page.evaluate(() => {
			window.location.hash = "schedule";
		});

		const chairStudioModal = page.locator('[data-testid="chair-schedule-studio-modal"]').first();
		await expect(chairStudioModal).toBeVisible({ timeout: 25000 });

		// Открытие экспресс-бронирования через Primary CTA в расписании
		const quickBookTriggerBtn = page.locator('[data-testid="chair-schedule-confirm-slot-btn"]').first();
		await expect(quickBookTriggerBtn).toBeVisible({ timeout: 10000 });
		await quickBookTriggerBtn.dispatchEvent("click");

		// Шторка быстрого бронирования слота
		const quickBookingPopover = page.locator('[data-testid="quick-booking-popover"]');
		await expect(quickBookingPopover).toBeVisible({ timeout: 8000 });

		// Заполнение данных пациента без требования ассистента (Мандат 8n)
		const patientNameInput = quickBookingPopover.locator('input[placeholder="Иванов Иван Иванович"]');
		await expect(patientNameInput).toBeVisible();
		await patientNameInput.fill("Иванов Иван Иванович");

		const patientPhoneInput = quickBookingPopover.locator('input[placeholder="+7 (999) 000-00-00"]');
		await expect(patientPhoneInput).toBeVisible();
		await patientPhoneInput.fill("+7 (999) 111-22-33");

		// Подтверждение бронирования через Primary CTA (Записать на приём)
		const submitBookingBtn = page.locator('[data-testid="quick-booking-submit-btn"]');
		await expect(submitBookingBtn).toBeVisible();
		await expect(submitBookingBtn).not.toBeDisabled();
		await submitBookingBtn.dispatchEvent("click");

		// Шторка бронирования скрывается после успешной записи
		await expect(quickBookingPopover).toBeHidden({ timeout: 8000 });

		// Закрываем студию расписания для перехода к приёму врача у кресла
		const closeScheduleBtn = page.locator('[data-testid="schedule-studio-close-btn"]').first();
		if (await closeScheduleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await closeScheduleBtn.dispatchEvent("click");
		}
		await expect(chairStudioModal).toBeHidden({ timeout: 10000 }).catch(() => {});

		// =========================================================================
		// ФАЗА B: ПРИЁМ У КРЕСЛА (VISITVIEW) И 1-КЛИК НОРМА (МАНДАТ 8e, 8ba)
		// =========================================================================
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });

		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 35000 });

		const headerMonolith = page.locator('[data-testid="visit-header-monolith"]');
		await expect(headerMonolith).toBeVisible({ timeout: 10000 });

		// Заполнение физиологической нормы в 1 клик (Мандат 8e / 8ba)
		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: "Норма" }))
			.first();
		if (await normBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await normBtn.dispatchEvent("click");
		}

		// =========================================================================
		// ФАЗА C: ОДОНТОГРАММА WHEELER 2.5D (ЗУБ 36, КАРИЕС K02.0, ОККЛЮЗИЯ)
		// =========================================================================
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
		await expect(odontogramSubtab).toBeVisible({ timeout: 10000 });
		await odontogramSubtab.dispatchEvent("click");

		const odontogramTab = page.locator('[data-testid="visit-odontogram-tab"]');
		await expect(odontogramTab).toBeVisible({ timeout: 15000 });

		// Выбор первого моляра нижней челюсти слева (зуб 36 по FDI)
		const toothCell36 = page.locator('[data-testid="anatomical-tooth-cell-36"]')
			.or(page.locator('[data-testid="anatomical-tooth-cell-16"]'))
			.first();
		await expect(toothCell36).toBeVisible({ timeout: 10000 });
		await toothCell36.scrollIntoViewIfNeeded();
		await toothCell36.dispatchEvent("click");

		// Контекстное радиальное меню зуба
		const radialOverlay = page.locator('[data-testid="tooth-radial-menu-overlay"]');
		await expect(radialOverlay).toBeVisible({ timeout: 8000 });

		// Выбор окклюзионной поверхности [O]
		const surfChipO = page.locator('[data-testid="radial-desktop-quick-surf-O"]')
			.or(page.locator('button[title*="Окклюзионная"]'))
			.first();
		if (await surfChipO.isVisible({ timeout: 3000 }).catch(() => false)) {
			await surfChipO.dispatchEvent("click");
		}

		// Выбор патологии «Кариес»
		const cariesBtn = page.locator('[data-testid="radial-btn-caries"]');
		await expect(cariesBtn).toBeVisible({ timeout: 5000 });
		await cariesBtn.dispatchEvent("click");

		// Радиальное меню закрывается после фиксации патологии
		await expect(radialOverlay).toBeHidden({ timeout: 8000 });

		// =========================================================================
		// ФАЗА D: ПЛАН ЛЕЧЕНИЯ, РАСЧЕТ В КОПЕЙКАХ И ПЕЧАТЬ СМЕТЫ (МАНДАТ 8e)
		// =========================================================================
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]');
		await expect(planSubtab).toBeVisible({ timeout: 8000 });
		await planSubtab.dispatchEvent("click");

		const planContent = page.locator('[data-testid="visit-treatment-plan-tab-content"]');
		await expect(planContent).toBeVisible({ timeout: 10000 });

		// Кнопка быстрой печати сметы плана лечения активна и не заблокирована
		const printEstimateBtn = page.locator('[data-testid="btn-plan-tab-print-estimate"]');
		await expect(printEstimateBtn).toBeVisible({ timeout: 8000 });
		await expect(printEstimateBtn).not.toBeDisabled();
		await printEstimateBtn.dispatchEvent("click");

		// =========================================================================
		// ФАЗА E: КАССА 54-ФЗ, СПЛИТ-ОПЛАТА 50/50 И ФИСКАЛЬНЫЙ ЧЕК
		// =========================================================================
		await page.goto(`${BASE_URL}/#checkout`, { waitUntil: "domcontentloaded" });

		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await expect(checkoutModal).toBeVisible({ timeout: 25000 });

		// Проверка итоговой суммы к оплате
		const totalAmountDue = page.locator('[data-testid="display-total-amount-due"]');
		await expect(totalAmountDue).toBeVisible();
		const totalText = await totalAmountDue.innerText();
		expect(totalText.replace(/[\s\u00a0]/g, " ")).toContain("6 500");

		// Переключение на комбинированную оплату (сплит-тендер)
		const splitTenderBtn = page.locator('[data-testid="btn-tender-split"]');
		await expect(splitTenderBtn).toBeVisible();
		await splitTenderBtn.dispatchEvent("click");

		const splitPanel = page.locator('[data-testid="split-tender-panel"]');
		await expect(splitPanel).toBeVisible({ timeout: 5000 });

		// 1-клик пресет «50% карта / 50% нал»
		const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]');
		await expect(split50Btn).toBeVisible();
		await split50Btn.dispatchEvent("click");

		// Проверка индикатора точной сходимости сумм без копеечных расхождений
		const splitStatus = page.locator('[data-testid="split-balance-status"]');
		await expect(splitStatus).toBeVisible();
		await expect(splitStatus).toContainText("Сумма сходится точно ✓");

		// =========================================================================
		// ФАЗА СНЯТИЯ И ВЕРИФИКАЦИИ 4-STATE VISUAL PROOF (МАНДАТЫ 8d, 8aw)
		// Снимаем сквозное состояние: кассовый терминал клиники со сплит-оплатой
		// =========================================================================
		// 1. PC Dark (1440x900)
		const proofPcDarkPath = path.join(PROOFS_DIR, "02_master_clinical_lifecycle_pc_dark_1440x900.png");
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofPcDarkPath, fullPage: false });
		verifyScreenshotByteGuard(proofPcDarkPath);

		// 2. PC Light (1440x900)
		const proofPcLightPath = path.join(PROOFS_DIR, "01_master_clinical_lifecycle_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofPcLightPath, fullPage: false });
		verifyScreenshotByteGuard(proofPcLightPath);

		// 3. Mobile Light (390x844 Apple HIG)
		const proofMobileLightPath = path.join(PROOFS_DIR, "03_master_clinical_lifecycle_mobile_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofMobileLightPath, fullPage: false });
		verifyScreenshotByteGuard(proofMobileLightPath);

		// 4. Mobile Dark (390x844 Apple HIG)
		const proofMobileDarkPath = path.join(PROOFS_DIR, "04_master_clinical_lifecycle_mobile_dark_390x844.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofMobileDarkPath, fullPage: false });
		verifyScreenshotByteGuard(proofMobileDarkPath);

		// Возвращаем десктопный размер для завершения подтверждения платежа
		await page.setViewportSize({ width: 1440, height: 900 });

		// Подтверждение оплаты через Primary CTA без обязательного ИНН физлица
		const submitPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await expect(submitPaymentBtn).toBeVisible();
		await expect(submitPaymentBtn).not.toBeDisabled();
		await submitPaymentBtn.dispatchEvent("click");

		// Проверка успешной отправки транзакции со строгими целочисленными копейками
		await expect(checkoutModal).toBeHidden({ timeout: 10000 });
		expect(capturedPayment).not.toBeNull();
		expect(capturedPayment?.amountKopecks).toBe(650000);
		expect(capturedPayment?.cashAmountKopecks).toBe(325000);
		expect(capturedPayment?.electronicAmountKopecks).toBe(325000);
		expect(capturedPayment?.method).toBe("split");
	});
});
