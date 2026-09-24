import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import {
	clinics,
	denteTelegramChatLinks,
	organizations,
	patients,
	users,
} from "../db/schema.js";
import {
	registerTelegramRoutes,
	registerTelegramWebhookRoutes,
} from "../routes/telegram.js";
import {
	clearTelegramDialogSession,
	cleanupStaleTelegramDialogSessions,
	countTelegramDialogSessions,
	getTelegramDialogSession,
	resetTelegramDialogSessions,
	setTelegramDialogSession,
	updateTelegramDialogSession,
} from "../services/telegram/telegramLegacyMemoryStore.js";
import {
	findActiveDenteTelegramChatLinkByFingerprint,
	findActiveDenteTelegramChatLinkBySubject,
	findPatientByTelegramChatId,
	findStaffByTelegramChatId,
	upsertDenteTelegramChatLink,
} from "../telegram/chatLinks.js";
import {
	buildSignedAppointmentCallbackData,
	buildVisitReminderInlineKeyboard,
	buildVisitReminderText,
	sendTelegramTextMessage,
	sendVisitCancellationNotification,
	sendVisitConfirmationReceipt,
	sendVisitReminderNotification,
} from "../telegramTransport.js";
import { encryptTelegramChatId } from "../utils/telegramChatRef.js";
import { fixtureUuid, withFixtureTenant } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

/**
 * НАПРАВЛЕНИЕ 7: TELEGRAM-ИНТЕГРАЦИЯ & БОТ
 *
 * Комплексный приемочный тест для подтверждения всех ключевых инвариантов:
 * 1. Изолированное in-memory хранилище сессий диалогов с TTL и защитой от утечек (LRU/ceiling).
 * 2. Сопоставление открытого Telegram chat_id с пациентами/врачами в PostgreSQL с жесткой изоляцией тенантов (152-ФЗ).
 * 3. Отправка напоминаний о визитах за 24 часа с кнопками в 1 клик и абсолютным запретом диагнозов (323-ФЗ ст. 13).
 * 4. Защита Telegram-вебхука от подделки запросов (webhook spoofing) через secret token.
 */

describe("Направление 7: Telegram Integration & Bot Core Invariants", () => {
	const PRIMARY_ORG = fixtureUuid("telegramDirection7", 1);
	const FOREIGN_ORG = fixtureUuid("telegramDirection7", 2);
	const PRIMARY_PATIENT_ID = fixtureUuid("telegramDirection7", 10);
	const PRIMARY_STAFF_ID = fixtureUuid("telegramDirection7", 20);

	const PATIENT_CHAT_ID = "998877661";
	const STAFF_CHAT_ID = "998877662";
	const PATIENT_FINGERPRINT = "fp_patient_998877661";
	const STAFF_FINGERPRINT = "fp_staff_998877662";

	const WEBHOOK_SECRET = "secret-token-tg-webhook-777";
	const BOT_TOKEN = "123456:synthetic-direction7-bot-token";

	let app: FastifyInstance | null = null;
	const fetchCalls: { url: string; body: Record<string, unknown> }[] = [];

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTAL_STATE_PERSISTENCE = "on";
		process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
		process.env.DENTE_TELEGRAM_BOT_TOKEN = BOT_TOKEN;
		process.env.DENTE_TELEGRAM_BOT_USERNAME = "dentecrm_bot";
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = WEBHOOK_SECRET;
		process.env.DENTE_TELEGRAM_LINK_CODE_SALT = "synthetic-salt-dir7";
		process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY =
			"synthetic-chat-key-direction7-test-32bytes!";

		// Перехват исходящих fetch для изоляции сетевых вызовов
		globalThis.fetch = (async (url: string, init?: RequestInit) => {
			const bodyText = typeof init?.body === "string" ? init.body : "{}";
			let parsedBody = {};
			try {
				parsedBody = JSON.parse(bodyText);
			} catch {}
			fetchCalls.push({ url: String(url), body: parsedBody });
			return {
				ok: true,
				status: 200,
				json: async () => ({
					ok: true,
					result: { message_id: 888123 },
				}),
			};
		}) as unknown as typeof fetch;

		// Инициализация тестового экземпляра Fastify
		app = createTenantTestApp();
		await registerTelegramRoutes(app);
		await registerTelegramWebhookRoutes(app);
		await app.ready();

		// Настройка основной организации и субъектов в БД
		await withFixtureTenant(PRIMARY_ORG, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: PRIMARY_ORG, name: "Основная клиника Telegram" })
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
					id: PRIMARY_PATIENT_ID,
					organizationId: PRIMARY_ORG,
					fullName: "Тестовый Пациент Телеграмович",
					phone: "+79991112233",
					status: "active",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: PRIMARY_STAFF_ID,
					organizationId: PRIMARY_ORG,
					fullName: "Др. Стоматологов Иван",
					email: "doctor.tg@example.com",
					role: "doctor",
				})
				.onConflictDoNothing();

			await tx
				.delete(denteTelegramChatLinks)
				.where(eq(denteTelegramChatLinks.organizationId, PRIMARY_ORG));
		});

		// Настройка чужой организации для проверки изоляции тенантов
		await withFixtureTenant(FOREIGN_ORG, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: FOREIGN_ORG, name: "Чужая клиника (Взломщик)" })
				.onConflictDoNothing();

			await tx
				.delete(denteTelegramChatLinks)
				.where(eq(denteTelegramChatLinks.organizationId, FOREIGN_ORG));
		});
	});

	after(async () => {
		await app?.close();
		resetTelegramDialogSessions();

		await withFixtureTenant(PRIMARY_ORG, async (tx) => {
			await tx
				.delete(denteTelegramChatLinks)
				.where(eq(denteTelegramChatLinks.organizationId, PRIMARY_ORG));
			await tx
				.delete(patients)
				.where(eq(patients.organizationId, PRIMARY_ORG));
			await tx.delete(users).where(eq(users.organizationId, PRIMARY_ORG));
			await tx
				.delete(organizations)
				.where(eq(organizations.id, PRIMARY_ORG));
		});

		await withFixtureTenant(FOREIGN_ORG, async (tx) => {
			await tx
				.delete(denteTelegramChatLinks)
				.where(eq(denteTelegramChatLinks.organizationId, FOREIGN_ORG));
			await tx
				.delete(organizations)
				.where(eq(organizations.id, FOREIGN_ORG));
		});
	});

	// =========================================================================
	// 1. ТЕСТЫ IN-MEMORY ДИАЛОГОВЫХ СЕССИЙ (telegramLegacyMemoryStore.ts)
	// =========================================================================
	describe("1. Telegram Dialog Session Cache & Expiration", () => {
		test("создает, читает, обновляет и удаляет сессию диалога", () => {
			resetTelegramDialogSessions();
			const now = Date.now();

			const session = setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "chat_fp_101",
					chatId: "1001",
					subjectType: "patient",
					subjectId: PRIMARY_PATIENT_ID,
					currentStep: "idle",
					metadata: { testKey: "testVal" },
					ttlMs: 60_000,
				},
				now,
			);

			assert.ok(session.sessionId);
			assert.equal(session.organizationId, PRIMARY_ORG);
			assert.equal(session.currentStep, "idle");
			assert.equal(session.metadata.testKey, "testVal");

			// Чтение активной сессии
			const fetched = getTelegramDialogSession(
				"chat_fp_101",
				PRIMARY_ORG,
				"default",
				now + 1000,
			);
			assert.ok(fetched);
			assert.equal(fetched.sessionId, session.sessionId);
			assert.equal(fetched.lastActiveAt, now + 1000); // продлилась активность

			// Обновление шага сессии
			const updated = updateTelegramDialogSession(
				"chat_fp_101",
				PRIMARY_ORG,
				{
					currentStep: "awaiting_name",
					lastCommand: "/start",
					metadata: { stepCount: 1 },
				},
				"default",
				now + 2000,
			);
			assert.ok(updated);
			assert.equal(updated.currentStep, "awaiting_name");
			assert.equal(updated.lastCommand, "/start");
			assert.equal(updated.metadata.testKey, "testVal"); // сохранилось прежнее свойство
			assert.equal(updated.metadata.stepCount, 1);

			// Удаление сессии
			const deleted = clearTelegramDialogSession(
				"chat_fp_101",
				PRIMARY_ORG,
				"default",
			);
			assert.equal(deleted, true);

			const afterDelete = getTelegramDialogSession(
				"chat_fp_101",
				PRIMARY_ORG,
				"default",
				now + 3000,
			);
			assert.equal(afterDelete, null);
		});

		test("автоматически считает сессию протухшей по истечении TTL", () => {
			resetTelegramDialogSessions();
			const baseTime = Date.now();

			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "chat_fp_expired",
					ttlMs: 10_000, // 10 секунд
				},
				baseTime,
			);

			// До истечения TTL сессия жива
			const alive = getTelegramDialogSession(
				"chat_fp_expired",
				PRIMARY_ORG,
				"default",
				baseTime + 5000,
			);
			assert.ok(alive);

			// После истечения TTL сессия возвращает null
			const expired = getTelegramDialogSession(
				"chat_fp_expired",
				PRIMARY_ORG,
				"default",
				baseTime + 10_001,
			);
			assert.equal(expired, null);
		});

		test("cleanupStaleTelegramDialogSessions очищает все протухшие сессии", () => {
			resetTelegramDialogSessions();
			const now = Date.now();

			// 2 активные сессии, 3 протухшие
			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "fp_act_1",
					ttlMs: 100_000,
				},
				now,
			);
			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "fp_act_2",
					ttlMs: 100_000,
				},
				now,
			);

			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "fp_exp_1",
					ttlMs: 5000,
				},
				now,
			);
			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "fp_exp_2",
					ttlMs: 5000,
				},
				now,
			);
			setTelegramDialogSession(
				{
					organizationId: PRIMARY_ORG,
					botConfigId: "default",
					chatFingerprint: "fp_exp_3",
					ttlMs: 5000,
				},
				now,
			);

			const purged = cleanupStaleTelegramDialogSessions(now + 10_000);
			assert.equal(purged, 3);
			assert.equal(countTelegramDialogSessions(PRIMARY_ORG, now + 10_000), 2);
		});
	});

	// =========================================================================
	// 2. МУЛЬТИТЕНАНТНОСТЬ И СОПОСТАВЛЕНИЕ ЧАТОВ (chatLinks.ts)
	// =========================================================================
	describe("2. Multi-tenant Chat Link Matching & 152-ФЗ Isolation", () => {
		test("находит пациента и врача по открытому chat_id через AES-256-GCM chatTransportRef", async () => {
			const encryptedPatientChatRef = encryptTelegramChatId(PATIENT_CHAT_ID);
			const encryptedStaffChatRef = encryptTelegramChatId(STAFF_CHAT_ID);
			assert.ok(encryptedPatientChatRef?.startsWith("v1."));
			assert.ok(encryptedStaffChatRef?.startsWith("v1."));

			// Сохраняем связки в базу под основной организацией
			await upsertDenteTelegramChatLink({
				organizationId: PRIMARY_ORG,
				botConfigId: "default",
				subjectType: "patient",
				subjectId: PRIMARY_PATIENT_ID,
				chatFingerprint: PATIENT_FINGERPRINT,
				chatTransportRef: encryptedPatientChatRef,
				chatIdLast4: PATIENT_CHAT_ID.slice(-4),
			});

			await upsertDenteTelegramChatLink({
				organizationId: PRIMARY_ORG,
				botConfigId: "default",
				subjectType: "staff",
				subjectId: PRIMARY_STAFF_ID,
				chatFingerprint: STAFF_FINGERPRINT,
				chatTransportRef: encryptedStaffChatRef,
				chatIdLast4: STAFF_CHAT_ID.slice(-4),
			});

			// Поиск пациента основной организацией
			const patientMatch = await findPatientByTelegramChatId(
				{ organizationId: PRIMARY_ORG, botConfigId: "default" },
				PATIENT_CHAT_ID,
			);
			assert.ok(patientMatch);
			assert.equal(patientMatch.patientId, PRIMARY_PATIENT_ID);
			assert.equal(patientMatch.chatLink.status, "active");

			// Поиск врача основной организацией
			const staffMatch = await findStaffByTelegramChatId(
				{ organizationId: PRIMARY_ORG, botConfigId: "default" },
				STAFF_CHAT_ID,
			);
			assert.ok(staffMatch);
			assert.equal(staffMatch.staffId, PRIMARY_STAFF_ID);

			// Поиск по отпечатку
			const fpMatch = await findActiveDenteTelegramChatLinkByFingerprint(
				{ organizationId: PRIMARY_ORG, botConfigId: "default" },
				PATIENT_FINGERPRINT,
			);
			assert.ok(fpMatch);
			assert.equal(fpMatch.subjectId, PRIMARY_PATIENT_ID);

			// Поиск по субъекту
			const subjectMatch = await findActiveDenteTelegramChatLinkBySubject(
				{ organizationId: PRIMARY_ORG, botConfigId: "default" },
				"patient",
				PRIMARY_PATIENT_ID,
			);
			assert.ok(subjectMatch);
			assert.equal(subjectMatch.chatFingerprint, PATIENT_FINGERPRINT);
		});

		test("152-ФЗ: Чужая организация не может получить доступ к связкам чата пациента", async () => {
			// Чужая организация (FOREIGN_ORG) пытается найти пациента по тому же chat_id
			const foreignPatientLookup = await findPatientByTelegramChatId(
				{ organizationId: FOREIGN_ORG, botConfigId: "default" },
				PATIENT_CHAT_ID,
			);
			assert.equal(
				foreignPatientLookup,
				null,
				"152-ФЗ нарушение: чужой тенант смог обнаружить привязку пациента другой клиники!",
			);

			const foreignStaffLookup = await findStaffByTelegramChatId(
				{ organizationId: FOREIGN_ORG, botConfigId: "default" },
				STAFF_CHAT_ID,
			);
			assert.equal(
				foreignStaffLookup,
				null,
				"152-ФЗ нарушение: чужой тенант смог обнаружить сотрудника другой клиники!",
			);

			const foreignFpLookup = await findActiveDenteTelegramChatLinkByFingerprint(
				{ organizationId: FOREIGN_ORG, botConfigId: "default" },
				PATIENT_FINGERPRINT,
			);
			assert.equal(foreignFpLookup, null);
		});
	});

	// =========================================================================
	// 3. УВЕДОМЛЕНИЯ И ВРАЧЕБНАЯ ТАЙНА (telegramTransport.ts)
	// =========================================================================
	describe("3. Visit Notifications & 323-ФЗ Medical Secrecy Guarantees", () => {
		test("buildVisitReminderText формирует текст только с датой, клиникой и контактами", () => {
			const text = buildVisitReminderText({
				clinicName: "ДентаЛюкс",
				appointmentStartsAt: "2026-04-15T14:30:00.000Z",
				doctorName: "Иванов И.И.",
				clinicAddress: "ул. Ленина, 10",
				clinicPhone: "+7 (999) 000-11-22",
			});

			assert.ok(text.includes("ДентаЛюкс"));
			assert.ok(text.includes("Иванов И.И."));
			assert.ok(text.includes("ул. Ленина, 10"));
			assert.ok(text.includes("+7 (999) 000-11-22"));
			assert.ok(text.toLowerCase().includes("подтвердите ваш визит"));
			// Никаких диагнозов или упоминаний процедур
			assert.equal(text.includes("кариес"), false);
			assert.equal(text.includes("пульпит"), false);
		});

		test("buildVisitReminderInlineKeyboard генерирует подписанные HMAC-кнопки подтверждения и отмены", () => {
			const keyboard = buildVisitReminderInlineKeyboard({
				appointmentId: "a1111111-2222-3333-4444-555555555555",
				startsAtIso: "2026-04-15T14:30:00.000Z",
				callbackSecret: "super-secret-key-for-hmac",
				organizationId: PRIMARY_ORG,
				clinicId: PRIMARY_ORG,
				botConfigId: "default",
			});

			const rows = keyboard.inline_keyboard as Array<Array<{ text: string; callback_data: string }>>;
			assert.equal(rows.length, 2);

			const confirmBtn = rows[0][0];
			assert.ok(confirmBtn.text.includes("Подтвердить"));
			assert.ok(confirmBtn.callback_data.startsWith("d1.c."));

			const rescheduleBtn = rows[1][0];
			assert.ok(rescheduleBtn.text.includes("Перенести"));
			assert.ok(rescheduleBtn.callback_data.startsWith("d1.r."));

			const cancelBtn = rows[1][1];
			assert.ok(cancelBtn.text.includes("Отменить"));
			assert.ok(cancelBtn.callback_data.startsWith("d1.p."));
		});

		test("sendVisitReminderNotification отправляет корректное напоминание в Telegram Bot API", async () => {
			fetchCalls.length = 0;

			const result = await sendVisitReminderNotification({
				botToken: BOT_TOKEN,
				chatId: PATIENT_CHAT_ID,
				organizationId: PRIMARY_ORG,
				clinicName: "ДентаЛюкс",
				appointmentId: "a1111111-2222-3333-4444-555555555555",
				appointmentStartsAt: "2026-04-15T14:30:00.000Z",
				clinicPhone: "+7 (999) 000-11-22",
				callbackSecret: "secret-key-123",
			});

			assert.equal(result.ok, true);
			assert.equal(fetchCalls.length, 1);
			const call = fetchCalls[0];
			assert.ok(call.url.includes("/sendMessage"));
			assert.equal(call.body.chat_id, PATIENT_CHAT_ID);
			assert.ok(String(call.body.text).includes("ДентаЛюкс"));
			assert.ok(call.body.reply_markup);
		});

		test("323-ФЗ ст. 13: блокирует отправку сообщения с диагнозом ДО обращения в сокет Telegram", async () => {
			fetchCalls.length = 0;

			// Попытка отправить сообщение с клиническим диагнозом
			const leakTexts = [
				"Здравствуйте! Напоминаем о лечении: острый пульпит зуба 46.",
				"У вас диагностирован кариес эмали K02.0 и периодонтит, ждем на лечение.",
				"Обнаружена гранулема зуба 12 и альвеолит.",
			];

			for (const leakText of leakTexts) {
				const result = await sendTelegramTextMessage({
					botToken: BOT_TOKEN,
					chatId: PATIENT_CHAT_ID,
					text: leakText,
				});

				assert.equal(result.ok, false);
				assert.equal(result.errorCode, 422);
				assert.equal(result.errorClass, "medical_secrecy_violation");
				assert.ok(result.details?.includes("323-ФЗ"));
			}

			// Физический сокет Telegram fetch не вызывался ни разу
			assert.equal(fetchCalls.length, 0);
		});

		test("отправка квитанции подтверждения и отмены проходит успешно", async () => {
			fetchCalls.length = 0;

			const confirmReceipt = await sendVisitConfirmationReceipt({
				botToken: BOT_TOKEN,
				chatId: PATIENT_CHAT_ID,
				organizationId: PRIMARY_ORG,
				clinicName: "ДентаЛюкс",
				appointmentStartsAt: "2026-04-15T14:30:00.000Z",
				clinicPhone: "+7 (999) 000-11-22",
			});
			assert.equal(confirmReceipt.ok, true);

			const cancelNotice = await sendVisitCancellationNotification({
				botToken: BOT_TOKEN,
				chatId: PATIENT_CHAT_ID,
				organizationId: PRIMARY_ORG,
				clinicName: "ДентаЛюкс",
				appointmentStartsAt: "2026-04-15T14:30:00.000Z",
				clinicPhone: "+7 (999) 000-11-22",
			});
			assert.equal(cancelNotice.ok, true);
			assert.equal(fetchCalls.length, 2);
		});
	});

	// =========================================================================
	// 4. БЕЗОПАСНОСТЬ ВЕБХУКА И ЗАЩИТА ОТ SPOOFING (routes/telegram.ts)
	// =========================================================================
	describe("4. Webhook Security & Spoofing Protection", () => {
		test("отклоняет запросы с отсутствующим или неверным секретным токеном вебхука", async () => {
			assert.ok(app);

			// Запрос без секретного токена
			const noSecretRes = await app.inject({
				method: "POST",
				url: "/api/telegram/webhook",
				payload: {
					update_id: 10001,
					message: {
						message_id: 1,
						chat: { id: 12345, type: "private" },
						from: { id: 12345, first_name: "Attacker" },
						text: "/start",
					},
				},
			});
			assert.equal(noSecretRes.statusCode, 401);
			const noSecretBody = noSecretRes.json() as Record<string, unknown>;
			assert.equal(noSecretBody.error, "TelegramWebhookSecretMismatch");

			// Запрос с неверным секретным токеном
			const badSecretRes = await app.inject({
				method: "POST",
				url: "/api/telegram/webhook",
				headers: {
					"x-telegram-bot-api-secret-token": "attacker-fake-secret",
				},
				payload: {
					update_id: 10002,
					message: {
						message_id: 2,
						chat: { id: 12345, type: "private" },
						from: { id: 12345, first_name: "Attacker" },
						text: "/start",
					},
				},
			});
			assert.equal(badSecretRes.statusCode, 401);
			const badSecretBody = badSecretRes.json() as Record<string, unknown>;
			assert.equal(badSecretBody.error, "TelegramWebhookSecretMismatch");
		});

		test("принимает запрос с верным токеном и обновляет сессию диалога", async () => {
			assert.ok(app);
			resetTelegramDialogSessions();

			const validRes = await app.inject({
				method: "POST",
				url: "/api/telegram/webhook",
				headers: {
					"x-telegram-bot-api-secret-token": WEBHOOK_SECRET,
				},
				payload: {
					update_id: 99001,
					message: {
						message_id: 55,
						chat: { id: 770100999, type: "private" },
						from: { id: 770100999, first_name: "Ivan" },
						text: "/help",
					},
				},
			});

			assert.equal(validRes.statusCode, 200);
			const body = validRes.json() as Record<string, unknown>;
			assert.equal(body.ok, true);

			// Проверяем, что в telegramLegacyMemoryStore зафиксировалась сессия
			const sessionCount = countTelegramDialogSessions();
			assert.ok(sessionCount >= 1, "Сессия диалога должна быть зафиксирована в хранилище");
		});
	});
});
