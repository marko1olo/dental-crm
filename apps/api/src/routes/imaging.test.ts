import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import type { ImagingSourceKind } from "@dental/shared";
import { parseDicomSeriesManifest } from "./imaging.js";

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
