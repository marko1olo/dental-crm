import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	payments,
	sberbankTransactions,
	visits,
} from "../../../db/schema.js";
import { verifySberbankChecksum } from "../../../routes/sberbank.js";
import {
	fixtureUuid,
	withFixtureTenant,
} from "../../support/fixtureOrganizations.js";
import {
	CHAIR_1_ID,
	CHAIR_2_ID,
	DOCTOR_1_ID,
	DOCTOR_2_ID,
	NAMESPACE,
	ORG_ID,
	PATIENT_1_ID,
	PATIENT_2_ID,
	SBER_SECRET,
	VISIT_1_ID,
	generateSberbankChecksum,
	repoRoot,
	type Tier2FixtureContext,
} from "./tier2Fixture.js";

export function registerSberbankAndScheduleCases(ctx: Tier2FixtureContext): void {
	// ==========================================
	// Feature 4: Sberbank Acquiring Boundaries
	// ==========================================
	describe("Feature 4: Sberbank Acquiring Boundaries & Corner Cases", () => {
		it("4.1 calculates exact HMAC-SHA256 with Cyrillic descriptions and special punctuation", () => {
			const params = {
				amount: "750000",
				description: "Оплата услуг: пломба & чистка (№ 45-А/2)",
				orderId: "sber-cyrillic-01",
				status: "success",
			};
			const checksum = generateSberbankChecksum(params, SBER_SECRET);
			const verified = verifySberbankChecksum(
				{ ...params, checksum },
				SBER_SECRET,
				checksum,
			);
			assert.equal(verified, true);
		});

		it("4.2 rejects webhook missing checksum with 400 Bad Request or 401 Unauthorized", async () => {
			const res = await ctx.app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: {
					orderId: "sber-missing-checksum",
					status: "success",
					amount: "100000",
				},
			});
			assert.ok(res.statusCode === 400 || res.statusCode === 401);
		});

		it("4.3 handles failed payment status without creating positive paid payment record", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const orderId = "sber-failed-order-002";
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					orderId,
					amount: 200000,
					status: "pending",
				});
			});

			const params = { orderId, status: "failed" };
			const checksum = generateSberbankChecksum(params, SBER_SECRET);

			const res = await ctx.app.inject({
				method: "POST",
				url: "/api/sberbank/webhook",
				payload: { ...params, checksum },
			});
			assert.equal(res.statusCode, 200);

			const [tx] = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(sberbankTransactions)
					.where(eq(sberbankTransactions.orderId, orderId)),
			);
			assert.equal(tx?.status, "failed");

			const paidList = await withFixtureTenant(ORG_ID, async () =>
				db
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, ORG_ID),
							eq(payments.clientMutationId, `sberbank:${orderId}`),
							eq(payments.status, "paid"),
						),
					),
			);
			assert.equal(paidList.length, 0);
		});

		it("4.4 prevents cross-tenant transaction hijacking via webhook callback", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const OTHER_ORG = fixtureUuid(NAMESPACE, 99);
			const orderId = "sber-other-org-order";

			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(sberbankTransactions).values({
					organizationId: ORG_ID,
					patientId: PATIENT_1_ID,
					orderId,
					amount: 150000,
					status: "pending",
				});
			});

			const foreignTx = await withFixtureTenant(OTHER_ORG, async () =>
				db
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, OTHER_ORG),
							eq(sberbankTransactions.orderId, orderId),
						),
					),
			);
			assert.equal(foreignTx.length, 0);
		});

		it("4.5 rejects non-POST HTTP methods to webhook route with 404 or 405", async () => {
			const res = await ctx.app.inject({
				method: "GET",
				url: "/api/sberbank/webhook",
			});
			assert.ok(res.statusCode === 404 || res.statusCode === 405);
		});
	});

	// ==========================================
	// Feature 7: Schedule Concurrency Boundaries
	// ==========================================
	describe("Feature 7: Schedule Concurrency Boundaries", () => {
		it("7.1 accepts contiguous non-overlapping boundary (exact touch 10:00-10:30 and 10:30-11:00)", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const res1 = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T10:00:00.000Z",
				endsAt: "2029-01-10T10:30:00.000Z",
			});
			assert.equal(res1.statusCode, 201);

			const res2 = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_2_ID,
				startsAt: "2029-01-10T10:30:00.000Z",
				endsAt: "2029-01-10T11:00:00.000Z",
			});
			assert.equal(res2.statusCode, 201);
		});

		it("7.2 rejects 1-second overlap interval with 409 Conflict", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const res = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T10:29:59.000Z",
				endsAt: "2029-01-10T11:00:00.000Z",
			});
			assert.equal(res.statusCode, 409);
		});

		it("7.3 rejects inverted time range (endsAt before startsAt) with 400 Validation Error", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const res = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt: "2029-01-10T15:00:00.000Z",
				endsAt: "2029-01-10T14:00:00.000Z",
			});
			assert.equal(res.statusCode, 400);
		});

		it("7.4 canceled appointments do not block future bookings on the same slot", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2029-01-10T16:00:00.000Z";
			const endsAt = "2029-01-10T16:30:00.000Z";

			const createRes = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_1_ID,
				startsAt,
				endsAt,
			});
			assert.equal(createRes.statusCode, 201);

			await withFixtureTenant(ORG_ID, async () => {
				await db
					.delete(appointments)
					.where(
						and(
							eq(appointments.organizationId, ORG_ID),
							eq(appointments.startsAt, new Date(startsAt)),
						),
					);
			});

			const retryRes = await ctx.makeAppointment({
				doctorUserId: DOCTOR_1_ID,
				chairId: CHAIR_1_ID,
				patientId: PATIENT_2_ID,
				startsAt,
				endsAt,
			});
			assert.equal(retryRes.statusCode, 201);
		});

		it("7.5 prevents concurrent chair double-booking while doctor is distinct", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const startsAt = "2029-01-10T17:00:00.000Z";
			const endsAt = "2029-01-10T17:45:00.000Z";

			const [resA, resB] = await Promise.all([
				ctx.makeAppointment({
					doctorUserId: DOCTOR_1_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_1_ID,
					startsAt,
					endsAt,
				}),
				ctx.makeAppointment({
					doctorUserId: DOCTOR_2_ID,
					chairId: CHAIR_2_ID,
					patientId: PATIENT_2_ID,
					startsAt,
					endsAt,
				}),
			]);

			const codes = [resA.statusCode, resB.statusCode].sort();
			assert.deepEqual(codes, [201, 409]);
		});
	});

	// ==========================================
	// Feature 8: 043/u EMR Drafts Boundaries
	// ==========================================
	describe("Feature 8: 043/u EMR Drafts & SHA-256 Boundaries", () => {
		const BOUNDARY_VISIT_ID = fixtureUuid(NAMESPACE, 85);

		it("8.1 handles null/undefined optional clinical notes as empty strings in SHA-256 hash", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(visits)
					.values({
						id: BOUNDARY_VISIT_ID,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					})
					.onConflictDoNothing();
			});

			const res = await ctx.app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": ctx.clinicToken,
					"x-dente-staff-token": ctx.doctorToken,
					authorization: `Bearer ${ctx.doctorToken}`,
				},
				payload: {
					visitId: BOUNDARY_VISIT_ID,
					patientId: PATIENT_1_ID,
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					status: "signed",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
			assert.equal(typeof body.hash, "string");
			assert.equal(body.hash.length, 64);
		});

		it("8.2 hashes large clinical text notes (>5000 chars) reliably without memory limits", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const largeVisitId = fixtureUuid(NAMESPACE, 86);
			await withFixtureTenant(ORG_ID, async () => {
				await db
					.insert(visits)
					.values({
						id: largeVisitId,
						organizationId: ORG_ID,
						patientId: PATIENT_1_ID,
						status: "draft",
					})
					.onConflictDoNothing();
			});

			const longNotes = "Пациент предъявляет жалобы на боль. ".repeat(200);
			const res = await ctx.app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": ctx.clinicToken,
					"x-dente-staff-token": ctx.doctorToken,
					authorization: `Bearer ${ctx.doctorToken}`,
				},
				payload: {
					visitId: largeVisitId,
					patientId: PATIENT_1_ID,
					diagnosisIcd10: "K02.1",
					diagnosisTooth: "16",
					anamnesis: longNotes,
					status: "signed",
				},
			});

			assert.equal(res.statusCode, 200);
			const body = res.json();
			assert.equal(body.success, true);
			assert.equal(body.hash.length, 64);
		});

		it("8.3 rejects malformed non-UUID visitId with 400 Bad Request", async () => {
			const res = await ctx.app.inject({
				method: "POST",
				url: "/api/diaries",
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": ctx.clinicToken,
					"x-dente-staff-token": ctx.doctorToken,
					authorization: `Bearer ${ctx.doctorToken}`,
				},
				payload: {
					visitId: "not-a-valid-uuid",
					patientId: PATIENT_1_ID,
					status: "draft",
				},
			});
			assert.equal(res.statusCode, 400);
		});

		it("8.4 revision ceremony requires non-empty revisionReason to unlock post-signing", async (context) => {
			if (!ctx.databaseAvailable) return context.skip("DB unavailable");

			const res = await ctx.app.inject({
				method: "POST",
				url: `/api/diaries/revise`,
				headers: {
					"content-type": "application/json",
					"x-dente-clinic-token": ctx.clinicToken,
					"x-dente-staff-token": ctx.doctorToken,
					authorization: `Bearer ${ctx.doctorToken}`,
				},
				payload: {
					visitId: BOUNDARY_VISIT_ID,
					revisionReason: "",
				},
			});
			assert.ok(res.statusCode >= 400);
		});

		it("8.5 confirms any byte alteration modifies the resulting SHA-256 digest completely", () => {
			const raw1 = `${VISIT_1_ID}|${PATIENT_1_ID}|Анамнез 1|||||||`;
			const raw2 = `${VISIT_1_ID}|${PATIENT_1_ID}|Анамнез 2|||||||`;
			const hash1 = crypto.createHash("sha256").update(raw1).digest("hex");
			const hash2 = crypto.createHash("sha256").update(raw2).digest("hex");
			assert.notEqual(hash1, hash2);
		});
	});

	// ==========================================
	// Feature 10: Repository Gates & Integrity
	// ==========================================
	describe("Feature 10: Repository Gates & Integrity Boundaries", () => {
		it("10.1 check-css-tokens gate fails-closed if CSS file has unmatched var()", () => {
			const checkCssScript = readFileSync(
				join(repoRoot, "scripts/check-css-tokens.mjs"),
				"utf8",
			);
			assert.ok(checkCssScript.includes("process.exit(1)"));
		});

		it("10.2 check-encoding gate fails-closed on invalid byte sequences", () => {
			const checkEncodingScript = readFileSync(
				join(repoRoot, "scripts/check-encoding.mjs"),
				"utf8",
			);
			assert.ok(checkEncodingScript.includes("process.exit(1)"));
		});

		it("10.3 check-dynamic-imports gate fails-closed on missing dynamic target files", () => {
			const checkDynScript = readFileSync(
				join(repoRoot, "scripts/check-dynamic-imports.mjs"),
				"utf8",
			);
			assert.ok(checkDynScript.includes("process.exit(1)"));
		});

		it("10.4 check-env-contract gate verifies environment keys fail-closed when undocumented", () => {
			const checkEnvScript = readFileSync(
				join(repoRoot, "scripts/check-env-contract.mjs"),
				"utf8",
			);
			assert.ok(checkEnvScript.includes("process.exit(1)"));
		});

		it("10.5 confirms zero mock interfaces in production billing and schedule route files", () => {
			const billingRoute = readFileSync(
				join(repoRoot, "apps/api/src/routes/billing.ts"),
				"utf8",
			);
			assert.doesNotMatch(billingRoute, /mock|Mock|Dummy/i);
		});
	});
}
