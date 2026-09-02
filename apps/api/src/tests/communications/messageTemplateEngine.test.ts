/**
 * messageTemplateEngine.test.ts
 *
 * Комплексный тест движка MessageTemplateEngine и API маршрутов шаблонов:
 * 1. Корректная подстановка макросов:
 *    {patient_name}, {doctor_name}, {clinic_name}, {clinic_phone},
 *    {appointment_date}, {appointment_time}, {total_amount_rub}.
 * 2. Поддержка каналов: telegram, whatsapp, sms, vk.
 * 3. Расчет SMS сегментов (GSM-7 vs UCS-2).
 * 4. 152-ФЗ / 323-ФЗ ст. 13: Защита врачебной тайны в открытых каналах (SMS/Мессенджеры):
 *    - Обнаружение диагнозов (кариес, пульпит, периодонтит, МКБ-10 K04.0, формулы зубов).
 *    - Блокировка при violationHandling = 'block'.
 *    - Автоматическая санитаризация при violationHandling = 'strip'.
 * 5. E2E тестирование API:
 *    - GET /api/communications/templates
 *    - POST /api/communications/templates (блокировка 152-ФЗ)
 *    - POST /api/communications/templates/render
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	chairs,
	clinics,
	messageTemplateCatalogs,
	organizations,
	patients,
	users,
} from "../../db/schema.js";
import { registerCommunicationRoutes } from "../../routes/communications.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerRouteNotFoundHandler } from "../../utils/routeNotFound.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "msgTplEngine";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const CLINIC_ID = fixtureUuid(NAMESPACE, 2);
const DOCTOR_USER_ID = fixtureUuid(NAMESPACE, 3);
const PATIENT_ID = fixtureUuid(NAMESPACE, 4);
const CHAIR_ID = fixtureUuid(NAMESPACE, 5);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 6);

describe("MessageTemplateEngine & 152-FZ Medical Secrecy Perimeter", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let doctorStaffToken: string;
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Стоматология ДЕНТЕ Плюс",
				})
				.onConflictDoNothing();

			await db
				.insert(clinics)
				.values({
					id: CLINIC_ID,
					organizationId: ORGANIZATION_ID,
					name: "Стоматологический центр ДЕНТЕ",
					phone: "+7 (495) 777-88-99",
					address: "г. Москва, ул. Профсоюзная, д. 45",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_USER_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Соколов Дмитрий Андреевич",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Алексеев Алексей Алексеевич",
					birthDate: "1988-04-12",
					phone: "+79161234567",
					status: "active",
				})
				.onConflictDoNothing();

			await db
				.insert(chairs)
				.values({
					id: CHAIR_ID,
					organizationId: ORGANIZATION_ID,
					clinicId: CLINIC_ID,
					name: "Кабинет 3, Кресло 1",
				})
				.onConflictDoNothing();

			await db
				.insert(appointments)
				.values({
					id: APPOINTMENT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					doctorUserId: DOCTOR_USER_ID,
					chairId: CHAIR_ID,
					startsAt: new Date("2026-09-15T14:30:00Z"),
					endsAt: new Date("2026-09-15T15:30:00Z"),
					status: "confirmed",
				})
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORGANIZATION_ID }, secret);
		doctorStaffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: DOCTOR_USER_ID,
				role: "doctor",
				fullName: "Соколов Дмитрий Андреевич",
			},
			secret,
		);

		app = createTenantTestApp();
		registerRouteNotFoundHandler(app);
		await registerCommunicationRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	// =========================================================================
	// 1. ПОДСТАНОВКА ТЕГОВ И РАЗРЕШЕНИЕ КОНТЕКСТА
	// =========================================================================
	test("1. Tag Substitution: All canonical macros resolved from database entities", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const templateText =
			"Здравствуйте, {patient_name}! Напоминаем о записи к врачу {doctor_name} в клинику «{clinic_name}» на {appointment_date} в {appointment_time}. Телефон: {clinic_phone}. Сумма к оплате: {total_amount_rub}.";

		const result = await withFixtureTenant(ORGANIZATION_ID, async () => {
			return MessageTemplateEngine.render(ORGANIZATION_ID, {
				templateText,
				patientId: PATIENT_ID,
				appointmentId: APPOINTMENT_ID,
				channel: "telegram",
				variables: {
					total_amount_rub: "4 200 ₽",
				},
			});
		});

		assert.strictEqual(result.ok, true, "Рендеринг должен быть успешен");
		assert.strictEqual(result.hasMedicalSecrecyViolation, false, "В тексте нет врачебной тайны");
		assert.ok(result.renderedText.includes("Алексеев Алексей Алексеевич"), "Пациент должен быть подставлен");
		assert.ok(result.renderedText.includes("Соколов Дмитрий Андреевич"), "Врач должен быть подставлен");
		assert.ok(result.renderedText.includes("Стоматологический центр ДЕНТЕ"), "Клиника должна быть подставлена");
		assert.ok(result.renderedText.includes("+7 (495) 777-88-99"), "Телефон клиники должен быть подставлен");
		assert.ok(result.renderedText.includes("14:30") || result.renderedText.includes("18:30") || result.renderedText.includes("17:30"), "Время должно быть подставлено");
		assert.ok(result.renderedText.includes("4 200 ₽"), "Сумма должна быть подставлена");
	});

	test("2. Tag Aliases: Short aliases ({patient}, {doctor}, {clinic}, {date}, {time}, {amount}) resolve identically", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const templateText = "Привет, {patient}! Ждем у врача {doctor} в {clinic} ({date} в {time}). К оплате: {amount}.";

		const result = await withFixtureTenant(ORGANIZATION_ID, async () => {
			return MessageTemplateEngine.render(ORGANIZATION_ID, {
				templateText,
				patientId: PATIENT_ID,
				appointmentId: APPOINTMENT_ID,
				channel: "whatsapp",
				variables: {
					amount: "1 500 ₽",
				},
			});
		});

		assert.strictEqual(result.ok, true);
		assert.ok(result.renderedText.includes("Алексеев Алексей Алексеевич"));
		assert.ok(result.renderedText.includes("Соколов Дмитрий Андреевич"));
		assert.ok(result.renderedText.includes("1 500 ₽"));
	});

	// =========================================================================
	// 2. КАНАЛЫ СВЯЗИ И ОЦЕНКА ОГРАНИЧЕНИЙ (SMS, Telegram, WhatsApp, VK)
	// =========================================================================
	test("3. Channel Limits & SMS Segmentation (GSM-7 vs UCS-2 Cyrillic)", () => {
		// ASCII латиница (GSM-7): 160 символов на сегмент
		const asciiText = "Hello! Your appointment at Dente clinic is confirmed for tomorrow. Call us at 123456.";
		const asciiRes = MessageTemplateEngine.calculateSmsSegments(asciiText);
		assert.strictEqual(asciiRes.encoding, "gsm7");
		assert.strictEqual(asciiRes.segments, 1);

		// Кириллица (UCS-2): 70 символов на 1 сегмент, далее по 67
		const shortRuText = "Здравствуйте! Ждем вас в клинике ДЕНТЕ на прием завтра в 14:00.";
		assert.ok(shortRuText.length <= 70, `Длина ${shortRuText.length} должна быть <= 70`);
		const ruRes = MessageTemplateEngine.calculateSmsSegments(shortRuText);
		assert.strictEqual(ruRes.encoding, "ucs2");
		assert.strictEqual(ruRes.segments, 1);

		// Длинная кириллица: > 70 знаков
		const longRuText =
			"Здравствуйте, уважаемый пациент! Напоминаем о вашем визите в стоматологическую клинику ДЕНТЕ на консультацию завтра в 14:30. Пожалуйста, подтвердите визит по телефону клиники.";
		const longRes = MessageTemplateEngine.calculateSmsSegments(longRuText);
		assert.strictEqual(longRes.encoding, "ucs2");
		assert.ok(longRes.segments >= 2, "Длинное кириллическое SMS должно разбиваться на >= 2 сегментов");
	});

	test("4. Channel Support: telegram, whatsapp, sms, vk validation", async () => {
		for (const ch of ["telegram", "whatsapp", "sms", "vk"] as const) {
			const res = await MessageTemplateEngine.render(ORGANIZATION_ID, {
				templateText: "Здравствуйте, {patient_name}! Ждем вас на прием.",
				channel: ch,
				allowPreviewFallback: true,
			});
			assert.strictEqual(res.ok, true, `Канал ${ch} должен успешно рендериться`);
			assert.strictEqual(res.channel, ch);
		}
	});

	// =========================================================================
	// 3. 152-ФЗ / 323-ФЗ: ЗАЩИТА ВРАЧЕБНОЙ ТАЙНЫ В ОТКРЫТЫХ КАНАЛАХ
	// =========================================================================
	test("5. 152-FZ / 323-ФЗ Attack: Text with dental diagnosis (кариес, пульпит, зуб 46) is BLOCKED", async () => {
		const maliciousText = "Здравствуйте, {patient_name}! У вас кариес зуба 46 и подозрение на пульпит. Ждем на прием.";

		const result = await MessageTemplateEngine.render(ORGANIZATION_ID, {
			templateText: maliciousText,
			channel: "sms",
			violationHandling: "block",
		});

		assert.strictEqual(result.ok, false, "Сообщение с диагнозом в SMS должно быть заблокировано");
		assert.strictEqual(result.hasMedicalSecrecyViolation, true);
		assert.ok(result.detectedMedicalTerms.length > 0);
		assert.ok(result.error?.includes("врачебная тайна"));
		console.log(`[152-FZ AUDIT BLOCKED TERMS]: ${result.detectedMedicalTerms.join(", ")}`);
	});

	test("6. 152-FZ / 323-ФЗ Attack: Text with ICD-10 code (K04.0) and surgery is BLOCKED", async () => {
		const leakText = "Напоминаем: у вас диагноз K04.0, запланирован синус-лифтинг и экстирпация пульпы.";

		const leakDetection = MessageTemplateEngine.detectMedicalSecrecyLeaks(leakText);
		assert.strictEqual(leakDetection.hasLeak, true);
		assert.ok(leakDetection.detectedTerms.some((t) => /K04\.0/i.test(t)));
		assert.ok(leakDetection.detectedTerms.some((t) => /синус-лифтинг/i.test(t)));
	});

	test("7. 152-FZ / 323-ФЗ Sanitization: violationHandling = 'strip' replaces clinical secrets", async () => {
		const rawWithLeak = "Здравствуйте, {patient_name}! Ждем на лечение: кариес зуба 36 и пульпит.";

		const result = await MessageTemplateEngine.render(ORGANIZATION_ID, {
			templateText: rawWithLeak,
			channel: "telegram",
			violationHandling: "strip",
			allowPreviewFallback: true,
		});

		assert.strictEqual(result.ok, true, "После санитизации сообщение может уйти");
		assert.strictEqual(result.hasMedicalSecrecyViolation, true);
		assert.ok(!result.renderedText.includes("кариес"), "Слово 'кариес' должно быть вырезано");
		assert.ok(!result.renderedText.includes("пульпит"), "Слово 'пульпит' должно быть вырезано");
		assert.ok(result.renderedText.includes("[информация защищена 152-ФЗ]"), "Должен быть вставлен безопасный маркер");
		assert.ok(result.warning !== undefined, "Должно быть предупреждение в ответе");
	});

	// =========================================================================
	// 4. E2E API МАРШРУТЫ: /api/communications/templates
	// =========================================================================
	test("8. API POST /api/communications/templates: Creating template with medical leak is REJECTED (422)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				title: "Напоминание о лечении периодонтита",
				channel: "telegram",
				templateText: "Здравствуйте, {patient_name}! Ждем на лечение периодонтита зуба 16.",
			},
		});

		assert.strictEqual(res.statusCode, 422, "Шаблон с врачебной тайной должен отвергаться со статусом 422");
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "MedicalSecrecyInTemplateError");
		assert.ok(body.message.includes("врачебной тайной"));
	});

	test("9. API POST /api/communications/templates: Clean template is CREATED (201 Created)", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/communications/templates",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				title: "Стандартное напоминание о визите",
				channel: "whatsapp",
				intent: "appointment_reminder",
				templateText: "Здравствуйте, {patient_name}! Ждем вас в клинике «{clinic_name}» {appointment_date} в {appointment_time}.",
			},
		});

		assert.strictEqual(res.statusCode, 201, "Корректный шаблон должен успешно создаваться (201)");
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.template.title, "Стандартное напоминание о визите");
	});

	test("10. API GET /api/communications/templates: Lists stored templates for organization", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/communications/templates?channel=whatsapp",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.success, true);
		assert.ok(Array.isArray(body.templates));
		assert.ok(body.templates.some((tpl: any) => tpl.title === "Стандартное напоминание о визите"));
	});

	test("11. API POST /api/communications/templates/render: Renders with variables and blocks leaks", async (t) => {
		if (!databaseReady) return t.skip("База данных недоступна");

		// Запрос с утечкой диагноза в переменной
		const leakRes = await app.inject({
			method: "POST",
			url: "/api/communications/templates/render",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				templateText: "Здравствуйте, {patient_name}! Ваш диагноз: {diagnosis_text}",
				channel: "sms",
				variables: {
					patient_name: "Сергей Иванович",
					diagnosis_text: "Острый глубокий кариес",
				},
				violationHandling: "block",
			},
		});

		assert.strictEqual(leakRes.statusCode, 422, "Рендеринг с диагнозом должен быть заблокирован (422)");
		const leakBody = JSON.parse(leakRes.payload);
		assert.strictEqual(leakBody.error, "MedicalSecrecyViolation");

		// Корректный запрос
		const okRes = await app.inject({
			method: "POST",
			url: "/api/communications/templates/render",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": doctorStaffToken,
			},
			payload: {
				templateText: "Здравствуйте, {patient_name}! Ждем в {clinic_name} {appointment_date}.",
				channel: "sms",
				patientId: PATIENT_ID,
				appointmentId: APPOINTMENT_ID,
			},
		});

		assert.strictEqual(okRes.statusCode, 200);
		const okBody = JSON.parse(okRes.payload);
		assert.strictEqual(okBody.success, true);
		assert.strictEqual(okBody.result.ok, true);
		assert.ok(okBody.result.renderedText.includes("Алексеев Алексей Алексеевич"));
	});
});
