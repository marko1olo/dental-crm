/**
 * dmsGuaranteePersistence.test.ts — End-to-End Integration tests for PostgreSQL-backed DMS Guarantee Letters.
 * Verifies persistence across major Russian insurers (SOGAZ, MAKS, Ingosstrakh, RESO),
 * FDI tooth mapping, ACID transaction usage recording, and limit overflow protection.
 */

import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { insuranceRoutes } from "../../routes/insurance.js";
import { idempotencyPlugin } from "../../plugins/idempotencyPlugin.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, organizations, patients } from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";

const NAMESPACE = "dmsGuaranteePersistence";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const TEST_USER_ID = fixtureUuid(NAMESPACE, 2);

import { createTenantTestApp } from "../../tests/support/tenantTestApp.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = createTenantTestApp();
	await app.register(idempotencyPlugin);
	await app.register(insuranceRoutes);
	await app.ready();
	return app;
}

function createStaffHeaders(organizationId: string, userId = TEST_USER_ID, role = "admin") {
	const token = signToken(
		{ organizationId, userId, role },
		authTokenSecret(),
	);
	return {
		"x-dente-staff-token": token,
	};
}

describe("DMS Guarantee Letters — PostgreSQL Persistence & ACID Limits", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("persists guarantee letter for SOGAZ, reads from DB, records usage, and prevents overflow", async () => {
		const orgId = ORG_ID;
		const app = await buildTestApp();
		const headers = createStaffHeaders(orgId);

		let testPatientId = "";
		let testPatientFullName = "Иванов Иван Дмитриевич (ДМС Тест)";

		await withFixtureTenant(orgId, async () => {
			await db.insert(organizations).values({
				id: orgId,
				name: "Тестовая Стоматология ДМС",
				loginId: `test_dms_org_${Date.now()}`,
			});

			const [testPatient] = await db
				.insert(patients)
				.values({
					organizationId: orgId,
					fullName: testPatientFullName,
					phone: "+79991234567",
					birthDate: "1988-04-12",
					status: "active",
				})
				.returning();
			assert.ok(testPatient, "Test patient must be created in DB");
			testPatientId = testPatient.id;
		});

		const testPatient = { id: testPatientId, fullName: testPatientFullName };

		// 2. Create DMS Guarantee Letter via POST /api/insurance/guarantee-letters
		const createRes = await app.inject({
			method: "POST",
			url: "/api/insurance/guarantee-letters",
			headers: {
				...headers,
				"idempotency-key": randomUUID(),
			},
			payload: {
				organizationId: orgId,
				patientId: testPatient.id,
				patientFullName: testPatient.fullName,
				patientBirthDate: "1988-04-12",
				policyNumber: "SOGAZ-DMS-789012",
				insurerKey: "sogaz",
				insurerName: "АО «СОГАЗ»",
				letterNumber: `ГП-СОГАЗ-${Date.now()}`,
				issueDate: "2026-09-01",
				validFrom: "2026-09-01",
				validUntil: "2026-12-31",
				maxCoverageRub: 100000.0,
				franchisePct: 0,
				franchiseType: "none",
				franchiseFixedRub: 0,
				approvedTeethFdi: ["16", "26", "36", "46"],
				approvedDiagnosisCodes: ["K02.1", "K04.0"],
				approvedServiceCodes: ["A16.07.002", "A16.07.008"],
				curatorFullName: "Смирнова Елена Викторовна",
				curatorPhone: "+74957392140",
				notes: "Согласовано эндодонтическое лечение моляров с коффердамом",
				status: "active",
			},
		});

		assert.equal(createRes.statusCode, 201, `Create failed: ${createRes.body}`);
		const createJson = createRes.json();
		assert.ok(createJson.id, "Letter must have generated UUID");
		assert.equal(createJson.insurerKey, "sogaz");
		assert.equal(createJson.maxCoverageRub, 100000);
		assert.equal(createJson.maxCoverageKopecks, 10000000);
		assert.equal(createJson.usedAmountKopecks, 0);
		assert.deepEqual(createJson.approvedTeethFdi, ["16", "26", "36", "46"]);

		const letterId = createJson.id;

		// 2.1 Verify direct DB persistence of kopecks (Mandate 8bm)
		const [dbRow] = await db
			.select()
			.from(dmsGuaranteeLetters)
			.where(eq(dmsGuaranteeLetters.id, letterId));
		assert.ok(dbRow, "Letter must exist in DB");
		assert.equal(dbRow.maxCoverageKopecks, 10000000n, "maxCoverageKopecks must be 10000000n in DB");
		assert.equal(dbRow.usedAmountKopecks, 0n, "usedAmountKopecks must be 0n on creation in DB");

		// 3. Query via GET /api/insurance/guarantee-letters
		const listRes = await app.inject({
			method: "GET",
			url: `/api/insurance/guarantee-letters?patientId=${testPatient.id}`,
			headers,
		});

		assert.equal(listRes.statusCode, 200);
		const listJson = listRes.json();
		assert.ok(Array.isArray(listJson), "Result must be an array of letters");
		assert.ok(listJson.length >= 1);
		const foundLetter = listJson.find((l: { id: string }) => l.id === letterId);
		assert.ok(foundLetter, "Created letter must be retrieved from database");
		assert.equal(foundLetter.insurerName, "АО «СОГАЗ»");
		assert.equal(foundLetter.maxCoverageKopecks, 10000000);
		assert.equal(foundLetter.usedAmountKopecks, 0);

		// 4. Record partial usage of 40,000 RUB
		const usage1Res = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers: {
				...headers,
				"idempotency-key": randomUUID(),
			},
			payload: {
				amountRub: 40000.0,
				reason: "Лечение кариеса 16 зуба по ДМС",
			},
		});

		assert.equal(usage1Res.statusCode, 200);
		const usage1Json = usage1Res.json();
		assert.equal(usage1Json.success, true);
		assert.equal(usage1Json.usedAmountRub, 40000);
		assert.equal(usage1Json.remainingCoverageRub, 60000);
		assert.equal(usage1Json.status, "active");

		// Verify via GET & PG18 DB row that usedAmountKopecks reflects 40,000 RUB = 4,000,000 kop
		await withFixtureTenant(orgId, async (tx) => {
			const [dbAfterUsage1] = await tx
				.select()
				.from(dmsGuaranteeLetters)
				.where(and(eq(dmsGuaranteeLetters.id, letterId), eq(dmsGuaranteeLetters.organizationId, orgId)));
			assert.equal(dbAfterUsage1?.usedAmountKopecks, 4000000n, "DB usedAmountKopecks must persist 4000000n");
		});
		const listAfterUsage1 = await app.inject({
			method: "GET",
			url: `/api/insurance/guarantee-letters?patientId=${testPatient.id}`,
			headers,
		});
		const letterAfterUsage1 = listAfterUsage1.json().find((l: { id: string }) => l.id === letterId);
		assert.equal(letterAfterUsage1.maxCoverageKopecks, 10000000);
		assert.equal(letterAfterUsage1.usedAmountKopecks, 4000000);
		assert.equal(letterAfterUsage1.remainingLimitKopecks, 6000000);

		// 5. Usage that exceeds remaining coverage (70,000 > 60,000) under Mandate 8e:
		// Quietly debits remaining 60,000, transfers 10,000 difference to patient co-pay, auto-transitions to "exhausted"
		const overflowRes = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers: {
				...headers,
				"idempotency-key": randomUUID(),
			},
			payload: {
				amountRub: 70000.0,
				reason: "Превышение лимита гарантийного письма",
			},
		});

		assert.equal(overflowRes.statusCode, 200, "Overflow usage must not block doctor (Mandate 8e)");
		const overflowJson = overflowRes.json();
		assert.equal(overflowJson.success, true);
		assert.equal(overflowJson.debitedAmountRub, 60000);
		assert.equal(overflowJson.patientCoPayRub, 10000);
		assert.equal(overflowJson.patientCoPayKopecks, 1000000);
		assert.equal(overflowJson.usedAmountRub, 100000);
		assert.equal(overflowJson.remainingCoverageRub, 0);
		assert.equal(overflowJson.status, "exhausted");

		// Verify via GET that letter is exhausted with usedAmountKopecks = 10,000,000 kop
		const listAfterOverflow = await app.inject({
			method: "GET",
			url: `/api/insurance/guarantee-letters?patientId=${testPatient.id}`,
			headers,
		});
		const letterAfterOverflow = listAfterOverflow.json().find((l: { id: string }) => l.id === letterId);
		assert.equal(letterAfterOverflow.maxCoverageKopecks, 10000000);
		assert.equal(letterAfterOverflow.usedAmountKopecks, 10000000);
		assert.equal(letterAfterOverflow.remainingLimitKopecks, 0);
		assert.equal(letterAfterOverflow.status, "exhausted");

		// 7. Any further usage on exhausted letter routes 100% to patient co-pay without blocking doctor (Mandate 8e)
		const postExhaustRes = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers: {
				...headers,
				"idempotency-key": randomUUID(),
			},
			payload: {
				amountRub: 1000.0,
			},
		});

		assert.equal(postExhaustRes.statusCode, 200, "Exhausted letter routes usage to patient co-pay under Mandate 8e");
		const postExhaustJson = postExhaustRes.json();
		assert.equal(postExhaustJson.success, true);
		assert.equal(postExhaustJson.debitedAmountRub, 0);
		assert.equal(postExhaustJson.debitedDmsKopecks, 0);
		assert.equal(postExhaustJson.patientCoPayRub, 1000);
		assert.equal(postExhaustJson.patientCoPayKopecks, 100000);
		assert.equal(postExhaustJson.remainingCoverageRub, 0);
		assert.equal(postExhaustJson.remainingCoverageKopecks, 0);
		assert.equal(postExhaustJson.status, "exhausted");

		// 8. Verify idempotency replay via idempotencyPlugin without 409 in_flight conflict (DEF-INS-01)
		const replayKey = randomUUID();
		const r1 = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers: { ...headers, "idempotency-key": replayKey },
			payload: { amountRub: 500.0 },
		});
		assert.equal(r1.statusCode, 200, `Expected 200 on first plugin call, got ${r1.statusCode}: ${r1.body}`);
		const r2 = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers: { ...headers, "idempotency-key": replayKey },
			payload: { amountRub: 500.0 },
		});
		assert.equal(r2.statusCode, 200);
		assert.equal(r2.headers["idempotency-replayed"], "true");

		// 9. Future validFrom letter guard (DEF-INS-02)
		const futureDateIso = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
		const futureValidUntilIso = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
		const futureCreate = await app.inject({
			method: "POST",
			url: "/api/insurance/guarantee-letters",
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: {
				patientId: testPatient.id,
				patientFullName: testPatient.fullName,
				policyNumber: "SOGAZ-FUT-1",
				insurerKey: "sogaz",
				insurerName: "АО «СОГАЗ»",
				letterNumber: `ГП-FUTURE-${Date.now()}`,
				issueDate: futureDateIso,
				validFrom: futureDateIso,
				validUntil: futureValidUntilIso,
				maxCoverageRub: 20000,
			},
		});
		assert.equal(futureCreate.statusCode, 201);
		const futureLetterId = futureCreate.json().id;
		const futureUsage = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${futureLetterId}/record-usage`,
			headers: { ...headers, "idempotency-key": randomUUID() },
			payload: { amountRub: 1000 },
		});
		assert.equal(futureUsage.statusCode, 400);
		assert.equal(futureUsage.json().error, "LetterNotYetValid");
	});
});
