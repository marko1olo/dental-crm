import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_PATIENT_SCANS,
	PatientPlanView,
	type PatientDiagnosticScan,
} from "../PatientPlanView.js";
import { getPresetBeforeAfterGalleries } from "../patientWebappEngine.js";

describe("Radiology & Patient Portal Zero-Diorama Law (Mandate 11 & Core Route Rule 7)", () => {
	it("DEFAULT_PATIENT_SCANS: Contains zero data:image/svg+xml and zero synthetic SVG dioramas", () => {
		expect(DEFAULT_PATIENT_SCANS.length > 0).toBe(true);

		for (const scan of DEFAULT_PATIENT_SCANS) {
			// Zero SVG data URLs
			expect(scan.previewUrl).not.toContain("data:image/svg+xml");
			expect(scan.previewUrl).not.toContain("<svg");
			expect(scan.previewUrl).not.toContain("<path");

			// Must point to real clinical radiology paths
			expect(scan.previewUrl.startsWith("/radiology/")).toBe(true);

			// Radiation safety: dose in microSieverts must be positive
			expect(scan.doseMicroSv > 0).toBe(true);

			// Modality must be valid
			expect(["rvg", "optg", "cbct", "trg"]).toContain(scan.modality);
		}
	});

	it("getPresetBeforeAfterGalleries: Contains zero fake SVG data URLs in photo comparison pairs", () => {
		const galleries = getPresetBeforeAfterGalleries("test-patient-42");
		expect(galleries.length > 0).toBe(true);

		for (const pair of galleries) {
			expect(pair.beforeSlot.imageUrl).not.toContain("data:image/svg+xml");
			expect(pair.beforeSlot.imageUrl).not.toContain("<svg");
			expect(pair.afterSlot.imageUrl).not.toContain("data:image/svg+xml");
			expect(pair.afterSlot.imageUrl).not.toContain("<svg");

			// Clean empty string placeholder awaiting doctor's clinical upload
			expect(pair.beforeSlot.imageUrl).toBe("");
			expect(pair.afterSlot.imageUrl).toBe("");
		}
	});

	it("PatientPlanView: Renders real clinical radiology images with no synthetic SVG markup", () => {
		const html = renderToString(<PatientPlanView />);

		// Real clinical scans rendered as <img>
		expect(html).toContain('src="/radiology/sample_rvg_tooth16.jpg"');
		expect(html).toContain('src="/radiology/sample_trg_cephalogram.jpg"');

		// Zero SVG data URLs in entire rendered output
		expect(html).not.toContain("data:image/svg+xml");
	});

	it("PatientPlanView: Displays honest empty state with Camera icon when scans array is empty", () => {
		const html = renderToString(<PatientPlanView scans={[]} />);

		// Empty state container rendered
		expect(html).toContain('data-testid="plan-scans-empty-state"');
		expect(html).toContain("Диагностические снимки не прикреплены");
		expect(html).toContain("В карте пациента пока нет загруженных");

		// No fake scans or SVG images rendered
		expect(html).not.toContain("sample_rvg_tooth16");
		expect(html).not.toContain("data:image/svg+xml");
	});

	it("PatientPlanView: Renders placeholder when a scan has empty previewUrl", () => {
		const pendingScan: PatientDiagnosticScan = {
			id: "scan-pending-1",
			titleRu: "В процессе обработки КТ",
			modality: "cbct",
			modalityRu: "Конусно-лучевая КТ",
			dateRu: "06.09.2026",
			doseMicroSv: 45.0,
			previewUrl: "",
			conclusionRu: "Идет реконструкция срезов DICOM",
		};

		const html = renderToString(<PatientPlanView scans={[pendingScan]} />);

		// Placeholder container rendered
		expect(html).toContain('data-testid="scan-placeholder-scan-pending-1"');
		expect(html).toContain("Снимок обрабатывается");
		expect(html).not.toContain("data:image/svg+xml");
	});
});
