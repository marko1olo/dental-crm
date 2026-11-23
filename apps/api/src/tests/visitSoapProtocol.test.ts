import assert from "node:assert/strict";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	organizations,
	patients,
	users,
	visitDiaries,
	visits,
} from "../db/schema.js";
import { TOKEN_SECRET } from "../routes/auth.js";
import { registerVisitRoutes } from "../routes/visits.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";

describe("Cryptex Lock & EMR SOAP Protocol Protection (CORE-5 / TASK-EMR-01..02)", () => {
	let app: FastifyInstance;
	let organizationId: string;
	let doctorUserId: string;
	let patientId: string;
	let visitIdDraft: string;
	let visitIdSigned: string;
	let clinicHeaders: Record<string, string>;

	beforeEach(async () => {
		organizationId = fixtureUuid("soap-cryptex", 1);
		doctorUserId = fixtureUuid("soap-cryptex", 2);
		patientId = fixtureUuid("soap-cryptex", 3);
		visitIdDraft = fixtureUuid("soap-cryptex", 4);
		visitIdSigned = fixtureUuid("soap-cryptex", 5);

		await purgeFixtureOrganizations([organizationId]);

		await withFixtureTenant(organizationId, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: organizationId,
					name: "Cryptex Lock Protocol Clinic",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: doctorUserId,
					organizationId,
					role: "doctor",
					email: "cryptex.doctor@clinic.test",
					fullName: "Доктор Замков",
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
					id: patientId,
					organizationId,
					fullName: "Пациент Неизменяемый",
				})
				.onConflictDoNothing();

			// 1. Черновик приёма
			await tx
				.insert(visits)
				.values({
					id: visitIdDraft,
					organizationId,
					patientId,
					status: "draft",
					complaint: "Первичный осмотр",
				})
				.onConflictDoNothing();

			// 2. Подписанный приём (Cryptex Lock)
			await tx
				.insert(visits)
				.values({
					id: visitIdSigned,
					organizationId,
					patientId,
					status: "signed",
					complaint: "Протокол подписан врачом",
					signedAt: new Date(),
				})
				.onConflictDoNothing();
		});

		app = Fastify();
		await registerVisitRoutes(app);

		clinicHeaders = {
			"x-dente-clinic-token": signToken(
				{ organizationId, role: "doctor", userId: doctorUserId },
				TOKEN_SECRET(),
			),
			"x-organization-id": organizationId,
			"content-type": "application/json",
		};
	});

	afterEach(async () => {
		await app.close();
		await purgeFixtureOrganizations([organizationId]);
	});

	it("1. Draft visit allows updating hygiene indices (HTTP 200 OK)", async () => {
		const payload = {
			ohi_s: 1.2,
			debris: 0.6,
			calculus: 0.6,
			plaqueIndexSilnessLoe: 1.2,
			approximalPlaqueIndexApi: 25,
			bleedingOnProbingPercent: 10,
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${visitIdDraft}/hygiene-indices`,
			headers: clinicHeaders,
			payload,
		});

		assert.strictEqual(res.statusCode, 200);
		const json = JSON.parse(res.body) as { ok?: boolean; hygieneIndices?: Record<string, unknown> };
		assert.strictEqual(json.ok, true);
		assert.strictEqual(json.hygieneIndices?.ohi_s, 1.2);
	});

	it("2. Cryptex Lock blocks hygiene mutation on signed visit with HTTP 422 VISIT_PROTOCOL_LOCKED", async () => {
		const payload = {
			ohi_s: 2.5,
			debris: 1.2,
			calculus: 1.3,
			plaqueIndexSilnessLoe: 2.5,
			approximalPlaqueIndexApi: 40,
			bleedingOnProbingPercent: 30,
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${visitIdSigned}/hygiene-indices`,
			headers: clinicHeaders,
			payload,
		});

		assert.strictEqual(res.statusCode, 422);
		const json = JSON.parse(res.body) as { error?: string; message?: string };
		assert.strictEqual(json.error, "VISIT_PROTOCOL_LOCKED");
		assert.strictEqual(json.message, "Протокол приёма подписан и защищён от изменений.");

		// Verify database row remained untainted
		const [checkRow] = await db
			.select({ hygieneIndices: visits.hygieneIndices })
			.from(visits)
			.where(and(eq(visits.id, visitIdSigned), eq(visits.organizationId, organizationId)))
			.limit(1);

		assert.strictEqual(checkRow?.hygieneIndices, null);
	});

	it("3. Cryptex Lock blocks periodontogram update on signed visit with HTTP 422 VISIT_PROTOCOL_LOCKED", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${visitIdSigned}/perio`,
			headers: clinicHeaders,
			payload: {
				teeth: [
					{ toothNumber: 11, mobility: 1 },
				],
			},
		});

		assert.strictEqual(res.statusCode, 422);
		const json = JSON.parse(res.body) as { error?: string; message?: string };
		assert.strictEqual(json.error, "VISIT_PROTOCOL_LOCKED");
		assert.strictEqual(json.message, "Протокол приёма подписан и защищён от изменений.");
	});

	it("4. Cryptex Lock blocks hygiene mutation if visit has locked diary (HTTP 422 VISIT_PROTOCOL_LOCKED)", async () => {
		// Attach a locked diary to draft visit
		const diaryId = fixtureUuid("soap-cryptex", 6);
		await withFixtureTenant(organizationId, async (tx) => {
			await tx
				.insert(visitDiaries)
				.values({
					id: diaryId,
					organizationId,
					visitId: visitIdDraft,
					patientId,
					isLocked: true,
					complaint: "Заблокированный дневник",
				})
				.onConflictDoNothing();
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/visits/${visitIdDraft}/hygiene-indices`,
			headers: clinicHeaders,
			payload: {
				ohi_s: 0.5,
				debris: 0.3,
				calculus: 0.2,
			},
		});

		assert.strictEqual(res.statusCode, 422);
		const json = JSON.parse(res.body) as { error?: string; message?: string };
		assert.strictEqual(json.error, "VISIT_PROTOCOL_LOCKED");
		assert.strictEqual(json.message, "Протокол приёма подписан и защищён от изменений.");
	});
});
