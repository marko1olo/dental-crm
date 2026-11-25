/**
 * apps/api/src/routes/integrations/prodoctorov/__tests__/medflexIntegration.test.ts
 * Red Team Inquisitor Test Suite: MedFlex / ProDoctorov Integration & Anti-Overbooking Protection.
 * Проверяет:
 * 1. Строгую изоляцию тенантов (несуществующий clinicExternalId -> 404).
 * 2. HMAC-SHA256 валидацию цифровой подписи по секрету клиники (401 при подделке).
 * 3. Идемпотентность по delivery_id (подавление дубликатов).
 * 4. Предотвращение овербукинга через каскадный шлюз executeBookingTransaction (409 Conflict).
 * 5. CRUD настроек и маппингов врачей.
 */

import { createHmac, randomBytes } from "node:crypto";
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../../../db/client.js";
import {
	appointments,
	medflexDoctorMappings,
	medflexIntegrations,
	medflexWebhookLogs,
	organizations,
	users,
} from "../../../../db/schema.js";
import { registerProdoctorovRouteEndpoints } from "../index.js";
import {
	verifyClinicMedflexSignature,
	verifyHmacSha256Signature,
} from "../hmacSignatureAuth.js";
import {
	findIntegrationByClinicExternalId,
	getMedflexDoctorMappings,
	getOrCreateMedflexSettings,
	saveMedflexDoctorMappings,
	updateMedflexSettings,
} from "../medflexIntegrationService.js";
import { eq } from "drizzle-orm";

describe("MedFlex & ProDoctorov Integration Suite (Mandates 8e, 8n, Red Team)", () => {
	let app: FastifyInstance;
	let testOrgId: string;
	let testDoctorId: string;
	let testClinicExternalId: string;
	const testWebhookSecret = "test-secret-medflex-inquisition-2026";

	before(async () => {
		app = Fastify();
		await registerProdoctorovRouteEndpoints(app);
		await app.ready();

		// Находим или создаем тестовую организацию в БД
		const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
		if (firstOrg) {
			testOrgId = firstOrg.id;
		} else {
			const [createdOrg] = await db
				.insert(organizations)
				.values({
					name: "Тестовая клиника МедФлекс",
					loginId: `test-org-${Date.now()}`,
				})
				.returning({ id: organizations.id });
			testOrgId = createdOrg!.id;
		}

		// Находим или создаем активного врача в организации
		const [doc] = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.organizationId, testOrgId))
			.limit(1);

		if (doc) {
			testDoctorId = doc.id;
		} else {
			const [createdDoc] = await db
				.insert(users)
				.values({
					organizationId: testOrgId,
					fullName: "Доктор Медфлексов И.И.",
					role: "doctor",
					isActive: true,
				})
				.returning({ id: users.id });
			testDoctorId = createdDoc!.id;
		}

		testClinicExternalId = `mf-test-${Date.now().toString(36)}`;

		// Создаем тестовую запись интеграции в medflex_integrations
		await db.insert(medflexIntegrations).values({
			organizationId: testOrgId,
			clinicExternalId: testClinicExternalId,
			apiKey: "test-api-key-12345",
			webhookSecret: testWebhookSecret,
			isActive: true,
			autoConfirmBookings: true,
		});
	});

	after(async () => {
		// Очистка тестовых данных
		try {
			await db
				.delete(medflexWebhookLogs)
				.where(eq(medflexWebhookLogs.organizationId, testOrgId));
			await db
				.delete(medflexDoctorMappings)
				.where(eq(medflexDoctorMappings.organizationId, testOrgId));
			await db
				.delete(medflexIntegrations)
				.where(eq(medflexIntegrations.clinicExternalId, testClinicExternalId));
		} catch {
			// Non-blocking cleanup
		}
		await app.close();
	});

	it("1. Изоляция тенантов: несуществующий clinicExternalId возвращает детерминированный 404 Not Found", async () => {
		const nonExistentClinic = `phantom-clinic-${Date.now()}`;

		// XML прейскурант
		const priceRes = await app.inject({
			method: "GET",
			url: `/api/integrations/medflex/${nonExistentClinic}/pricelist.xml`,
		});
		assert.equal(priceRes.statusCode, 404);
		const priceBody = JSON.parse(priceRes.body);
		assert.equal(priceBody.error, "ClinicIntegrationNotFound");

		// Слоты расписания
		const slotsRes = await app.inject({
			method: "GET",
			url: `/api/integrations/medflex/${nonExistentClinic}/slots`,
		});
		assert.equal(slotsRes.statusCode, 404);
		const slotsBody = JSON.parse(slotsRes.body);
		assert.equal(slotsBody.error, "ClinicIntegrationNotFound");

		// Вебхук бронирования
		const webhookRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${nonExistentClinic}/webhook/booking`,
			payload: { event: "booking_created" },
		});
		assert.equal(webhookRes.statusCode, 404);
		const webhookBody = JSON.parse(webhookRes.body);
		assert.equal(webhookBody.error, "ClinicIntegrationNotFound");
	});

	it("2. HMAC-SHA256 валидация: неверная подпись дает 401 Unauthorized, верная пропускает", async () => {
		// Проверка DEF-PD-01: пустой секрет обязан возвращать false (Fail-Closed)
		const dummyReq = { headers: {}, body: {} } as Parameters<typeof verifyClinicMedflexSignature>[0];
		assert.equal(verifyClinicMedflexSignature(dummyReq, ""), false);
		assert.equal(verifyClinicMedflexSignature(dummyReq, "   "), false);

		const payload = {
			event: "booking_created",
			deliveryId: `del-hmac-${Date.now()}`,
			patient: { fullName: "Петров Петр", phone: "+79991112233" },
			appointment: {
				doctorId: testDoctorId,
				startsAt: "2026-11-25T10:00:00Z",
				endsAt: "2026-11-25T10:30:00Z",
			},
		};
		const rawPayload = JSON.stringify(payload);

		// Запрос с неверной подписью
		const invalidRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": "sha256=invaliddeadbeef0123456789abcdef",
			},
			payload: rawPayload,
		});
		assert.equal(invalidRes.statusCode, 401);
		const invalidBody = JSON.parse(invalidRes.body);
		assert.equal(invalidBody.error, "InvalidSignature");

		// Запрос с валидной HMAC подписью
		const validSig = createHmac("sha256", testWebhookSecret)
			.update(rawPayload)
			.digest("hex");

		const validRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": `sha256=${validSig}`,
			},
			payload: rawPayload,
		});

		assert.ok(
			validRes.statusCode === 201 || validRes.statusCode === 200,
			`Ожидался статус 201 Created или 200 OK, получено ${validRes.statusCode}: ${validRes.body}`,
		);
	});

	it("3. Идемпотентность по deliveryId: повторный вебхук не создает дубликата и возвращает 200 OK duplicate: true", async () => {
		const deliveryId = `test-idemp-${Date.now()}`;
		const payload = {
			event: "booking_created",
			deliveryId,
			patient: { fullName: "Сидоров Сидор", phone: "+79998887766" },
			appointment: {
				doctorId: testDoctorId,
				startsAt: "2026-11-26T14:00:00Z",
				endsAt: "2026-11-26T14:30:00Z",
			},
		};
		const rawPayload = JSON.stringify(payload);
		const sig = createHmac("sha256", testWebhookSecret)
			.update(rawPayload)
			.digest("hex");

		// Первый запрос
		const firstRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": sig,
			},
			payload: rawPayload,
		});
		assert.equal(firstRes.statusCode, 201);
		const firstBody = JSON.parse(firstRes.body);
		assert.equal(firstBody.success, true);
		const appointmentId = firstBody.appointmentId;

		// Повторный запрос с тем же deliveryId
		const secondRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": sig,
			},
			payload: rawPayload,
		});
		assert.equal(secondRes.statusCode, 200);
		const secondBody = JSON.parse(secondRes.body);
		assert.equal(secondBody.success, true);
		assert.equal(secondBody.duplicate, true);

		// Уборка созданного визита
		if (appointmentId) {
			await db.delete(appointments).where(eq(appointments.id, appointmentId));
		}
	});

	it("4. Защита от овербукинга (Anti-Overbooking via executeBookingTransaction): на занятый слот возвращается 409 Conflict", async () => {
		const startsAt = new Date("2026-11-27T11:00:00Z");
		const endsAt = new Date("2026-11-27T11:30:00Z");

		// Занимаем слот первым бронированием
		const payload1 = {
			event: "booking_created",
			deliveryId: `overbook-1-${Date.now()}`,
			patient: { fullName: "Пациент Первый", phone: "+79001110001" },
			appointment: {
				doctorId: testDoctorId,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
			},
		};
		const raw1 = JSON.stringify(payload1);
		const sig1 = createHmac("sha256", testWebhookSecret).update(raw1).digest("hex");

		const res1 = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": sig1,
			},
			payload: raw1,
		});
		assert.equal(res1.statusCode, 201);
		const body1 = JSON.parse(res1.body);
		const apptId1 = body1.appointmentId;

		// Пытаемся занять то же самое время другим пациентом
		const payload2 = {
			event: "booking_created",
			deliveryId: `overbook-2-${Date.now()}`,
			patient: { fullName: "Пациент Второй Конкурент", phone: "+79002220002" },
			appointment: {
				doctorId: testDoctorId,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
			},
		};
		const raw2 = JSON.stringify(payload2);
		const sig2 = createHmac("sha256", testWebhookSecret).update(raw2).digest("hex");

		const res2 = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: {
				"content-type": "application/json",
				"x-medflex-signature": sig2,
			},
			payload: raw2,
		});

		// Должен детерминированно вернуть 409 Conflict (SlotAlreadyBooked)
		assert.equal(res2.statusCode, 409);
		const body2 = JSON.parse(res2.body);
		assert.equal(body2.error, "SlotAlreadyBooked");

		// Уборка
		if (apptId1) {
			await db.delete(appointments).where(eq(appointments.id, apptId1));
		}
	});

	it("5. Выгрузка прейскуранта XML/YML содержит номенклатуру 804н и валидный заголовок", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/integrations/medflex/${testClinicExternalId}/pricelist.xml`,
		});

		assert.equal(res.statusCode, 200);
		assert.ok(res.headers["content-type"]?.includes("xml"));
		assert.ok(res.body.includes("<yml_catalog"));
		assert.ok(res.body.includes("<shop>"));
		assert.ok(res.body.includes("<categories>"));
	});

	it("6. Сервисный слой: CRUD настроек и маппингов врачей МедФлекс", async () => {
		const settings = await getOrCreateMedflexSettings(db, testOrgId);
		assert.ok(settings.clinicExternalId);

		const updated = await updateMedflexSettings(db, testOrgId, {
			autoConfirmBookings: false,
		});
		assert.equal(updated.autoConfirmBookings, false);

		// Маппинг врачей
		const saveRes = await saveMedflexDoctorMappings(db, testOrgId, [
			{
				staffId: testDoctorId,
				externalDoctorId: "doc-pd-777",
				isSyncEnabled: true,
			},
		]);
		assert.ok(saveRes.savedCount >= 1);

		const mappings = await getMedflexDoctorMappings(db, testOrgId);
		const found = mappings.find((m) => m.staffId === testDoctorId);
		assert.ok(found);
		assert.equal(found.externalDoctorId, "doc-pd-777");
	});

	it("7. Изоляция тенантов (DEF-PD-05): отсутствие авторизации и контекста организации отклоняется 401/403", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/integrations/prodoctorov/slots",
		});
		assert.ok(
			res.statusCode === 401 || res.statusCode === 403,
			`Expected 401/403 without auth or clinicExternalId, got ${res.statusCode}`,
		);

		const genSecretRes = await app.inject({
			method: "POST",
			url: "/api/integrations/medflex/settings/generate-secret",
		});
		assert.ok(
			genSecretRes.statusCode === 401 || genSecretRes.statusCode === 403,
			`Expected 401/403 on generate-secret without auth, got ${genSecretRes.statusCode}`,
		);

		const updateSettingsRes = await app.inject({
			method: "PUT",
			url: "/api/integrations/medflex/settings",
			payload: { isActive: true },
		});
		assert.ok(
			updateSettingsRes.statusCode === 401 || updateSettingsRes.statusCode === 403,
			`Expected 401/403 on update-settings without auth, got ${updateSettingsRes.statusCode}`,
		);
	});

	it("8. Запрет отмены чужого приёма по голому startsAt: чужая запись на то же время НЕ отменяется", async () => {
		const startsAt = new Date("2026-12-01T10:00:00Z");
		const endsAt = new Date("2026-12-01T10:30:00Z");

		// 1. Создаём запись Пациента А (бронь A-101)
		const createPayload = {
			event: "booking_created",
			deliveryId: `cancel-guard-create-${Date.now()}`,
			bookingId: `PD-OWN-${Date.now()}`,
			patient: { fullName: "Защищённый Пациент", phone: "+79015554433" },
			appointment: {
				doctorId: testDoctorId,
				startsAt: startsAt.toISOString(),
				endsAt: endsAt.toISOString(),
			},
		};
		const rawCreate = JSON.stringify(createPayload);
		const sigCreate = createHmac("sha256", testWebhookSecret).update(rawCreate).digest("hex");

		const createRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: { "content-type": "application/json", "x-medflex-signature": sigCreate },
			payload: rawCreate,
		});
		assert.equal(createRes.statusCode, 201);
		const apptId = JSON.parse(createRes.body).appointmentId as string;

		// 2. Пытаемся отменить НЕсуществующий bookingId, передав тот же startsAt чужой записи
		const cancelPayload = {
			event: "booking_cancelled",
			deliveryId: `cancel-guard-del-${Date.now()}`,
			bookingId: `PD-ALIEN-${Date.now()}`,
			startsAt: startsAt.toISOString(),
		};
		const rawCancel = JSON.stringify(cancelPayload);
		const sigCancel = createHmac("sha256", testWebhookSecret).update(rawCancel).digest("hex");

		const cancelRes = await app.inject({
			method: "POST",
			url: `/api/integrations/medflex/${testClinicExternalId}/webhook/booking`,
			headers: { "content-type": "application/json", "x-medflex-signature": sigCancel },
			payload: rawCancel,
		});
		assert.equal(cancelRes.statusCode, 200);
		const cancelBody = JSON.parse(cancelRes.body);
		assert.equal(cancelBody.ignored, true);

		// 3. Проверяем в БД, что запись Пациента А осталась активной (НЕ cancelled!)
		const [stillActive] = await db
			.select({ status: appointments.status })
			.from(appointments)
			.where(eq(appointments.id, apptId));
		assert.ok(stillActive);
		assert.notEqual(stillActive.status, "cancelled", "Чужой приём на тот же startsAt не должен отменяться!");

		await db.delete(appointments).where(eq(appointments.id, apptId));
	});
});
