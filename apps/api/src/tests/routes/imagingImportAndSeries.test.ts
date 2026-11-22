import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { ImagingSourceKind } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { fixtureUuid, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { commitImagingImport, parseDicomSeriesManifest } from "../../routes/imaging.js";

describe("parseDicomSeriesManifest", () => {
	it("returns default preview response when rawText yields no lines", async () => {
		const input = {
			sourceName: "test-source.zip",
			sourceKind: "dicom_file" as ImagingSourceKind,
			rawText: "   \n\r\n   ",
		};

		const result = await parseDicomSeriesManifest("mock-org", input);

		assert.strictEqual(result.sourceName, "test-source.zip");
		assert.strictEqual(result.sourceKind, "dicom_file");
		assert.strictEqual(result.totalRows, 0);
		assert.strictEqual(result.totalSeries, 0);
		assert.strictEqual(result.readySeries, 0);
		assert.strictEqual(result.warningSeries, 0);
		assert.strictEqual(result.blockedSeries, 0);
		assert.deepStrictEqual(result.rows, []);
		assert.deepStrictEqual(result.series, []);
		assert.deepStrictEqual(result.parserNotes, [
			"Нет строк списка снимков для разбора.",
		]);
	});
});

describe("commitImagingImport (Real PostgreSQL 18)", () => {
	const orgId = fixtureUuid("imagingImportRealTest", 1);
	const patientId = fixtureUuid("imagingImportRealTest", 2);

	before(async () => {
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));

			await db.insert(schema.organizations).values({ id: orgId, name: "Клиника импорта DICOM" }).onConflictDoNothing();
			await db.insert(schema.patients).values({
				id: patientId,
				organizationId: orgId,
				fullName: "Тестов Тест Тестович",
				phone: "+79990000000",
			}).onConflictDoNothing();
		});
	});

	after(async () => {
		await withFixtureTenant(orgId, async () => {
			await db.delete(schema.xrayScans).where(eq(schema.xrayScans.organizationId, orgId));
			await db.delete(schema.imagingInstances).where(eq(schema.imagingInstances.organizationId, orgId));
			await db.delete(schema.imagingSeries).where(eq(schema.imagingSeries.organizationId, orgId));
			await db.delete(schema.imagingStudies).where(eq(schema.imagingStudies.organizationId, orgId));
			await db.delete(schema.patients).where(eq(schema.patients.organizationId, orgId));
			await db.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
		});
	});

	it("processes valid records and persists to database with zero mocks", async () => {
		const input = {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				`Тестов Тест Тестович|opg|uploads/dicom/test_valid.dcm|Test OPG|+79990000000|12, 13|Maxilla|2023-10-27T10:00:00Z`,
				`|opg|uploads/dicom/invalid.dcm|Invalid OPG||||`,
				`Тестов Тест Тестович|opg||Missing Path|+79990000000|||`,
			].join("\n"),
		};

		const result = await withFixtureTenant(orgId, async () => {
			return commitImagingImport(orgId, input);
		});

		assert.strictEqual(result.preview.totalRows, 3);
		assert.strictEqual(result.importedCount, 1);
		assert.strictEqual(result.skippedCount, 2);
		assert.strictEqual(result.createdStudyIds.length, 1);

		const createdId = result.createdStudyIds[0];
		assert.ok(createdId, "ID созданного исследования должен присутствовать");

		await withFixtureTenant(orgId, async () => {
			const [stored] = await db
				.select()
				.from(schema.imagingStudies)
				.where(and(eq(schema.imagingStudies.id, createdId), eq(schema.imagingStudies.organizationId, orgId)));

			assert.ok(stored, "Исследование должно быть сохранено в PostgreSQL");
			assert.strictEqual(stored.patientId, patientId);
			assert.strictEqual(stored.kind, "opg");
			assert.strictEqual(stored.title, "Test OPG");
			assert.strictEqual(stored.toothCode, "12, 13");
			assert.strictEqual(stored.region, "Maxilla");
			assert.strictEqual(stored.storagePath, "uploads/dicom/test_valid.dcm");
		});
	});

	it("не пишет в базу, если готовых строк нет", async () => {
		const result = await withFixtureTenant(orgId, async () => {
			return commitImagingImport(orgId, {
				sourceName: "test_empty_import",
				sourceKind: "folder_watch" as ImagingSourceKind,
				rawText: [
					"fio|modality|filePath|title|phone|tooth|region|date",
					`|opg|||||`,
				].join("\n"),
			});
		});

		assert.strictEqual(result.importedCount, 0);
		assert.strictEqual(result.createdStudyIds.length, 0);
	});
});
