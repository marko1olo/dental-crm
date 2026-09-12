import assert from "node:assert";
import { after, afterEach, before, describe, it, mock, test } from "node:test";
import type { ImagingSourceKind, Patient } from "@dental/shared";
import { db } from "../db/client.js";
import { patients } from "../sampleData.js";
import { commitImagingImport, parseDicomSeriesManifest } from "./imaging.js";

describe("parseDicomSeriesManifest", () => {
	afterEach(() => {
		mock.restoreAll();
	});

	test("returns default preview response when rawText yields no lines", async () => {
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

/**
 * commitImagingImport tests:
 * Сопоставление пациента по ФИО и телефону идёт по данным в памяти и базы не
 * требует, поэтому подменяется только db.insert — и проверяется то, что
 * действительно уходит в базу.
 */
const ORG_ID = "123e4567-e89b-12d3-a456-4266141740ff";

const testPatient = {
	id: "123e4567-e89b-12d3-a456-4266141740aa",
	organizationId: ORG_ID,
	fullName: "Тестов Тест Тестович",
	phone: "+79990000000",
} as unknown as Patient;

const testPatientRow = {
	id: testPatient.id,
	organizationId: ORG_ID,
	status: "active",
	fullName: "Тестов Тест Тестович",
	birthDate: null,
	phone: "+79990000000",
	email: null,
	notes: null,
	administrativeProfile: null,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

describe("commitImagingImport", () => {
	before(() => {
		patients.push(testPatient);
	});

	after(() => {
		const index = patients.indexOf(testPatient);
		if (index >= 0) patients.splice(index, 1);
	});

	afterEach(() => {
		mock.restoreAll();
	});

	it("processes valid records only and maps properties to the created study correctly", async () => {
		const patient = testPatient;

		mock.method(db, "select", () => ({
			from: () => ({
				where: () =>
					Object.assign(Promise.resolve([testPatientRow]), {
						limit: () => Promise.resolve([testPatientRow]),
					}),
			}),
		}));

		const insertedValues: Array<Record<string, unknown>> = [];
		mock.method(db, "insert", () => ({
			values: (values: Record<string, unknown>) => {
				insertedValues.push(values);
				return {
					returning: async () => [
						{
							id: `123e4567-e89b-12d3-a456-42661417${String(insertedValues.length).padStart(4, "0")}`,
							...values,
							createdAt: new Date(),
						},
					],
				};
			},
		}));

		const input = {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				// Valid row
				`${patient.fullName}|opg|C:\\scans\\valid.dcm|Test OPG|${patient.phone}|12, 13|Maxilla|2023-10-27T10:00:00Z`,
				// Invalid row (missing patient name, won't match)
				`|opg|C:\\scans\\invalid.dcm|Invalid OPG||||`,
				// Invalid row (no filepath)
				`${patient.fullName}|opg||Missing Path|${patient.phone}|||`,
			].join("\n"),
		};

		const result = await commitImagingImport(ORG_ID, input);

		assert.strictEqual(result.preview.totalRows, 3);
		assert.strictEqual(result.importedCount, 1);
		assert.strictEqual(result.skippedCount, 2);
		assert.strictEqual(result.createdStudyIds.length, 1);

		assert.strictEqual(insertedValues.length, 1);
		// biome-ignore lint/style/noNonNullAssertion: automated suppression
		const stored = insertedValues[0]!;
		assert.strictEqual(stored.organizationId, ORG_ID);
		assert.strictEqual(stored.patientId, patient.id);
		assert.strictEqual(stored.kind, "opg");
		assert.strictEqual(stored.title, "Test OPG");
		assert.strictEqual(stored.toothCode, "12, 13");
		assert.strictEqual(stored.region, "Maxilla");
		assert.strictEqual(stored.sourceKind, "dicom_file");
		assert.strictEqual(stored.sourceName, "test_import");
		assert.strictEqual(stored.storagePath, "C:\\scans\\valid.dcm");
		assert.strictEqual(
			(stored.capturedAt as Date).toISOString(),
			"2023-10-27T00:00:00.000Z",
		);
		assert.strictEqual(stored.aiSummary, null);
	});

	it("не пишет в базу, если готовых строк нет", async () => {
		let insertCalls = 0;
		mock.method(db, "insert", () => {
			insertCalls += 1;
			return { values: () => ({ returning: async () => [] }) };
		});

		const result = await commitImagingImport(ORG_ID, {
			sourceName: "test_import",
			sourceKind: "folder_watch" as ImagingSourceKind,
			rawText: [
				"fio|modality|filePath|title|phone|tooth|region|date",
				`|opg|||||`,
			].join("\n"),
		});

		assert.strictEqual(result.importedCount, 0);
		assert.strictEqual(insertCalls, 0);
	});
});
