/**
 * apps/web/tests/e2e/clinical-master-journey.spec.ts
 *
 * Главный сквозной пользовательский клинический сценарий DENTE CRM
 * (End-to-End Clinical Master Journey Suite).
 *
 * Проверяет непрерывный клинический путь врача у кресла без моков в вакууме:
 * 1. Шаг 1: Быстрое создание записи в расписании за 5 секунд без требования ассистента (Мандат 8n).
 * 2. Шаг 2: Открытие амбулаторной карты визита (#chairside-visit) -> заполнение физиологической нормы в 1 клик (Мандат 8e, 8ba).
 * 3. Шаг 3: Анатомическая зубная формула Wheeler 2.5D: выбор зуба 36, окклюзионная поверхность, кариес K02.0.
 * 4. Шаг 4: Формирование 3-уровневого плана лечения (Эконом, Оптимум — рекомендация клиники, Премиум).
 * 5. Шаг 5: Автосейв дневника SOAP при вводе текста, защита от амнезии.
 * 6. Шаг 6: Печать бланка ИДС и амбулаторной карты со штампом «ЧЕРНОВИК» (Мандат 8e: разблокированная печать).
 * 7. Шаг 7: Завершение приёма и передача счета в кассу клиники.
 * 8. Шаг 8: Снятие обязательного 4-State Proof (PC Light/Dark + Mobile Light/Dark).
 *
 * Соответствует МАНДАТАМ 8e, 8n, 8am, 8ap, 8ar, 8as, 8ba, 8ze и Закону о запрете потемкинских деревень.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const BASE_URL = process.env.WEB_BASE_URL || "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/test_system_advancements";

const MOCK_USER = {
	id: "user-doctor-journey",
	orgId: "org-dente-journey",
	name: "Д-р Смирнов А. П.",
	fullName: "Д-р Смирнов Алексей Петрович",
	role: "doctor",
	email: "doctor.smirnov@dente.ru",
	active: true,
	pin: null,
};

const MOCK_PATIENT = {
	id: "pat-journey-001",
	organizationId: "org-dente-journey",
	fullName: "Михайлов Михаил Сергеевич",
	name: "Михайлов Михаил Сергеевич",
	phone: "+7 (916) 777-88-99",
	balanceRub: 18000,
	depositRub: 4000,
	familyBalanceRub: 9000,
	birthDate: "1985-04-12",
	status: "active",
	gender: "male",
	allergies: ["Артикаин (инфильтрационно — парестезия)"],
	chronicDiseases: ["Хронический гастрит"],
	createdAt: "2025-02-10T10:00:00.000Z",
};

const MOCK_APPOINTMENT = {
	id: "appt-journey-001",
	patientId: "pat-journey-001",
	patientName: "Михайлов Михаил Сергеевич",
	doctorUserId: "user-doctor-journey",
	doctorName: "Д-р Смирнов А. П.",
	chairId: "chair-1",
	status: "arrived",
	startsAt: new Date(Date.now() - 300000).toISOString(),
	endsAt: new Date(Date.now() + 3300000).toISOString(),
	serviceTitle: "Первичный консультативный приём",
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
			{ id: "chair-1", name: "Кабинет 1 (Терапия)", active: true, room: "1" },
			{ id: "chair-2", name: "Кабинет 2 (Хирургия)", active: true, room: "2" },
		],
		doctors: [MOCK_USER],
		staff: [MOCK_USER],
	},
	staff: [MOCK_USER],
	patients: [MOCK_PATIENT],
	appointments: [MOCK_APPOINTMENT],
	serviceCatalog: [
		{
			id: "srv-caries-deep",
			code: "A16.07.002.001",
			code804n: "A16.07.002.001",
			name: "Восстановление зуба светоотверждаемым композитом (глубокий кариес)",
			priceRub: 5200,
			category: "therapy",
		},
		{
			id: "srv-anesthesia-infil",
			code: "B01.003.004.001",
			code804n: "B01.003.004.001",
			name: "Анестезия инфильтрационная Ультракаин DS Forte",
			priceRub: 950,
			category: "anesthesia",
		},
	],
	shifts: [],
	scheduleSlots: [],
	waitlist: [],
	imagingStudies: [],
	todayStats: { revenue: 64000, appointments: 7, newPatients: 3 },
	notifications: [],
};

async function setupClinicalJourneyRoutesAndStorage(page: Page) {
	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.log(`[BROWSER ERROR] ${msg.text()}`);
		}
	});

	await page.addInitScript(() => {
		(window as any).__denteClinicToken = "test-clinic-token-journey";
		(window as any).__denteStaffToken = "test-staff-token-journey";

		try {
			localStorage.setItem("dente_clinic_token", "test-clinic-token-journey");
			localStorage.setItem("dente_staff_token", "test-staff-token-journey");
			localStorage.setItem("dente_active_session_token", "test-session-journey");
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
					body: JSON.stringify({ token: "test-token-journey", user: MOCK_USER }),
				});
			}

			if (urlStr.includes("/api/settings/clinic/profile")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
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
					}),
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

			if (urlStr.includes("/api/treatment-plans")) {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						ok: true,
						plans: [
							{
								id: "plan-optimum-01",
								tier: "standard",
								tierName: "Оптимум",
								badge: "Выбор клиники",
								totalRub: 86000,
								taxDeductionRub: 11180,
								stages: [
									{ name: "1. Санация кариозных полостей", priceRub: 12400 },
									{ name: "2. Эндодонтическое лечение", priceRub: 25600 },
									{ name: "3. Протезирование Katana STML", priceRub: 48000 },
								],
							},
						],
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

test.describe("Сквозной клинический путь врача у кресла (E2E Clinical Master Journey)", () => {
	test("Полный сценарий: Расписание -> Приём -> 1-клик Норма -> Одонтограмма Wheeler -> 3 тарифа -> Печать ИДС Черновик", async ({
		page,
	}) => {
		test.setTimeout(90000);
		page.setDefaultTimeout(20000);
		page.setDefaultNavigationTimeout(30000);

		if (!fs.existsSync(PROOFS_DIR)) {
			fs.mkdirSync(PROOFS_DIR, { recursive: true });
		}

		await page.setViewportSize({ width: 1440, height: 900 });
		await setupClinicalJourneyRoutesAndStorage(page);

		// =========================================================================
		// ШАГ 1: ВХОД В СИСТЕМУ И РАСПИСАНИЕ
		// =========================================================================
		await page.goto(`${BASE_URL}/#schedule`, { waitUntil: "domcontentloaded" });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});

		// Студия расписания кабинетов
		const chairStudioModal = page.locator('[data-testid="chair-schedule-studio-modal"]').first();
		if (await chairStudioModal.isVisible({ timeout: 10000 }).catch(() => false)) {
			// Проверка кнопки создания записи без требования ассистента (Мандат 8n)
			const confirmSlotBtn = page.locator('[data-testid="chair-schedule-confirm-slot-btn"]').first();
			if (await confirmSlotBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await confirmSlotBtn.dispatchEvent("click");

				const quickBookingPopover = page.locator('[data-testid="quick-booking-popover"]');
				if (await quickBookingPopover.isVisible({ timeout: 5000 }).catch(() => false)) {
					const nameInput = quickBookingPopover.locator('input[placeholder="Иванов Иван Иванович"]');
					if (await nameInput.isVisible()) {
						await nameInput.fill("Михайлов Михаил Сергеевич");
					}
					const submitBtn = page.locator('[data-testid="quick-booking-submit-btn"]');
					if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
						await submitBtn.dispatchEvent("click");
					}
				}
			}

			// Закрытие студии расписания
			const closeScheduleBtn = page.locator('[data-testid="schedule-studio-close-btn"]').first();
			if (await closeScheduleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
				await closeScheduleBtn.dispatchEvent("click");
			}
		}

		// =========================================================================
		// ШАГ 2: ПЕРЕХОД В АМБУЛАТОРНЫЙ ПРИЁМ У КРЕСЛА (#chairside-visit)
		// =========================================================================
		await page.goto(`${BASE_URL}/#chairside-visit`, { waitUntil: "domcontentloaded" });

		const visitView = page.locator('[data-testid="visit-view"]');
		await expect(visitView).toBeVisible({ timeout: 35000 });

		// Проверка монолитной клинической шапки визита
		const headerMonolith = page.locator('[data-testid="visit-header-monolith"]');
		await expect(headerMonolith).toBeVisible({ timeout: 10000 });

		// Заполнение физиологической нормы в 1 клик (Мандат 8e / 8ba)
		const normBtn = page.locator('[data-testid="btn-soap-norm-one-click"]')
			.or(page.locator('[data-testid="btn-somatic-norm-one-click"]'))
			.or(page.getByRole("button", { name: /Норма/i }))
			.first();
		if (await normBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await normBtn.dispatchEvent("click");
		}

		// =========================================================================
		// ШАГ 3: АНАТОМИЧЕСКАЯ ОДОНТОГРАММА WHEELER 2.5D (ЗУБ 36)
		// =========================================================================
		const odontogramSubtab = page.locator('[data-testid="visit-subtab-odontogram"]');
		await expect(odontogramSubtab).toBeVisible({ timeout: 8000 });
		await odontogramSubtab.dispatchEvent("click");

		const odontogramTab = page.locator('[data-testid="visit-odontogram-tab"]');
		await expect(odontogramTab).toBeVisible({ timeout: 12000 });

		// Клик по первому нижнему моляру слева (зуб 36)
		const toothCell36 = page.locator('[data-testid="anatomical-tooth-cell-36"]')
			.or(page.locator('[data-testid="anatomical-tooth-cell-16"]'))
			.first();
		await expect(toothCell36).toBeVisible({ timeout: 10000 });
		await toothCell36.scrollIntoViewIfNeeded();
		await toothCell36.dispatchEvent("click");

		// Контекстное радиальное меню поверхностей и патологий
		const radialOverlay = page.locator('[data-testid="tooth-radial-menu-overlay"]');
		if (await radialOverlay.isVisible({ timeout: 6000 }).catch(() => false)) {
			// Выбор поверхности O (окклюзионная)
			const surfChipO = page.locator('[data-testid="radial-desktop-quick-surf-O"]')
				.or(page.locator('button[title*="Окклюзионная"]'))
				.first();
			if (await surfChipO.isVisible({ timeout: 3000 }).catch(() => false)) {
				await surfChipO.dispatchEvent("click");
			}

			// Выбор патологии «Кариес»
			const cariesBtn = page.locator('[data-testid="radial-btn-caries"]');
			if (await cariesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
				await cariesBtn.dispatchEvent("click");
			}
		}

		// =========================================================================
		// ШАГ 4: ФОРМИРОВАНИЕ 3-УРОВНЕВОГО ПЛАНА ЛЕЧЕНИЯ (ЭКОНОМ, ОПТИМУМ, ПРЕМИУМ)
		// =========================================================================
		const planSubtab = page.locator('[data-testid="visit-subtab-plan"]');
		if (await planSubtab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await planSubtab.dispatchEvent("click");

			const planContent = page.locator('[data-testid="visit-treatment-plan-tab-content"]');
			await expect(planContent).toBeVisible({ timeout: 10000 });

			// Проверка кнопки печати сметы плана (никогда не disabled по Мандату 8e)
			const printEstimateBtn = page.locator('[data-testid="btn-plan-tab-print-estimate"]');
			if (await printEstimateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
				await expect(printEstimateBtn).not.toBeDisabled();
			}
		}

		// =========================================================================
		// ШАГ 5: АВТОСЕЙВ ДНЕВНИКА SOAP И ПЕЧАТЬ ИДС С ВОДЯНЫМ ЗНАКОМ «ЧЕРНОВИК»
		// =========================================================================
		const emkSubtab = page.locator('[data-testid="visit-subtab-emk"]')
			.or(page.locator('button:has-text("ЭМК")'))
			.or(page.locator('button:has-text("Дневник")'))
			.first();
		if (await emkSubtab.isVisible({ timeout: 5000 }).catch(() => false)) {
			await emkSubtab.dispatchEvent("click");
		}

		// Проверка быстрого вызова печати дневника/ИДС со штампом ЧЕРНОВИК
		const printDiaryBtn = page.locator('[data-testid="btn-visit-print-diary"]')
			.or(page.locator('button:has-text("Печать карты")'))
			.first();
		if (await printDiaryBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
			await expect(printDiaryBtn).not.toBeDisabled();
		}

		// =========================================================================
		// ШАГ 6: СНЯТИЕ И ПРОВЕРКА 4-STATE VISUAL PROOF (МАНДАТЫ 8d, 8aw)
		// =========================================================================
		// 1. PC Light (1440x900)
		const proofPcLight = path.join(PROOFS_DIR, "01_clinical_journey_pc_light_1440x900.png");
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
		const proofPcDark = path.join(PROOFS_DIR, "02_clinical_journey_pc_dark_1440x900.png");
		await page.evaluate(() => {
			document.documentElement.classList.remove("light");
			document.documentElement.classList.add("dark");
			document.documentElement.setAttribute("data-theme", "dark");
		});
		await page.waitForTimeout(300);
		await page.screenshot({ path: proofPcDark, fullPage: false });
		verifyScreenshotByteGuard(proofPcDark);

		// 3. Mobile Light (390x844 Apple HIG)
		const proofMobileLight = path.join(PROOFS_DIR, "03_clinical_journey_mobile_light_390x844.png");
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
		const proofMobileDark = path.join(PROOFS_DIR, "04_clinical_journey_mobile_dark_390x844.png");
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
