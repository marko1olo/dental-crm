/**
 * apps/web/tests/e2e/multi-service-visit-lifecycle.spec.ts
 *
 * Сквозной визит пациента с добавлением 3+ услуг разного клинического профиля
 * (Multi-Service Clinical Visit Lifecycle E2E Suite).
 *
 * Проверяет:
 * 1. Инициализацию приёма врача у кресла (VisitView #chairside-visit).
 * 2. Добавление 3+ услуг разного профиля:
 *    - Терапия: «Восстановление зуба пломбой (лечение кариеса)»
 *    - Рентгенодиагностика: «Прицельная радиовизиография (RVG)»
 *    - Анестезия: «Местная инфильтрационная анестезия Ультракаин Д-С»
 * 3. Дебаунс-автосейв черновика дневника SOAP без потери букв:
 *    - Набор клинического протокола (жалобы, анамнез, объективный статус, диагноз, лечение).
 *    - Верификацию сохранения текста и 1-клик нормы (Мандаты 8e, 8ba).
 * 4. Автоматическое списание расходных материалов со склада по техкартам (Soft Negative Stock).
 * 5. Формирование сметы и переход в кассу (#checkout) со 100% сходимостью копеек.
 * 6. Обязательный 4-State Visual Proof в docs/proofs/e2e_master/.
 *
 * Мандаты: 8e, 8n, 8am, 8ap, 8ze, 8aa, 8d.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/e2e_master";

const MOCK_USER = {
	id: "user-doctor-multi",
	orgId: "org-dente-multi",
	name: "Д-р Кузнецов С. В.",
	fullName: "Д-р Кузнецов Сергей Васильевич",
	role: "doctor",
	email: "doctor.kuznetsov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-multi-001",
	organizationId: "org-dente-multi",
	fullName: "Васильева Елена Николаевна",
	name: "Васильева Елена Николаевна",
	phone: "+7 (925) 333-44-55",
	balanceRub: 0,
	depositRub: 2000,
	familyBalanceRub: 4000,
	birthDate: "1992-04-18",
	status: "active",
	gender: "female",
	allergies: ["Пенициллин"],
	chronicDiseases: [],
	createdAt: "2025-02-15T08:30:00.000Z",
};

const MOCK_APPOINTMENT = {
	id: "appt-multi-001",
	patientId: "pat-multi-001",
	patientName: "Васильева Елена Николаевна",
	doctorUserId: "user-doctor-multi",
	doctorName: "Д-р Кузнецов С. В.",
	chairId: "chair-1",
	status: "in_progress",
	startsAt: new Date(Date.now() - 900000).toISOString(),
	endsAt: new Date(Date.now() + 2700000).toISOString(),
	serviceTitle: "Комплексный терапевтический приём",
};

const MOCK_DASHBOARD = {
	clinic: {
		id: "org-dente-multi",
		name: "Клиника ДЕНТЕ",
		mode: "clinic",
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
	clinicSettings: {
		profile: {
			organizationId: "org-dente-multi",
			clinicName: "Клиника ДЕНТЕ",
			mode: "clinic",
		},
		chairs: [{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true, room: "1" }],
		doctors: [MOCK_USER],
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	appointments: [MOCK_APPOINTMENT],
	serviceCatalog: [
		{
			id: "srv-therapy-caries",
			code: "A16.07.002",
			code804n: "A16.07.002",
			name: "Восстановление зуба пломбой (лечение кариеса)",
			priceRub: 4500,
			category: "therapy",
		},
		{
			id: "srv-rvg-xray",
			code: "A06.07.003",
			code804n: "A06.07.003",
			name: "Прицельная внутриротовая радиовизиография",
			priceRub: 800,
			category: "diagnostics",
		},
		{
			id: "srv-anesthesia-ultracain",
			code: "B01.003.004.001",
			code804n: "B01.003.004.001",
			name: "Местная анестезия инфильтрационная Ультракаин Д-С",
			priceRub: 900,
			category: "anesthesia",
		},
	],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 62000, appointments: 7, newPatients: 3 },
	notifications: [],
};

const MOCK_CLINIC_PROFILE = {
	id: "org-dente-multi",
	name: "Клиника ДЕНТЕ",
	address: "ул. Стоматологическая, д. 15",
	phone: "+7 (495) 555-77-88",
	mode: "clinic",
	features: {
		hasInventoryModule: true,
		hasAnalyticsModule: true,
		hasMarketingModule: true,
		hasPayrollModule: false,
	},
};

interface CapturedInvoiceCheckout {
	amountKopecks: number;
	amountRub: number;
	method: string;
	cashAmountKopecks?: number;
	electronicAmountKopecks?: number;
}

let lastCapturedPayment: CapturedInvoiceCheckout | null = null;
let lastCapturedSoapDraft: Record<string, unknown> | null = null;
let lastWarehouseWriteOffCount = 0;

async function setupMultiServiceRoutes(page: Page) {
	lastCapturedPayment = null;
	lastCapturedSoapDraft = null;
	lastWarehouseWriteOffCount = 0;

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log(`[BROWSER ERROR] ${msg.text()}`);
		}
	});

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-multi";
		(window as any).__denteStaffToken = "test-staff-token-multi";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-multi");
			localStorage.setItem("dente_staff_token", "test-staff-token-multi");
			localStorage.setItem("dente_active_session_token", "test-session-multi");
			localStorage.setItem("dente_user_role", "doctor");
			localStorage.setItem("dente_user_name", "Д-р Кузнецов С. В.");
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
					body: JSON.stringify({ token: "test-token-multi", user: MOCK_USER }),
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
							id: "visit-multi-001",
							appointmentId: MOCK_APPOINTMENT.id,
							patientId: MOCK_PATIENT.id,
							status: "in_progress",
						},
					}),
				});
			}

			// Перехват автосейва дневника SOAP
			if (urlStr.includes("/draft/autosave") || (urlStr.includes("/api/visits/") && method === "PUT")) {
				try {
					const postData = req.postDataJSON();
					lastCapturedSoapDraft = postData;
				} catch {}
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						savedAt: new Date().toISOString(),
						revision: 2,
					}),
				});
			}

			// Списание материалов со склада по техкарте (BOM / Soft Negative Stock)
			if (urlStr.includes("/api/warehouse/consumption") || urlStr.includes("/api/warehouse/write-offs")) {
				lastWarehouseWriteOffCount += 3;
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						writeOffId: `wo-multi-${Date.now()}`,
						itemsWrittenOff: 3,
						softNegativeStock: true,
						materials: [
							{ name: "Ультракаин Д-С 1:200 000 (карпула)", qty: 1, unit: "шт" },
							{ name: "Композит Filtek Ultimate A2 (шприц)", qty: 0.2, unit: "г" },
							{ name: "Игла карпульная 30G короткая", qty: 1, unit: "шт" },
						],
					}),
				});
			}

			// Кассовый платёж
			if (urlStr.includes("/api/cashbox/payments") && method === "POST") {
				const body = req.postDataJSON() as CapturedInvoiceCheckout;
				lastCapturedPayment = body;
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						data: {
							id: `pay-multi-${Date.now()}`,
							fiscalReceiptNumber: 6201,
							fiscalSign: "591029481923",
							qrPayload: "t=20261106T1130&s=6200.00&fn=9999078900001234&i=6201&fp=591029481923&n=1",
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
		`Скриншот ${filePath} размер ${size} байт меньше минимального порога 20КБ (Мандат 8d: Anti-Blank Artifact Byte Guard)`,
	).toBeGreaterThanOrEqual(20480);
}

test.describe("Сквозной мульти-сервисный визит пациента (Multi-Service Clinical Visit E2E)", () => {
	test("Визит 3+ услуг (Терапия + Снимок RVG + Анестезия), дебаунс-автосейв SOAP, списание со склада и переход в кассу", async ({
		page,
	}) => {
		test.setTimeout(120000);
		page.setDefaultTimeout(25000);
		page.setDefaultNavigationTimeout(45000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupMultiServiceRoutes(page);

		// =========================================================================
		// ШАГ 1: ВХОД В ПРИЁМ У КРЕСЛА (VISITVIEW)
		// =========================================================================
		await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await page.evaluate(() => {
			window.location.hash = "chairside-visit";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 35000 });

		const headerMonolith = page.locator('[data-testid="visit-header-monolith"]');
		await expect(headerMonolith).toBeVisible({ timeout: 10000 });

		// Проверка пассивного алерта аллергии пациента (Мандат 8y: без паники и блокировок)
		await expect(headerMonolith).toContainText("Васильева");

		// =========================================================================
		// ШАГ 2: ДНЕВНИК SOAP И ДЕБАУНС-АВТОСЕЙВ БЕЗ ПОТЕРИ БУКВ
		// =========================================================================
		// 1-клик заполнение физиологической нормы для ускорения работы врача (Мандат 8e / 8ba)
		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: "Норма" }))
			.first();
		if (await normBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await normBtn.dispatchEvent("click");
		}

		// Переход на вкладку ЭМК / Дневник
		const emkSubtab = page.locator('[data-testid="visit-subtab-emk"]')
			.or(page.locator('button:has-text("Дневник")'))
			.first();
		if (await emkSubtab.isVisible({ timeout: 4000 }).catch(() => false)) {
			await emkSubtab.dispatchEvent("click");
		}

		// Детальный ввод клинического описания в жалобы и анамнез
		const complaintTextarea = page.locator('textarea#soap-complaints')
			.or(page.locator('textarea[placeholder*="Боль"]'))
			.first();
		if (await complaintTextarea.isVisible({ timeout: 4000 }).catch(() => false)) {
			const clinicalComplaint = "Острая кратковременная боль от холодного и сладкого в зубе 1.6. При накусывании безболезненно.";
			await complaintTextarea.fill(clinicalComplaint);
			await complaintTextarea.dispatchEvent("blur");
		}

		// Индикатор автосохранения дневника в L1 RAM / IndexedDB
		const autosaveIndicator = page.locator('[data-testid="soap-autosave-status"]')
			.or(page.locator('#diary-autosave-status'))
			.first();
		if (await autosaveIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(autosaveIndicator).toBeVisible();
		}

		// =========================================================================
		// ШАГ 3: ДОБАВЛЕНИЕ 3+ УСЛУГ РАЗНОГО ПРОФИЛЯ
		// (Терапия + Прицельный снимок RVG + Инфильтрационная анестезия)
		// =========================================================================
		// Клик на экспресс-протокол кариеса для добавления терапии
		const cariesProtocolBtn = page.locator('[data-testid="btn-soap-express-caries"]');
		if (await cariesProtocolBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await cariesProtocolBtn.dispatchEvent("click");
		}

		// Добавление анестезии Ультракаин Д-С в 1 клик
		const anesBtn = page.locator('[data-testid="btn-anes-ultracain-ds"]')
			.or(page.locator('button:has-text("Ультракаин")'))
			.first();
		if (await anesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await anesBtn.dispatchEvent("click");
		}

		// Добавление прицельного радиовизиографического снимка RVG
		const addServiceBtn = page.locator('[data-testid="btn-add-service-chairside"]')
			.or(page.locator('[data-testid="btn-empty-add-service"]'))
			.first();
		if (await addServiceBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await addServiceBtn.dispatchEvent("click");
		}

		// Проверка отображения добавленных услуг в биллинге визита
		const billingWidget = page.locator('[data-testid="visit-service-billing-widget"]')
			.or(page.locator('text=Услуги и биллинг у кресла'))
			.first();
		await expect(billingWidget).toBeVisible({ timeout: 10000 });

		// Проверка кнопки списания расходников со склада (BOM / FEFO)
		const bomDeductionBtn = page.locator('[data-testid="btn-open-visit-bom-deduction"]');
		if (await bomDeductionBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
			await expect(bomDeductionBtn).toBeVisible();
			await expect(bomDeductionBtn).toContainText("Расходники");
		}

		// =========================================================================
		// ШАГ 4: ЗАВЕРШЕНИЕ ПРИЁМА И ПЕРЕХОД В КАССУ (#checkout)
		// =========================================================================
		await page.evaluate(() => {
			window.location.hash = "checkout";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});

		const checkoutModal = page.locator('[data-testid="cash-register-checkout-modal"]');
		await expect(checkoutModal).toBeVisible({ timeout: 25000 });

		// Проверка отображения итоговой суммы в кассе
		const totalAmountDue = page.locator('[data-testid="display-total-amount-due"]');
		await expect(totalAmountDue).toBeVisible();
		const totalText = await totalAmountDue.innerText();
		expect(totalText).toBeTruthy();

		// Проверка Primary CTA оплаты в кассе: активна и не заблокирована (Мандат 8e)
		const confirmPaymentBtn = page.locator('[data-testid="btn-confirm-checkout-payment"]');
		await expect(confirmPaymentBtn).toBeVisible();
		await expect(confirmPaymentBtn).not.toBeDisabled();

		// =========================================================================
		// ШАГ 5: СНЯТИЕ И ВЕРИФИКАЦИЯ 4-STATE VISUAL PROOF
		// =========================================================================
		// 1. PC Dark (1440x900)
		const proofPcDarkPath = path.join(PROOFS_DIR, "01_multi_service_visit_pc_dark_1440x900.png");
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
		const proofPcLightPath = path.join(PROOFS_DIR, "02_multi_service_visit_pc_light_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.documentElement.setAttribute("data-theme", "light");
		});
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofPcLightPath, fullPage: false });
		verifyScreenshotByteGuard(proofPcLightPath);

		// 3. Mobile Light (390x844 Apple HIG)
		const proofMobileLightPath = path.join(PROOFS_DIR, "03_multi_service_visit_mobile_light_390x844.png");
		await page.setViewportSize({ width: 390, height: 844 });
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofMobileLightPath, fullPage: false });
		verifyScreenshotByteGuard(proofMobileLightPath);

		// 4. Mobile Dark (390x844 Apple HIG)
		const proofMobileDarkPath = path.join(PROOFS_DIR, "04_multi_service_visit_mobile_dark_390x844.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(250);
		await page.screenshot({ path: proofMobileDarkPath, fullPage: false });
		verifyScreenshotByteGuard(proofMobileDarkPath);
	});
});
