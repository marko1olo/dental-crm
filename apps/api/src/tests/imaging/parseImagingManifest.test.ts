import test from "node:test";
import assert from "node:assert";
import { parseImagingManifest } from "../../routes/imaging.js";
import { imagingImportPreviewResponseSchema } from "@dental/shared";

test("parseImagingManifest - handles empty text", () => {
  const result = parseImagingManifest({
    sourceName: "empty.csv",
    sourceKind: "manual_upload",
    rawText: ""
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

test("parseImagingManifest - handles text with only empty lines", () => {
  const result = parseImagingManifest({
    sourceName: "empty.csv",
    sourceKind: "manual_upload",
    rawText: "\n\r\n  \n\t\n"
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
