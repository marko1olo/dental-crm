import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	clearInMemoryStaffTokensForTest,
	formatPatientInitials,
	formatStaffRoleLabel,
	mapUserRoleToStaffCockpitRole,
	sanitizePhoneForCall,
	sanitizeStaffPushFor323FZ,
	TelegramStaffCockpitService,
} from "../services/telegram/TelegramStaffCockpitService.js";

describe("TelegramStaffCockpitService Suite — Staff Dispatcher & Doctor Chairside Cockpit", () => {
	const testOrgId = "00000000-0000-0000-0000-000000000001";
	const testClinicId = "00000000-0000-0000-0000-000000000002";
	const testDoctorId = "00000000-0000-0000-0000-000000000003";

	beforeEach(() => {
		clearInMemoryStaffTokensForTest();
	});

	// =========================================================================
	// 1. ШЛЮЗ АВТОРИЗАЦИИ И РОЛЕВОЙ МОДЕЛИ ПЕРСОНАЛА
	// =========================================================================
	describe("1. Staff Auth Gateway & Roles Model", () => {
		it("maps internal roles to staff cockpit roles and human-readable Russian labels", () => {
			assert.strictEqual(mapUserRoleToStaffCockpitRole("owner"), "chief_doctor");
			assert.strictEqual(mapUserRoleToStaffCockpitRole("admin"), "chief_doctor");
			assert.strictEqual(mapUserRoleToStaffCockpitRole("doctor"), "dentist");
			assert.strictEqual(mapUserRoleToStaffCockpitRole("assistant"), "assistant");
			assert.strictEqual(mapUserRoleToStaffCockpitRole("administrator"), "administrator");
			assert.strictEqual(mapUserRoleToStaffCockpitRole("manager"), "manager");

			assert.strictEqual(formatStaffRoleLabel("chief_doctor"), "Главный врач");
			assert.strictEqual(formatStaffRoleLabel("doctor"), "Врач-стоматолог");
			assert.strictEqual(formatStaffRoleLabel("assistant"), "Ассистент");
			assert.strictEqual(formatStaffRoleLabel("administrator"), "Администратор");
			assert.strictEqual(formatStaffRoleLabel("manager"), "Управляющий");
		});

		it("generates single-use token, deep-link URL and SVG QR-code for staff connection", async () => {
			const res = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				clinicId: testClinicId,
				staffUserId: testDoctorId,
				role: "doctor",
				fullName: "Иванов Иван Иванович",
				botUsername: "TestClinicBot",
				ttlHours: 24,
			});

			assert.ok(res.token.startsWith("staff_auth_"));
			assert.ok(res.deepLink.includes("t.me/TestClinicBot?start=staff_auth_"));
			assert.ok(res.qrSvg, "QR SVG must be generated");
			assert.ok(res.qrSvg.includes("<svg"), "QR must be valid SVG");
			assert.strictEqual(res.role, "doctor");
			assert.strictEqual(res.staffUserId, testDoctorId);
			assert.ok(new Date(res.expiresAt).getTime() > Date.now());
		});

		it("successfully authorizes doctor via /start staff_auth_... and provides doctor menu", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				clinicId: testClinicId,
				staffUserId: testDoctorId,
				role: "doctor",
				fullName: "Петрова Анна Сергеевна",
			});

			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "123456789",
				chatFingerprint: "fingerprint_doctor_1",
				startPayload: tokenRes.token,
			});

			assert.strictEqual(authRes.success, true);
			assert.strictEqual(authRes.staffUserId, testDoctorId);
			assert.strictEqual(authRes.role, "dentist");
			assert.strictEqual(authRes.roleLabel, "Врач-стоматолог");
			assert.match(authRes.message, /Авторизация успешна/);
			assert.match(authRes.message, /Петрова Анна Сергеевна/);
			assert.match(authRes.message, /323-ФЗ/);

			// Check Doctor keyboard buttons
			const buttons = authRes.replyMarkup.inline_keyboard as Array<Array<{ text: string }>>;
			const flatButtons = buttons.flat();
			assert.ok(flatButtons.some((b) => b.text.includes("Расписание на сегодня")));
			assert.ok(flatButtons.some((b) => b.text.includes("Утренний дайджест")));
			assert.ok(flatButtons.some((b) => b.text.includes("Открыть DENTE CRM")));
		});

		it("authorizes Chief Doctor (owner/admin) and provides Executive Menu", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				clinicId: testClinicId,
				staffUserId: "chief-doc-01",
				role: "owner",
				fullName: "Смирнов Алексей Викторович",
			});

			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "987654321",
				chatFingerprint: "fingerprint_chief_1",
				startPayload: tokenRes.token,
			});

			assert.strictEqual(authRes.success, true);
			assert.strictEqual(authRes.role, "chief_doctor");
			assert.strictEqual(authRes.roleLabel, "Главный врач");

			const buttons = (authRes.replyMarkup.inline_keyboard as Array<Array<{ text: string }>>).flat();
			assert.ok(flatButtons(buttons, "Вечерний финансовый отчет"));
			assert.ok(flatButtons(buttons, "Остатки на складе"));
			assert.ok(flatButtons(buttons, "Загрузка кресел"));
		});

		it("authorizes Administrator and provides Reception Menu", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				clinicId: testClinicId,
				staffUserId: "admin-rec-01",
				role: "administrator",
				fullName: "Кузнецова Ольга",
			});

			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "555444333",
				chatFingerprint: "fingerprint_admin_1",
				startPayload: tokenRes.token,
			});

			assert.strictEqual(authRes.success, true);
			assert.strictEqual(authRes.role, "administrator");
			assert.strictEqual(authRes.roleLabel, "Администратор");

			const buttons = (authRes.replyMarkup.inline_keyboard as Array<Array<{ text: string }>>).flat();
			assert.ok(flatButtons(buttons, "Пациенты в холле"));
			assert.ok(flatButtons(buttons, "Интерком"));
		});

		it("authorizes Assistant and provides Assistant Menu", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				clinicId: testClinicId,
				staffUserId: "assistant-01",
				role: "assistant",
				fullName: "Соколова Марина",
			});

			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "444333222",
				chatFingerprint: "fingerprint_assistant_1",
				startPayload: tokenRes.token,
			});

			assert.strictEqual(authRes.success, true);
			assert.strictEqual(authRes.role, "assistant");
			assert.strictEqual(authRes.roleLabel, "Ассистент");

			const buttons = (authRes.replyMarkup.inline_keyboard as Array<Array<{ text: string }>>).flat();
			assert.ok(flatButtons(buttons, "Мои приёмы"));
			assert.ok(flatButtons(buttons, "Заявка на расходники"));
		});

		it("rejects invalid, unknown, or fabricated tokens", async () => {
			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "12345",
				chatFingerprint: "fake_fingerprint",
				startPayload: "staff_auth_fabricated_token_123",
			});

			assert.strictEqual(authRes.success, false);
			assert.strictEqual(authRes.errorMessage, "invalid_staff_auth_token");
			assert.match(authRes.message, /недействительна или не найдена/);
		});

		it("prevents replay attacks: rejects already used staff token", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				staffUserId: testDoctorId,
				role: "doctor",
			});

			// 1st use
			const firstUse = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "111",
				chatFingerprint: "fp1",
				startPayload: tokenRes.token,
			});
			assert.strictEqual(firstUse.success, true);

			// 2nd use
			const secondUse = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "222",
				chatFingerprint: "fp2",
				startPayload: tokenRes.token,
			});
			assert.strictEqual(secondUse.success, false);
			assert.strictEqual(secondUse.errorMessage, "token_already_used");
			assert.match(secondUse.message, /уже был использован/);
		});

		it("rejects expired tokens", async () => {
			const tokenRes = await TelegramStaffCockpitService.generateStaffAuthToken({
				organizationId: testOrgId,
				staffUserId: testDoctorId,
				role: "doctor",
				ttlHours: -1, // Expired 1 hour ago
			});

			const authRes = await TelegramStaffCockpitService.handleStaffAuthStart({
				organizationId: testOrgId,
				chatId: "111",
				chatFingerprint: "fp1",
				startPayload: tokenRes.token,
			});

			assert.strictEqual(authRes.success, false);
			assert.strictEqual(authRes.errorMessage, "token_expired");
			assert.match(authRes.message, /истёк/);
		});
	});

	// =========================================================================
	// 2. ФУНКЦИОНАЛ ДЛЯ ВРАЧА (УТРЕННИЙ ДАЙДЖЕСТ И РЕАЛТАЙМ-ПУШИ)
	// =========================================================================
	describe("2. Doctor Functionality: Shift Morning Digest & Realtime Pushes", () => {
		it("builds morning shift digest with patient count, first appointment, and complex clinical cases", async () => {
			const digest = await TelegramStaffCockpitService.buildDoctorMorningDigest({
				organizationId: testOrgId,
				doctorUserId: testDoctorId,
				doctorName: "Д-р Смирнов А.В.",
				dateKey: "2026-10-05",
				crmBaseUrl: "https://dente.clinic",
			});

			assert.ok(digest.patientCount > 0, "Should contain patient count");
			assert.ok(digest.firstAppointmentTime, "Should detect first appointment time");
			assert.ok(digest.complexCasesCount > 0, "Should detect complex cases (endo, implant)");

			assert.match(digest.text, /Доброе утро, Д-р Смирнов А\.В\./);
			assert.match(digest.text, /Дайджест смены на 05\.10\.2026/);
			assert.match(digest.text, /Первый приём:/);
			assert.match(digest.text, /Сложные клинические случаи/);
			assert.match(digest.text, /Эндодонтия/);
			assert.match(digest.text, /Имплантация/);

			const flat = digest.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.text.includes("Расписание на сегодня")));
			assert.ok(flat.some((b) => b.text.includes("Смена принята")));
			assert.ok(flat.some((b) => b.text.includes("Открыть ЭМК в CRM")));
		});

		it("formats realtime event push: Patient Arrived in Hall", () => {
			const push = TelegramStaffCockpitService.buildDoctorEventPush({
				eventType: "patient_arrived",
				doctorUserId: testDoctorId,
				appointmentId: "app-101",
				patientFullName: "Смирнова Анна Сергеевна",
				patientPhone: "+7 (999) 111-22-33",
				time: "14:00",
				crmBaseUrl: "https://dente.clinic",
			});

			assert.strictEqual(push.sanitization.isCompliant, true);
			assert.match(push.safeText, /🛎️ Пациент Смирнова А\.С\. подошла в холл клиники \(визит на 14:00\)/);

			const flat = push.replyMarkup.inline_keyboard.flat();
			const emkBtn = flat.find((b) => b.text.includes("Медкарта в CRM"));
			assert.ok(emkBtn?.url?.includes("/#/patient/record/app-101"));

			const callBtn = flat.find((b) => b.text.includes("Позвонить"));
			assert.strictEqual(callBtn?.url, "tel:+79991112233");

			const ackBtn = flat.find((b) => b.text.includes("Принято"));
			assert.strictEqual(ackBtn?.callback_data, "cockpit:ack:patient_arrived:app-101");
		});

		it("formats realtime event push: Appointment Cancelled by Patient", () => {
			const push = TelegramStaffCockpitService.buildDoctorEventPush({
				eventType: "appointment_cancelled",
				doctorUserId: testDoctorId,
				appointmentId: "app-102",
				patientFullName: "Ковалев Дмитрий",
				time: "16:30",
			});

			assert.strictEqual(push.sanitization.isCompliant, true);
			assert.match(push.safeText, /⚠️ Пациент Ковалев Д\. отменил запись на 16:30 — слот освободился/);

			const flat = push.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.text.includes("Медкарта в CRM")));
			assert.ok(flat.some((b) => b.callback_data === "cockpit:ack:appointment_cancelled:app-102"));
		});

		it("formats realtime event push: CITO Acute Pain", () => {
			const push = TelegramStaffCockpitService.buildDoctorEventPush({
				eventType: "cito_acute_pain",
				doctorUserId: testDoctorId,
				appointmentId: "app-103",
				patientFullName: "Пациент Неотложный",
				time: "17:00",
				tooth: 46,
				note: "пульпит",
			});

			assert.match(push.safeText, /🚨 CITO: Пациент с острой болью на 17:00 \(зуб 46, пульпит\)/);
			const flat = push.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.callback_data === "cockpit:ack:cito_acute_pain:app-103"));
		});

		it("formats realtime event push: Lab Work Delivered", () => {
			const push = TelegramStaffCockpitService.buildDoctorEventPush({
				eventType: "lab_work_delivered",
				doctorUserId: testDoctorId,
				patientFullName: "Иванов И.И.",
				time: "12:00",
				labOrderNumber: 142,
				labItemName: "коронка",
			});

			assert.match(push.safeText, /🦷 Зуботехническая лаборатория: коронка по наряду №142 доставлена в клинику/);
			const flat = push.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.callback_data === "cockpit:ack:lab_work_delivered:142"));
		});
	});

	// =========================================================================
	// 3. ФУНКЦИОНАЛ ДЛЯ ГЛАВВРАЧА И УПРАВЛЯЮЩЕГО (EXECUTIVE DIGEST)
	// =========================================================================
	describe("3. Executive Digest: Evening Financial Report & Low Inventory Alert", () => {
		it("builds daily executive evening financial report with revenue breakdown, chair occupancy, and confirmation rate", async () => {
			const report = await TelegramStaffCockpitService.buildExecutiveEveningReport({
				organizationId: testOrgId,
				dateKey: "2026-10-04",
				crmBaseUrl: "https://dente.clinic",
			});

			assert.ok(report.totalRevenueRub > 0, "Must calculate total revenue");
			assert.ok(report.cashRevenueRub >= 0);
			assert.ok(report.cardRevenueRub >= 0);
			assert.ok(report.sbpRevenueRub >= 0);
			assert.ok(report.chairOccupancyPercent >= 0 && report.chairOccupancyPercent <= 100);
			assert.ok(report.confirmationRatePercent >= 0 && report.confirmationRatePercent <= 100);

			assert.match(report.text, /ИТОГОВЫЙ ВЕЧЕРНИЙ ОТЧЕТ КЛИНИКИ/);
			assert.match(report.text, /Выручка за день:/);
			assert.match(report.text, /Наличные/);
			assert.match(report.text, /Терминал/);
			assert.match(report.text, /СБП/);
			assert.match(report.text, /Загрузка кресел:/);
			assert.match(report.text, /Подтверждение визитов:/);

			const flat = report.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.text.includes("Полный финансовый отчет в CRM")));
			assert.ok(flat.some((b) => b.text.includes("Отчёт принят")));
		});

		it("builds critical low inventory alert for anesthetics and consumables", async () => {
			const alert = await TelegramStaffCockpitService.buildLowInventoryAlert({
				organizationId: testOrgId,
				items: [
					{
						name: "Артикаин 1:100 000 (Септанест)",
						category: "anesthesia",
						currentQty: 4,
						minQty: 20,
						unit: "карпул",
					},
					{
						name: "Стерильные смотровые перчатки (M)",
						category: "consumable",
						currentQty: 2,
						minQty: 10,
						unit: "уп",
					},
				],
				crmBaseUrl: "https://dente.clinic",
			});

			assert.strictEqual(alert.isShortage, true);
			assert.strictEqual(alert.anestheticsCount, 1);
			assert.strictEqual(alert.consumablesCount, 1);

			assert.match(alert.text, /Критический остаток на складе/);
			assert.match(alert.text, /Анестетики:/);
			assert.match(alert.text, /Артикаин 1:100 000 \(Септанест\)/);
			assert.match(alert.text, /Расходные материалы:/);
			assert.match(alert.text, /Стерильные смотровые перчатки/);

			const flat = alert.replyMarkup.inline_keyboard.flat();
			assert.ok(flat.some((b) => b.text.includes("Сформировать заказ в CRM")));
			assert.ok(flat.some((b) => b.text.includes("Принято")));
		});

		it("returns normal state when there is no inventory shortage", async () => {
			const alert = await TelegramStaffCockpitService.buildLowInventoryAlert({
				organizationId: testOrgId,
				items: [], // no items provided and no shortages detected
			});

			// When passing explicitly empty list to override fallback:
			assert.ok(alert.text);
		});
	});

	// =========================================================================
	// 4. СОБЛЮДЕНИЕ 323-ФЗ И ЗАЩИТА ВРАЧЕБНОЙ ТАЙНЫ
	// =========================================================================
	describe("4. Compliance with 323-FZ and 152-FZ Medical Secrecy", () => {
		it("formats full Russian names into patient initials", () => {
			assert.strictEqual(formatPatientInitials("Смирнова Анна Сергеевна"), "Смирнова А.С.");
			assert.strictEqual(formatPatientInitials("Ковалев Дмитрий"), "Ковалев Д.");
			assert.strictEqual(formatPatientInitials("Петров"), "Петров");
			assert.strictEqual(formatPatientInitials(""), "Пациент");
		});

		it("sanitizes and formats telephone numbers for dial buttons", () => {
			assert.strictEqual(sanitizePhoneForCall("+7 (999) 123-45-67"), "+79991234567");
			assert.strictEqual(sanitizePhoneForCall("89991234567"), "+79991234567");
			assert.strictEqual(sanitizePhoneForCall(null), null);
		});

		it("strips Russian passport series and numbers from text", () => {
			const dirtyText = "Пациент Иванов И.И. паспорт 4510 123456 пришел на приём";
			const result = sanitizeStaffPushFor323FZ(dirtyText);

			assert.strictEqual(result.isCompliant, false);
			assert.ok(result.strippedItems.includes("Паспортные данные"));
			assert.ok(!result.safeText.includes("4510 123456"));
			assert.match(result.safeText, /\[ПАСПОРТ СКРЫТ 152-ФЗ\]/);
		});

		it("strips SNILS numbers from text", () => {
			const dirtyText = "СНИЛС пациента: 123-456-789 01";
			const result = sanitizeStaffPushFor323FZ(dirtyText);

			assert.strictEqual(result.isCompliant, false);
			assert.ok(result.strippedItems.includes("СНИЛС"));
			assert.ok(!result.safeText.includes("123-456-789 01"));
			assert.match(result.safeText, /\[СНИЛС СКРЫТ 152-ФЗ\]/);
		});

		it("strips 16-digit OMS insurance policies", () => {
			const dirtyText = "Полис ОМС: 1234567890123456 вложен";
			const result = sanitizeStaffPushFor323FZ(dirtyText);

			assert.strictEqual(result.isCompliant, false);
			assert.ok(result.strippedItems.includes("Полис ОМС"));
			assert.ok(!result.safeText.includes("1234567890123456"));
			assert.match(result.safeText, /\[ПОЛИС ОМС СКРЫТ\]/);
		});

		it("strips sensitive somatic diagnoses (HIV, Hepatitis, Tuberculosis, Oncology)", () => {
			const dirtyText = "Внимание: у пациента сопутствующий гепатит C и ВИЧ";
			const result = sanitizeStaffPushFor323FZ(dirtyText);

			assert.strictEqual(result.isCompliant, false);
			assert.ok(result.strippedItems.includes("Соматический диагноз особой тайны"));
			assert.ok(!result.safeText.includes("гепатит"));
			assert.ok(!result.safeText.includes("ВИЧ"));
			assert.match(result.safeText, /\[МЕДТАЙНА 323-ФЗ: см\. в ЭМК\]/);
		});

		it("preserves safe text and returns isCompliant: true for clean pushes", () => {
			const cleanText = "🛎️ Пациент Смирнова А.С. подошла в холл клиники (визит на 14:00).";
			const result = sanitizeStaffPushFor323FZ(cleanText);

			assert.strictEqual(result.isCompliant, true);
			assert.strictEqual(result.strippedItems.length, 0);
			assert.strictEqual(result.safeText, cleanText);
		});
	});

	// =========================================================================
	// 5. ИНТЕРАКТИВНЫЕ 1-КЛИК CALLBACK-КНОПКИ
	// =========================================================================
	describe("5. Interactive 1-Click Callback Query Protocol", () => {
		it("handles cockpit:ack:... button press and confirms receipt", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "cockpit:ack:patient_arrived:app-101",
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.ok, true);
			assert.match(res.responseText, /Подтверждено: статус обновлён в DENTE CRM/);
		});

		it("handles cockpit:doctor_schedule callback and loads schedule", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "cockpit:doctor_schedule",
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.ok, true);
			assert.match(res.responseText, /Дайджест смены/);
			assert.ok(res.replyMarkup?.inline_keyboard);
		});

		it("handles cockpit:shift_ack:... callback and confirms shift start", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "cockpit:shift_ack:2026-10-05",
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.ok, true);
			assert.match(res.responseText, /Смена на 2026-10-05 принята/);
		});

		it("handles cockpit:executive_fin callback and returns evening report", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "cockpit:executive_fin",
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.ok, true);
			assert.match(res.responseText, /ИТОГОВЫЙ ВЕЧЕРНИЙ ОТЧЕТ КЛИНИКИ/);
		});

		it("handles cockpit:stock_alert callback and returns inventory report", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "cockpit:stock_alert",
			});

			assert.strictEqual(res.handled, true);
			assert.strictEqual(res.ok, true);
			assert.match(res.responseText, /склад/i);
		});

		it("ignores non-cockpit callbacks gracefully", async () => {
			const res = await TelegramStaffCockpitService.handleCockpitCallback({
				organizationId: testOrgId,
				chatId: "12345",
				callbackData: "unrelated:callback:data",
			});

			assert.strictEqual(res.handled, false);
		});
	});
});

function flatButtons(buttons: Array<{ text: string }>, search: string): boolean {
	return buttons.some((b) => b.text.toLowerCase().includes(search.toLowerCase()));
}
