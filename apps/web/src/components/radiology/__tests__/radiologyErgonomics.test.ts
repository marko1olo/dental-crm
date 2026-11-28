import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as RadiologyModuleNs from "../RadiologyModule";
import {
	ADULT_FDI_TEETH,
	calculateDistanceMm,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
	LANDMARK_TYPE_LABELS,
} from "../radiologyMath";
import { DEFAULT_WW_WL_PRESETS, RADIOLOGY_MODALITIES } from "../types";

describe("Radiology Ergonomics & Math Suite", () => {
	it("calculates 2-point measurement distance in millimeters with calibration", () => {
		const dist = calculateDistanceMm(10, 10, 40, 50, 1000, 1000, 0.1);
		assert.equal(dist, 50.0);

		const zeroDist = calculateDistanceMm(25, 25, 25, 25, 1000, 1000, 0.1);
		assert.equal(zeroDist, 0.0);

		const smallDist = calculateDistanceMm(0, 0, 1, 1, 1000, 1000, 0.05);
		assert.ok(smallDist > 0);
	});

	it("formats effective radiation dose according to SanPiN standards", () => {
		const rvg = formatRadiationDose(3.0);
		assert.equal(rvg.microsvText, "3 мкЗв");
		assert.equal(rvg.safetyZone, "green");

		const cbct = formatRadiationDose(55.0);
		assert.equal(cbct.microsvText, "55 мкЗв");
		assert.equal(cbct.safetyZone, "yellow");

		const heavy = formatRadiationDose(600.0);
		assert.equal(heavy.microsvText, "600 мкЗв");
		assert.equal(heavy.safetyZone, "red");
	});

	it("ensures all 32 adult FDI teeth are defined with anatomical names", () => {
		const totalQuadrantsTeeth = [
			...ADULT_FDI_TEETH.quadrant1,
			...ADULT_FDI_TEETH.quadrant2,
			...ADULT_FDI_TEETH.quadrant3,
			...ADULT_FDI_TEETH.quadrant4,
		];
		assert.equal(totalQuadrantsTeeth.length, 32);

		for (const tooth of totalQuadrantsTeeth) {
			assert.ok(FDI_TOOTH_NAMES[tooth]);
		}
	});

	it("verifies all Window/Level presets contain valid brightness, contrast, and invert fields", () => {
		assert.ok(DEFAULT_WW_WL_PRESETS.length >= 6);
		const standard = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "standard");
		assert.ok(standard);
		assert.equal(standard.brightness, 100);
		assert.equal(standard.contrast, 100);

		const boneEndo = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "bone_endo");
		assert.ok(boneEndo && boneEndo.contrast > 150);

		const invertPreset = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "negative_invert");
		assert.ok(invertPreset && invertPreset.invert === true);
	});

	it("verifies radiology modality registry covers all primary dental modalities", () => {
		for (const mod of ["cbct_3d", "optg_panoramic", "intraoral_rvg", "trg_ceph", "bitewing", "photo_clinical"] as const) {
			assert.ok(RADIOLOGY_MODALITIES[mod]);
			assert.ok(RADIOLOGY_MODALITIES[mod].label.length > 0);
			assert.ok(RADIOLOGY_MODALITIES[mod].typicalDoseMicrosv >= 0);
		}
	});

	it("verifies anatomical landmark types are registered", () => {
		for (const t of ["tooth", "apex", "canal", "sinus", "nerve", "implant_site", "caries", "custom"] as const) {
			assert.ok(LANDMARK_TYPE_LABELS[t]);
		}
	});

	it("verifies honest medical radiology dropzone supports DICOM and clinical raster formats without SVG mock export", async () => {
		const { SUPPORTED_RADIOLOGY_EXTENSIONS, SAMPLE_PATIENT_RVG_URL } = await import("../types");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".dcm"));
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".dicom"));
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".tif"));
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".tiff"));
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".png"));
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".jpg"));
		assert.equal(SAMPLE_PATIENT_RVG_URL, "/radiology/sample_rvg_tooth16.jpg");
		assert.equal("TOOTH_16_DIAGNOSTIC_RADIOGRAPH_DATA_URI" in RadiologyModuleNs, false);
	});

	it("verifies Standard WW/WL preset label is 'Стандарт'", () => {
		const standardPreset = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "standard");
		assert.ok(standardPreset);
		assert.equal(standardPreset.label, "Стандарт");
	});

	it("verifies tooth 16 RVG anatomical landmarks map to physical apex coordinates with 0.05 mm/px calibration", () => {
		const rootLengthMm = calculateDistanceMm(51.5, 53.8, 51.5, 21.9, 1000, 1300, 0.05);
		assert.ok(rootLengthMm >= 20.0 && rootLengthMm <= 21.5);
		assert.equal(calculateDistanceMm(34.0, 71.0, 68.0, 71.0, 1000, 1300, 0.05), 17.0);
	});

	it("verifies real DICOM header parser extracts correct 16-bit CT pixel geometry and window centers", async () => {
		const { parseDicomSliceHeader } = await import("../realDicomVolumeLoader");
		const buffer = new ArrayBuffer(2048);
		const view = new DataView(buffer);

		let off = 128;
		view.setUint16(off, 0x0028, true);
		view.setUint16(off + 2, 0x0010, true);
		view.setUint16(off + 4, 0x5553, true);
		view.setUint16(off + 6, 2, true);
		view.setUint16(off + 8, 512, true);

		off += 10;
		view.setUint16(off, 0x0028, true);
		view.setUint16(off + 2, 0x0011, true);
		view.setUint16(off + 4, 0x5553, true);
		view.setUint16(off + 6, 2, true);
		view.setUint16(off + 8, 512, true);

		off += 10;
		view.setUint16(off, 0x0028, true);
		view.setUint16(off + 2, 0x0100, true);
		view.setUint16(off + 4, 0x5553, true);
		view.setUint16(off + 6, 2, true);
		view.setUint16(off + 8, 16, true);

		const header = parseDicomSliceHeader(buffer);
		assert.equal(header.rows, 512);
		assert.equal(header.cols, 512);
		assert.equal(header.bitsAllocated, 16);
		assert.ok(header.windowWidth > 0);
	});

	it("renders DicomViewerModal with patient header and touch targets", { timeout: 30000 }, async () => {
		const { DicomViewerModal } = await import("../../imaging/DicomViewerModal");
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");

		const html = renderToStaticMarkup(
			createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Елена Васильевна",
				toothFdiCode: "16",
				studyDate: "2026-08-15 14:30",
			}),
		);

		assert.ok(html.includes("Смирнова Елена Васильевна"));
		assert.ok(html.includes("Зуб 16"));
		assert.ok(html.includes("btn-dicom-norma-emk") || html.includes("btn-dicom-norma-043"));
	});

	it("synchronizes studyDate in DicomViewerModal header", { timeout: 15000 }, async () => {
		const { DicomViewerModal } = await import("../../imaging/DicomViewerModal");
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");

		const html = renderToStaticMarkup(
			createElement(DicomViewerModal, {
				isOpen: true,
				onClose: () => {},
				studyDate: "28.08.2026 15:30",
			}),
		);

		assert.ok(html.includes("28.08.2026 15:30"));
	});

	it("renders CbctMprImplantStudioModal without disabled buttons or raw emojis", { timeout: 30000 }, async () => {
		const { CbctMprImplantStudioModal } = await import("../CbctMprImplantStudioModal");
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");

		const html = renderToStaticMarkup(
			createElement(CbctMprImplantStudioModal, {
				isOpen: true,
				onClose: () => {},
				initialStudioMode: "implant",
			}),
		);

		assert.ok(html.includes('data-testid="cbct-delete-nerve-node-btn"'));
		assert.ok(html.includes('data-testid="cbct-reset-nerve-trace-btn"'));
		assert.equal(html.includes("🗑️"), false);
		assert.equal(html.includes("✅"), false);
		assert.equal(html.includes("⚠️"), false);
		assert.equal(html.includes("⛔"), false);
	});
});
