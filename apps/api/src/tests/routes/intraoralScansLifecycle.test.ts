/**
 * apps/api/src/tests/routes/intraoralScansLifecycle.test.ts — Integration Test Suite
 * for Universal Intraoral 3D Optical Scans Ingestion, Storage, Routing, and Security.
 *
 * Enforces:
 * - Red Team Zero Mocks & Presumption of 100% Defect
 * - Ingestion of multi-vendor 3D scan packages (3Shape TRIOS, Medit, iTero, Shining3D)
 * - Automatic vendor detection & FDI teeth extraction
 * - 4x4 Occlusion transformation matrix persistence
 * - Mesh streaming with strict path traversal jail & tenant isolation
 * - 152-ФЗ / 323-ФЗ ст. 13 Medical Secrecy RBAC enforcement
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { intraoralScanSessions } from "../../db/schema/intraoralScans.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { registerIntraoralScansRoutes } from "../../routes/intraoralScansRoutes.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { createSyntheticZipBuffer } from "./syntheticZipHelper.js";

describe("Universal Intraoral 3D Scans Lifecycle & Ingestion Invariants", () => {
	const orgA = fixtureUuid("scanLife", 1);
	const orgB = fixtureUuid("scanLife", 2);
	const patientId = fixtureUuid("scanLife", 3);
	const patientBId = fixtureUuid("scanLife", 4);
	const doctorUserId = fixtureUuid("scanLife", 5);
	const marketerUserId = fixtureUuid("scanLife", 6);
	const visitId = fixtureUuid("scanLife", 7);

	let app: ReturnType<typeof createTenantTestApp>;
	let doctorHeaders: Record<string, string>;
	let marketerHeaders: Record<string, string>;
	let orgBDoctorHeaders: Record<string, string>;

	before(async () => {
		await withFixtureTenant(orgA, async () => {
			await db.delete(intraoralScanSessions).where(eq(intraoralScanSessions.organizationId, orgA));
			await db.delete(schema.visits).where(eq(schema.visits.organizationId, orgA));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgA));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgA));

			await db.insert(schema.organizations).values({
				id: orgA,
				name: "Клиника 3D Сканирования Alpha",
			}).onConflictDoNothing();
			await db.insert(schema.patients).values({
				id: patientId,
				organizationId: orgA,
				fullName: "Смирнов Алексей Владимирович",
			}).onConflictDoNothing();
			await db.insert(schema.visits).values({
				id: visitId,
				organizationId: orgA,
				patientId: patientId,
				status: "draft",
			}).onConflictDoNothing();
		});

		await withFixtureTenant(orgB, async () => {
			await db.delete(intraoralScanSessions).where(eq(intraoralScanSessions.organizationId, orgB));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgB));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgB));

			await db.insert(schema.organizations).values({
				id: orgB,
				name: "Клиника 3D Сканирования Beta",
			}).onConflictDoNothing();
			await db.insert(schema.patients).values({
				id: patientBId,
				organizationId: orgB,
				fullName: "Кузнецов Петр Семенович",
			}).onConflictDoNothing();
		});

		app = createTenantTestApp();
		await registerIntraoralScansRoutes(app);

		const secret = authTokenSecret();

		const doctorStaffToken = signToken(
			{ role: "doctor", organizationId: orgA, userId: doctorUserId },
			secret,
		);
		const doctorClinicToken = signToken({ organizationId: orgA }, secret);
		doctorHeaders = {
			"x-organization-id": orgA,
			"x-dente-staff-token": doctorStaffToken,
			"x-dente-clinic-token": doctorClinicToken,
		};

		const marketerStaffToken = signToken(
			{ role: "marketer", organizationId: orgA, userId: marketerUserId },
			secret,
		);
		marketerHeaders = {
			"x-organization-id": orgA,
			"x-dente-staff-token": marketerStaffToken,
			"x-dente-clinic-token": doctorClinicToken,
		};

		const orgBStaffToken = signToken(
			{ role: "doctor", organizationId: orgB, userId: doctorUserId },
			secret,
		);
		const orgBClinicToken = signToken({ organizationId: orgB }, secret);
		orgBDoctorHeaders = {
			"x-organization-id": orgB,
			"x-dente-staff-token": orgBStaffToken,
			"x-dente-clinic-token": orgBClinicToken,
		};
	});

	after(async () => {
		await withFixtureTenant(orgA, async () => {
			await db.delete(intraoralScanSessions).where(eq(intraoralScanSessions.organizationId, orgA));
			await db.delete(schema.visits).where(eq(schema.visits.organizationId, orgA));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgA));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgA));
		});

		await withFixtureTenant(orgB, async () => {
			await db.delete(intraoralScanSessions).where(eq(intraoralScanSessions.organizationId, orgB));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgB));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgB));
		});

		await app.close();
	});

	it("1. POST /api/v1/scans/session successfully ingests 3Shape TRIOS ZIP with metadata", async () => {
		const orderXml = `<?xml version="1.0" encoding="utf-8"?>
<Order>
  <PatientName>Смирнов Алексей</PatientName>
  <Tooth>16</Tooth>
  <Tooth>26</Tooth>
  <Shade>A2</Shade>
</Order>`;

		const mockStlUpper = Buffer.from(
			"solid upper_jaw\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid",
			"utf8",
		);
		const mockStlLower = Buffer.from(
			"solid lower_jaw\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid",
			"utf8",
		);
		const mockStlBite = Buffer.from("solid buccal_bite\nendsolid", "utf8");

		const zipBuffer = createSyntheticZipBuffer([
			{ name: "3Shape_TRIOS_UpperJaw.stl", content: mockStlUpper },
			{ name: "3Shape_TRIOS_LowerJaw.stl", content: mockStlLower },
			{ name: "3Shape_TRIOS_Bite1.stl", content: mockStlBite },
			{ name: "Order.xml", content: orderXml },
		]);

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/scans/session",
			headers: doctorHeaders,
			payload: {
				patientId,
				visitId,
				zipBase64: zipBuffer.toString("base64"),
			},
		});

		assert.equal(res.statusCode, 201, `Expected 201 Created, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);

		assert.equal(body.success, true);
		assert.ok(body.session?.id);
		assert.equal(body.session.vendor, "3shape");
		assert.equal(body.session.organizationId, orgA);
		assert.equal(body.session.patientId, patientId);
		assert.equal(body.session.visitId, visitId);
		assert.equal(body.session.isOcclusionPreAligned, true);
		assert.equal(body.session.vitaShade, "A2");
		assert.deepEqual(body.session.preparationTeethFdi, [16, 26]);
		assert.ok(body.session.upperJawMasterUrl?.includes("UpperJaw.stl"));
		assert.ok(body.session.lowerJawMasterUrl?.includes("LowerJaw.stl"));
		assert.ok(body.session.upperJawPreviewUrl);
		assert.ok(body.session.lowerJawPreviewUrl);
	});

	it("2. POST /api/v1/scans/session ingests Medit files with 4x4 occlusion matrix and autolinks active visit", async () => {
		const meditJson = JSON.stringify({
			patientName: "Смирнов Алексей",
			teeth: [36, 46],
			shade: "B1",
			matrix: [
				1, 0, 0, 0,
				0, 0.9848, -0.1736, 0,
				0, 0.1736, 0.9848, 0,
				0, 2.5, -4.0, 1,
			],
			scannerModel: "Medit i700 Wireless",
		});

		const mockUpper = Buffer.from("ply\nformat ascii 1.0\nelement vertex 3\nend_header\n", "utf8");
		const mockLower = Buffer.from("ply\nformat ascii 1.0\nelement vertex 3\nend_header\n", "utf8");

		const res = await app.inject({
			method: "POST",
			url: "/api/v1/scans/session",
			headers: doctorHeaders,
			payload: {
				patientId,
				vendor: "medit",
				files: [
					{ name: "medit_maxilla_upper.ply", contentBase64: mockUpper.toString("base64") },
					{ name: "medit_mandible_lower.ply", contentBase64: mockLower.toString("base64") },
					{ name: "case_info.json", contentBase64: Buffer.from(meditJson).toString("base64") },
				],
			},
		});

		assert.equal(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${res.body}`);
		const body = JSON.parse(res.body);

		assert.equal(body.success, true);
		assert.equal(body.session.vendor, "medit");
		assert.equal(body.session.scannerModel, "Medit i700 Wireless");
		assert.equal(body.session.visitId, visitId, "Must auto-link active visit in chair");
		assert.equal(body.session.vitaShade, "B1");
		assert.deepEqual(body.session.preparationTeethFdi, [36, 46]);

		const matrix = body.session.occlusionMatrix;
		assert.equal(matrix.length, 16);
		assert.equal(matrix[5], 0.9848);
		assert.equal(matrix[13], 2.5);
	});

	it("3. GET /api/v1/scans/sessions/patient/:patientId returns all patient sessions in descending order", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});

		assert.equal(res.statusCode, 200);
		const body = JSON.parse(res.body);

		assert.equal(body.success, true);
		assert.ok(body.count >= 2, `Expected at least 2 sessions, got ${body.count}`);
		assert.equal(body.sessions.length, body.count);

		const dates = body.sessions.map((s: { capturedAt: string }) => new Date(s.capturedAt).getTime());
		for (let i = 1; i < dates.length; i++) {
			assert.ok(dates[i - 1]! >= dates[i]!, "Sessions must be ordered by capturedAt desc");
		}
	});

	it("4. GET /api/v1/scans/sessions/:id returns exact session and handles 404 for missing", async () => {
		const listRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});
		const listBody = JSON.parse(listRes.body);
		const existingId = listBody.sessions[0].id;

		const getRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/${existingId}`,
			headers: doctorHeaders,
		});
		assert.equal(getRes.statusCode, 200);
		const getBody = JSON.parse(getRes.body);
		assert.equal(getBody.session.id, existingId);

		const missingId = randomUUID();
		const missingRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/${missingId}`,
			headers: doctorHeaders,
		});
		assert.equal(missingRes.statusCode, 404);
	});

	it("5. GET /api/v1/scans/files/:sessionId/:fileName streams raw mesh bytes with correct MIME type", async () => {
		const listRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});
		const listBody = JSON.parse(listRes.body);
		const session = listBody.sessions.find((s: { vendor: string }) => s.vendor === "3shape");
		assert.ok(session, "3Shape session must exist");

		const fileRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/files/${session.id}/3Shape_TRIOS_UpperJaw.stl`,
			headers: doctorHeaders,
		});

		assert.equal(fileRes.statusCode, 200);
		assert.equal(fileRes.headers["content-type"], "model/stl");
		assert.ok(fileRes.body.includes("solid upper_jaw"));
	});

	it("6. Path Traversal Jail Security: Rejects directory traversal attempts", async () => {
		const listRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});
		const listBody = JSON.parse(listRes.body);
		const sessionId = listBody.sessions[0].id;

		const attackRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/files/${sessionId}/..%2F..%2F..%2Fpackage.json`,
			headers: doctorHeaders,
		});

		assert.equal(attackRes.statusCode, 404);
		assert.ok(!attackRes.body.includes("@dental/api"));
	});

	it("7. Multitenant Isolation: Org B cannot access Org A's scan sessions or files", async () => {
		const listRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});
		const listBody = JSON.parse(listRes.body);
		const orgASessionId = listBody.sessions[0].id;

		const crossTenantGet = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/${orgASessionId}`,
			headers: orgBDoctorHeaders,
		});
		assert.equal(crossTenantGet.statusCode, 404, "Org B must receive 404 for Org A's session");

		const crossTenantFile = await app.inject({
			method: "GET",
			url: `/api/v1/scans/files/${orgASessionId}/3Shape_TRIOS_UpperJaw.stl`,
			headers: orgBDoctorHeaders,
		});
		assert.equal(crossTenantFile.statusCode, 404, "Org B must receive 404 for Org A's mesh");
	});

	it("8. 152-ФЗ / 323-ФЗ ст. 13 Medical Secrecy: Non-clinical marketer cannot upload or download scans", async () => {
		const uploadRes = await app.inject({
			method: "POST",
			url: "/api/v1/scans/session",
			headers: marketerHeaders,
			payload: {
				patientId,
				vendor: "generic",
				files: [{ name: "scan.stl", contentBase64: Buffer.from("mesh").toString("base64") }],
			},
		});
		assert.equal(uploadRes.statusCode, 403, "Marketer upload must be rejected with 403");
		const uploadBody = JSON.parse(uploadRes.body);
		assert.equal(uploadBody.error, "PermissionDenied");

		const listRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/sessions/patient/${patientId}`,
			headers: doctorHeaders,
		});
		const sessionId = JSON.parse(listRes.body).sessions[0].id;

		const downloadRes = await app.inject({
			method: "GET",
			url: `/api/v1/scans/files/${sessionId}/3Shape_TRIOS_UpperJaw.stl`,
			headers: marketerHeaders,
		});
		assert.equal(downloadRes.statusCode, 403, "Marketer download must be rejected with 403");
		const downloadBody = JSON.parse(downloadRes.body);
		assert.equal(downloadBody.error, "PermissionDenied");
	});

	it("9. Path Traversal Defense: folderPath outside allowed scanner roots is rejected with 403", async () => {
		const traversalRes = await app.inject({
			method: "POST",
			url: "/api/v1/scans/session",
			headers: doctorHeaders,
			payload: {
				patientId,
				vendor: "generic",
				folderPath: "../../../etc/passwd",
			},
		});
		assert.equal(traversalRes.statusCode, 403, `Path traversal must be rejected with 403, got ${traversalRes.statusCode}`);
		const body = JSON.parse(traversalRes.body);
		assert.equal(body.error, "PathTraversalDetected");
	});
});
