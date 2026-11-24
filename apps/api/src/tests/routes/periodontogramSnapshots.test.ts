import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { SEPA_PERMANENT_TEETH } from "@dental/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { registerPeriodontogramRoutes } from "../../routes/periodontogram/index.js";
import { authTokenSecret } from "../../security/authSecret.js";
import {
	CLINIC_TOKEN_HEADER,
	STAFF_TOKEN_HEADER,
} from "../../security/identity.js";
import {
	computeSnapshotIndices,
	type SiteRow,
	type ToothRow,
} from "../../services/periodontogramIndices.js";
import { siteItemSchema } from "../../services/periodontogramService.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { organizations, patients, periodontogramSnapshots, users } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "perioSnapshotsTest";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const PATIENT_ID = fixtureUuid(NAMESPACE, 2);
const USER_ID = fixtureUuid(NAMESPACE, 3);
const SNAPSHOT_ID = fixtureUuid(NAMESPACE, 4);

describe("Periodontogram Clinical Indices & SEPA Calculator (ADR 0013)", () => {
	it("returns zero metrics when denominator is 0 (all teeth missing)", () => {
		const teeth: ToothRow[] = [
			{
				id: "t1",
				snapshotId: SNAPSHOT_ID,
				toothNumber: 11,
				isPresent: false,
				isImplant: false,
				mobility: null,
				prognosis: null,
				furcationBuccal: null,
				furcationLingual: null,
				keratinizedGingivaMm: null,
			},
		];
		const sites: SiteRow[] = [];

		const indices = computeSnapshotIndices(teeth, sites);
		assert.equal(indices.total_teeth_examined, 0);
		assert.equal(indices.total_sites_probed, 0);
		assert.equal(indices.bop_pct, 0);
		assert.equal(indices.pi_pct, 0);
		assert.equal(indices.cal_mean_mm, 0);
		assert.equal(indices.deep_pockets_count, 0);
		assert.equal(indices.ohi_s, 0);
		assert.equal(indices.pma, 0);
		assert.equal(indices.psr, 0);
	});

	it("accurately computes SEPA BOP %, Plaque %, CAL Mean, and Deep Pockets", () => {
		// 28 present teeth -> denominator = 28 * 6 = 168 sites
		const teeth: ToothRow[] = Array.from({ length: 28 }, (_, i) => ({
			id: `t_${i}`,
			snapshotId: SNAPSHOT_ID,
			toothNumber: SEPA_PERMANENT_TEETH[i]!,
			isPresent: true,
			isImplant: false,
			mobility: null,
			prognosis: null,
			furcationBuccal: null,
			furcationLingual: null,
			keratinizedGingivaMm: null,
		}));

		// Create sites:
		// 42 sites with BOP -> 42 / 168 = 25.0%
		// 84 sites with Plaque -> 84 / 168 = 50.0%
		// Tooth 11 has pocket 5mm (CAL = 5 + 1 = 6mm) -> deep pocket!
		// Tooth 26 has pocket 6mm (CAL = 6 + 0 = 6mm) -> deep pocket!
		const sites: SiteRow[] = [];
		for (let i = 0; i < 42; i++) {
			const toothNumber = teeth[i % 28]!.toothNumber;
			sites.push({
				id: `s_bop_${i}`,
				snapshotId: SNAPSHOT_ID,
				toothId: `t_${i % 28}`,
				toothNumber,
				siteCode: "V",
				probingDepthMm: 3,
				gingivalMarginMm: 0,
				bleedingOnProbing: true,
				plaque: i < 84,
				suppuration: false,
				calculus: false,
			});
		}

		// Add deep pockets to tooth 11 and tooth 26
		sites.push({
			id: "s_deep_11",
			snapshotId: SNAPSHOT_ID,
			toothId: "t_0",
			toothNumber: 11,
			siteCode: "MV",
			probingDepthMm: 5,
			gingivalMarginMm: 1,
			bleedingOnProbing: true,
			plaque: true,
			suppuration: false,
			calculus: true,
		});

		sites.push({
			id: "s_deep_26",
			snapshotId: SNAPSHOT_ID,
			toothId: "t_10",
			toothNumber: 26,
			siteCode: "L",
			probingDepthMm: 6,
			gingivalMarginMm: 0,
			bleedingOnProbing: true,
			plaque: true,
			suppuration: true,
			calculus: true,
		});

		const indices = computeSnapshotIndices(teeth, sites);

		assert.equal(indices.total_teeth_examined, 28);
		assert.equal(indices.deep_pockets_count, 2); // 11 and 26
		assert.ok(indices.bop_pct > 25);
		assert.ok(indices.cal_mean_mm > 0);
		assert.ok(indices.psr >= 4); // Max pocket >= 6mm -> PSR code 4
	});
});

describe("Periodontogram Fastify Routes Integration (/api/periodontogram/*)", () => {
	let app: FastifyInstance;
	let clinicToken: string;
	let staffToken: string;
	const originalEnv = process.env;

	beforeEach(async () => {
		process.env = { ...originalEnv };
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.AUTH_TOKEN_SECRET =
			process.env.AUTH_TOKEN_SECRET ||
			"dente-test-secret-at-least-32-chars-long!!";

		clinicToken = signToken({ organizationId: ORG_ID }, authTokenSecret());
		staffToken = signToken(
			{
				organizationId: ORG_ID,
				userId: USER_ID,
				role: "doctor",
			},
			authTokenSecret(),
		);

		app = Fastify();
		await registerPeriodontogramRoutes(app);

		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника Пародонтологии Тест",
				})
				.onConflictDoNothing();
			await tx
				.insert(users)
				.values({
					id: USER_ID,
					organizationId: ORG_ID,
					fullName: "Доктор Пародонтолог",
					role: "doctor",
				})
				.onConflictDoNothing();
			await tx
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Тестовый",
				})
				.onConflictDoNothing();
		});
	});

	afterEach(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await app.close();
		process.env = originalEnv;
		mock.reset?.();
	});

	it("GET /api/periodontogram/patients/:patientId/snapshots rejects without auth token (401)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/periodontogram/patients/${PATIENT_ID}/snapshots`,
		});
		assert.equal(res.statusCode, 401);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "AuthRequired");
	});

	it("GET /api/periodontogram/patients/:patientId/snapshots rejects empty patientId (400)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/periodontogram/patients/%20/snapshots",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidPatientId");
	});

	it("GET /api/periodontogram/patients/:patientId/snapshots supports demo non-UUID patient ID cleanly", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/periodontogram/patients/demo_perio_patient/snapshots",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
	});

	it("POST /api/periodontogram/patients/:patientId/draft rejects non-staff call (401)", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/periodontogram/patients/${PATIENT_ID}/draft`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(res.statusCode, 401);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "StaffAuthRequired");
	});

	it("PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber validates tooth bounds (400)", async () => {
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: async () => [{ id: SNAPSHOT_ID, status: "draft" }],
				}),
			}),
		}));

		const res = await app.inject({
			method: "PATCH",
			url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}/teeth/11`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				mobility: 5, // Invalid: must be 0..3
			},
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
	});

	it("PATCH /api/periodontogram/snapshots/:id/sites rejects probing depth > 15 (400)", async () => {
		// Mock db to return an open draft snapshot
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: async () => [{ id: SNAPSHOT_ID, status: "draft" }],
				}),
			}),
		}));

		const res = await app.inject({
			method: "PATCH",
			url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}/sites`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: [
				{
					toothNumber: 11,
					siteCode: "MV",
					probingDepthMm: 25, // Invalid: exceeds 15mm
				},
			],
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "ValidationError");
	});

	it("PATCH /api/periodontogram/snapshots/:id/teeth/:toothNumber/sites/:siteCode rejects invalid siteCode (400)", async () => {
		const res = await app.inject({
			method: "PATCH",
			url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}/teeth/11/sites/INVALID`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				probingDepthMm: 3,
			},
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidParameters");
	});

	it("siteItemSchema accepts and normalizes frontend site codes MB, B, DB to MV, V, DV", () => {
		const parsedMb = siteItemSchema.parse({
			toothNumber: 11,
			siteCode: "MB",
			probingDepthMm: 3,
		});
		assert.equal(parsedMb.siteCode, "MV");

		const parsedB = siteItemSchema.parse({
			toothNumber: 11,
			site_code: "B",
			probingDepthMm: 2,
		});
		assert.equal(parsedB.site_code, "V");

		const parsedDb = siteItemSchema.parse({
			toothNumber: 11,
			siteCode: "DB",
			probingDepthMm: 4,
		});
		assert.equal(parsedDb.siteCode, "DV");

		const parsedLingual = siteItemSchema.parse({
			toothNumber: 11,
			siteCode: "ML",
			probingDepthMm: 2,
		});
		assert.equal(parsedLingual.siteCode, "ML");
	});

	it("POST /api/periodontogram/snapshots/:id/close returns 409 if snapshot already closed", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(periodontogramSnapshots)
				.values({
					id: SNAPSHOT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "closed",
					recordedAt: new Date(),
					closedAt: new Date(),
					recordedByUserId: USER_ID,
					closedByUserId: USER_ID,
				})
				.onConflictDoNothing();
		});

		const res = await app.inject({
			method: "POST",
			url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}/close`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Пациент завершил курс пародонтологического лечения",
			},
		});

		assert.equal(res.statusCode, 409);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "SnapshotAlreadyClosed");
	});

	it("DELETE /api/periodontogram/snapshots/:id rejects deleting closed snapshot (409)", async () => {
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(periodontogramSnapshots)
				.values({
					id: SNAPSHOT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					status: "closed",
					recordedAt: new Date(),
					closedAt: new Date(),
					recordedByUserId: USER_ID,
					closedByUserId: USER_ID,
				})
				.onConflictDoNothing();
		});

		const res = await app.inject({
			method: "DELETE",
			url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
		});

		assert.equal(res.statusCode, 409);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "CannotDiscardClosedSnapshot");
	});

	it("GET /api/periodontogram/:patientId rejects empty patientId (400)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/periodontogram/%20",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidPatientId");
	});

	it("GET /api/periodontogram/:patientId and /api/perio/:patientId support demo non-UUID without 400", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/perio/demo_perio_patient",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
	});

	it("POST /api/periodontogram/:patientId rejects non-staff call (401)", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/periodontogram/${PATIENT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
			payload: {
				notes: "Клинический осмотр",
			},
		});

		assert.equal(res.statusCode, 401);
	});

	it("POST /api/periodontogram/:patientId rejects empty patientId (400)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/periodontogram/%20",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Клинический осмотр",
			},
		});

		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidPatientId");
	});

	it("POST /api/perio/:patientId supports demo non-UUID patient ID cleanly", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/perio/demo_perio_patient",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Клинический осмотр пародонта",
			},
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
	});

	it("POST /api/perio/:patientId rejects non-existent patient with 404 PatientNotFound in production mode", async () => {
		const nonExistentId = fixtureUuid(NAMESPACE, 999);
		const res = await app.inject({
			method: "POST",
			url: `/api/perio/${nonExistentId}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Клинический осмотр пародонта",
			},
		});

		assert.equal(res.statusCode, 404);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "PatientNotFound");
	});

	it("POST /api/perio/:patientId successfully saves periodontogram for existing patient in database", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/perio/${PATIENT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Клинический осмотр пародонта",
			},
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(json.data);
	});

	it("POST /api/periodontogram/snapshots/:id/close preserves psrData in indices", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/perio/${PATIENT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Осмотр с PSR перед закрытием",
				psrData: { S1: { code: 2, asterisk: false } },
				indices: { psrData: { S1: { code: 2, asterisk: false } } },
			},
		});

		assert.equal(createRes.statusCode, 200);
		const createJson = JSON.parse(createRes.body);
		const snapshotId = createJson.data?.id;
		assert.ok(snapshotId, "Draft snapshot ID must exist");

		const closeRes = await app.inject({
			method: "POST",
			url: `/api/periodontogram/snapshots/${snapshotId}/close`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: { notes: "Закрытие осмотра" },
		});

		assert.equal(closeRes.statusCode, 200);
		const closeJson = JSON.parse(closeRes.body);
		assert.equal(closeJson.success, true);
		assert.ok(closeJson.data?.indices?.psrData, "psrData must be preserved upon close");
		assert.equal(closeJson.data?.indices?.psrData?.S1?.code, 2);
	});

	it("POST /api/periodontogram/snapshots/:id/close returns cached 200 OK on idempotency retry instead of 409", async () => {
		const createRes = await app.inject({
			method: "POST",
			url: `/api/perio/${PATIENT_ID}`,
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
				[STAFF_TOKEN_HEADER]: staffToken,
			},
			payload: {
				notes: "Осмотр для проверки идемпотентности закрытия",
			},
		});

		assert.equal(createRes.statusCode, 200);
		const createJson = JSON.parse(createRes.body);
		const snapshotId = createJson.data?.id;
		assert.ok(snapshotId, "Draft snapshot ID must exist");

		const testIdemKey = "01933a00-1111-7000-8000-000000000099";
		const idemApp = await createIdempotentTenantTestApp();
		await registerPeriodontogramRoutes(idemApp);
		try {
			// Первая попытка закрытия снимка с Idempotency-Key
			const closeRes1 = await idemApp.inject({
				method: "POST",
				url: `/api/periodontogram/snapshots/${snapshotId}/close`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
					"idempotency-key": testIdemKey,
				},
				payload: { notes: "Закрытие осмотра с ключом идемпотентности" },
			});

			assert.equal(closeRes1.statusCode, 200);
			const closeJson1 = JSON.parse(closeRes1.body);
			assert.equal(closeJson1.success, true);

			// Повторный сетевой ретрай с тем же Idempotency-Key: должен вернуть 200 OK из кэша вместо 409 SnapshotAlreadyClosed!
			const closeRes2 = await idemApp.inject({
				method: "POST",
				url: `/api/periodontogram/snapshots/${snapshotId}/close`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
					"idempotency-key": testIdemKey,
				},
				payload: { notes: "Закрытие осмотра с ключом идемпотентности" },
			});

			assert.equal(closeRes2.statusCode, 200, "Retry with same Idempotency-Key must return 200 OK");
			assert.equal(closeRes2.headers["idempotency-replayed"], "true");
			const closeJson2 = JSON.parse(closeRes2.body);
			assert.equal(closeJson2.success, true);
		} finally {
			await idemApp.close();
		}
	});

	it("POST /api/periodontogram/snapshots/:id/close returns 409 Conflict if idempotency key status is in_flight", async () => {
		const inFlightKey = "01933a00-2222-7000-8000-000000000099";
		await db.insert(idempotencyKeys).values({
			clinicId: ORG_ID,
			key: inFlightKey,
			status: "in_flight",
			lockedAt: new Date(),
		});

		const idemApp = await createIdempotentTenantTestApp();
		await registerPeriodontogramRoutes(idemApp);
		try {
			const res = await idemApp.inject({
				method: "POST",
				url: `/api/periodontogram/snapshots/${SNAPSHOT_ID}/close`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
					"idempotency-key": inFlightKey,
				},
				payload: { notes: "Попытка закрытия при in_flight" },
			});

			assert.equal(res.statusCode, 409);
			const json = JSON.parse(res.body);
			assert.equal(json.error, "Conflict");
			assert.equal(res.headers["retry-after"], "1");
		} finally {
			await idemApp.close();
		}
	});

	it("POST /api/perio/:patientId returns 409 Conflict if idempotency key status is in_flight", async () => {
		const inFlightKey = "01933a00-3333-7000-8000-000000000099";
		await db.insert(idempotencyKeys).values({
			clinicId: ORG_ID,
			key: inFlightKey,
			status: "in_flight",
			lockedAt: new Date(),
		});

		const idemApp = await createIdempotentTenantTestApp();
		await registerPeriodontogramRoutes(idemApp);
		try {
			const res = await idemApp.inject({
				method: "POST",
				url: `/api/perio/${PATIENT_ID}`,
				headers: {
					[CLINIC_TOKEN_HEADER]: clinicToken,
					[STAFF_TOKEN_HEADER]: staffToken,
					"idempotency-key": inFlightKey,
				},
				payload: { notes: "Попытка сохранения при in_flight" },
			});

			assert.equal(res.statusCode, 409);
			const json = JSON.parse(res.body);
			assert.equal(json.error, "Conflict");
			assert.equal(res.headers["retry-after"], "1");
		} finally {
			await idemApp.close();
		}
	});
});
