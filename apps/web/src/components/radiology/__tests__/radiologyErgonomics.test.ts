import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
		// 1000x1000 image, 0.1 mm/px spacing
		// Point A: (10%, 10%) -> (100px, 100px)
		// Point B: (40%, 50%) -> (400px, 500px)
		// dx = 300px, dy = 400px -> hypotenuse = 500px
		// Distance = 500px * 0.1 mm/px = 50.0 mm
		const dist = calculateDistanceMm(10, 10, 40, 50, 1000, 1000, 0.1);
		assert.equal(dist, 50.0);

		// Zero distance
		const zeroDist = calculateDistanceMm(25, 25, 25, 25, 1000, 1000, 0.1);
		assert.equal(zeroDist, 0.0);

		// Sub-millimeter precision
		const smallDist = calculateDistanceMm(0, 0, 1, 1, 1000, 1000, 0.05);
		assert.ok(smallDist > 0);
	});

	it("formats effective radiation dose according to SanPiN standards", () => {
		// RVG typical dose: 3.0 µSv (0.003 mSv) -> Green zone
		const rvg = formatRadiationDose(3.0);
		assert.equal(rvg.microsvText, "3 мкЗв");
		assert.equal(rvg.safetyZone, "green");

		// CBCT typical dose: 55.0 µSv (0.055 mSv) -> Yellow zone (>= 0.05 mSv)
		const cbct = formatRadiationDose(55.0);
		assert.equal(cbct.microsvText, "55 мкЗв");
		assert.equal(cbct.safetyZone, "yellow");

		// Heavy dose: 600 µSv (0.6 mSv) -> Red zone (>= 0.5 mSv)
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
			assert.ok(FDI_TOOTH_NAMES[tooth], `Tooth ${tooth} must have an anatomical description`);
		}
	});

	it("verifies all Window/Level presets contain valid brightness, contrast, and invert fields", () => {
		assert.ok(DEFAULT_WW_WL_PRESETS.length >= 6);

		const standard = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "standard");
		assert.ok(standard);
		assert.equal(standard.brightness, 100);
		assert.equal(standard.contrast, 100);

		const boneEndo = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "bone_endo");
		assert.ok(boneEndo);
		assert.ok(boneEndo.contrast > 150);

		const invertPreset = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "negative_invert");
		assert.ok(invertPreset);
		assert.equal(invertPreset.invert, true);
	});

	it("verifies radiology modality registry covers all primary dental modalities", () => {
		const expectedModalities = [
			"cbct_3d",
			"optg_panoramic",
			"intraoral_rvg",
			"trg_ceph",
			"bitewing",
			"photo_clinical",
		] as const;

		for (const mod of expectedModalities) {
			assert.ok(RADIOLOGY_MODALITIES[mod]);
			assert.ok(RADIOLOGY_MODALITIES[mod].label.length > 0);
			assert.ok(RADIOLOGY_MODALITIES[mod].typicalDoseMicrosv >= 0);
		}
	});

	it("verifies anatomical landmark types are registered", () => {
		const landmarkTypes = ["tooth", "apex", "canal", "sinus", "nerve", "implant_site", "caries", "custom"] as const;
		for (const t of landmarkTypes) {
			assert.ok(LANDMARK_TYPE_LABELS[t]);
		}
	});

	it("verifies honest medical radiology dropzone supports DICOM and clinical raster formats", async () => {
		const {
			SUPPORTED_RADIOLOGY_EXTENSIONS,
			SAMPLE_PATIENT_RVG_URL,
			MedicalRadiologyDropzone,
		} = await import("../MedicalRadiologyDropzone");

		assert.ok(typeof MedicalRadiologyDropzone === "function");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".dcm"), "Must support DICOM .dcm");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".dicom"), "Must support DICOM .dicom");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".tif"), "Must support TIFF .tif");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".tiff"), "Must support TIFF .tiff");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".png"), "Must support PNG .png");
		assert.ok(SUPPORTED_RADIOLOGY_EXTENSIONS.includes(".jpg"), "Must support JPG .jpg");
		assert.equal(SAMPLE_PATIENT_RVG_URL, "/radiology/sample_rvg_tooth16.jpg");
	});

	it("verifies zero vector SVG mock teeth remain in radiology exports", async () => {
		const radiologyExports = await import("../index");
		assert.strictEqual(
			(radiologyExports as Record<string, unknown>).TOOTH_16_DIAGNOSTIC_RADIOGRAPH_DATA_URI,
			undefined,
			"TOOTH_16_DIAGNOSTIC_RADIOGRAPH_DATA_URI must be eradicated from exports",
		);
		assert.ok(
			radiologyExports.MedicalRadiologyDropzone,
			"MedicalRadiologyDropzone must be exported",
		);
	});

	it("verifies Standard WW/WL preset label is 'Стандарт' without unexpected whitespace breaks", () => {
		const standardPreset = DEFAULT_WW_WL_PRESETS.find((p) => p.id === "standard");
		assert.ok(standardPreset);
		assert.equal(standardPreset.label, "Стандарт");
	});

	it("verifies tooth 16 RVG anatomical landmarks map to physical apex coordinates with 0.05 mm/px calibration", () => {
		// Tooth 16 image dimensions: 1000 x 1300 px, spacing 0.05 mm/px
		// Palatal Root Apex: (51.5%, 21.9%) -> (515px, 285px)
		// Palatal Canal Orifice: (51.5%, 53.8%) -> (515px, 700px)
		const imgW = 1000;
		const imgH = 1300;
		const spacing = 0.05;

		const rootLengthMm = calculateDistanceMm(51.5, 53.8, 51.5, 21.9, imgW, imgH, spacing);
		// (700 - 285) * 0.05 = 415 * 0.05 = 20.75 mm -> rounded 20.8 mm
		assert.ok(rootLengthMm >= 20.0 && rootLengthMm <= 21.5, `Root length must be ~20.8 mm, got ${rootLengthMm}`);

		// Crown mesio-distal width: (34.0%, 71.0%) to (68.0%, 71.0%) -> 340px * 0.05 = 17.0 mm
		const crownWidthMm = calculateDistanceMm(34.0, 71.0, 68.0, 71.0, imgW, imgH, spacing);
		assert.equal(crownWidthMm, 17.0);
	});

	it("verifies real DICOM header parser extracts correct 16-bit CT pixel geometry and window centers", async () => {
		const { parseDicomSliceHeader } = await import("../realDicomVolumeLoader");

		// Construct synthetic real-layout DICOM buffer with standard tags
		const buffer = new ArrayBuffer(2048);
		const view = new DataView(buffer);

		// Tag (0028, 0010) Rows = 512
		let off = 128;
		view.setUint16(off, 0x0028, true);
		view.setUint16(off + 2, 0x0010, true);
		view.setUint16(off + 4, 0x5553, true); // US
		view.setUint16(off + 6, 2, true);
		view.setUint16(off + 8, 512, true);

		// Tag (0028, 0011) Columns = 512
		off += 10;
		view.setUint16(off, 0x0028, true);
		view.setUint16(off + 2, 0x0011, true);
		view.setUint16(off + 4, 0x5553, true);
		view.setUint16(off + 6, 2, true);
		view.setUint16(off + 8, 512, true);

		// Tag (0028, 0100) BitsAllocated = 16
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

	it("renders RadiologyViewerModal with non-truncated WW/WL presets bar and min-w-max buttons", async () => {
		const { RadiologyViewerModal } = await import("../RadiologyViewerModal");
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");

		const testStudy: import("../types").RadiologyStudy = {
			id: "study-101",
			patientName: "Смирнова Елена Васильевна",
			doctorName: "Д-р Барабаш С.В.",
			studyDate: "2026-08-15 14:30",
			studyType: "intraoral_radiovisiography",
			status: "completed",
			effectiveDoseMsv: 0.0035,
			modality: "intraoral_rvg",
			modalityLabel: "Радиовизиография",
			anatomicalArea: "Зуб 16 (Верхний моляр)",
			teethFdi: ["16"],
			imageUrl: "/radiology/sample_rvg_tooth16.jpg",
			effectiveDoseMicrosv: 3.5,
			measurements: [],
			landmarks: [],
			calipers: [],
			nerves: [],
			metadata: { pixelSpacingMm: 0.05 },
		};

		const html = renderToStaticMarkup(
			createElement(RadiologyViewerModal, {
				isOpen: true,
				onClose: () => {},
				study: testStudy,
			}),
		);

		// 1. Presets bar structure & test ID
		assert.ok(html.includes('data-testid="viewer-presets-bar"'), "Contains presets bar container");
		assert.ok(
			html.includes("overflow-x-auto") && html.includes("flex-nowrap"),
			"Presets bar has overflow-x-auto flex-nowrap to prevent button clipping",
		);

		// 2. Buttons with min-w-max and full non-truncated Russian labels
		assert.ok(html.includes("Негатив / Инверсия"), "Contains full 'Негатив / Инверсия' label");
		assert.ok(html.includes("Кость / Эндодонтия"), "Contains full 'Кость / Эндодонтия' label");
		assert.ok(html.includes("Эмаль / Дентин"), "Contains full 'Эмаль / Дентин' label");
		assert.ok(html.includes("Импланты / Металл"), "Contains full 'Импланты / Металл' label");
		assert.ok(html.includes("min-w-max"), "Preset buttons contain min-w-max class");

		// 3. Tooth 16 complete anatomical label
		assert.ok(
			html.includes("Зуб 16 (Верхний моляр)"),
			"Renders full tooth anatomical description without truncation",
		);
	});

	it("synchronizes studyDate from reception / props when omitted in DICOM / study", async () => {
		const { RadiologyViewerModal } = await import("../RadiologyViewerModal");
		const { createElement } = await import("react");
		const { renderToStaticMarkup } = await import("react-dom/server");

		const testStudyWithoutDate: import("../types").RadiologyStudy = {
			id: "study-102",
			patientName: "Иванов Иван",
			doctorName: "Д-р Барабаш С.В.",
			studyDate: "", // empty / omitted in DICOM
			studyType: "cbct_full_maxillofacial_15x15",
			status: "completed",
			effectiveDoseMsv: 0.025,
			modality: "cbct_3d",
			modalityLabel: "3D КЛКТ",
			anatomicalArea: "Челюстно-лицевая область",
			teethFdi: ["16", "26"],
			imageUrl: "/radiology/sample.jpg",
			effectiveDoseMicrosv: 25.0,
			measurements: [],
			landmarks: [],
			calipers: [],
			nerves: [],
		};

		const html = renderToStaticMarkup(
			createElement(RadiologyViewerModal, {
				isOpen: true,
				onClose: () => {},
				study: testStudyWithoutDate,
				currentReceptionDate: "2026-08-28 15:30",
			}),
		);

		// Synchronized formatted date from reception prop
		assert.ok(html.includes("28.08.2026 15:30"), "Synchronized reception date into formatted study header");
	});

	it("renders CbctMprImplantStudioModal with disabled unselected nerve node delete and strict vector icons (DEF-R2-02)", async () => {
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

		// 1. Delete node button exists and has disabled state and classes
		assert.ok(html.includes('data-testid="cbct-delete-nerve-node-btn"'), "Contains cbct-delete-nerve-node-btn");
		assert.ok(
			html.includes("disabled:opacity-40") &&
			html.includes("disabled:cursor-not-allowed") &&
			html.includes("disabled:pointer-events-none"),
			"Delete node button has disabled state classes",
		);

		// 2. Reset nerve trace button exists
		assert.ok(html.includes('data-testid="cbct-reset-nerve-trace-btn"'), "Contains cbct-reset-nerve-trace-btn");

		// 3. Strict zero emojis in modal markup
		assert.ok(!html.includes("🗑️"), "Zero raw trash emoji");
		assert.ok(!html.includes("✅"), "Zero raw checkmark emoji in sinus notes");
		assert.ok(!html.includes("⚠️"), "Zero raw warning emoji");
		assert.ok(!html.includes("⛔"), "Zero raw no-entry emoji");
	});
});

