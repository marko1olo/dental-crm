import assert from "node:assert";
import test from "node:test";
import { imagingImportPreviewResponseSchema } from "@dental/shared";
import { parseImagingManifest } from "../../routes/imaging.js";

test("parseImagingManifest - handles empty text", async () => {
	const result = await parseImagingManifest("test-org-id", {
		sourceName: "empty.csv",
		sourceKind: "manual_upload",
		rawText: "",
	});

	assert.strictEqual(result.totalRows, 0);
	assert.strictEqual(result.readyRows, 0);
	assert.strictEqual(result.warningRows, 0);
	assert.strictEqual(result.blockedRows, 0);
	assert.deepStrictEqual(result.rows, []);
	assert.deepStrictEqual(result.parserNotes, ["Нет строк для разбора."]);

	// ensure it is valid according to schema
	assert.ok(imagingImportPreviewResponseSchema.safeParse(result).success);
});

test("parseImagingManifest - extracts deciduous FDI teeth 51-85", async () => {
	const result = await parseImagingManifest("00000000-0000-4000-8000-000000000001", {
		sourceName: "pediatric.csv",
		sourceKind: "manual_upload",
		rawText: "Пациент Иванов\tзуб 54\tperiapical\nПациент Петрова\t#75\tbitewing",
	});

	assert.strictEqual(result.totalRows, 2);
	assert.strictEqual(result.rows[0]?.toothCode, "54");
	assert.strictEqual(result.rows[1]?.toothCode, "75");
});

test("parseImagingManifest - handles text with only empty lines", async () => {
	const result = await parseImagingManifest("test-org-id", {
		sourceName: "empty.csv",
		sourceKind: "manual_upload",
		rawText: "\n\r\n  \n\t\n",
	});

	assert.strictEqual(result.totalRows, 0);
	assert.strictEqual(result.readyRows, 0);
	assert.strictEqual(result.warningRows, 0);
	assert.strictEqual(result.blockedRows, 0);
	assert.deepStrictEqual(result.rows, []);
	assert.deepStrictEqual(result.parserNotes, ["Нет строк для разбора."]);

	// ensure it is valid according to schema
	assert.ok(imagingImportPreviewResponseSchema.safeParse(result).success);
});

test("parseImagingManifest - extracts deciduous FDI teeth 51-85", async () => {
	const result = await parseImagingManifest("00000000-0000-4000-8000-000000000001", {
		sourceName: "pediatric.csv",
		sourceKind: "manual_upload",
		rawText: "Пациент Иванов\tзуб 54\tperiapical\nПациент Петрова\t#75\tbitewing",
	});

	assert.strictEqual(result.totalRows, 2);
	assert.strictEqual(result.rows[0]?.toothCode, "54");
	assert.strictEqual(result.rows[1]?.toothCode, "75");
});
