import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { parseDicomDataset, rawPixelToHounsfieldUnit } from "../imaging/dicomParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Hardware DICOM Fixtures & Imaging Compatibility (Mandates 8e, 8k, 8n)", () => {
	const fixturesDir = path.resolve(__dirname, "../../test-fixtures");
	const kavoPath = path.join(fixturesDir, "kavo_op300_cbct_slice_anonymized.dcm");
	const xpectPath = path.join(fixturesDir, "xspect_visiograph_periapical_anonymized.dcm");
	const manifestPath = path.join(fixturesDir, "dicom_fixtures_manifest.json");

	it("1. Manifest and real hardware DICOM test fixtures exist on disk", () => {
		assert.ok(fs.existsSync(manifestPath), "Manifest JSON must exist");
		assert.ok(fs.existsSync(kavoPath), "KaVo OP300 CBCT fixture must exist");
		assert.ok(fs.existsSync(xpectPath), "Xpect Vision RVG fixture must exist");

		const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
		assert.equal(manifest.fixtures.length, 2);
	});

	it("2. KaVo OP300 / Instrumentarium CBCT slice is strictly < 500 KB and valid CT format", () => {
		const buffer = fs.readFileSync(kavoPath);
		const sizeKb = buffer.length / 1024;
		assert.ok(sizeKb < 500, `KaVo slice must be < 500 KB, got ${sizeKb.toFixed(1)} KB`);

		const parsed = parseDicomDataset(buffer);
		assert.equal(parsed.modality, "CT");
		assert.equal(parsed.rows, 468);
		assert.equal(parsed.columns, 468);
		assert.equal(parsed.bitsAllocated, 16);
		assert.equal(parsed.bitsStored, 12);
		assert.equal(parsed.rescaleIntercept, -1000);
		assert.equal(parsed.rescaleSlope, 1);
		assert.equal(parsed.pixelSpacing[0], 0.32);
		assert.equal(parsed.pixelSpacing[1], 0.32);
		assert.equal(parsed.sliceThickness, 0.32);

		// Calibrated HU calculations (Air is ~ -1000 HU, Water is ~ 0 HU, Cortical Bone is > 1000 HU)
		const airHu = rawPixelToHounsfieldUnit(0, parsed.rescaleSlope, parsed.rescaleIntercept);
		assert.equal(airHu, -1000);

		const boneHu = rawPixelToHounsfieldUnit(2500, parsed.rescaleSlope, parsed.rescaleIntercept);
		assert.equal(boneHu, 1500);
	});

	it("3. Xpect Vision direct photon counting RVG is strictly < 500 KB with 35µm sensor resolution", () => {
		const buffer = fs.readFileSync(xpectPath);
		const sizeKb = buffer.length / 1024;
		assert.ok(sizeKb < 500, `Xpect RVG must be < 500 KB, got ${sizeKb.toFixed(1)} KB`);

		const parsed = parseDicomDataset(buffer);
		assert.equal(parsed.modality, "IO");
		assert.equal(parsed.rows, 480);
		assert.equal(parsed.columns, 480);
		assert.equal(parsed.bitsAllocated, 16);
		assert.equal(parsed.bitsStored, 16);
		assert.equal(parsed.pixelSpacing[0], 0.035);
		assert.equal(parsed.pixelSpacing[1], 0.035);
		assert.equal(parsed.windowCenter, 32768);
		assert.equal(parsed.windowWidth, 65536);
		assert.equal(parsed.rescaleIntercept, 0);
		assert.equal(parsed.rescaleSlope, 1);
		assert.equal(parsed.warnings.length, 0, "Xpect Vision undefined sequence (0040,0260) must be skipped with 0 warnings");
	});
});
