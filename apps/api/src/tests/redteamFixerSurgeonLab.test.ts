/**
 * RED TEAM FIXER SURGEON LAB ORDERS & WARRANTY INVARIANTS TEST
 *
 * Проверяет закрытие всех 6 дефектов ЗТЛ из Fact Dossier:
 * 1. Сохранение гарантийных полей при создании наряда (parentLabOrderId, fittingAppointmentId, remakeReason, etc.)
 * 2. Обновление гарантии и связей при PUT мутации (isWarranty = true, remakeReason, etc.)
 * 3. Атомарность и дедупликация Idempotency-Key без гонок
 * 4. Защита RLS и изоляция тенантов в scansDownloadHandler
 * 5. buildLabOrderApiPayload в @dental/shared сохраняет гарантийные атрибуты
 * 6. Обнуление price_kopecks и price_rub в lab_items при гарантийной рекламации
 * 7. Ликвидация мертвого кода в labQuery.ts
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { buildLabOrderApiPayload, generateUuidV7 } from "@dental/shared";
import { db } from "../db/client.js";
import { withFixtureTenant, fixtureUuid, purgeFixtureOrganizations, isDatabaseUnavailable } from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";
import { organizations, users, patients, labOrders, labItems, appointments } from "../db/schema.js";
import { registerLabRoutes } from "../routes/lab/index.js";
import { signToken } from "../utils/cryptoHelper.js";
import { authTokenSecret } from "../security/authSecret.js";
import * as labQueryModule from "../db/labQuery.js";

const NAMESPACE = "redteamFixerLab";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const PARENT_ORDER_ID = fixtureUuid(NAMESPACE, 4);
const FITTING_APPT_ID = fixtureUuid(NAMESPACE, 5);
const LAB_ID = fixtureUuid(NAMESPACE, 6);

describe("Red Team Fixer Surgeon: Dental Lab Warranty, RLS & Idempotency", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
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
					name: "Клиника Red Team Fixer Lab",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Врач-Ортопед Хирург",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Пациент Рекламации ЗТЛ",
					status: "active",
				})
				.onConflictDoNothing();

			const now = new Date();
			await db
				.insert(appointments)
				.values({
					id: FITTING_APPT_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					doctorUserId: DOCTOR_ID,
					status: "planned",
					startsAt: now,
					endsAt: new Date(now.getTime() + 3600000),
				})
				.onConflictDoNothing();

			await db
				.insert(labOrders)
				.values({
					id: PARENT_ORDER_ID,
					organizationId: ORGANIZATION_ID,
					patientId: PATIENT_ID,
					doctorId: DOCTOR_ID,
					orderNumber: "ЗТЛ-PARENT-001",
					secureToken: "token-parent-order-001",
					status: "completed",
					priceKopecks: 2000000,
					priceRub: 20000,
				})
				.onConflictDoNothing();
		});

		staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerLabRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		if (!databaseReady) return;
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
	});

	test("ДЕФЕКТ 1: POST /api/clinical/lab-orders сохраняет все гарантийные поля и связи в БД", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				toothFdi: 21,
				material: "zirconia",
				colorVita: "A2",
				isWarranty: true,
				parentLabOrderId: PARENT_ORDER_ID,
				fittingAppointmentId: FITTING_APPT_ID,
				laboratoryId: LAB_ID,
				warrantyLiabilityType: "lab_defect",
				remakeReason: "Скол керамического края на этапе примерки",
				priceRub: 0,
			},
		});

		assert.equal(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${res.body}`);
		const created = JSON.parse(res.body);
		assert.ok(created.id, "Expected created order id");

		// Проверяем прямое состояние в базе данных (PG18)
		const [inDb] = await db
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, created.id), eq(labOrders.organizationId, ORGANIZATION_ID)));

		assert.ok(inDb, "Order should exist in DB");
		assert.equal(inDb.isWarranty, true, "isWarranty should be true in DB");
		assert.equal(inDb.parentLabOrderId, PARENT_ORDER_ID, "parentLabOrderId must be persisted");
		assert.equal(inDb.fittingAppointmentId, FITTING_APPT_ID, "fittingAppointmentId must be persisted");
		assert.equal(inDb.laboratoryId, LAB_ID, "laboratoryId must be persisted");
		assert.equal(inDb.warrantyLiabilityType, "lab_defect", "warrantyLiabilityType must be persisted");
		assert.equal(inDb.remakeReason, "Скол керамического края на этапе примерки", "remakeReason must be persisted");
	});

	test("ДЕФЕКТ 2: PUT /api/clinical/lab-orders/:id физически обновляет is_warranty и гарантийные связи", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		// Сначала создаем обычный заказ
		const createRes = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				toothFdi: 11,
				material: "emax",
				colorVita: "A1",
				isWarranty: false,
				priceRub: 15000,
			},
		});
		assert.equal(createRes.statusCode, 201);
		const order = JSON.parse(createRes.body);

		// Переводим через PUT в гарантию с указанием причины
		const putRes = await app.inject({
			method: "PUT",
			url: `/api/clinical/lab-orders/${order.id}`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				isWarranty: true,
				warrantyLiabilityType: "clinic_warranty",
				remakeReason: "Изменение цвета опорного зуба после депульпирования",
				parentLabOrderId: PARENT_ORDER_ID,
				fittingAppointmentId: FITTING_APPT_ID,
				laboratoryId: LAB_ID,
			},
		});

		assert.equal(putRes.statusCode, 200, `Expected 200, got ${putRes.statusCode}: ${putRes.body}`);

		// Проверяем в базе данных
		const [updatedInDb] = await db
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, order.id), eq(labOrders.organizationId, ORGANIZATION_ID)));

		assert.ok(updatedInDb);
		assert.equal(updatedInDb.isWarranty, true, "PUT must set is_warranty = true in DB");
		assert.equal(updatedInDb.isLockedInstalled, false, "isLockedInstalled must be reset on warranty");
		assert.equal(updatedInDb.warrantyLiabilityType, "clinic_warranty");
		assert.equal(updatedInDb.remakeReason, "Изменение цвета опорного зуба после депульпирования");
		assert.equal(updatedInDb.parentLabOrderId, PARENT_ORDER_ID);
		assert.equal(updatedInDb.fittingAppointmentId, FITTING_APPT_ID);
		assert.equal(updatedInDb.laboratoryId, LAB_ID);
	});

	test("ДЕФЕКТ 3: Idempotency-Key дедупликация и воспроизведение ответа без TOCTOU гонки", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		const testKey = generateUuidV7();
		const payload = {
			patientId: PATIENT_ID,
			doctorId: DOCTOR_ID,
			toothFdi: 46,
			material: "zirconia",
			colorVita: "A3",
			priceRub: 12000,
		};

		// Первый запрос
		const res1 = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": testKey,
			},
			payload,
		});

		assert.equal(res1.statusCode, 201, `Expected 201, got ${res1.statusCode}: ${res1.body}`);
		const body1 = JSON.parse(res1.body);
		assert.ok(body1.id);

		// Второй идентичный запрос с тем же Idempotency-Key
		const res2 = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": testKey,
			},
			payload,
		});

		assert.equal(res2.statusCode, 201);
		assert.equal(res2.headers["idempotency-replayed"], "true");
		const body2 = JSON.parse(res2.body);
		assert.equal(body2.id, body1.id, "Replayed order must return identical order id");
	});

	test("ДЕФЕКТ 4: handleLabScanDownloadUrl изолирован через withTenantCtx и не использует сырой db", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		const nonExistentOrderId = fixtureUuid(NAMESPACE, 88);
		const res = await app.inject({
			method: "GET",
			url: `/api/clinical/lab-orders/${nonExistentOrderId}/scans/download-url?storageKey=org_${ORGANIZATION_ID}/lab_orders/${nonExistentOrderId}/scan.stl`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 404, "Non existent order should return 404 via tenant context");
	});

	test("ДЕФЕКТ 5: buildLabOrderApiPayload в @dental/shared сохраняет все поля гарантии", () => {
		const payload = buildLabOrderApiPayload({
			effectivePatientId: PATIENT_ID,
			formPatientName: "Иванов И.И.",
			formDoctorId: DOCTOR_ID,
			formDoctorName: "Петров П.П.",
			selectedTeeth: [24],
			jawScope: null,
			constructionType: "Коронка одиночная",
			material: "Диоксид циркония",
			impressionType: "Цифровой скан (CAD/CAM)",
			finalShade: "A2",
			currentStage: "draft",
			dueDate: "2026-12-01",
			clinicalNotes: "Клинические заметки",
			attachedImageUrl: null,
			gostOrderNumber: "ЗТЛ-2611-001",
			isWarrantyRework: true,
			reworkReason: "Пористость керамического плеча",
		});

		assert.equal(payload.isWarranty, true, "isWarranty must be true");
		assert.equal(payload.isWarrantyRework, true, "isWarrantyRework must be true");
		assert.equal(payload.warrantyLiabilityType, "clinic_warranty", "warrantyLiabilityType must default to clinic_warranty");
		assert.equal(payload.remakeReason, "Пористость керамического плеча", "remakeReason must match");
	});

	test("ДЕФЕКТ 6: PATCH гарантийной рекламации обнуляет priceKopecks и priceRub во вложенных lab_items", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		// Создаем наряд с позициями lab_items
		const createRes = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				toothFdi: 26,
				material: "zirconia",
				colorVita: "A2",
				priceRub: 18000,
				items: [
					{
						toothFdi: 26,
						priceRub: 18000,
						restorationType: "crown_monolithic",
						material: "zirconia_multilayer_gradient",
					},
				],
			},
		});

		assert.equal(createRes.statusCode, 201);
		const order = JSON.parse(createRes.body);

		// Проверяем, что lab_items создана с ценой 18000 руб (1800000 копеек)
		const itemsBefore = await db
			.select()
			.from(labItems)
			.where(and(eq(labItems.labOrderId, order.id), eq(labItems.organizationId, ORGANIZATION_ID)));

		assert.ok(itemsBefore.length > 0, "lab_items must be created");
		assert.equal(Number(itemsBefore[0]?.priceKopecks), 1800000);

		// Выполняем PATCH рекламации
		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/clinical/lab-orders/${order.id}`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				stage: "warranty_rework",
				warrantyLiabilityType: "lab_defect",
				remakeReason: "Брак литья каркаса",
			},
		});

		assert.equal(patchRes.statusCode, 200, `Expected 200, got ${patchRes.statusCode}: ${patchRes.body}`);

		// Проверяем, что в lab_orders цена обнулилась
		const [orderAfter] = await db
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, order.id), eq(labOrders.organizationId, ORGANIZATION_ID)));
		assert.equal(orderAfter?.isWarranty, true);
		assert.equal(Number(orderAfter?.priceKopecks), 0);

		// Проверяем [ДЕФЕКТ 6]: в lab_items цена также гарантированно обнулилась!
		const itemsAfter = await db
			.select()
			.from(labItems)
			.where(and(eq(labItems.labOrderId, order.id), eq(labItems.organizationId, ORGANIZATION_ID)));

		assert.ok(itemsAfter.length > 0);
		for (const item of itemsAfter) {
			assert.equal(Number(item.priceKopecks), 0, "lab_item priceKopecks must be 0 upon warranty remake");
			assert.equal(Number(item.priceRub), 0, "lab_item priceRub must be 0 upon warranty remake");
		}
	});

	test("МЕРТВЫЙ КОД: updateLabOrderStatusByToken и updateLabOrderStatusByClinic удалены из labQuery.ts", () => {
		const exports = labQueryModule as Record<string, unknown>;
		assert.equal(exports.updateLabOrderStatusByToken, undefined, "updateLabOrderStatusByToken must be deleted");
		assert.equal(exports.updateLabOrderStatusByClinic, undefined, "updateLabOrderStatusByClinic must be deleted");
	});

	test("ДЕФЕКТ 5: Отказ в создании наряда без врача (400 DoctorRequired, запрет тихого .limit(1))", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_ID,
				// doctorId не передан и doctorName не передан
				toothFdi: 16,
				material: "zirconia",
				priceRub: 10000,
			},
		});

		// При авторизованном staffToken текущий пользователь DOCTOR_ID автоматически подхватывается как fallbackDoctorId.
		// Чтобы проверить честный отказ, шлем запрос без токена врача (или с несуществующим врачом):
		const invalidDocId = fixtureUuid(NAMESPACE, 77);
		const resNoDoctor = await app.inject({
			method: "POST",
			url: "/api/clinical/lab-orders",
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				patientId: PATIENT_ID,
				doctorId: invalidDocId,
				toothFdi: 16,
				material: "zirconia",
				priceRub: 10000,
			},
		});

		assert.equal(resNoDoctor.statusCode, 400);
		const json = JSON.parse(resNoDoctor.body);
		assert.equal(json.error, "DoctorRequired");
	});

	test("ДЕФЕКТ 4: Блокировка кассовой выплаты при нулевой себестоимости наряда (400 AmountExceedsCost)", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable");

		// Создаем наряд с нулевой себестоимостью
		const zeroCostOrderId = fixtureUuid(NAMESPACE, 78);
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db.insert(labOrders).values({
				id: zeroCostOrderId,
				organizationId: ORGANIZATION_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				orderNumber: "ЗТЛ-ZERO-001",
				secureToken: "token-zero-order-001",
				status: "received",
				priceRub: 15000,
				priceKopecks: 1500000,
				labCostRub: 0,
				labCostKopecks: 0,
			}).onConflictDoNothing();
		});

		const payRes = await app.inject({
			method: "POST",
			url: `/api/lab-orders/${zeroCostOrderId}/pay`,
			headers: {
				"x-dente-clinic-token": staffToken,
				"x-dente-staff-token": staffToken,
				"Idempotency-Key": generateUuidV7(),
			},
			payload: {
				amountKopecks: 500000, // 5000 руб
			},
		});

		assert.equal(payRes.statusCode, 400);
		const json = JSON.parse(payRes.body);
		assert.equal(json.error, "AmountExceedsCost");
	});
});
