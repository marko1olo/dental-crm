import assert from "node:assert";
import { describe, test } from "node:test";
import * as path from "path";
import { DicomVacuum } from "../../services/ingestion/DicomVacuum.js";

describe("DicomVacuum", () => {
  describe("scanDirectory", () => {
    test("simulates scanning a directory and returns expected metadata", async () => {
      const testDir = "/path/to/test/dir";
      const results = await DicomVacuum.scanDirectory(testDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(
        results[0].filepath,
        path.join(testDir, "1.2.840.113619.2.55.3.2831178355.dcm")
      );
      assert.strictEqual(results[0].metadata.patientName, "IVANOV^IVAN^IVANOVICH");
      assert.strictEqual(results[0].metadata.patientBirthDate, "19800101");
      assert.strictEqual(results[0].metadata.patientSex, "M");
      assert.strictEqual(results[0].metadata.studyInstanceUID, "1.2.840.113619.2.55.3.2831178355.8");
      assert.strictEqual(results[0].metadata.seriesInstanceUID, "1.2.840.113619.2.55.3.2831178355.8.1");
      assert.strictEqual(results[0].metadata.acquisitionDate, "20231015");
      assert.strictEqual(results[0].metadata.modality, "CT");
      assert.strictEqual(results[0].metadata.sliceThickness, "0.5");
      assert.strictEqual(results[0].metadata.pixelSpacing, "0.25\\0.25");
      assert.strictEqual(results[0].metadata.manufacturer, "Sirona");
    });
  });

  describe("generatePreviewSlide", () => {
    test("simulates generating a preview slide and returns valid path", async () => {
      const filepath = "/path/to/dicom/file.dcm";
      const outputPath = "/output/path";

      const result = await DicomVacuum.generatePreviewSlide(filepath, outputPath);

      assert.ok(result.startsWith(outputPath + "/preview_"));
      assert.ok(result.endsWith(".png"));
    });
  });
});
