import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { calculateAnestheticSafety, estimatePediatricWeightKg } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	anesthesiaLogs,
	auditEvents,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patientImplantInstallations,
	patients,
	serviceCatalogItems,
	toothStates,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerAnesthesiaRoutes } from "../../routes/anesthesia.js";
import { registerClinicalImplantRoutes } from "../../routes/clinicalImplants/index.js";
import { registerPediatricIndicesRoutes } from "../../routes/pediatric/pediatricIndicesRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * RED TEAM FIXER REGRESSION & VERIFICATION SUITE:
 * 1. DEFECT 1 & 3: logsCreateRoute.ts: rejection of missing patientId (400), ACID tx, and dynamic service catalog price (no 950 RUB hardcode).
 * 2. DEFECT 4: logsDeleteRoute.ts: atomic warehouse carpule storno & visit estimate treatmentItem rollback.
 * 3. DEFECT 2: anesthesiaAndRestorationSchemas.ts: calculateAnestheticSafety WHO weight fallback for pediatric & adult.
 * 4. DEFECT 5: clinicalImplants routes: canonical SSOT /api/clinical/implants/*.
 * 5. DEFECT 7: pediatricIndicesRoutes.ts: physiological root resorption excluded from primaryExtracted.
 */

const FIXTURE = "anesthesiaAndImplantsFixerRedTeam";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 10);
const PATIENT_ID = fixtureUuid(FIXTURE, 20);
const VISIT_ID = fixtureUuid(FIXTURE, 30);
const SERVICE_ID = fixtureUuid(FIXTURE, 40);
const INVENTORY_ITEM_ID = fixtureUuid(FIXTURE, 50);

describe("RED TEAM FIXER: ANESTHESIA, IMPLANTS & PEDIATRIC PROTOCOLS VERIFICATION", () => {
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
			// Clean prior operational state
			await tx.delete(anesthesiaLogs).where(eq(anesthesiaLogs.organizationId, ORG_ID));
			await tx.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
			await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.organizationId, ORG_ID));
			await tx.delete(inventoryItems).where(eq(inventoryItems.organizationId, ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, ORG_ID));
			await tx.delete(patientImplantInstallations).where(eq(patientImplantInstallations.organizationId, ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await tx.delete(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));

			// Seed fixtures with onConflictDoNothing for append-only audit compliance
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника DENTE Red Team",
				email: "dente_redteam@test.local",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "surgeon@test.local",
				fullName: "Др. Хирургов А.В.",
				role: "doctor",
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Иванов Иван Иванович",
				birthDate: "1990-05-15",
			}).onConflictDoNothing();

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
				objectiveStatus: "Осмотр полости рта",
			});

			// Прейскурант клиники: 1400 ₽ за анестезию (НЕ 950 ₽)
			await tx.insert(serviceCatalogItems).values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "A16.07.030",
				title: "Анестезия инфильтрационная / проводниковая",
				basePriceRub: 1400,
				priceRub: 1400,
				order804nCode: "A16.07.030",
				isActive: true,
			});

			// Склад: Ультракаин Д-С (10 карпул в наличии)
			await tx.insert(inventoryItems).values({
				id: INVENTORY_ITEM_ID,
				organizationId: ORG_ID,
				name: "Ультракаин Д-С (артикаин 4% 1:200 000, карпулы)",
				sku: "ANESTH-ULTRA-DS",
				stockQuantity: "10.0000",
				currentQty: "10.0000",
				unitCostRub: "150.00",
				unit: "карпула",
			});
		});

		const secret = authTokenSecret();
		tokenDoctor = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, secret, 3600);

		app = createTenantTestApp();
		await registerAnesthesiaRoutes(app);
		await registerClinicalImplantRoutes(app);
		await registerPediatricIndicesRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (app) await app.close();
	});

	describe("1. DEFECT 1 & DEFECT 3: logsCreateRoute.ts Hardening", () => {
		it("1.1. Отклоняет создание анестезии без patientId с кодом 400 (PatientRequired), без подмены первого пациента", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: "/api/anesthesia/logs",
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
				payload: {
					technique: "infiltration",
					drug: "articaine",
					carpulesAdministered: 1.0,
				},
			});

			assert.equal(res.statusCode, 400);
			const body = JSON.parse(res.body);
			assert.equal(body.error, "PatientRequired");
		});

		it("1.2. Создает протокол анестезии, списывает карпулу со склада и выставляет цену из прейскуранта (1400 ₽, без хардкода 950 ₽)", async (t) => {
			if (!dbAvailable) return t.skip();

			const res = await app.inject({
				method: "POST",
				url: `/api/anesthesia/patients/${PATIENT_ID}/logs`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
				payload: {
					visitId: VISIT_ID,
					doctorId: DOCTOR_ID,
					technique: "infiltration",
					drug: "articaine",
					drugBrandName: "Ультракаин Д-С",
					concentrationPct: 4.0,
					vasoconstrictor: "1:200000",
					carpuleVolumeMl: 1.7,
					carpulesAdministered: 2.0,
					patientWeightKg: 75,
					autoDeductInventory: true,
					addToVisitEstimate: true,
				},
			});

			assert.equal(res.statusCode, 201);
			const body = JSON.parse(res.body);
			assert.ok(body.success);
			assert.ok(body.id);

			// Проверка списания со склада (было 10 карпул, списано 2 -> осталось 8)
			const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, INVENTORY_ITEM_ID));
			assert.equal(Number(inv?.stockQuantity), 8);

			// Проверка цены в смете (2 карпулы по 1400 ₽ = 2800 ₽, а НЕ 950 ₽)
			const items = await db.select().from(treatmentItems).where(and(eq(treatmentItems.organizationId, ORG_ID), eq(treatmentItems.visitId, VISIT_ID)));
			assert.equal(items.length, 1);
			assert.equal(items[0]?.unitPriceRub, 1400);
			assert.equal(items[0]?.priceRub, 2800);
		});
	});

	describe("2. DEFECT 4: logsDeleteRoute.ts Storno & Rollback", () => {
		it("2.1. Удаление анестезии выполняет сторно склада (+2 карпулы) и откат связанной позиции сметы", async (t) => {
			if (!dbAvailable) return t.skip();

			const [log] = await db.select().from(anesthesiaLogs).where(eq(anesthesiaLogs.organizationId, ORG_ID)).limit(1);
			assert.ok(log, "Запись анестезии должна существовать");

			const res = await app.inject({
				method: "DELETE",
				url: `/api/anesthesia/logs/${log.id}`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
			});

			assert.equal(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.equal(body.success, true);
			assert.equal(body.deletedId, log.id);
			assert.equal(body.storno?.carpulesReturned, 2);

			// Проверка склада: 8 + 2 = 10 карпул восстановлено
			const [inv] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, INVENTORY_ITEM_ID));
			assert.equal(Number(inv?.stockQuantity), 10);

			// Проверка сметы: связанная позиция анестезии удалена
			const items = await db.select().from(treatmentItems).where(and(eq(treatmentItems.organizationId, ORG_ID), eq(treatmentItems.visitId, VISIT_ID)));
			assert.equal(items.length, 0);

			// Проверка логов: запись удалена
			const deletedLogs = await db.select().from(anesthesiaLogs).where(eq(anesthesiaLogs.id, log.id));
			assert.equal(deletedLogs.length, 0);
		});
	});

	describe("3. DEFECT 2: Split-Brain & WHO Weight Fallback", () => {
		it("3.1. Для ребенка без указания веса калькулятор применяет физиологическую норму ВОЗ без блокировки", () => {
			const res = calculateAnestheticSafety({
				drug: "articaine",
				concentrationPct: 4.0,
				vasoconstrictor: "1:200000",
				carpuleVolumeMl: 1.7,
				carpulesAdministered: 1.0,
				patientAgeYears: 6,
			});

			const expectedWeight = estimatePediatricWeightKg(6);
			assert.equal(expectedWeight, 20);
			assert.ok(res.maxRecommendedAnestheticMg > 0);
			assert.ok(res.maxSafeCarpules > 0);
			assert.ok(res.clinicalWarnings.some((w) => w.includes("норма ВОЗ") && w.includes("20 кг")));
		});

		it("3.2. Для взрослого без указания веса калькулятор применяет стандартную норму 70 кг без блокировки", () => {
			const res = calculateAnestheticSafety({
				drug: "articaine",
				concentrationPct: 4.0,
				vasoconstrictor: "1:200000",
				carpuleVolumeMl: 1.7,
				carpulesAdministered: 1.0,
			});

			assert.equal(res.maxRecommendedAnestheticMg, 490); // 70 kg * 7.0 mg/kg
			assert.ok(res.clinicalWarnings.some((w) => w.includes("норма массы тела взрослого: 70 кг")));
		});
	});

	describe("4. DEFECT 5: Canonical SSOT /api/clinical/implants/*", () => {
		it("4.1. Канонические эндпоинты имплантации доступны, а устаревшие префиксы исключены из роутера", async (t) => {
			if (!dbAvailable) return t.skip();

			// GET /api/clinical/implants
			const resList = await app.inject({
				method: "GET",
				url: `/api/clinical/implants?patientId=${PATIENT_ID}`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
			});
			assert.equal(resList.statusCode, 200);

			// GET /api/clinical/implants/patient/:patientId
			const resPatient = await app.inject({
				method: "GET",
				url: `/api/clinical/implants/patient/${PATIENT_ID}`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
			});
			assert.equal(resPatient.statusCode, 200);

			// Проверка отсутствия старого роута /api/surgery/implants (404)
			const resLegacy = await app.inject({
				method: "GET",
				url: `/api/surgery/implants?patientId=${PATIENT_ID}`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
			});
			assert.equal(resLegacy.statusCode, 404);
		});
	});

	describe("5. DEFECT 7: Pediatric Physiological Resorption Excluded from primaryExtracted", () => {
		it("5.1. Молочный зуб с физиологической резорбцией не засчитывается в prematurelyExtracted", async (t) => {
			if (!dbAvailable) return t.skip();

			// Сеем зубы:
			// Зуб 51 (молочный резец): выпал по физиологической резорбции
			// Зуб 54 (молочный моляр): удален по кариесу (Extracted, без резорбции)
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.insert(toothStates).values([
					{
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						toothNumber: 51,
						state: "Missing",
						notes: JSON.stringify({ resorptionStage: 100, isPhysiologicalResorption: true, text: "Естественная физиологическая смена зуба" }),
					},
					{
						organizationId: ORG_ID,
						patientId: PATIENT_ID,
						toothNumber: 54,
						state: "Extracted",
						notes: "Осложненный пульпит, удаление по болезни",
					},
				]);
			});

			const res = await app.inject({
				method: "GET",
				url: `/api/patients/${PATIENT_ID}/pediatric/indices`,
				headers: { "x-dente-clinic-token": tokenDoctor, "x-dente-staff-token": tokenDoctor },
			});

			assert.equal(res.statusCode, 200);
			const body = JSON.parse(res.body);
			assert.ok(body.success);
			// В prematurelyExtracted должен попасть ТОЛЬКО зуб 54 (1 шт.), а зуб 51 (физиологическая резорбция) исключен!
			assert.equal(body.indices.primary.prematurelyExtracted, 1);
		});
	});
});
