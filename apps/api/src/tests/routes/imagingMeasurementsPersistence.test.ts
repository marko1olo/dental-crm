import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import {
	getImagingAnnotationsForStudy,
	saveImagingMeasurementsForStudy,
} from "../../db/imagingMeasurementsQuery.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { registerStudiesRoutes } from "../../routes/imaging/studiesRoutes.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

describe("Dental DICOM & Radiology Measurements SSOT Persistence", () => {
	const orgId = "c752bbc3-e8e3-4e4b-a008-8b8444ef097d";
	const patientId = "01a0d7f7-d48c-7838-89e3-d747341585fc";
	const studyId = randomUUID();

	it("saves and retrieves calibrated millimeter measurements from PostgreSQL", async () => {
		// 1. Create a transient test study row
		await withTenantCtx(orgId, async () => {
			await db.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: orgId,
				patientId: patientId,
				kind: "periapical",
				title: "Test RVG Tooth 46 Implant Ruler",
				toothCode: "46",
				status: "available",
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "RVG Sensor",
			});
		});

		const testMeasurements = [
			{
				id: randomUUID(),
				toothCode: "46",
				annotationType: "distance",
				coordinates: {
					startX: 120,
					startY: 240,
					endX: 120,
					endY: 440,
				},
				measurements: {
					lengthMm: 10.5,
					distanceMm: 10.5,
					distancePx: 200,
					pixelSpacingMm: 0.0525,
				},
				notes: "Alveolar bone height for implant planning",
			},
			{
				id: randomUUID(),
				toothCode: "46",
				annotationType: "distance",
				coordinates: {
					startX: 100,
					startY: 280,
					endX: 180,
					endY: 280,
				},
				measurements: {
					lengthMm: 7.2,
					distanceMm: 7.2,
					distancePx: 80,
					pixelSpacingMm: 0.09,
				},
				notes: "Ridge width measurement",
			},
		];

		// 2. Save measurements
		const saved = await saveImagingMeasurementsForStudy(
			orgId,
			studyId,
			patientId,
			testMeasurements,
		);

		assert.equal(saved.length, 2);
		assert.equal(saved[0]?.toothCode, "46");
		assert.equal(saved[0]?.toothNumber, "46");
		assert.equal((saved[0]?.measurements as any)?.lengthMm, 10.5);

		// 3. Retrieve measurements
		const loaded = await getImagingAnnotationsForStudy(orgId, studyId);
		assert.equal(loaded.length, 2);
		assert.equal(loaded[0]?.studyId, studyId);
		assert.equal(loaded[0]?.toothCode, "46");
		assert.equal((loaded[0]?.coordinates as any)?.startX, 120);
		assert.equal((loaded[1]?.measurements as any)?.lengthMm, 7.2);

		// 4. Atomic replace test: update with 1 new measurement
		const updatedMeasurements = [
			{
				id: randomUUID(),
				toothCode: "46",
				annotationType: "distance",
				coordinates: {
					startX: 150,
					startY: 250,
					endX: 150,
					endY: 350,
				},
				measurements: {
					lengthMm: 12.0,
					distanceMm: 12.0,
				},
				notes: "Updated implant canal clearance",
			},
		];

		const replaced = await saveImagingMeasurementsForStudy(
			orgId,
			studyId,
			patientId,
			updatedMeasurements,
		);

		assert.equal(replaced.length, 1);
		const reloaded = await getImagingAnnotationsForStudy(orgId, studyId);
		assert.equal(reloaded.length, 1);
		assert.equal((reloaded[0]?.measurements as any)?.lengthMm, 12.0);

		// 5. Clean up test study and cascading annotations
		await withTenantCtx(orgId, async () => {
			await db
				.delete(schema.imagingStudies)
				.where(
					and(
						eq(schema.imagingStudies.organizationId, orgId),
						eq(schema.imagingStudies.id, studyId),
					),
				);
		});
	});

	it("verifies radiology_studies view aliasing tooth_number", async () => {
		const result = await db.execute(
			`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'radiology_studies' AND column_name IN ('tooth_code', 'tooth_number') ORDER BY column_name;`
		);
		assert.ok(result.rows.length >= 2, "radiology_studies view should expose both tooth_code and tooth_number");
	});

	it("verifies imaging_measurements view aliasing tooth_number and annotations", async () => {
		const result = await db.execute(
			`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'imaging_measurements' AND column_name IN ('tooth_code', 'tooth_number', 'coordinates', 'measurements') ORDER BY column_name;`
		);
		assert.ok(result.rows.length >= 4, "imaging_measurements view should expose tooth_number, tooth_code, coordinates, measurements");
	});

	it("exercises Fastify API endpoints for radiology studies, measurements, and viewer session", async () => {
		const app = createTenantTestApp();
		await registerStudiesRoutes(app);

		const secret = authTokenSecret();
		const clinicToken = signToken({ organizationId: orgId }, secret);
		const staffToken = signToken({ role: "doctor", organizationId: orgId, userId: patientId }, secret);

		const headers = {
			"x-organization-id": orgId,
			"x-dente-staff-token": staffToken,
			"x-dente-clinic-token": clinicToken,
		};

		// 1. Create a study via /api/radiology/studies
		const createRes = await app.inject({
			method: "POST",
			url: "/api/radiology/studies",
			headers,
			payload: {
				patientId,
				kind: "periapical",
				title: "RVG Inquisitor Test Study",
				toothCode: "36",
				sourceKind: "manual_upload",
				sourceName: "RVG Sensor",
			},
		});
		assert.equal(createRes.statusCode, 201);
		const createdStudy = JSON.parse(createRes.body);
		const testStudyId = createdStudy.id;

		// 2. Put measurements via /api/radiology/studies/:id/measurements
		const putMeasRes = await app.inject({
			method: "PUT",
			url: `/api/radiology/studies/${testStudyId}/measurements`,
			headers,
			payload: {
				measurements: [
					{
						toothCode: "36",
						annotationType: "distance",
						coordinates: { startX: 50, startY: 100, endX: 50, endY: 300 },
						measurements: { lengthMm: 15.2, distanceMm: 15.2 },
						notes: "Root canal length measurement",
					},
				],
			},
		});
		assert.equal(putMeasRes.statusCode, 200);

		// 3. Get measurements via /api/radiology/studies/:id/measurements
		const getMeasRes = await app.inject({
			method: "GET",
			url: `/api/radiology/studies/${testStudyId}/measurements`,
			headers,
		});
		assert.equal(getMeasRes.statusCode, 200);
		const getMeas = JSON.parse(getMeasRes.body);
		assert.equal(getMeas.length, 1);
		assert.equal(getMeas[0].toothCode, "36");
		assert.equal(getMeas[0].measurements.lengthMm, 15.2);

		// 4. Update viewer-session via /api/radiology/studies/:id/viewer-session
		const putSessionRes = await app.inject({
			method: "PUT",
			url: `/api/radiology/studies/${testStudyId}/viewer-session`,
			headers,
			payload: {
				patientId,
				state: {
					mode: "two_d",
					activeTool: "measure_distance",
					activeQuickActionId: null,
					windowPreset: "bone",
					windowCenter: null,
					windowWidth: null,
					brightness: 1.2,
					contrast: 1.4,
					inverted: true,
					rotationDeg: 90,
					flipHorizontal: false,
					zoom: 1.5,
					panX: 10,
					panY: 20,
					sliceIndex: null,
					projection: null,
					axisDeg: 0,
					slabMm: 1,
					crosshair: false,
					linkedPlanes: false,
					implantPlan: null,
				},
				annotations: [
					{
						id: "ann_1",
						type: "distance",
						label: "Канал 15.2 мм",
						toothCode: "36",
						points: [{ x: 50, y: 100 }, { x: 50, y: 300 }],
						measurementValue: 15.2,
						unit: "mm",
						note: "Endo measurement",
						createdByUserId: null,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				],
			},
		});
		assert.equal(putSessionRes.statusCode, 200);

		// 5. Get viewer session via /api/radiology/studies/:id/viewer-session
		const getSessionRes = await app.inject({
			method: "GET",
			url: `/api/radiology/studies/${testStudyId}/viewer-session`,
			headers,
		});
		assert.equal(getSessionRes.statusCode, 200);
		const sess = JSON.parse(getSessionRes.body);
		assert.equal(sess.session.state.brightness, 1.2);
		assert.equal(sess.session.state.inverted, true);

		// 6. 1-click update toothCode via PATCH /api/radiology/studies/:id
		const patchRes = await app.inject({
			method: "PATCH",
			url: `/api/radiology/studies/${testStudyId}`,
			headers,
			payload: {
				toothCode: "37",
			},
		});
		assert.equal(patchRes.statusCode, 200);
		const patched = JSON.parse(patchRes.body);
		assert.equal(patched.toothCode, "37");

		// Clean up
		await withTenantCtx(orgId, async () => {
			await db
				.delete(schema.imagingViewerSessions)
				.where(
					and(
						eq(schema.imagingViewerSessions.organizationId, orgId),
						eq(schema.imagingViewerSessions.studyId, testStudyId),
					),
				);
			await db
				.delete(schema.imagingStudies)
				.where(
					and(
						eq(schema.imagingStudies.organizationId, orgId),
						eq(schema.imagingStudies.id, testStudyId),
					),
				);
		});
	});
});
