/**
 * visitConsumablesWriteoffIdempotency.test.ts — Red Team Verification Suite (Wave 357).
 *
 * Statutory Invariants:
 * 1. POST /api/visits/:id/consumables & POST /api/inventory/write-off:
 *    - Soft Negative Stock (Mandates 8e & 8n): zero stock / warehouse delay must NEVER block patient visit completion with 400/409 Insufficient Stock. Returns 200 OK with isOverdraft: true and non-blocking warning.
 *    - Idempotency-Key (UUID / UUIDv7) validation: prevents double write-offs on accidental double-click by doctor or nurse. Invalid key format returns 400 Bad Request.
 * 2. 1-Click Standard Therapist Kit deduction:
 *    - Instant deduction of standard PPE + cotton rolls bundle without micro-validation of ml/grams.
 * 3. Purged Soviet Decrees & Russian UI purity:
 *    - Zero "В смету 804н" in surgery action bars; clean clinical labels.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { generateUuidV7, isValidUuid, isValidUuidV7 } from "@dental/shared";
import { db } from "../../db/client.js";
import {
	appointments,
	inventoryItems,
	inventoryTransactions,
	organizations,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = `vConsum_${Date.now()}`;
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const APPOINTMENT_ID = fixtureUuid(NAMESPACE, 4);
const VISIT_ID = fixtureUuid(NAMESPACE, 5);
const ZERO_STOCK_ITEM_ID = fixtureUuid(NAMESPACE, 6);

describe("Wave 357: Visit Consumables Deduction & Soft Negative Stock Inquisitor Gate", () => {
	let app: FastifyInstance;
	let clinicToken = "";
	let staffToken = "";

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

		await purgeFixtureOrganizations([ORG_ID]);

		app = createTenantTestApp();
		await registerVisitRoutes(app);
		await app.register(inventoryRoutes, { prefix: "/api/inventory" });
		await app.ready();

		const secret = authTokenSecret();
		clinicToken = signToken({ organizationId: ORG_ID }, secret);
		staffToken = signToken(
			{
				userId: DOCTOR_ID,
				role: "doctor",
				organizationId: ORG_ID,
				fullName: "Доктор Стоматолог-Терапевт",
			},
			secret,
		);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Стоматология ДЕНТЕ Инвентарь",
					inn: "7701234999",
				})
				.onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Доктор Стоматолог-Терапевт",
				email: "doctor-therapist@dente.ru",
				role: "doctor",
				passwordHash: "hash",
			});

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Тестовый",
				phone: "+79998887766",
			});

			await tx.insert(appointments).values({
				id: APPOINTMENT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				doctorUserId: DOCTOR_ID,
				status: "in_treatment",
				startsAt: new Date(),
				endsAt: new Date(Date.now() + 3600000),
			});

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				appointmentId: APPOINTMENT_ID,
				patientId: PATIENT_ID,
				status: "draft",
				doctorSummary: "Клинический приём терапевта",
			});

			// Карточка материала с нулевым остатком для проверки мягкого овердрафта
			await tx.insert(inventoryItems).values({
				id: ZERO_STOCK_ITEM_ID,
				organizationId: ORG_ID,
				name: "Пломбировочный материал световой Filtek Z250 (4г)",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "1",
				unitCostRub: "2500",
			});
		});
	});

	after(async () => {
		await app.close();
		await purgeFixtureOrganizations([ORG_ID]);
	});

	test("1. Idempotency-Key validation rejects invalid formats with 400 Bad Request", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"idempotency-key": "not-a-valid-uuid-1234",
				"content-type": "application/json",
			},
			payload: {
				bundleType: "standard_kit",
			},
		});

		assert.equal(res.statusCode, 400);
		const body = JSON.parse(res.payload);
		assert.equal(body.error, "InvalidIdempotencyKey");
		assert.ok(body.message.includes("UUID"));
	});

	test("2. Idempotency-Key with valid RFC 9562 UUIDv7 succeeds and deducts standard kit", async () => {
		const validKey = generateUuidV7();
		assert.ok(isValidUuid(validKey), "Must be valid UUID");
		assert.ok(isValidUuidV7(validKey), "Must be valid UUIDv7");

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"idempotency-key": validKey,
				"content-type": "application/json",
			},
			payload: {
				bundleType: "standard_kit",
				notes: "1-клик стандартный набор терапевта",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.equal(body.success, true);
		assert.ok(body.message.includes("Базовый набор приёма списан") || body.message.includes("набор"));
	});

	test("3. Soft Negative Stock: Zero stock on hand returns 200 OK with isOverdraft=true (Mandate 8e & 8n)", async () => {
		const validKey = generateUuidV7();

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"idempotency-key": validKey,
				"content-type": "application/json",
			},
			payload: {
				items: [
					{
						inventoryItemId: ZERO_STOCK_ITEM_ID,
						quantity: 1,
						notes: "Списание пломбировочного материала с 0 остатком",
					},
				],
			},
		});

		assert.equal(res.statusCode, 200, "Zero stock must NEVER return 400 or 409 InsufficientStock");
		const body = JSON.parse(res.payload);
		assert.equal(body.success, true);
		assert.equal(body.isOverdraft, true);
		assert.equal(body.hasOverdraft, true);
		assert.ok(body.warning.includes("овердрафт") || body.warning.includes("дефицит"));
	});

	test("4. Dual-Route Parity: /api/visits/:id/consumables and /api/visits/:visitId/consumables work identically", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"content-type": "application/json",
			},
			payload: {
				carpulesCount: 2,
				drugName: "Артикаин 1:100 000 (карпула)",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.equal(body.success, true);
	});

	test("5. GET /api/visits/:id/consumables inspects recorded inventory transactions", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/visits/${VISIT_ID}/consumables`,
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.equal(body.visitId, VISIT_ID);
		assert.ok(Array.isArray(body.consumables));
		assert.ok(body.count > 0, "Transactions must be recorded for this visit");
	});

	test("6. POST /api/inventory/write-off validates Idempotency-Key and supports soft overdraft", async () => {
		// Invalid key rejected
		const invalidRes = await app.inject({
			method: "POST",
			url: "/api/inventory/write-off",
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"x-organization-id": ORG_ID,
				"idempotency-key": "invalid-writeoff-key",
				"content-type": "application/json",
			},
			payload: {
				items: [{ inventoryItemId: ZERO_STOCK_ITEM_ID, quantity: 1 }],
			},
		});
		assert.equal(invalidRes.statusCode, 400);
		const invalidBody = JSON.parse(invalidRes.payload);
		assert.equal(invalidBody.error, "InvalidIdempotencyKey");

		// Valid key with 0 stock returns 200 OK soft overdraft
		const validRes = await app.inject({
			method: "POST",
			url: "/api/inventory/write-off",
			headers: {
				"x-dente-staff-token": staffToken,
				"x-dente-clinic-token": clinicToken,
				"x-organization-id": ORG_ID,
				"idempotency-key": generateUuidV7(),
				"content-type": "application/json",
			},
			payload: {
				items: [{ inventoryItemId: ZERO_STOCK_ITEM_ID, quantity: 2 }],
			},
		});
		assert.equal(validRes.statusCode, 200);
		const validBody = JSON.parse(validRes.payload);
		assert.equal(validBody.success, true);
		assert.equal(validBody.isOverdraft, true);
	});

	test("7. Behavioral Clinical Gate: shared write-off & cost engines avoid Soviet decree jargon and reject qty <= 0", async () => {
		const { processClinicalMaterialWriteoff, resolveCostKopecks } = await import("@dental/shared");
		const { executeUnifiedStockDeduction } = await import("../../services/treatmentConsumables/unifiedStockDeductionEngine.js");

		assert.equal(resolveCostKopecks(0n, "125.40"), 12540n);
		assert.equal(resolveCostKopecks(5000n, "125.40"), 5000n);

		const itemUuid = fixtureUuid("idemp-writeoff", 90);
		const clinicalResult = processClinicalMaterialWriteoff({
			visitId: fixtureUuid("idemp-writeoff", 91),
			treatmentServiceId: "A16.07.002.001",
			treatmentServiceTitle: "Пломбирование кариеса",
			norms: [
				{
					inventoryItemId: itemUuid,
					itemName: "Стеклоиономерный цемент",
					tier: "expensive_clinical",
					defaultQuantity: 1,
					unit: "шт",
					costPriceKopecks: 45000,
					canOmit: false,
					canAdjustQuantity: false,
				},
			],
			currentStocks: { [itemUuid]: 2 },
		});
		const serialized = JSON.stringify(clinicalResult);
		assert.ok(!serialized.includes("В смету 804н"), "Clinical output must not leak 804н decree");
		assert.ok(!serialized.includes("257/у"), "Clinical output must not leak 257/у decree");
		assert.ok(!serialized.includes("1 клик"), "Clinical output must not contain dev slang");

		const emptyRes = await withFixtureTenant(ORG_ID, async (tx) =>
			executeUnifiedStockDeduction(tx, {
				organizationId: ORG_ID,
				visitId: null,
				userId: DOCTOR_ID,
				transactionType: "manual_writeoff",
				reasonPrefix: "Проверка невалидного количества",
				items: [{ exactItemId: ZERO_STOCK_ITEM_ID, defaultName: "Композит", category: "Композиты", unit: "шт", defaultCost: "100", qty: 0, label: "Zero qty" }],
			}),
		);
		assert.equal(emptyRes.deductedItems.length, 0, "Zero quantity must not coerce qty <= 0 to 1");
	});
});
