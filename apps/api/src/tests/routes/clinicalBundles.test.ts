import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	organizations,
	patients,
	treatmentPlans,
	treatmentPlanItemsNew,
	users,
} from "../../db/schema.js";
import { clinicalBundlesRoutes } from "../../routes/clinicalBundlesRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "clinicalBundles";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const DOCTOR_ID = fixtureUuid(FIXTURE, 3);
const PLAN_ID = fixtureUuid(FIXTURE, 4);

describe("Clinical Bundles API (Mandate 8e, 8n & 8ao)", () => {
	let app: FastifyInstance;
	let databaseReady = true;
	let testHeaders: Record<string, string>;

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		try {
			await purgeFixtureOrganizations([ORG_ID]);
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseReady = false;
			return;
		}

		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника ДЕНТЕ Клинические Пакеты",
			}).onConflictDoNothing();

			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "bundle_doctor@example.com",
				passwordHash: "hash_test",
				fullName: "Др. Тестов Пакет Игоревич",
				role: "doctor",
			}).onConflictDoNothing();

			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пациент Пакетный Тест",
				phone: "+79998887766",
			}).onConflictDoNothing();

			await db.insert(treatmentPlans).values({
				id: PLAN_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				doctorId: DOCTOR_ID,
				name: "Комплексный план под ключ",
				totalPriceRub: "0",
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await app.register(clinicalBundlesRoutes);
		await app.ready();

		const token = signToken(
			{
				userId: DOCTOR_ID,
				role: "doctor",
				organizationId: ORG_ID,
			},
			authTokenSecret(),
			3600,
		);

		testHeaders = {
			authorization: `Bearer ${token}`,
			"x-tenant-id": ORG_ID,
		};
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
	});

	test("1. GET /api/clinical-bundles returns all canonical turnkey packages", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "GET",
			url: "/api/clinical-bundles",
			headers: testHeaders,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.ok(Array.isArray(body.bundles));
		assert.ok(body.bundles.length >= 10);

		// Проверяем наличие ключевых пакетов
		const cariesBundle = body.bundles.find((b: any) => b.id === "caries_turnkey");
		assert.ok(cariesBundle);
		assert.equal(cariesBundle.category, "therapy");
		assert.ok(cariesBundle.totalPriceRub > 0);
		assert.ok(cariesBundle.items.length >= 3);
	});

	test("2. GET /api/clinical-bundles/:id returns single bundle details", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "GET",
			url: "/api/clinical-bundles/implant_turnkey",
			headers: testHeaders,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.bundle.id, "implant_turnkey");
		assert.equal(body.bundle.category, "surgery");
		assert.equal(body.bundle.totalPriceRub, 41500);
		assert.equal(body.bundle.totalPriceKopecks, 4150000);
	});

	test("3. POST /api/clinical-bundles/apply without planId calculates items in-memory", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-bundles/apply",
			headers: testHeaders,
			payload: {
				bundleId: "caries_turnkey",
				toothNumber: 26,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.bundleId, "caries_turnkey");
		assert.equal(body.toothNumber, 26);
		assert.equal(body.totalRub, 7500);
		assert.equal(body.totalKopecks, 750000);
		assert.ok(body.items.length >= 4);

		// Проверяем, что элементы содержат правильный зуб
		for (const it of body.items) {
			assert.equal(it.toothNumber, 26);
			assert.ok(it.serviceCode);
		}
	});

	test("4. POST /api/clinical-bundles/apply with planId inserts items into PostgreSQL 18", async (t) => {
		if (!databaseReady) return t.skip("Database is not ready");

		const res = await app.inject({
			method: "POST",
			url: "/api/clinical-bundles/apply",
			headers: testHeaders,
			payload: {
				bundleId: "hygiene_turnkey",
				planId: PLAN_ID,
				doctorId: DOCTOR_ID,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.success, true);
		assert.equal(body.bundleId, "hygiene_turnkey");
		assert.equal(body.totalRub, 6500);

		// Проверяем запись в реальную базу данных
		await withFixtureTenant(ORG_ID, async () => {
			const insertedItems = await db.query.treatmentPlanItemsNew.findMany({
				where: (items, { and, eq }) =>
					and(eq(items.organizationId, ORG_ID), eq(items.planId, PLAN_ID)),
			});
			assert.ok(insertedItems.length >= 3);
			const hasAirflow = insertedItems.some((it) => it.priceId === "A16.07.050.001");
			assert.ok(hasAirflow);
		});
	});
});
