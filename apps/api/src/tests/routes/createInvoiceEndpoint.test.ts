import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patientInvoices,
	patients,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import { registerInvoiceRoutes } from "../../routes/invoices.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "createInvoiceEndpointTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 10);
const VISIT_ID = fixtureUuid(NAMESPACE, 20);
const VISIT_2_ID = fixtureUuid(NAMESPACE, 21);

describe("RED TEAM AUDIT: Real Visit Invoice Creation & PostgreSQL 18 Persistence", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let token = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Red Team Аудита Счетов",
				})
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Стоматолог-Терапевт",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Смирнов Алексей Викторович",
					phone: "+7 (999) 111-22-33",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "K02.1 Кариес дентина",
				})
				.onConflictDoNothing();

			await db
				.insert(visits)
				.values({
					id: VISIT_2_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "signed",
					diagnosis: "K05.0 Острый гингивит",
				})
				.onConflictDoNothing();
		});

		app = createTenantTestApp();
		await registerInvoiceRoutes(app);

		const secret = authTokenSecret();
		token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, secret);
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]).catch(() => {});
		}
	});

	it("1. POST /api/invoices rejects payload without patientId", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable in this test environment");

		const res = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			payload: {
				visitId: VISIT_ID,
				items: [],
			},
		});

		assert.strictEqual(res.statusCode, 400);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.error, "ValidationError");
	});

	it("2. POST /api/invoices creates real invoice and treatmentItems in PostgreSQL 18", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable in this test environment");

		const res = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			payload: {
				visitId: VISIT_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				items: [
					{
						serviceCode: "A16.07.002",
						serviceName: "Лечение кариеса с постановкой световой пломбы",
						toothNumber: 16,
						priceRub: 4500,
						quantity: 1,
						discountPercent: 10, // 450 ₽ скидка, итого 4050 ₽
					},
					{
						serviceCode: "A16.07.051",
						serviceName: "Проводниковая анестезия",
						priceRub: 800,
						quantity: 1,
						discountRub: 0,
					},
				],
				totalAmountRub: 4850,
				status: "issued",
				notes: "Оплата после приёма терапевта",
			},
		});

		assert.strictEqual(res.statusCode, 201, `Failed with payload: ${res.payload}`);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.success, true);
		assert.ok(body.invoice?.id, "Invoice must contain real UUID from database");
		assert.ok(body.invoice.invoiceNumber.startsWith("СЧ-"), "Invoice number must follow canonical format");
		assert.strictEqual(body.invoice.patientId, PATIENT_ID);
		assert.strictEqual(body.invoice.visitId, VISIT_ID);
		assert.strictEqual(body.invoice.totalAmountRub, 4850);
		assert.strictEqual(body.invoice.status, "issued");

		// Верификация в PostgreSQL 18
		const [dbInvoice] = await db
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, ORG_ID),
					eq(patientInvoices.id, body.invoice.id),
				),
			)
			.limit(1);

		assert.ok(dbInvoice, "Invoice record must exist in PostgreSQL patient_invoices");
		assert.strictEqual(dbInvoice.patientId, PATIENT_ID);
		assert.strictEqual(dbInvoice.visitId, VISIT_ID);
		assert.strictEqual(Number(dbInvoice.totalAmountRub), 4850);
		assert.strictEqual(dbInvoice.status, "issued");

		// Верификация treatment_items
		const dbItems = await db
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, ORG_ID),
					eq(treatmentItems.visitId, VISIT_ID),
				),
			);

		assert.strictEqual(dbItems.length, 2, "Must persist 2 treatment items in database");
		const toothItem = dbItems.find((it) => it.toothCode === "16");
		assert.ok(toothItem, "Tooth 16 item must exist");
		assert.strictEqual(toothItem.title, "Лечение кариеса с постановкой световой пломбы");
		assert.strictEqual(toothItem.priceRub, 4050);
		assert.strictEqual(toothItem.discountRub, 450);
	});

	it("3. GET /api/invoices/pending returns freshly created real invoice", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable in this test environment");

		const res = await app.inject({
			method: "GET",
			url: "/api/invoices/pending",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.success, true);
		assert.ok(Array.isArray(body.invoices), "Must return invoices array");

		const found = body.invoices.find((inv: any) => inv.visitId === VISIT_ID);
		assert.ok(found, "Pending queue must contain our newly created invoice");
		assert.strictEqual(found.totalAmountRub, 4850);
		assert.strictEqual(found.status, "issued");
	});

	it("4. Idempotency: repeated POST /api/invoices with same visitId returns existing invoice", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable in this test environment");

		const res = await app.inject({
			method: "POST",
			url: "/api/invoices",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			payload: {
				visitId: VISIT_ID,
				patientId: PATIENT_ID,
				totalAmountRub: 4850,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.idempotent, true);
		assert.strictEqual(body.invoice.visitId, VISIT_ID);
		assert.strictEqual(body.invoice.totalAmountRub, 4850);
	});

	it("5. POST /api/v1/visits/:visitId/invoice accepts visitId from URL route parameter", async (t) => {
		if (!databaseReady) return t.skip("Database is unavailable in this test environment");

		const res = await app.inject({
			method: "POST",
			url: `/api/v1/visits/${VISIT_2_ID}/invoice`,
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			payload: {
				patientId: PATIENT_ID,
				items: [
					{
						serviceCode: "A16.07.020",
						serviceName: "Ультразвуковое удаление зубных отложений",
						priceRub: 3500,
						quantity: 1,
					},
				],
				totalAmountRub: 3500,
			},
		});

		assert.strictEqual(res.statusCode, 201);
		const body = JSON.parse(res.payload);
		assert.strictEqual(body.success, true);
		assert.strictEqual(body.invoice.visitId, VISIT_2_ID);
		assert.strictEqual(body.invoice.totalAmountRub, 3500);
	});
});
