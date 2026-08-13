import assert from "node:assert";
import { after, before, describe, it } from "node:test";
import type { ImagingSourceKind } from "@dental/shared";
import { eq } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../../tests/support/fixtureOrganizations.js";
import { commitImagingImport } from "../imaging.js";

const ORG_ID = fixtureUuid("m2.imaging.test", 1);
const PATIENT_ID = fixtureUuid("m2.imaging.test", 2);

describe("commitImagingImport", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(schema.organizations).values({
				id: ORG_ID,
				name: "Test Imaging Org",
			});
			await tx.insert(schema.patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Тестов Тест Тестович",
				phone: "+79990000000",
			});
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("processes valid records only and maps properties to the created study correctly", async () => {
		const input = {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				// Valid row
				"Тестов Тест Тестович|opg|C:\\scans\\valid.dcm|Test OPG|+79990000000|12, 13|Maxilla|2023-10-27T10:00:00Z",
				// Invalid row (missing patient name, won't match)
				"|opg|C:\\scans\\invalid.dcm|Invalid OPG||||",
				// Invalid row (no filepath)
				"Тестов Тест Тестович|opg||Missing Path|+79990000000|||",
			].join("\n"),
		};

		const result = await withFixtureTenant(ORG_ID, async () => {
			return commitImagingImport(ORG_ID, input);
		});

		assert.strictEqual(result.preview.totalRows, 3);
		assert.strictEqual(result.importedCount, 1);
		assert.strictEqual(result.skippedCount, 2);
		assert.strictEqual(result.createdStudyIds.length, 1);

		// Проверяем подлинную запись в базе данных PostgreSQL 18
		const [stored] = await withFixtureTenant(ORG_ID, async (tx) => {
			return tx
				.select()
				.from(schema.imagingStudies)
				.where(eq(schema.imagingStudies.id, result.createdStudyIds[0]));
		});

		assert.ok(stored);
		assert.strictEqual(stored.organizationId, ORG_ID);
		assert.strictEqual(stored.patientId, PATIENT_ID);
		assert.strictEqual(stored.kind, "opg");
		assert.strictEqual(stored.title, "Test OPG");
		assert.strictEqual(stored.toothCode, "12, 13");
		assert.strictEqual(stored.region, "Maxilla");
		assert.strictEqual(stored.sourceKind, "dicom_file");
		assert.strictEqual(stored.sourceName, "test_import");
		assert.strictEqual(stored.storagePath, "C:\\scans\\valid.dcm");
		assert.strictEqual(
			stored.capturedAt?.toISOString(),
			"2023-10-27T10:00:00.000Z",
		);
		assert.strictEqual(stored.aiSummary, null);
	});

	it("не пишет в базу, если готовых строк нет", async () => {
		const result = await withFixtureTenant(ORG_ID, async () => {
			return commitImagingImport(ORG_ID, {
				sourceName: "test_import",
				sourceKind: "folder_watch" as ImagingSourceKind,
				rawText: [
					"fio|modality|filePath|title|phone|tooth|region|date",
					"|opg|||||",
				].join("\n"),
			});
		});

		assert.strictEqual(result.importedCount, 0);
		assert.strictEqual(result.createdStudyIds.length, 0);
	});
});
