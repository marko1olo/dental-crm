import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { withTenantCtx } from "../../db/rls.js";
import { createTenantTestApp, closeAllTenantTestApps } from "../support/tenantTestApp.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { registerStudiesRoutes, registerXraySeriesRoute } from "../../routes/imaging/studiesRoutes.js";
import { registerPacsRoutes } from "../../routes/imaging/pacsRoutes.js";
import { validateAndResolvePacsLocalFilePath } from "../../services/imaging/localPacsSanitizer.js";
import { mapImagingStudy } from "../../db/imaging/imagingMappers.js";
import { mapXrayScanToImagingStudy } from "../../db/imaging/imagingXrayMapper.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { authTokenSecret } from "../../security/authSecret.js";

describe("Radiology Backend Engine: Security & Consistency SSOT Suite", () => {
	const orgId = fixtureUuid("radiologySecurityTest", 1);
	const patientId = fixtureUuid("radiologySecurityTest", 2);
	const doctorId = fixtureUuid("radiologySecurityTest", 3);
	const secret = authTokenSecret();

	const chiefDoctorToken = signToken(
		{ role: "chief_doctor", organizationId: orgId, userId: doctorId },
		secret,
	);
	const clinicToken = signToken({ organizationId: orgId }, secret);

	const authHeaders = {
		"x-organization-id": orgId,
		"x-dente-staff-token": chiefDoctorToken,
		"x-dente-clinic-token": clinicToken,
	};

	before(async () => {
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.users).where(eq(schema.users.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));

			await db.insert(schema.organizations).values({
				id: orgId,
				name: "Клиника Радиологии Red Team",
			}).onConflictDoNothing();

			await db.insert(schema.patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Пациент Безопасный",
				phone: "+79991112233",
			}).onConflictDoNothing();

			await db.insert(schema.users).values({
				id: doctorId,
				organizationId: orgId,
				role: "chief_doctor",
				fullName: "Главврач Рентгенолог",
				login: "chief_rad",
				passwordHash: "hash",
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await closeAllTenantTestApps();
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.imagingAnnotations).where(eq(schema.imagingAnnotations.organizationId, orgId));
			await db.delete(schema.imagingViewerSessions).where(eq(schema.imagingViewerSessions.organizationId, orgId));
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.users).where(eq(schema.users.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
		});
	});

	describe("1. Path Traversal & Folder Scanner Security", () => {
		it("блокирует попытки выхода через относительные пути (..) и абсолютные пути хоста", () => {
			assert.throws(
				() => validateAndResolvePacsLocalFilePath(orgId, "../../../windows/system32"),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.match(err.message, /находится вне разрешенного хранилища|выходит за пределы|недопустимый путь/i);
					return true;
				},
			);

			assert.throws(
				() => validateAndResolvePacsLocalFilePath(orgId, "C:\\Windows\\System32"),
				(err: unknown) => {
					assert.ok(err instanceof Error);
					assert.match(err.message, /находится вне разрешенного хранилища|выходит за пределы|недопустимый путь/i);
					return true;
				},
			);
		});

		it("POST /api/imaging/folders/scan-preview возвращает HTTP 400 PATH_TRAVERSAL_DETECTED при опасном пути", async () => {
			const app = createTenantTestApp();
			await registerPacsRoutes(app);

			const response = await app.inject({
				method: "POST",
				url: "/api/imaging/folders/scan-preview",
				headers: authHeaders,
				payload: {
					sourceName: "Враждебный источник",
					folderPath: "../../secret_passwords",
					recursive: false,
					maxFiles: 10,
				},
			});

			assert.strictEqual(response.statusCode, 400);
			const body = JSON.parse(response.body);
			assert.strictEqual(body.error, "PATH_TRAVERSAL_DETECTED");
			assert.ok(body.message.length > 0);
		});
	});

	describe("2. Radiation Dose Honesty (Anti-Fake Doses)", () => {
		it("не подставляет фиктивные хардкод-дозы (0.002, 0.025, 0.05) при их отсутствии", () => {
			const dummyStudy: typeof schema.imagingStudies.$inferSelect = {
				id: randomUUID(),
				organizationId: orgId,
				patientId,
				visitId: null,
				kind: "periapical",
				status: "available",
				title: "Прицельный снимок 36",
				toothCode: "36",
				region: null,
				capturedAt: new Date(),
				sourceKind: "manual_upload",
				sourceName: "RVG Sensor",
				storagePath: null,
				fileSizeBytes: 1024,
				sopInstanceUid: null,
				studyInstanceUid: null,
				seriesInstanceUid: null,
				sliceCount: 1,
				voxelSpacing: null,
				dimensions: null,
				bindingStatus: "bound",
				aiSummary: null,
				aiFindings: null,
				metadata: {},
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mappedStudy = mapImagingStudy(dummyStudy);
			assert.strictEqual(
				mappedStudy.doseMsv,
				null,
				"При отсутствии данных о дозе должен возвращаться null, а не 0.002 / 0.025",
			);
			assert.strictEqual(
				mappedStudy.effectiveDoseMsv,
				null,
				"Эффективная доза должна быть null при отсутствии тегов DICOM",
			);

			const dummyScan: typeof schema.xrayScans.$inferSelect = {
				id: randomUUID(),
				organizationId: orgId,
				patientId,
				visitId: null,
				imageDataUri: null,
				storagePath: null,
				fileUrl: null,
				fileSizeBytes: null,
				sha256: null,
				originalFilename: "test.jpg",
				mimeType: "image/jpeg",
				aiReport: null,
				aiSummary: null,
				aiToothStates: null,
				aiModelName: null,
				aiAnalyzedAt: null,
				aiError: null,
				status: "done",
				kind: "periapical",
				toothCode: "36",
				notes: null,
				capturedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mappedScan = mapXrayScanToImagingStudy(dummyScan);
			assert.strictEqual(
				mappedScan.doseMsv,
				null,
				"В xrayMapper доза должна быть честным null, а не вымышленным числом",
			);
		});
	});

	describe("3. Unified CRUD & Cascading Deletion (Zero Zombie Scans)", () => {
		it("DELETE /api/xray/scans/:id удаляет снимок из обеих таблиц (xrayScans и imagingStudies)", async () => {
			const app = createTenantTestApp();
			await registerXraySeriesRoute(app);

			const testScanId = randomUUID();

			await withTenantCtx(orgId, async () => {
				await db.insert(schema.imagingStudies).values({
					id: testScanId,
					organizationId: orgId,
					patientId,
					kind: "periapical",
					title: "Снимок перед удалением",
					toothCode: "11",
					status: "available",
					capturedAt: new Date(),
					sourceKind: "manual_upload",
					sourceName: "Sensor",
				});

				await db.insert(schema.xrayScans).values({
					id: testScanId,
					organizationId: orgId,
					patientId,
					kind: "periapical",
					originalFilename: "Снимок перед удалением",
					toothCode: "11",
					status: "done",
					capturedAt: new Date(),
				});
			});

			const deleteRes = await app.inject({
				method: "DELETE",
				url: `/api/xray/scans/${testScanId}`,
				headers: authHeaders,
			});

			assert.strictEqual(deleteRes.statusCode, 204);

			await withTenantCtx(orgId, async () => {
				const [xray] = await db
					.select()
					.from(schema.xrayScans)
					.where(and(eq(schema.xrayScans.id, testScanId), eq(schema.xrayScans.organizationId, orgId)));
				const [study] = await db
					.select()
					.from(schema.imagingStudies)
					.where(and(eq(schema.imagingStudies.id, testScanId), eq(schema.imagingStudies.organizationId, orgId)));

				assert.strictEqual(xray, undefined, "Запись в xrayScans должна быть удалена");
				assert.strictEqual(study, undefined, "Запись в imagingStudies должна быть удалена");
			});
		});

		it("синхронизирует обновление toothCode и title в обеих таблицах при PATCH /api/radiology/studies/:id", async () => {
			const app = createTenantTestApp();
			await registerStudiesRoutes(app);

			const createRes = await app.inject({
				method: "POST",
				url: "/api/radiology/studies",
				headers: authHeaders,
				payload: {
					patientId,
					kind: "periapical",
					title: "Начальный заголовок",
					toothCode: "16",
					sourceKind: "manual_upload",
					sourceName: "RVG",
				},
			});

			assert.strictEqual(createRes.statusCode, 201);
			const created = JSON.parse(createRes.body);
			const studyId = created.id;

			const patchRes = await app.inject({
				method: "PATCH",
				url: `/api/radiology/studies/${studyId}`,
				headers: authHeaders,
				payload: {
					toothCode: "17",
					title: "Обновленный заголовок зуба 17",
				},
			});

			assert.strictEqual(patchRes.statusCode, 200);

			await withTenantCtx(orgId, async () => {
				const [study] = await db
					.select()
					.from(schema.imagingStudies)
					.where(and(eq(schema.imagingStudies.id, studyId), eq(schema.imagingStudies.organizationId, orgId)));
				const [xray] = await db
					.select()
					.from(schema.xrayScans)
					.where(and(eq(schema.xrayScans.id, studyId), eq(schema.xrayScans.organizationId, orgId)));

				assert.ok(study, "Исследование должно существовать в imagingStudies");
				assert.strictEqual(study.toothCode, "17");
				assert.strictEqual(study.title, "Обновленный заголовок зуба 17");

				assert.ok(xray, "Снимок должен существовать в xrayScans (зеркалирование)");
				assert.strictEqual(xray.toothCode, "17");
				assert.strictEqual(xray.originalFilename, "Обновленный заголовок зуба 17");
			});
		});
	});
});
