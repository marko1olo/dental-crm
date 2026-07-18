import assert from "node:assert";
import { describe, test } from "node:test";
import path from "node:path";
import { DicomVacuum } from "./DicomVacuum.js";

describe("DicomVacuum", () => {
	describe("scanDirectory", () => {
		test("returns mocked DICOM metadata for a given directory", async () => {
			const dirPath = "/test/dicom/dir";
			const results = await DicomVacuum.scanDirectory(dirPath);

			assert.strictEqual(results.length, 1);
			assert.strictEqual(
				results[0].filepath,
				path.join(dirPath, "1.2.840.113619.2.55.3.2831178355.dcm"),
			);
			assert.deepStrictEqual(results[0].metadata, {
				patientName: "IVANOV^IVAN^IVANOVICH",
				patientBirthDate: "19800101",
				patientSex: "M",
				studyInstanceUID: "1.2.840.113619.2.55.3.2831178355.8",
				seriesInstanceUID: "1.2.840.113619.2.55.3.2831178355.8.1",
				acquisitionDate: "20231015",
				modality: "CT",
				sliceThickness: "0.5",
				pixelSpacing: "0.25\\0.25",
				manufacturer: "Sirona",
			});
		});
	});

	describe("generatePreviewSlide", () => {
		test("generates a simulated preview slide path based on outputPath", async () => {
			const filepath = "/test/dicom/dir/1.2.840.113619.2.55.3.2831178355.dcm";
			const outputPath = "/test/output";

			const originalDateNow = Date.now;
			const mockTimestamp = 1697364000000;
			Date.now = () => mockTimestamp;

			try {
				const result = await DicomVacuum.generatePreviewSlide(
					filepath,
					outputPath,
				);
				assert.strictEqual(result, `${outputPath}/preview_${mockTimestamp}.png`);
			} finally {
				Date.now = originalDateNow;
			}
		});
	});
});
