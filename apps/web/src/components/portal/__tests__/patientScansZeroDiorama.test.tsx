import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
globalThis.React = React;
import { renderToString } from "react-dom/server";
import {
	DEFAULT_PATIENT_SCANS,
	PlanScanViewerModal,
	type PatientDiagnosticScan,
} from "../../imaging/PlanScanViewerModal.js";
import { getPresetBeforeAfterGalleries } from "../patientPortalEngine.js";

describe("Radiology & Patient Portal Zero-Diorama Law (Mandate 11 & Core Route Rule 7)", () => {
	it("DEFAULT_PATIENT_SCANS: Contains zero data:image/svg+xml and zero synthetic SVG dioramas", () => {
		assert.ok(DEFAULT_PATIENT_SCANS.length > 0);

		for (const scan of DEFAULT_PATIENT_SCANS) {
			// Zero SVG data URLs
			assert.ok(!scan.previewUrl.includes("data:image/svg+xml"));
			assert.ok(!scan.previewUrl.includes("<svg"));
			assert.ok(!scan.previewUrl.includes("<path"));

			// Must point to real clinical radiology paths
			assert.ok(scan.previewUrl.startsWith("/radiology/"));

			// Radiation safety: dose in microSieverts must be positive
			assert.ok(scan.doseMicroSv > 0);

			// Modality must be valid
			assert.ok(["rvg", "optg", "cbct", "trg"].includes(scan.modality));
		}
	});

	it("getPresetBeforeAfterGalleries: Contains zero fake SVG data URLs in photo comparison pairs", () => {
		const galleries = getPresetBeforeAfterGalleries("test-patient-42");
		assert.ok(galleries.length > 0);

		for (const pair of galleries) {
			assert.ok(!pair.beforeSlot.imageUrl.includes("data:image/svg+xml"));
			assert.ok(!pair.beforeSlot.imageUrl.includes("<svg"));
			assert.ok(!pair.afterSlot.imageUrl.includes("data:image/svg+xml"));
			assert.ok(!pair.afterSlot.imageUrl.includes("<svg"));

			// Clean empty string placeholder awaiting doctor's clinical upload
			assert.strictEqual(pair.beforeSlot.imageUrl, "");
			assert.strictEqual(pair.afterSlot.imageUrl, "");
		}
	});

	it("PlanScanViewerModal: Renders diagnostic scan viewer with zoom, invert negative, and dose", () => {
		const scan = DEFAULT_PATIENT_SCANS[0]!;
		const html = renderToString(
			<PlanScanViewerModal
				scan={scan}
				scans={DEFAULT_PATIENT_SCANS}
				onClose={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="plan-scan-viewer-modal"'));
		assert.ok(html.includes('data-testid="close-scan-modal-btn"'));
		assert.ok(html.includes('data-testid="scan-switcher-bar"'));
		assert.ok(html.includes('data-testid="scan-zoom-in-btn"'));
		assert.ok(html.includes('data-testid="scan-zoom-out-btn"'));
		assert.ok(html.includes('data-testid="scan-invert-btn"'));
		assert.ok(html.includes('data-testid="scan-reset-btn"'));
		assert.ok(html.includes(scan.titleRu));
		assert.ok(html.includes("Доза:"));
		assert.ok(html.includes("мкЗв"));
		assert.ok(html.includes(scan.conclusionRu));
		assert.ok(html.includes(scan.previewUrl));
		assert.ok(!html.includes("data:image/svg+xml"));
	});

	it("PlanScanViewerModal: Renders null when scan is null", () => {
		const html = renderToString(
			<PlanScanViewerModal
				scan={null}
				onClose={() => {}}
			/>,
		);

		assert.strictEqual(html, "");
	});

	it("PlanScanViewerModal: Renders placeholder when previewUrl is empty", () => {
		const emptyScan: PatientDiagnosticScan = {
			id: "scan-empty",
			titleRu: "Снимок без файла",
			modality: "rvg",
			modalityRu: "RVG",
			dateRu: "01.09.2026",
			doseMicroSv: 1.5,
			previewUrl: "",
			conclusionRu: "Снимок еще загружается",
		};

		const html = renderToString(
			<PlanScanViewerModal
				scan={emptyScan}
				onClose={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="modal-scan-empty-placeholder"'));
		assert.ok(html.includes("Файл снимка не прикреплен"));
	});
});
