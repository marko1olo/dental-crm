import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { registerRadiologyDicomRoutes } from "../../routes/radiology/dicomReceiverRoutes.js";
import { registerStudiesRoutes } from "../../routes/imaging/studiesRoutes.js";
import { registerDiagnocatAnalyticsRoutes } from "../../routes/analytics/diagnocatRoutes.js";
import { registerDiagnocatIntegrationRoutes } from "../../routes/integrations/diagnocat.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../../security/identity.js";

process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";

describe("Radiology Fixer Defects Suite (SEV-1, SEV-2, SEV-3)", () => {
	const orgId = fixtureUuid("radiologyFixerOrg", 1);
	const patientId = fixtureUuid("radiologyFixerPat", 2);
	const studyId = fixtureUuid("radiologyFixerStudy", 3);

	const createAuthHeader = (role = "doctor") => {
		const token = signToken(
			{
				userId: fixtureUuid("radiologyUser", 9),
				organizationId: orgId,
				role,
			},
			authTokenSecret(),
		);
		return {
			[STAFF_TOKEN_HEADER]: token,
			authorization: `Bearer ${token}`,
			"x-organization-id": orgId,
		};
	};

	before(async () => {
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.generatedDocuments).where(eq(schema.generatedDocuments.organizationId, orgId));
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));

			await db.insert(schema.organizations).values({ id: orgId, name: "Radiology Fixer Clinic" }).onConflictDoNothing();
			await db.insert(schema.patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Смирнова Елена Анатольевна",
				phone: "+79001112233",
			}).onConflictDoNothing();

			// Исходное исследование и соответствующий 2D-снимок
			await db.insert(schema.imagingStudies).values({
				id: studyId,
				organizationId: orgId,
				patientId: null,
				kind: "periapical",
				title: "Прицельный снимок зуба 26",
				toothCode: null,
				sourceKind: "sensor_bridge",
				sourceName: "Vatech EzSensor",
				status: "available",
				capturedAt: new Date(),
			}).onConflictDoNothing();

			await db.insert(schema.xrayScans).values({
				id: studyId,
				organizationId: orgId,
				patientId,
				originalFilename: "scan_26.dcm",
				mimeType: "image/jpeg",
				kind: "periapical",
				toothCode: null,
				status: "done",
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.generatedDocuments).where(eq(schema.generatedDocuments.organizationId, orgId));
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
		});
	});

	describe("SEV-1: Path Traversal & Missing Org Isolation in Vatech Bridge", () => {
		it("POST /api/radiology/dicom/bridge/start отклоняет попытку Path Traversal с кодом 400 PathValidationError", async () => {
			const app = Fastify();
			await registerRadiologyDicomRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: "/api/radiology/dicom/bridge/start",
				headers: createAuthHeader("admin"),
				payload: {
					watchDirectory: "../../windows/system32",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const json = res.json();
			assert.strictEqual(json.error, "PathValidationError");
			await app.close();
		});

		it("POST /api/radiology/dicom/bridge/scan-now отклоняет попытку Path Traversal с кодом 400 PathValidationError", async () => {
			const app = Fastify();
			await registerRadiologyDicomRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: "/api/radiology/dicom/bridge/scan-now",
				headers: createAuthHeader("admin"),
				payload: {
					directoryPath: "C:\\Windows\\System32\\config",
				},
			});

			assert.strictEqual(res.statusCode, 400);
			const json = res.json();
			assert.strictEqual(json.error, "PathValidationError");
			await app.close();
		});
	});

	describe("SEV-2: Dual SSOT & Synchronized Updates in imaging_studies vs xray_scans", () => {
		it("bindPatientHandler синхронно обновляет patientId в xray_scans в рамках единой транзакции", async () => {
			const app = Fastify();
			await registerStudiesRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: `/api/imaging/studies/${studyId}/bind-patient`,
				headers: createAuthHeader("doctor"),
				payload: {
					patientId,
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = res.json();
			assert.strictEqual(data.patientId, patientId);

			// Проверяем синхронное обновление в xray_scans
			await withFixtureTenant(orgId, async () => {
				const [xray] = await db
					.select()
					.from(schema.xrayScans)
					.where(and(eq(schema.xrayScans.id, studyId), eq(schema.xrayScans.organizationId, orgId)));

				assert.ok(xray, "Запись xray_scans должна существовать");
				assert.strictEqual(xray.patientId, patientId, "patientId в xray_scans обязан совпадать со study");
			});

			await app.close();
		});

		it("bindToothHandler синхронно обновляет toothCode в xray_scans в рамках единой транзакции", async () => {
			const app = Fastify();
			await registerStudiesRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: `/api/imaging/studies/${studyId}/bind-tooth`,
				headers: createAuthHeader("doctor"),
				payload: {
					toothCode: "26",
				},
			});

			assert.strictEqual(res.statusCode, 200);
			const data = res.json();
			assert.strictEqual(data.toothCode, "26");

			// Проверяем синхронное обновление в xray_scans
			await withFixtureTenant(orgId, async () => {
				const [xray] = await db
					.select()
					.from(schema.xrayScans)
					.where(and(eq(schema.xrayScans.id, studyId), eq(schema.xrayScans.organizationId, orgId)));

				assert.ok(xray, "Запись xray_scans должна существовать");
				assert.strictEqual(xray.toothCode, "26", "toothCode в xray_scans обязан обновиться до 26");
			});

			await app.close();
		});

		it("unbindPatientHandler синхронно удаляет запись из xray_scans при отвязке от пациента", async () => {
			const app = Fastify();
			await registerStudiesRoutes(app);

			const res = await app.inject({
				method: "POST",
				url: `/api/imaging/studies/${studyId}/unbind-patient`,
				headers: createAuthHeader("doctor"),
			});

			assert.strictEqual(res.statusCode, 200);
			const data = res.json();
			assert.strictEqual(data.patientId, null);

			// Проверяем удаление из xray_scans (так как patient_id в xray_scans NOT NULL)
			await withFixtureTenant(orgId, async () => {
				const [xray] = await db
					.select()
					.from(schema.xrayScans)
					.where(and(eq(schema.xrayScans.id, studyId), eq(schema.xrayScans.organizationId, orgId)));

				assert.strictEqual(xray, undefined, "Запись в xray_scans обязана быть удалена при отвязке от пациента");
			});

			await app.close();
		});
	});

	describe("SEV-3: Naming Collision Elimination for Diagnocat Routes", () => {
		it("registerDiagnocatAnalyticsRoutes и registerDiagnocatIntegrationRoutes регистрируют маршруты без коллизий", async () => {
			const app = Fastify();
			await registerDiagnocatAnalyticsRoutes(app);
			await registerDiagnocatIntegrationRoutes(app);

			// Проверяем доступность эндпоинта аналитики
			const resAnalytics = await app.inject({
				method: "GET",
				url: "/api/analytics/ai-diagnostics",
				headers: createAuthHeader("admin"),
			});
			assert.strictEqual(resAnalytics.statusCode, 200);

			// Проверяем вебхук интеграции (требует секрет)
			const resWebhook = await app.inject({
				method: "POST",
				url: "/api/clinical-ai/webhook",
				payload: {},
			});
			assert.strictEqual(resWebhook.statusCode, 401);

			await app.close();
		});
	});
});
