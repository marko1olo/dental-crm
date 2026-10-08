/**
 * braveryDiplomaAndSimulatorIsolation.test.ts
 *
 * RED TEAM ИНКВИЗИЦИОННЫЙ ЮНИТ-ТЕСТ:
 * 1. Искоренение бутафорских дипломов за храбрость:
 *    - В боевом режиме диплом использует живые реквизиты авторизованного врача
 *      (getCachedActiveStaffUser) и клиники (getCachedClinicDashboard / getCachedClinicProfile).
 *    - Защита от фейковых захардкоженных «Д-р Соколов А. В.» и «Стоматологическая Клиника DENTE» на реальном приеме.
 *    - Автоматическая генерация уникального номера с текущим годом (ДИПЛОМ-ГЕРОЙ-YYYY-...).
 *    - Zero emojis в бланках и модалках (строгие векторные иконки Lucide).
 * 2. Железная изоляция интерактивного симулятора demoInteractiveSimulation.ts:
 *    - Защита боевого токена врача в localStorage (Fail-Closed при попытке стереть рабочий JWT).
 *    - Наличие механизма аварийного восстановления restoreLiveStaffSessionAfterDemo().
 *    - Блокировка симуляций мутаций (смена статуса, клик по зубу, добавление в смету) для реальных пациентов/приемов.
 *    - Изоляция in-memory стейта демо-пациентов от базы данных и рабочего контура врача.
 *
 * МАНДАТЫ 8c (ZERO-MOCKS), 8e (DOCTOR AUTONOMY), 8n (ZERO DEAD-ENDS), 8y (FAIL-CLOSED INVARIANT).
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "vitest";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	resolveBraveryDiplomaRequisites,
	generateBraveryDiploma,
	type BraveryDiplomaData,
} from "../utils/pediatric/braveryDiplomaGenerator.js";

import {
	simulateDemoAppointmentStatusChange,
	simulateDemoToothClick,
	simulateDemoAddServiceToEstimate,
	getLiveDemoAppointments,
	getLiveDemoOdontogram,
	getLiveDemoEstimate,
	switchDemoRole,
	restoreLiveStaffSessionAfterDemo,
	DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY,
	DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY,
} from "../utils/demo/demoInteractiveSimulation.js";

import {
	isDemoShowcaseMode,
	setRuntimeDemoMode,
	DEMO_SHOWCASE_ORG_ID,
} from "../utils/demoModeEngine.js";

import { PediatricBraveryDiplomaModal } from "../components/pediatric/PediatricBraveryDiplomaModal.js";
import { PatientCardModal } from "../components/patients/PatientCardModal.js";

const EMOJI_REGEX =
	/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

// Mock localStorage for headless Node.js environment
class LocalStorageMock {
	private store: Record<string, string> = {};

	getItem(key: string): string | null {
		return this.store[key] ?? null;
	}

	setItem(key: string, value: string): void {
		this.store[key] = String(value);
	}

	removeItem(key: string): void {
		delete this.store[key];
	}

	clear(): void {
		this.store = {};
	}
}

describe("Red Team Inquisition: Live Bravery Diplomas & Interactive Simulator Isolation", () => {
	const originalLocalStorage = (globalThis as unknown as { localStorage?: unknown }).localStorage;
	let mockStorage: LocalStorageMock;

	beforeEach(() => {
		mockStorage = new LocalStorageMock();
		Object.defineProperty(globalThis, "localStorage", {
			value: mockStorage,
			configurable: true,
			writable: true,
		});
		setRuntimeDemoMode(false); // Строгий боевой режим по умолчанию
	});

	afterEach(() => {
		setRuntimeDemoMode(null);
		if (originalLocalStorage) {
			Object.defineProperty(globalThis, "localStorage", {
				value: originalLocalStorage,
				configurable: true,
				writable: true,
			});
		} else {
			delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
		}
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 1. ЖИВЫЕ ДИПЛОМЫ ЗА ХРАБРОСТЬ (НЕТ БУТАФОРИИ НА РЕАЛЬНОМ ПРИЕМЕ)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Pediatric Bravery Diploma: Live Requisites & Production Purity", () => {
		it("resolves live doctor and clinic requisites from active session cache", () => {
			// Симулируем авторизованного врача реальной клиники в localStorage
			mockStorage.setItem(
				"dente_active_staff_user",
				JSON.stringify({
					id: "usr-live-doctor-1",
					fullName: "Д-р Кузнецова Мария Игоревна",
					specialization: "Детский врач-стоматолог",
				}),
			);
			mockStorage.setItem(
				"dente_clinic_dashboard_cache",
				JSON.stringify({
					clinicName: "Клиника Семейной Стоматологии «Денталь»",
					city: "Казань",
				}),
			);

			const resolved = resolveBraveryDiplomaRequisites({
				patientName: "Миша Смирнов (6 лет)",
			});

			assert.equal(resolved.patientName, "Миша Смирнов (6 лет)");
			assert.equal(resolved.doctorName, "Д-р Кузнецова Мария Игоревна");
			assert.equal(resolved.clinicName, "Клиника Семейной Стоматологии «Денталь»");
		});

		it("purges hardcoded demo defaults ('Соколов' and 'DENTE') in live production mode", () => {
			// На реальном приеме ассистент или форма по ошибке передала шаблонные демо-значения
			mockStorage.setItem(
				"dente_active_staff_user",
				JSON.stringify({
					id: "usr-live-doctor-2",
					fullName: "Д-р Алиева Зарина Руслановна",
					specialization: "Стоматолог-терапевт детский",
				}),
			);
			mockStorage.setItem(
				"dente_clinic_profile",
				JSON.stringify({
					name: "Стоматологический Центр «Улыбка»",
				}),
			);

			const resolved = resolveBraveryDiplomaRequisites({
				patientName: "Алиса (5 лет)",
				doctorName: "Д-р Соколов А. В.", // Шаблон из демо
				clinicName: "Стоматологическая Клиника DENTE", // Шаблон из демо
			});

			// В боевом режиме генератор обязан заменить бутафорию на живые реквизиты!
			assert.equal(resolved.doctorName, "Д-р Алиева Зарина Руслановна");
			assert.equal(resolved.clinicName, "Стоматологический Центр «Улыбка»");
		});

		it("generates unique diploma number with current year and valid Russian date", () => {
			const diploma = generateBraveryDiploma({
				patientName: "Артем (7 лет)",
				doctorName: "Д-р Ковалев П. С.",
				clinicName: "Детская Стоматология «Зубная Фея»",
				awardReasonRu: "За храбрость при лечении молочного зубика и лучезарную улыбку!",
			});

			const currentYear = new Date().getFullYear().toString();
			assert.ok(
				diploma.diplomaNumber.startsWith(`ДИПЛОМ-ГЕРОЙ-${currentYear}-`),
				`Diploma number must contain current year ${currentYear}, got: ${diploma.diplomaNumber}`,
			);
			assert.equal(diploma.patientName, "Артем (7 лет)");
			assert.equal(diploma.doctorName, "Д-р Ковалев П. С.");
			assert.equal(diploma.clinicName, "Детская Стоматология «Зубная Фея»");
			assert.ok(
				/^\d{2}\.\d{2}\.\d{4}$/.test(diploma.issueDateRu),
				`Issue date must be DD.MM.YYYY format, got: ${diploma.issueDateRu}`,
			);
			assert.ok(
				diploma.awardReasonRu.includes("храбрость"),
				"Must include award reason in Russian",
			);
		});

		it("preserves demo showcase presentation standards when demo mode is explicitly enabled", () => {
			setRuntimeDemoMode(true);
			assert.equal(isDemoShowcaseMode(), true);

			const demoDiploma = generateBraveryDiploma({
				patientName: "Ваня Смирнов (7 лет)",
			});

			assert.equal(demoDiploma.doctorName, "Д-р Соколов А. В.");
			assert.equal(demoDiploma.clinicName, "Детское отделение DENTE");
			assert.ok(demoDiploma.diplomaNumber.startsWith("ДИПЛОМ-ДЕТСТВО-"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ЖЕЛЕЗНАЯ ИЗОЛЯЦИЯ ИНТЕРАКТИВНОГО СИМУЛЯТОРА
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Interactive Simulation Isolation & Live Session Protection", () => {
		it("protects live staff token in localStorage when switchDemoRole is invoked", () => {
			// Реальный боевой токен врача в системе
			const LIVE_JWT = "dente_live_jwt_auth_token_secret_123456789";
			const LIVE_USER = JSON.stringify({
				id: "usr-live-real",
				fullName: "Д-р Реальный Доктор",
				email: "doctor@realdentalclinic.ru",
			});

			mockStorage.setItem("dente_staff_token", LIVE_JWT);
			mockStorage.setItem("dente_active_staff_user", LIVE_USER);

			// Попытка переключить роль в боевом режиме без allowInLiveMode
			const switchResult = switchDemoRole("surgeon");

			// ДОЛЖНО БЫТЬ ЗАБЛОКИРОВАНО (Fail-Closed):
			assert.equal(switchResult.success, false);
			assert.ok(switchResult.error?.includes("protected"));

			// Боевой токен не должен быть стерт!
			assert.equal(
				mockStorage.getItem("dente_staff_token"),
				LIVE_JWT,
				"Live doctor JWT must NOT be overwritten by demo simulation",
			);
			assert.equal(
				mockStorage.getItem("dente_active_staff_user"),
				LIVE_USER,
				"Live doctor user data must NOT be corrupted",
			);
		});

		it("backs up and cleanly restores live session via restoreLiveStaffSessionAfterDemo", () => {
			const LIVE_JWT = "dente_live_jwt_auth_token_for_restore_test";
			const LIVE_USER = JSON.stringify({
				id: "usr-restore-test",
				fullName: "Д-р Восстанавливаемый",
				email: "dr@clinic-restore.ru",
			});

			mockStorage.setItem("dente_staff_token", LIVE_JWT);
			mockStorage.setItem("dente_active_staff_user", LIVE_USER);

			// Переключение с явным разрешением (например, врач нажал «Попробовать демо-роль»)
			const switchResult = switchDemoRole("orthodontist", { allowInLiveMode: true });
			assert.equal(switchResult.success, true);

			// Проверяем, что создана резервная копия живого токена
			assert.equal(
				mockStorage.getItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY),
				LIVE_JWT,
				"Live staff token must be saved to backup storage",
			);
			assert.equal(
				mockStorage.getItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY),
				LIVE_USER,
				"Live active user must be saved to backup storage",
			);

			// Вызываем восстановление живой сессии
			const restored = restoreLiveStaffSessionAfterDemo();
			assert.equal(restored, true);

			// Проверяем, что живой токен вернулся на место
			assert.equal(mockStorage.getItem("dente_staff_token"), LIVE_JWT);
			assert.equal(mockStorage.getItem("dente_active_staff_user"), LIVE_USER);
			assert.equal(mockStorage.getItem(DENTE_LIVE_STAFF_TOKEN_BACKUP_KEY), null);
			assert.equal(mockStorage.getItem(DENTE_LIVE_ACTIVE_STAFF_USER_BACKUP_KEY), null);
		});

		it("blocks simulation mutations on real production appointments and patients (Fail-Closed)", () => {
			// Реальный ID приема и реальный ID пациента
			const realAppointmentId = "apt-real-uuid-99887766";
			const realPatientId = "pat-real-uuid-11223344";

			// 1. Попытка смены статуса реального приема
			const aptChangeResult = simulateDemoAppointmentStatusChange(realAppointmentId, "completed");
			assert.equal(
				aptChangeResult.success,
				false,
				"Simulation status change on real appointment MUST be rejected",
			);
			assert.ok(aptChangeResult.error?.includes("protected"));

			// 2. Попытка клика по зубу реального пациента
			const toothResult = simulateDemoToothClick(realPatientId, 21, {
				state: "implant",
				titleRu: "Фейковый имплант",
			});
			assert.equal(
				toothResult.length,
				0,
				"Simulation tooth click on real patient MUST return empty array and not mutate card",
			);

			// 3. Попытка добавления услуги в смету реального пациента
			const estimateResult = simulateDemoAddServiceToEstimate(realPatientId, {
				code: "FAKE.01",
				name: "Фейковая услуга",
				quantity: 1,
				unitPriceRub: 99999,
				discountRub: 0,
				totalRub: 99999,
			});
			assert.equal(
				estimateResult.totalGrossRub,
				0,
				"Simulation estimate add on real patient MUST return empty draft estimate with 0 gross rub",
			);
			assert.equal(estimateResult.estimateNumber, "СМЕТА-ПУСТО");
		});

		it("allows isolated simulation for demo patients and appointments", () => {
			// Демо ID пациента и приема
			const demoPatientId = "01a00000-0000-0000-0000-000000000001";
			const demoAppointmentId = "01a00000-0000-0000-0001-000000000001";

			// Смена статуса демо-приема
			const aptRes = simulateDemoAppointmentStatusChange(demoAppointmentId, "in_treatment");
			assert.equal(aptRes.success, true);
			assert.equal(aptRes.appointment?.status, "in_treatment");

			// Клик по зубу демо-пациента
			const toothRes = simulateDemoToothClick(demoPatientId, 16, {
				state: "crown",
				titleRu: "Коронка циркониевая",
			});
			const tooth16 = toothRes.find((t) => t.toothNumber === 16);
			assert.ok(tooth16);
			assert.equal(tooth16.state, "crown");

			// Добавление услуги в смету демо-пациента
			const estRes = simulateDemoAddServiceToEstimate(demoPatientId, {
				code: "A16.07.004",
				name: "Восстановление зуба коронкой",
				quantity: 1,
				unitPriceRub: 22000,
				discountRub: 0,
				totalRub: 22000,
			});
			assert.ok(estRes.totalGrossRub >= 22000);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. UI РЕНДЕРИНГ И АВТОНОМИЯ ВРАЧА (ZERO EMOJIS & REAL ATTRIBUTES)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Pediatric UI Modals & Clinical Aesthetics", () => {
		it("renders PediatricBraveryDiplomaModal with live requisites, A4 print sheet, and zero cartoon emojis", () => {
			// Настраиваем живого врача в сессии
			mockStorage.setItem(
				"dente_active_staff_user",
				JSON.stringify({
					fullName: "Д-р Белова Елена Сергеевна",
					specialization: "Детский стоматолог",
				}),
			);
			mockStorage.setItem(
				"dente_clinic_dashboard_cache",
				JSON.stringify({
					clinicName: "Клиника Инновационной Стоматологии «Денталь»",
				}),
			);

			const html = renderToStaticMarkup(
				createElement(PediatricBraveryDiplomaModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Егор (6 лет)",
				}),
			);

			// 1. Проверяем наличие живых реквизитов врача и клиники в модалке
			assert.ok(
				html.includes("Егор (6 лет)"),
				"Modal preview must include patient name",
			);
			assert.ok(
				html.includes("Д-р Белова Елена Сергеевна"),
				"Modal preview must include real doctor name from active session",
			);
			assert.ok(
				html.includes("Клиника Инновационной Стоматологии «Денталь»"),
				"Modal preview must include real clinic name from cache",
			);

			// 2. Проверяем контролы управления дипломом
			assert.ok(
				html.includes('data-testid="btn-modal-print-diploma"'),
				"Must render print diploma button",
			);
			assert.ok(
				html.includes("Распечатать диплом (Enter)"),
				"Print button must indicate Enter hotkey",
			);
			assert.ok(
				html.includes('data-testid="btn-copy-diploma-text"'),
				"Must render copy diploma text button",
			);
			assert.ok(
				html.includes('data-testid="diploma-certificate-preview"'),
				"Must render live diploma certificate preview",
			);

			// 3. Строгий запрет мультяшных эмодзи (Мандат 8c / 7 смертных грехов UI)
			assert.ok(
				!EMOJI_REGEX.test(html),
				"PediatricBraveryDiplomaModal must contain ZERO cartoon emojis (strict Lucide vector icons only)",
			);
		});

		it("PatientCardModal provides 1-tap diploma trigger without hardcoded fake doctor strings", () => {
			const html = renderToStaticMarkup(
				createElement(PatientCardModal, {
					isOpen: true,
					onClose: () => {},
					patientData: {
						fullName: "София Лебедева",
						birthDate: "2019-03-20", // 7 лет, несовершеннолетний ребенок
						representativeType: "Мать",
						representativeFullName: "Лебедева Ольга",
						representativePhone: "+7 (911) 222-33-44",
					},
				}),
			);

			// Кнопка диплома должна быть доступна в шапке карточки ребенка
			assert.ok(
				html.includes('data-testid="btn-patient-card-diploma"'),
				"Must render 1-tap diploma button in child's patient card header",
			);
			assert.ok(
				!html.includes("Врач-стоматолог детский"),
				"Must not hardcode generic 'Врач-стоматолог детский' placeholder",
			);
		});
	});
});
