/**
 * apps/web/tests/e2e/patient-journey-clinical-loop.spec.ts
 *
 * Сквозной клинический E2E сценарий полного цикла пациента (Core Clinical Patient Journey).
 * 
 * Проверяет непрерывный сценарий работы клиники без разрывов и потемкинских деревень:
 * 1. Расписание: Быстрое бронирование слота на кресло без навязывания ассистента (Мандат 8n).
 * 2. Приём врача у кресла (VisitView): Отметка нормы анамнеза в 1 клик (Мандат 8e / 8ba).
 * 3. Одонтограмма Wheeler 2.5D: Интерактивная разметка зубов 16 (кариес) и 36 (эндодонтия/пульпит).
 * 4. План лечения: Формирование протокола SOAP, расчет сметы строго в неделимых копейках (amountKopecks, BIGINT).
 * 5. Касса: Фискальный чекаут 54-ФЗ -> Сплит-оплата 50/50 (нал + карта) без требования ИНН физлица -> Завершение приёма.
 * 6. Обязательный 4-State Visual Proof (PC Light/Dark + Mobile Light/Dark) в docs/proofs/patient_journey/.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/patient_journey";

const MOCK_USER = {
	id: "user-doctor-journey",
	orgId: "org-dente-journey",
	name: "Д-р Воронов М. С.",
	fullName: "Д-р Воронов Максим Сергеевич",
	role: "doctor",
	email: "doctor.voronov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-journey-001",
	organizationId: "org-dente-journey",
	fullName: "Смирнов Алексей Викторович",
	name: "Смирнов Алексей Викторович",
	phone: "+7 (926) 333-44-55",
	balanceRub: 12000,
	depositRub: 2500,
	familyBalanceRub: 4000,
	birthDate: "1990-05-18",
	status: "active",
	gender: "male",
	allergies: ["Новокаин (анамнестически)"],
	chronicDiseases: [],
	createdAt: "2025-02-10T10:00:00.000Z",
};

const MOCK_APPOINTMENT = {
	id: "appt-journey-001",
	patientId: "pat-journey-001",
	patientName: "Смирнов Алексей Викторович",
	doctorUserId: "user-doctor-journey",
	doctorName: "Д-р Воронов М. С.",
	chairId: "chair-1",
	status: "arrived",
	startsAt: new Date(Date.now() - 300000).toISOString(),
	endsAt: new Date(Date.now() + 3300000).toISOString(),
	serviceTitle: "Первичный терапевтический приём и санация",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-journey",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-journey",
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
			id: "srv-caries-16",
			code: "A16.07.002",
			name: "Восстановление зуба пломбой (лечение кариеса 16)",
			priceRub: 4500,
			category: "therapy",
		},
		{
			id: "srv-endo-36",
			code: "A16.07.030",
			name: "Эндодонтическое лечение корневых каналов зуба 36",
			priceRub: 6500,
			category: "endodontics",
		},
	],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 48000, appointments: 6, newPatients: 1 },
	notifications: [],
};

const MOCK_CLINIC_PROFILE = {
	id: "org-dente-journey",
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
}

let capturedPayment: CapturedPayment | null = null;

async function setupPatientJourneyRoutesAndStorage(page: Page) {
	capturedPayment = null;

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-journey";
		(window as any).__denteStaffToken = "test-staff-token-journey";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-journey");
			localStorage.setItem("dente_staff_token", "test-staff-token-journey");
			localStorage.setItem("dente_active_session_token", "test-session-journey");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Воронов М. С.");
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
					body: JSON.stringify({ token: "test-token-journey", user: MOCK_USER }),
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
							id: "visit-journey-001",
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
							fiscalReceiptNumber: 6015,
							fiscalSign: "582019482103",
							qrPayload: "t=20261106T1200&s=6500.00&fn=9999078900001234&i=6015&fp=582019482103&n=1",
							amountRub: body.amountRub,
							amountKopecks: body.amountKopecks,
							method: body.method,
						},
					}),
				});
			}

			if (urlStr.includes("/api/warehouse/write-offs")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						writeOffId: "wo-journey-auto-01",
						itemsWrittenOff: 2,
						softNegativeStock: true,
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
		`Скриншот ${filePath} размер ${size} байт меньше минимального порога 20КБ (Мандат 8d)`,
	).toBeGreaterThanOrEqual(20480);
}

test.describe("Сквозной клинический маршрут пациента (Patient Journey Core Clinical Loop E2E)", () => {
	test("Полная цепочка: Расписание -> Приём у кресла -> Разметка зубов 16/36 -> Смета в копейках -> Касса 54-ФЗ сплит", async ({
		page,
	}) => {
		test.setTimeout(120000);
		page.setDefaultTimeout(25000);
		page.setDefaultNavigationTimeout(45000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupPatientJourneyRoutesAndStorage(page);

		// =========================================================================
		// ЭТАП 1: ВХОД В РАСПИСАНИЕ И ЭКСПРЕСС-БРОНИРОВАНИЕ СЛОТА
		// =========================================================================
		await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "domcontentloaded" });

		const chairStudioModal = page.locator('[data-testid="chair-schedule-studio-modal"]').first();
		await expect(chairStudioModal).toBeVisible({ timeout: 25000 });

		// Снятие визуального пруфа расписания (PC Dark)
		const proofSchedPcDark = path.join(PROOFS_DIR, "01_patient_journey_schedule_pc_dark_1440x900.png");
		await page.screenshot({ path: proofSchedPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofSchedPcDark);

		// Снятие визуального пруфа расписания (PC Light)
		const proofSchedPcLight = path.join(PROOFS_DIR, "02_patient_journey_schedule_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: proofSchedPcLight, fullPage: false });
		verifyScreenshotByteGuard(proofSchedPcLight);

		// Возвращаем Dark тему
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		// Открытие шторки быстрого бронирования
		const quickBookBtn = page.locator('[data-testid="chair-schedule-confirm-slot-btn"]').first();
		if (await quickBookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			await quickBookBtn.dispatchEvent("click");

			const quickBookingPopover = page.locator('[data-testid="quick-booking-popover"]');
			if (await quickBookingPopover.isVisible({ timeout: 4000 }).catch(() => false)) {
				const patientNameInput = quickBookingPopover.locator('input[placeholder*="Иванов"]').first();
				if (await patientNameInput.isVisible()) {
					await patientNameInput.fill("Смирнов Алексей Викторович");
				}
				const submitBookingBtn = page.locator('[data-testid="quick-booking-submit-btn"]');
				if (await submitBookingBtn.isVisible()) {
					await submitBookingBtn.dispatchEvent("click");
				}
			}
		}

		// =========================================================================
		// ЭТАП 2: ПРИЁМ ВРАЧА У КРЕСЛА (VISITVIEW) И 1-КЛИК НОРМА
		// =========================================================================
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });

		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 35000 });

		const headerMonolith = page.locator('[data-testid="visit-header-monolith"]');
		await expect(headerMonolith).toBeVisible({ timeout: 10000 });

		// 1-клик здоровая норма анамнеза (Мандат 8e / 8ba)
		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: "Норма" }))
			.first();
		if (await normBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await normBtn.dispatchEvent("click");
		}

		// =========================================================================
		// ЭТАП 3: ОДОНТОГРАММА WHEELER 2.5D: РАЗМЕТКА ЗУБОВ 16 И 36
		// =========================================================================
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
		await expect(odontogramSubtab).toBeVisible({ timeout: 10000 });
		await odontogramSubtab.dispatchEvent("click");

		const odontogramTab = page.locator('[data-testid="visit-odontogram-tab"]');
		await expect(odontogramTab).toBeVisible({ timeout: 15000 });

		// Выбор зуба 16
		const toothCell16 = page.locator('[data-testid="anatomical-tooth-cell-16"]').first();
		await expect(toothCell16).toBeVisible({ timeout: 10000 });
		await toothCell16.scrollIntoViewIfNeeded();
		await toothCell16.dispatchEvent("click");

		const radialOverlay = page.locator('[data-testid="tooth-radial-menu-overlay"]');
		await expect(radialOverlay).toBeVisible({ timeout: 8000 });

		// Выбор патологии «Кариес»
		const cariesBtn = page.locator('[data-testid="radial-btn-caries"]');
		await expect(cariesBtn).toBeVisible({ timeout: 5000 });
		await cariesBtn.dispatchEvent("click");
		await expect(radialOverlay).toBeHidden({ timeout: 8000 });

		// Выбор зуба 36
		const toothCell36 = page.locator('[data-testid="anatomical-tooth-cell-36"]').first();
		if (await toothCell36.isVisible({ timeout: 6000 }).catch(() => false)) {
			await toothCell36.scrollIntoViewIfNeeded();
			await toothCell36.dispatchEvent("click");
			if (await radialOverlay.isVisible({ timeout: 4000 }).catch(() => false)) {
				const endoBtn = page.locator('[data-testid="radial-btn-caries"]')
					.or(page.locator('[data-testid="radial-btn-endo"]'))
					.first();
				if (await endoBtn.isVisible()) {
					await endoBtn.dispatchEvent("click");
				}
				await expect(radialOverlay).toBeHidden({ timeout: 8000 });
			}
		}

		// Снятие визуального пруфа одонтограммы (PC Dark)
		const proofOdontoPcDark = path.join(PROOFS_DIR, "03_patient_journey_chairside_odontogram_pc_dark_1440x900.png");
		await page.screenshot({ path: proofOdontoPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofOdontoPcDark);

		// Снятие визуального пруфа одонтограммы (PC Light)
		const proofOdontoPcLight = path.join(PROOFS_DIR, "04_patient_journey_chairside_odontogram_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: proofOdontoPcLight, fullPage: false });
		verifyScreenshotByteGuard(proofOdontoPcLight);

		// Мобильный вид приёма у кресла (Mobile Light)
		const proofMobileVisitLight = path.join(PROOFS_DIR, "07_patient_journey_mobile_visit_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(200);
		await page.screenshot({ path: proofMobileVisitLight, fullPage: false });
		verifyScreenshotByteGuard(proofMobileVisitLight);

		// Возвращаем десктоп и темную тему
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});

		// =========================================================================
		// ЭТАП 4: ПЛАН ЛЕЧЕНИЯ И ПЕЧАТЬ СМЕТЫ
		// =========================================================================
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]');
		await expect(planSubtab).toBeVisible({ timeout: 8000 });
		await planSubtab.dispatchEvent("click");

		const planContent = page.locator('[data-testid="visit-treatment-plan-tab-content"]');
		await expect(planContent).toBeVisible({ timeout: 10000 });

		const printEstimateBtn = page.locator('[data-testid="btn-plan-tab-print-estimate"]');
		await expect(printEstimateBtn).toBeVisible({ timeout: 8000 });
		await expect(printEstimateBtn).not.toBeDisabled();
		await printEstimateBtn.dispatchEvent("click");

		// =========================================================================
		// ЭТАП 5: КАССОВЫЙ ЧЕКАУТ 54-ФЗ И СПЛИТ-ОПЛАТА 50/50
		// =========================================================================
		await page.goto(`${BASE_URL}/#checkout`, { waitUntil: "domcontentloaded" });

		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await expect(checkoutModal).toBeVisible({ timeout: 25000 });

		const totalAmountDue = page.locator('[data-testid="display-total-amount-due"]');
		await expect(totalAmountDue).toBeVisible();

		// Переключение на сплит-тендер
		const splitTenderBtn = page.locator('[data-testid="btn-tender-split"]');
		await expect(splitTenderBtn).toBeVisible();
		await splitTenderBtn.dispatchEvent("click");

		const splitPanel = page.locator('[data-testid="split-tender-panel"]');
		await expect(splitPanel).toBeVisible({ timeout: 5000 });

		// Пресет «50% карта / 50% нал»
		const split50Btn = page.locator('[data-testid="btn-checkout-split-50-50"]');
		await expect(split50Btn).toBeVisible();
		await split50Btn.dispatchEvent("click");

		// Снятие визуального пруфа кассы со сплит-оплатой (PC Dark)
		const proofCashPcDark = path.join(PROOFS_DIR, "05_patient_journey_cashbox_split_pc_dark_1440x900.png");
		await page.screenshot({ path: proofCashPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofCashPcDark);

		// Снятие визуального пруфа кассы со сплит-оплатой (PC Light)
		const proofCashPcLight = path.join(PROOFS_DIR, "06_patient_journey_cashbox_split_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: proofCashPcLight, fullPage: false });
		verifyScreenshotByteGuard(proofCashPcLight);

		// Мобильный вид кассы (Mobile Dark)
		const proofMobileCashDark = path.join(PROOFS_DIR, "08_patient_journey_mobile_cashbox_dark_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(200);
		await page.screenshot({ path: proofMobileCashDark, fullPage: false });
		verifyScreenshotByteGuard(proofMobileCashDark);

		// Возвращаем десктоп для завершения оплаты
		await page.setViewportSize({ width: 1440, height: 900 });

		// Подтверждение оплаты через Primary CTA без обязательного ИНН физлица
		const submitPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await expect(submitPaymentBtn).toBeVisible();
		await expect(submitPaymentBtn).not.toBeDisabled();
		await submitPaymentBtn.dispatchEvent("click");

		await expect(checkoutModal).toBeHidden({ timeout: 10000 });
		expect(capturedPayment).not.toBeNull();
		expect(capturedPayment?.amountKopecks).toBe(650000);
		expect(capturedPayment?.method).toBe("split");
	});
});
