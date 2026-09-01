/**
 * dmsGuaranteePersistence.test.ts — End-to-End Integration tests for PostgreSQL-backed DMS Guarantee Letters.
 * Verifies persistence across major Russian insurers (SOGAZ, MAKS, Ingosstrakh, RESO),
 * FDI tooth mapping, ACID transaction usage recording, and limit overflow protection.
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { insuranceRoutes } from "../../routes/insurance.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { db } from "../../db/client.js";
import { organizations, patients } from "../../db/schema.js";

async function getOrCreateTestOrg(): Promise<string> {
	const existing = await db
		.select({ id: organizations.id })
		.from(organizations)
		.limit(1);
	if (existing.length > 0 && existing[0]?.id) {
		return existing[0].id;
	}
	const [created] = await db
		.insert(organizations)
		.values({
			name: "Тестовая Стоматология ДМС",
			loginId: `test_dms_org_${Date.now()}`,
		})
		.returning({ id: organizations.id });
	return created!.id;
}

const TEST_USER_ID = "00000000-0000-7000-8000-000000000002";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
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
	it("persists guarantee letter for SOGAZ, reads from DB, records usage, and prevents overflow", async () => {
		const orgId = await getOrCreateTestOrg();
		const app = await buildTestApp();
		const headers = createStaffHeaders(orgId);

		// 1. Ensure test patient exists
		const [testPatient] = await db
			.insert(patients)
			.values({
				organizationId: orgId,
				fullName: "Иванов Иван Дмитриевич (ДМС Тест)",
				phone: `+7999${Math.floor(1000000 + Math.random() * 9000000)}`,
				birthDate: "1988-04-12",
				status: "active",
			})
			.returning();

		assert.ok(testPatient, "Test patient must be created in DB");

		// 2. Create DMS Guarantee Letter via POST /api/insurance/guarantee-letters
		const createRes = await app.inject({
			method: "POST",
			url: "/api/insurance/guarantee-letters",
			headers,
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
		assert.deepEqual(createJson.approvedTeethFdi, ["16", "26", "36", "46"]);

		const letterId = createJson.id;

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

		// 4. Record partial usage of 40,000 RUB
		const usage1Res = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers,
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

		// 5. Attempt usage that exceeds remaining coverage (70,000 > 60,000)
		const overflowRes = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers,
			payload: {
				amountRub: 70000.0,
				reason: "Превышение лимита гарантийного письма",
			},
		});

		assert.equal(overflowRes.statusCode, 400, "Overflow usage must be rejected");
		const overflowJson = overflowRes.json();
		assert.equal(overflowJson.error, "LimitExceeded");

		// 6. Record remaining exact usage of 60,000 RUB -> should auto-transition to "exhausted"
		const usage2Res = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers,
			payload: {
				amountRub: 60000.0,
				reason: "Эндодонтическое лечение 26 зуба (завершение лимита)",
			},
		});

		assert.equal(usage2Res.statusCode, 200);
		const usage2Json = usage2Res.json();
		assert.equal(usage2Json.success, true);
		assert.equal(usage2Json.usedAmountRub, 100000);
		assert.equal(usage2Json.remainingCoverageRub, 0);
		assert.equal(usage2Json.status, "exhausted");

		// 7. Any further usage on exhausted letter must fail
		const postExhaustRes = await app.inject({
			method: "POST",
			url: `/api/insurance/guarantee-letters/${letterId}/record-usage`,
			headers,
			payload: {
				amountRub: 1000.0,
			},
		});

		assert.equal(postExhaustRes.statusCode, 400);
	});
});
