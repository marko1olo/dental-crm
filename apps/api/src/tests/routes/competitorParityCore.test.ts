import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	egiszBlankPermissions,
	egiszOutbox,
	inventoryItems,
	organizations,
	patientConsents,
	patients,
	serviceCatalogItems,
	toothStates,
	treatmentPlans,
	users,
	visits,
} from "../../db/schema.js";
import { registerEgiszModularRoutes } from "../../routes/egiszModules/egiszRoutes.js";
import { registerVisitWriteOffHandlers } from "../../routes/inventory/consumables/visitWriteOffHandlers.js";
import { registerInvoiceRoutes } from "../../routes/invoiceRoutes/index.js";
import { registerStatusRoutes } from "../../routes/odontogram/statusRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "parityCore";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_ID = fixtureUuid(FIXTURE, 3);
const VISIT_ID = fixtureUuid(FIXTURE, 4);
const ITEM_CLINICAL_USED_ID = fixtureUuid(FIXTURE, 5);
const ITEM_CLINICAL_OMITTED_ID = fixtureUuid(FIXTURE, 6);
const ITEM_OVERHEAD_ID = fixtureUuid(FIXTURE, 7);
const SERVICE_ID = fixtureUuid(FIXTURE, 8);
const PLAN_ID = fixtureUuid(FIXTURE, 9);

describe("Competitor Parity Core Integration Suite (Warehouse VN/VI, Jaw Codes, PriceLock, EGISZ Blanks)", () => {
	let app: FastifyInstance;
	let headers: Record<string, string>;
	let databaseReady = false;

	before(async () => {
		try {
			await db.execute("SELECT 1;");
			databaseReady = true;
		} catch {
			return;
		}

		await purgeFixtureOrganizations([ORG_ID]);

		await db.transaction(async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Паритета Конкурентов",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				fullName: "Д-р Паритетный Алексей",
				role: "doctor",
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Иванов Тест Паритета",
				phone: "+79990001122",
				birthDate: "1990-05-15",
				administrativeProfile: {
					gender: "male",
					snils: "11223344595",
				},
			}).onConflictDoNothing();

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				chiefComplaint: "Боль при накусывании на 16 зуб",
				diagnosis: "K02.1 Кариес дентина",
				treatmentPlan: "Реставрация 16 зуба",
			}).onConflictDoNothing();

			await tx.insert(inventoryItems).values([
				{
					id: ITEM_CLINICAL_USED_ID,
					organizationId: ORG_ID,
					name: "Имплантат дентальный (ВИ = 2 шт.)",
					sku: "PARITY-IMPL-01",
					unit: "шт.",
					stockQuantity: 1,
					minStockLevel: 1,
				},
				{
					id: ITEM_CLINICAL_OMITTED_ID,
					organizationId: ORG_ID,
					name: "Мембрана резорбируемая (ВН: не использована)",
					sku: "PARITY-MEMB-02",
					unit: "шт.",
					stockQuantity: 5,
					minStockLevel: 1,
				},
				{
					id: ITEM_OVERHEAD_ID,
					organizationId: ORG_ID,
					name: "Перчатки нитриловые",
					sku: "PARITY-GLOV-03",
					unit: "пара",
					stockQuantity: 10,
					minStockLevel: 2,
				},
			]).onConflictDoNothing();

			await tx.insert(serviceCatalogItems).values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "A16.07.002",
				order804nCode: "A16.07.002",
				title: "Восстановление зуба пломбой с фотополимером",
				priceRub: 6500,
				basePriceRub: 6500,
				category: "therapy",
			}).onConflictDoNothing();

			await tx.insert(treatmentPlans).values({
				id: PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				name: "План лечения №1",
				title: "План лечения №1",
				createdAt: new Date(Date.now() - 45 * 86400000),
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(
			async (warehouseInstance) => {
				await registerVisitWriteOffHandlers(warehouseInstance);
			},
			{ prefix: "/api/inventory" },
		);
		await app.register(registerInvoiceRoutes);
		registerStatusRoutes(app);
		await app.register(registerEgiszModularRoutes);
		await app.ready();

		const token = signToken(
			{ userId: DOCTOR_ID, organizationId: ORG_ID, role: "doctor" },
			authTokenSecret(),
		);
		headers = {
			authorization: `Bearer ${token}`,
			"x-dente-staff-token": token,
			"x-dente-organization-id": ORG_ID,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	test("1. Warehouse VN/VI: clinicalMaterialWriteoffEngine omits canOmit(isOmitted), adjusts ВИ, and keeps soft negative stock", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const res = await app.inject({
			method: "POST",
			url: `/api/inventory/${ORG_ID}/deduct/visit`,
			headers,
			payload: {
				visitId: VISIT_ID,
				allowOverdraft: true,
				clinicalNorms: [
					{
						inventoryItemId: ITEM_OVERHEAD_ID,
						itemName: "Перчатки нитриловые",
						tier: "cheap_overhead",
						defaultQuantity: 1,
						unit: "пара",
						costPriceKopecks: 2000,
						canOmit: false,
						canAdjustQuantity: false,
					},
					{
						inventoryItemId: ITEM_CLINICAL_USED_ID,
						itemName: "Имплантат дентальный (ВИ = 2 шт.)",
						tier: "expensive_clinical",
						defaultQuantity: 1,
						unit: "шт.",
						costPriceKopecks: 850000,
						canOmit: true,
						canAdjustQuantity: true,
						isOmitted: false,
						actualQuantity: 2,
					},
					{
						inventoryItemId: ITEM_CLINICAL_OMITTED_ID,
						itemName: "Мембрана резорбируемая (ВН: не использована)",
						tier: "expensive_clinical",
						defaultQuantity: 1,
						unit: "шт.",
						costPriceKopecks: 1200000,
						canOmit: true,
						canAdjustQuantity: true,
						isOmitted: true,
					},
				],
			},
		});

		assert.equal(res.statusCode, 200, res.body);
		const body = res.json() as {
			twoLevelWriteoff: {
				hasOverdraft: boolean;
				clinicalItems: Array<{ inventoryItemId: string; isOmitted: boolean; quantity: number }>;
				overheadItems: Array<{ inventoryItemId: string; quantity: number }>;
			};
		};
		assert.ok(body.twoLevelWriteoff, "Expected twoLevelWriteoff result");
		assert.equal(body.twoLevelWriteoff.hasOverdraft, true);
		assert.equal(body.twoLevelWriteoff.overheadItems.length, 1);

		const stockRows = await withTenantCtx(ORG_ID, async (tx) =>
			tx
				.select({ id: inventoryItems.id, stockQuantity: inventoryItems.stockQuantity })
				.from(inventoryItems)
				.where(inArray(inventoryItems.id, [ITEM_CLINICAL_USED_ID, ITEM_CLINICAL_OMITTED_ID, ITEM_OVERHEAD_ID])),
		);
		const stockById = new Map(stockRows.map((r) => [r.id, Number(r.stockQuantity)]));
		assert.equal(stockById.get(ITEM_CLINICAL_USED_ID), -1, "Expected 1 - 2 = -1 soft negative stock");
		assert.equal(stockById.get(ITEM_CLINICAL_OMITTED_ID), 5, "Omitted VN item must NOT be deducted");
		assert.equal(stockById.get(ITEM_OVERHEAD_ID), 9, "Overhead item must be deducted by 1");
	});

	test("2. Odontogram Jaw Codes: accepts JU/JL/C and 100/101/102 in POST /api/odontogram/status and returns jawCode in GET", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const postRes = await app.inject({
			method: "POST",
			url: "/api/odontogram/status",
			headers,
			payload: {
				patientId: PATIENT_ID,
				toothNumber: "JU",
				state: "Healthy",
				notes: "Верхняя челюсть без патологии костной ткани.",
				clinicalData: { jawCode: "JU", presetId: "ju_norm" },
			},
		});
		assert.equal(postRes.statusCode, 200, postRes.body);
		const postJson = postRes.json() as {
			success: boolean;
			states: Array<{ toothNumber: number; jawCode?: string }>;
		};
		assert.equal(postJson.states[0]?.toothNumber, 100);
		assert.equal(postJson.states[0]?.jawCode, "JU");

		const getRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/tooth-states`,
			headers,
		});
		assert.equal(getRes.statusCode, 200, getRes.body);
		const getJson = getRes.json() as {
			states: Array<{ toothNumber: number; jawCode?: string; clinicalData?: { presetId?: string } | null }>;
		};
		const juRow = getJson.states.find((s) => s.toothNumber === 100);
		assert.ok(juRow, "Persisted jaw row 100 must be returned");
		assert.equal(juRow?.jawCode, "JU");
		assert.equal(juRow?.clinicalData?.presetId, "ju_norm");

		// Cleanup toothStates row explicitly
		await withTenantCtx(ORG_ID, async (tx) =>
			tx.delete(toothStates).where(and(eq(toothStates.organizationId, ORG_ID), eq(toothStates.patientId, PATIENT_ID))),
		);
	});

	test("3. PriceLockEngine: generateInvoiceHandler returns priceLockStatus & supplementaryAgreement HTML when price differs", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		const res = await app.inject({
			method: "POST",
			url: "/api/invoices/generate-from-plan",
			headers,
			payload: {
				patientId: PATIENT_ID,
				planId: PLAN_ID,
				documentType: "invoice",
				items: [
					{
						itemId: "item-1",
						serviceId: SERVICE_ID,
						code804n: "A16.07.002",
						nameRu: "Восстановление зуба пломбой с фотополимером",
						quantity: 1,
						planUnitPriceRub: 5000,
						effectiveUnitPriceRub: 6500,
						resolutionPolicy: "UPDATE_TO_CURRENT_PRICE",
					},
				],
			},
		});
		assert.equal(res.statusCode, 201, res.body);
		const json = res.json() as {
			priceLockStatus: { isLocked: boolean; isExpired: boolean; daysElapsed: number };
			supplementaryAgreement: { needed: boolean; html: string | null };
		};
		assert.equal(json.priceLockStatus.isExpired, true);
		assert.equal(json.supplementaryAgreement.needed, true);
		assert.ok(
			typeof json.supplementaryAgreement.html === "string" &&
				json.supplementaryAgreement.html.includes("ДОПОЛНИТЕЛЬНОЕ СОГЛАШЕНИЕ"),
		);
	});

	test("4. EGISZ Blank Guard: enforces egiszBlankPermissions (isAllowed=false and patientOptOutRespect)", async (t) => {
		if (!databaseReady) {
			t.skip("PostgreSQL unavailable");
			return;
		}
		await withTenantCtx(ORG_ID, async (tx) => {
			await tx.insert(egiszBlankPermissions).values({
				organizationId: ORG_ID,
				doctorId: DOCTOR_ID,
				blankCode: "Медицинская карта приёма (108)",
				blankTitle: "Анамнез и дневник приёма",
				isAllowed: false,
				patientOptOutRespect: true,
			});
		});

		const blockedRes = await app.inject({
			method: "POST",
			url: "/api/egisz/send",
			headers,
			payload: { patientId: PATIENT_ID, visitId: VISIT_ID },
		});
		assert.equal(blockedRes.statusCode, 403, blockedRes.body);
		assert.equal((blockedRes.json() as { error: string }).error, "EgiszBlankExportForbidden");

		// Allow blank export, then set patient opt-out consent
		await withTenantCtx(ORG_ID, async (tx) => {
			await tx
				.update(egiszBlankPermissions)
				.set({ isAllowed: true, patientOptOutRespect: true })
				.where(eq(egiszBlankPermissions.organizationId, ORG_ID));
			await tx.insert(patientConsents).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				kind: "otkaz_v_peredache_dannykh_v_egisz",
				grantedAt: new Date(),
			});
		});

		const optOutRes = await app.inject({
			method: "POST",
			url: "/api/egisz/send",
			headers,
			payload: { patientId: PATIENT_ID, visitId: VISIT_ID },
		});
		assert.equal(optOutRes.statusCode, 403, optOutRes.body);
		assert.equal((optOutRes.json() as { error: string }).error, "PatientEgiszOptOut");

		const outboxRows = await withTenantCtx(ORG_ID, async (tx) =>
			tx.select().from(egiszOutbox).where(eq(egiszOutbox.organizationId, ORG_ID)),
		);
		assert.equal(outboxRows.length, 0, "Blocked sends must never enqueue into egisz_outbox");
	});
});
