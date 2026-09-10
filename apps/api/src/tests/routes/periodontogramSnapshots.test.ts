import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { SEPA_PERMANENT_TEETH } from "@dental/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { registerPeriodontogramRoutes } from "../../routes/periodontogram.js";
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
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid } from "../support/fixtureOrganizations.js";

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
	});

	afterEach(async () => {
		await app.close();
		process.env = originalEnv;
		mock.restoreAll();
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

	it("GET /api/periodontogram/patients/:patientId/snapshots rejects malformed UUID (400)", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/periodontogram/patients/invalid-uuid/snapshots",
			headers: {
				[CLINIC_TOKEN_HEADER]: clinicToken,
			},
		});
		assert.equal(res.statusCode, 400);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "InvalidPatientId");
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

	it("POST /api/periodontogram/snapshots/:id/close returns 409 if snapshot already closed", async () => {
		// Mock db returning a closed snapshot
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: async () => [{ id: SNAPSHOT_ID, status: "closed" }],
				}),
			}),
		}));

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
		mock.method(db, "select", () => ({
			from: () => ({
				where: () => ({
					limit: async () => [{ id: SNAPSHOT_ID, status: "closed" }],
				}),
			}),
		}));

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
});
