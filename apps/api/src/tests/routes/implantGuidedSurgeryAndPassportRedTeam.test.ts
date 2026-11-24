import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	idempotencyKeys,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patientImplantInstallations,
	patientInvoices,
	patients,
	serviceCatalogItems,
	syncIdempotencyRecords,
	toothStateHistory,
	toothStates,
	treatmentItems,
	users,
	visits,
	warrantyCertificates,
} from "../../db/schema.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants/index.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "implantGuidedSurgeryAndPassportRedTeam";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 10);
const PATIENT_ID = fixtureUuid(FIXTURE, 20);
const VISIT_ID = fixtureUuid(FIXTURE, 30);
const INVENTORY_IMPLANT_ID = fixtureUuid(FIXTURE, 40);

describe("RED TEAM FIXER: GUIDED SURGERY, IMPLANT PASSPORT & IDEMPOTENCY VERIFICATION", () => {
	let app: FastifyInstance;
	let tokenDoctor: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[FIXER_TEST] Database unavailable, skipping integration suite");
				return;
			}
			throw err;
		}

		await withFixtureTenant(ORG_ID, async (tx) => {
			// Очистка предыдущего состояния фикстуры
			await tx.delete(warrantyCertificates).where(eq(warrantyCertificates.organizationId, ORG_ID));
			await tx.delete(patientImplantInstallations).where(eq(patientImplantInstallations.organizationId, ORG_ID));
			await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID));
			await tx.delete(syncIdempotencyRecords).where(eq(syncIdempotencyRecords.organizationId, ORG_ID));
			await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.organizationId, ORG_ID));
			await tx.delete(inventoryItems).where(eq(inventoryItems.organizationId, ORG_ID));
			await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
			await tx.delete(toothStateHistory).where(eq(toothStateHistory.organizationId, ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await tx.delete(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, ORG_ID));
			await tx.delete(patientInvoices).where(eq(patientInvoices.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));

			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника DENTE Red Team Implantology",
				email: "dente_implants@test.local",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "surgeon_implants@test.local",
				fullName: "Др. Навигаторов С.В.",
				role: "doctor",
				isStaff: true,
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Кузнецов Алексей Петрович",
				birthDate: "1985-04-12",
			}).onConflictDoNothing();

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
				objectiveStatus: "Плановая дентальная имплантация по навигационному шаблону",
			});

			// Склад: винт имплантата Osstem TS III SA
			await tx.insert(inventoryItems).values({
				id: INVENTORY_IMPLANT_ID,
				organizationId: ORG_ID,
				name: "Дентальный имплантат Osstem TS III SA Ø4.0 L10",
				sku: "TS3S4010S",
				category: "implant_screw",
				stockQuantity: "5.000",
				priceKopecks: 1450000n,
				lotNumber: "LOT-OSS-2026-99",
				expirationDate: "2029-12-31",
				unit: "шт",
				isCritical: true,
			});
		});

		const secret = authTokenSecret();
		tokenDoctor = signToken(
			{
				userId: DOCTOR_ID,
				email: "surgeon_implants@test.local",
				role: "doctor",
				organizationId: ORG_ID,
				isStaff: true,
			},
			secret,
			3600,
		);

		app = createTenantTestApp();
		await app.register(idempotencyPlugin);
		await registerClinicalImplantRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
	});

	it("1. Сохраняет физические колонки паспорта и параметры навигационной хирургии без JSON-in-Text антипаттерна", async (t) => {
		if (!dbAvailable) return t.skip();

		const diarySoap = "ДНЕВНИК ОПЕРАЦИИ:\nРазрез по гребню, фиксация шаблона SG-2026-T46, препарирование ложа фрезами с охлаждением 0.9% NaCl, установка имплантата с торком 40 Н·см.";
		const idempKey = fixtureUuid(FIXTURE, 90);

		const installRes = await app.inject({
			method: "POST",
			url: "/api/clinical/implants/installations",
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
				"X-Idempotency-Key": idempKey,
			},
			body: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				toothNumberFdi: 46,
				implantBrand: "osstem",
				inventoryItemId: INVENTORY_IMPLANT_ID,
				implantDiameterMm: 4.0,
				implantLengthMm: 10.0,
				catalogArticle: "TS3S4010S",
				lotNumber: "LOT-OSS-2026-99",
				serialNumber: "SN-OSS-46461",
				expirationDate: "2029-12-31",
				connectionType: "internal_hex",
				boneDensityClass: "D2",
				finalInsertionTorqueNcm: 40,
				baselineIsqMesiodistal: 75,
				baselineIsqBuccolingual: 75,
				isGuidedSurgery: true,
				guidedSleeveDiameterMm: 5.0,
				guidedSleeveOffsetMm: 2.0,
				surgicalGuideTemplateId: "SG-2026-T46",
				sutureMaterial: "Викрил 4-0",
				notes: diarySoap,
				idempotencyKey: idempKey,
			},
		});

		assert.equal(installRes.statusCode, 201);
		const installBody = installRes.json();
		assert.equal(installBody.success, true);
		const installationId = installBody.installation?.id;
		assert.ok(installationId, "Идентификатор установки должен быть возвращен");

		// Проверяем прямое физическое состояние таблицы в PostgreSQL 18
		const [rawRow] = await db
			.select()
			.from(patientImplantInstallations)
			.where(eq(patientImplantInstallations.id, installationId))
			.limit(1);

		assert.ok(rawRow, "Запись установки должна присутствовать в БД");
		assert.equal(rawRow.catalogArticle, "TS3S4010S", "Физическая колонка catalogArticle должна содержать артикул");
		assert.equal(rawRow.expirationDate, "2029-12-31", "Физическая колонка expirationDate должна содержать дату");
		assert.equal(rawRow.connectionType, "internal_hex", "Физическая колонка connectionType должна содержать тип соединения");
		assert.equal(rawRow.isGuidedSurgery, true, "isGuidedSurgery должно быть true");
		assert.equal(Number(rawRow.guidedSleeveDiameterMm), 5.0, "guidedSleeveDiameterMm должно быть 5.0");
		assert.equal(Number(rawRow.guidedSleeveOffsetMm), 2.0, "guidedSleeveOffsetMm должно быть 2.0");
		assert.equal(rawRow.surgicalGuideTemplateId, "SG-2026-T46", "surgicalGuideTemplateId должно совпадать");
		assert.equal(rawRow.notes, diarySoap, "notes должно содержать чистый клинический текст врача, а НЕ JSON!");
		assert.ok(rawRow.financialsJsonb, "financialsJsonb должен быть отдельным jsonb объектом");

		// Проверяем выдачу паспорта имплантата
		const passportRes = await app.inject({
			method: "GET",
			url: `/api/clinical/implants/${installationId}/passport`,
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(passportRes.statusCode, 200);
		const passportBody = passportRes.json();
		assert.equal(passportBody.success, true);
		const passport = passportBody.passport;

		assert.equal(passport.sku, "TS3S4010S", "Паспорт должен содержать артикул SKU");
		assert.equal(passport.expirationDate, "2029-12-31", "Паспорт должен содержать срок годности");
		assert.equal(passport.connectionType, "internal_hex", "Паспорт должен содержать тип соединения");
		assert.equal(passport.isGuidedSurgery, true, "Паспорт должен подтверждать навигационную установку");
		assert.equal(passport.guidedSleeveDiameterMm, 5.0, "Паспорт должен содержать диаметр втулки");
		assert.equal(passport.guidedSleeveOffsetMm, 2.0, "Паспорт должен содержать оффсет втулки");
		assert.equal(passport.surgicalGuideTemplateId, "SG-2026-T46", "Паспорт должен содержать ID шаблона");
		assert.equal(passport.notes, diarySoap, "Паспорт должен возвращать клиническую заметку врача");
	});

	it("2. Идемпотентность: повторный запрос с тем же Idempotency-Key не дублирует установку и списание", async (t) => {
		if (!dbAvailable) return t.skip();

		const diarySoap = "ДНЕВНИК ОПЕРАЦИИ:\nРазрез по гребню, фиксация шаблона SG-2026-T46, препарирование ложа фрезами с охлаждением 0.9% NaCl, установка имплантата с торком 40 Н·см.";
		const idempKey = fixtureUuid(FIXTURE, 90);

		// Отправляем точный повторный запрос, симулируя повторный клик или ретрай сети
		const replayRes = await app.inject({
			method: "POST",
			url: "/api/clinical/implants/installations",
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
				"X-Idempotency-Key": idempKey,
			},
			body: {
				patientId: PATIENT_ID,
				visitId: VISIT_ID,
				toothNumberFdi: 46,
				implantBrand: "osstem",
				inventoryItemId: INVENTORY_IMPLANT_ID,
				implantDiameterMm: 4.0,
				implantLengthMm: 10.0,
				catalogArticle: "TS3S4010S",
				lotNumber: "LOT-OSS-2026-99",
				serialNumber: "SN-OSS-46461",
				expirationDate: "2029-12-31",
				connectionType: "internal_hex",
				boneDensityClass: "D2",
				finalInsertionTorqueNcm: 40,
				baselineIsqMesiodistal: 75,
				baselineIsqBuccolingual: 75,
				isGuidedSurgery: true,
				guidedSleeveDiameterMm: 5.0,
				guidedSleeveOffsetMm: 2.0,
				surgicalGuideTemplateId: "SG-2026-T46",
				sutureMaterial: "Викрил 4-0",
				notes: diarySoap,
				idempotencyKey: idempKey,
			},
		});

		assert.equal(replayRes.statusCode, 201);
		assert.equal(replayRes.headers["x-idempotency-replayed"], "true", "Запрос должен быть распознан как повторный");

		// Проверяем, что в базе по-прежнему ровно 1 запись для зуба 46 у данного пациента
		const countRows = await db
			.select()
			.from(patientImplantInstallations)
			.where(
				and(
					eq(patientImplantInstallations.organizationId, ORG_ID),
					eq(patientImplantInstallations.patientId, PATIENT_ID),
					eq(patientImplantInstallations.toothNumberFdi, 46),
				),
			);

		assert.equal(countRows.length, 1, "В базе должна остаться ровно 1 запись об установке, дубликат исключен");
	});

	it("3. Создание гарантийного паспорта в ACID-транзакции установки и безопасный GET без скрытых мутаций", async (t) => {
		if (!dbAvailable) return t.skip();

		// Находим установку из предыдущего шага
		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(
				and(
					eq(patientImplantInstallations.organizationId, ORG_ID),
					eq(patientImplantInstallations.patientId, PATIENT_ID),
				),
			)
			.limit(1);

		assert.ok(installation, "Установка имплантата должна существовать");

		// Проверяем, что сертификат гарантии УЖЕ создан в БД (в момент установки, а не при GET)
		const canonicalPassportId = `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`;
		const [certBeforeGet] = await db
			.select()
			.from(warrantyCertificates)
			.where(
				and(
					eq(warrantyCertificates.certificateNumber, canonicalPassportId),
					eq(warrantyCertificates.organizationId, ORG_ID),
				),
			)
			.limit(1);

		assert.ok(certBeforeGet, "Гарантийный сертификат должен быть создан в момент регистрации установки имплантата");
		assert.equal(certBeforeGet.status, "active");
		assert.equal(certBeforeGet.warrantyMonths, 120);

		// Делаем GET запрос паспорта
		const passportRes = await app.inject({
			method: "GET",
			url: `/api/clinical/implants/${installation.id}/passport`,
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
			},
		});

		assert.equal(passportRes.statusCode, 200);
		const passportBody = passportRes.json();
		assert.equal(passportBody.success, true);
		assert.ok(passportBody.passport.warrantyCertificate, "Паспорт должен возвращать гарантийный сертификат");
		assert.equal(
			passportBody.passport.patientCardNumber.startsWith("ЭМК-"),
			true,
			`Клинический номер карты должен иметь формат ЭМК-XXXX, получено: ${passportBody.passport.patientCardNumber}`,
		);
	});

	it("4. Контроль стабильности ISQ: запрет ложного хардкода 70 и точный расчет среднего", async (t) => {
		if (!dbAvailable) return t.skip();

		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(
				and(
					eq(patientImplantInstallations.organizationId, ORG_ID),
					eq(patientImplantInstallations.patientId, PATIENT_ID),
				),
			)
			.limit(1);

		assert.ok(installation, "Установка имплантата должна существовать");

		// Тест 4а: Отправка запроса с пустыми/невалидными замерами должна отвергаться с кодом 400
		const badIsqRes = await app.inject({
			method: "POST",
			url: `/api/clinical/implants/${installation.id}/isq`,
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
				"Idempotency-Key": fixtureUuid(FIXTURE, 91),
			},
			body: {
				daysPostOp: 0,
				isqMesiodistal: 0, // невалидное нулевое значение
				isqBuccolingual: 0,
			},
		});

		// Либо Zod схема отвергает 0 (min 1), либо наш гейт isqMean === null возвращает 400
		assert.equal(badIsqRes.statusCode, 400, "Пустые или нулевые замеры ISQ обязаны возвращать 400 ValidationError");

		// Тест 4б: Отправка реальных замеров (например, 74 и 76)
		const validIsqRes = await app.inject({
			method: "POST",
			url: `/api/clinical/implants/${installation.id}/isq`,
			headers: {
				"x-dente-clinic-token": tokenDoctor,
				"x-dente-staff-token": tokenDoctor,
				"Idempotency-Key": fixtureUuid(FIXTURE, 92),
			},
			body: {
				daysPostOp: 14,
				isqMesiodistal: 74,
				isqBuccolingual: 76,
			},
		});

		assert.equal(validIsqRes.statusCode, 201);
		const isqBody = validIsqRes.json();
		assert.equal(isqBody.success, true);
		assert.equal(Number(isqBody.measurement.isqMean), 75, "Среднее значение ISQ должно быть строго (74 + 76) / 2 = 75.00");
		assert.notEqual(isqBody.measurement.isqMean, "70", "Хардкод 70 исключен");
	});
});
