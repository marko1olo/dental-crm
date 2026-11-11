import assert from "node:assert";
import { describe, test } from "node:test";
import { mapXrayScanToImagingStudy } from "../imagingXrayMapper.js";
import type * as schema from "../../schema.js";

describe("imagingXrayMapper URL Resolution Integrity (Defect 1 Defense)", () => {
	const baseScan: typeof schema.xrayScans.$inferSelect = {
		id: "0194e3a0-1234-7000-8000-000000000001",
		organizationId: "org-1",
		patientId: "patient-1",
		visitId: null,
		kind: "periapical",
		originalFilename: "tooth_16_rvg.png",
		toothCode: 16,
		capturedAt: new Date("2026-11-11T12:00:00Z"),
		notes: "Прицельный снимок 16",
		storagePath: null,
		fileUrl: "/api/xray/scans/0194e3a0-1234-7000-8000-000000000001/file",
		fileSizeBytes: 2048576,
		aiSummary: null,
		deletedAt: null,
	};

	test("preserves record.fileUrl exactly without appending duplicate id (no 404 URL mangling)", () => {
		const study = mapXrayScanToImagingStudy(baseScan, "Иванов И.И.");

		// Must NOT concatenate duplicate /0194e3a0-1234-7000-8000-000000000001
		assert.strictEqual(
			study.previewUrl,
			"/api/xray/scans/0194e3a0-1234-7000-8000-000000000001/file",
			"previewUrl must equal fileUrl directly without trailing /${record.id}",
		);
		assert.strictEqual(
			study.viewerUrl,
			"/api/xray/scans/0194e3a0-1234-7000-8000-000000000001/file",
			"viewerUrl must equal fileUrl directly without trailing /${record.id}",
		);
	});

	test("resolves storagePath with browser renderable image", () => {
		const scanWithStorage: typeof schema.xrayScans.$inferSelect = {
			...baseScan,
			storagePath: "uploads/imaging/studies/scan_16.png",
			fileUrl: null,
		};
		const study = mapXrayScanToImagingStudy(scanWithStorage);

		assert.strictEqual(study.previewUrl, `/api/imaging/studies/${baseScan.id}/file`);
		assert.strictEqual(study.viewerUrl, `/api/imaging/studies/${baseScan.id}/file`);
	});

	test("falls back to preview.svg when both storagePath and fileUrl are absent", () => {
		const scanEmpty: typeof schema.xrayScans.$inferSelect = {
			...baseScan,
			storagePath: null,
			fileUrl: null,
		};
		const study = mapXrayScanToImagingStudy(scanEmpty);

		assert.strictEqual(study.previewUrl, `/api/imaging/studies/${baseScan.id}/preview.svg`);
		assert.strictEqual(study.viewerUrl, `/api/imaging/studies/${baseScan.id}/preview.svg`);
	});
});
