import assert from "node:assert/strict";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { registerDicomwebRoutes } from "../../routes/dicomweb/modules/dicomwebRegistration.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { STAFF_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

describe("W16-HW-01: WADO Retrieve Frames RLS Tenant Transaction Scope", () => {
	const orgAId = fixtureUuid("wadoFramesOrgA", 1);
	const orgBId = fixtureUuid("wadoFramesOrgB", 2);
	const studyId = fixtureUuid("wadoFramesStudy", 3);
	const seriesId = fixtureUuid("wadoFramesSeries", 4);
	const instanceId = fixtureUuid("wadoFramesInst", 5);

	const studyUid = "1.2.826.0.1.3680043.10.100.1";
	const seriesUid = "1.2.826.0.1.3680043.10.100.2";
	const instanceUid = "1.2.826.0.1.3680043.10.100.3";

	const createTokenHeaders = (organizationId: string) => {
		const token = signToken(
			{
				userId: fixtureUuid("wadoFramesUser", 9),
				organizationId,
				role: "doctor",
			},
			authTokenSecret(),
		);
		return {
			[STAFF_TOKEN_HEADER]: token,
			authorization: `Bearer ${token}`,
			"x-organization-id": organizationId,
		};
	};

	const relativeTestFile = path.posix.join("uploads", "pacs", orgAId, "wado-frame-test.dcm");
	const absoluteTestFile = path.resolve(process.cwd(), relativeTestFile);

	before(async () => {
		await fs.mkdir(path.dirname(absoluteTestFile), { recursive: true });
		const samplePath = fsSync.existsSync(path.resolve(process.cwd(), ".data/dicom/test.dcm"))
			? path.resolve(process.cwd(), ".data/dicom/test.dcm")
			: path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
		await fs.copyFile(samplePath, absoluteTestFile);

		await withFixtureTenant(orgAId, async (tx) => {
			await tx
				.insert(schema.organizations)
				.values({ id: orgAId, name: "WADO Org A" })
				.onConflictDoNothing();
			await tx
				.insert(schema.imagingStudies)
				.values({
					id: studyId,
					organizationId: orgAId,
					dicomStudyUid: studyUid,
					title: "WADO Frame RLS Study",
					modality: "cbct",
					kind: "cbct",
					capturedAt: new Date(),
					sourceKind: "dicom_file",
					sourceName: "WADO Test",
					status: "available",
				})
				.onConflictDoNothing();
			await tx
				.insert(schema.imagingSeries)
				.values({
					id: seriesId,
					organizationId: orgAId,
					studyId,
					dicomSeriesUid: seriesUid,
					seriesNumber: 1,
					modality: "CT",
				})
				.onConflictDoNothing();
			await tx
				.insert(schema.imagingInstances)
				.values({
					id: instanceId,
					organizationId: orgAId,
					seriesId,
					dicomSopInstanceUid: instanceUid,
					instanceNumber: 1,
					storagePath: relativeTestFile,
					fileSizeBytes: 256,
				})
				.onConflictDoNothing();
		});

		await withFixtureTenant(orgBId, async (tx) => {
			await tx
				.insert(schema.organizations)
				.values({ id: orgBId, name: "WADO Org B" })
				.onConflictDoNothing();
		});
	});

	after(async () => {
		try {
			await withFixtureTenant(orgAId, async (tx) => {
				await tx
					.delete(schema.imagingInstances)
					.where(eq(schema.imagingInstances.organizationId, orgAId));
				await tx
					.delete(schema.imagingSeries)
					.where(eq(schema.imagingSeries.organizationId, orgAId));
				await tx
					.delete(schema.imagingStudies)
					.where(eq(schema.imagingStudies.organizationId, orgAId));
			});
			await purgeFixtureOrganizations([orgAId, orgBId]);
			await fs.rm(path.resolve(process.cwd(), "uploads", "pacs", orgAId), {
				recursive: true,
				force: true,
			});
		} catch {
			// best-effort teardown
		}
	});

	it("binds wadoFramesRoute queries to withTenantCtx tx and blocks cross-tenant access", async () => {
		const routeSrcPath = path.resolve(
			process.cwd(),
			"src/routes/dicomweb/modules/wadoFramesRoute.ts",
		);
		const fallbackSrcPath = path.resolve(
			process.cwd(),
			"apps/api/src/routes/dicomweb/modules/wadoFramesRoute.ts",
		);
		const resolvedPath = fsSync.existsSync(routeSrcPath) ? routeSrcPath : fallbackSrcPath;
		const source = fsSync.readFileSync(resolvedPath, "utf8");

		assert.ok(source.includes("withTenantCtx(organizationId, async (tx)"), "must bind tx inside withTenantCtx");
		assert.ok(source.includes("organizationExists(organizationId, tx)"), "must pass tx to organizationExists");
		assert.ok(
			source.includes("resolveInstanceFilePath(organizationId, studyUid, seriesUid, instanceUid, tx)"),
			"must pass tx to resolveInstanceFilePath",
		);
		assert.ok(!source.includes('from "../../../db/client.js"'), "must not import unscoped db client");

		const app = Fastify({ logger: false });
		await registerDicomwebRoutes(app);
		await app.ready();

		try {
			// Org B must NEVER resolve Org A's study/instance frame inside withTenantCtx RLS
			const crossTenantRes = await app.inject({
				method: "GET",
				url: `/api/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}/frames/1`,
				headers: createTokenHeaders(orgBId),
			});
			assert.equal(crossTenantRes.statusCode, 404);
			assert.equal(crossTenantRes.json().error, "DicomInstanceNotFound");

			// Org A resolves inside RLS tx (200 or 422 if minimal header has no pixel data, never 403/500)
			const ownTenantRes = await app.inject({
				method: "GET",
				url: `/api/dicomweb/studies/${studyUid}/series/${seriesUid}/instances/${instanceUid}/frames/1`,
				headers: createTokenHeaders(orgAId),
			});
			assert.ok(
				ownTenantRes.statusCode === 200 || ownTenantRes.statusCode === 422,
				`Expected own tenant to reach DICOM frame parser (got ${ownTenantRes.statusCode})`,
			);
		} finally {
			await app.close();
		}
	});
});
