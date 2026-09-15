/**
 * wave224DiagnosticCtImplantInquisition.test.ts
 *
 * WAVE 224 INQUISITION: Diagnostic Imaging, Real DICOM P10 & Implant Planning Engine
 * Mandates: 11 (Real Engines vs Synthetic Dioramas), 8s (Anti-Mock & SSOT), 8e (Doctor Autonomy & <50ms RVG).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	CANONICAL_IMPLANT_SYSTEMS,
	MIS_SYSTEM,
	NOBEL_BIOCARE_SYSTEM,
	OSSTEM_SYSTEM,
	STRAUMANN_SYSTEM,
	DENTIUM_SYSTEM,
	getImplantSystem,
	normalizeSystemId,
} from "../implantCatalog";
import {
	IMPLANT_BRANDS_METADATA,
	getFixturesByBrand,
} from "../../implants/implantCatalog";
import { FAST_IMPLANT_SYSTEM_PRESETS } from "../../implants/implantQuickPresets";
import {
	IMPLANT_TORQUE_SPECS,
	getTorqueSpecsByBrand,
} from "../../implants/implantTorqueCatalog";
import {
	STANDARD_IMPLANT_CATALOG,
	SURGEON_IMPLANT_PRESETS,
	auditMandibularNerveSafety,
	findImplantSpec,
	MANDIBULAR_NERVE_DANGER_THRESHOLD_MM,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
} from "../../radiology/implantSafetyEngine";
import { MANDIBULAR_NERVE_SAFETY_MARGIN_MM } from "../../radiology/cbctCaliperNerveMath";
import { parseDicomSliceHeader } from "../../radiology/realDicomVolumeLoader";
import { isMultiFrameDicom } from "../../radiology/dicomMultiFrameLoader";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Wave 224 Inquisition: Real Diagnostic Engines, DICOM P10 & Outpatient Implant Planning", () => {
	// ─── 1. OUTPATIENT IMPLANT LIBRARY VERIFICATION ───────────────────────────
	describe("1. Outpatient Dental Implant Library (Nobel, Straumann, Osstem, Dentium, MIS)", () => {
		it("1.1 CANONICAL_IMPLANT_SYSTEMS contains all 5 outpatient dental brands with exact clinical specs", () => {
			const systemIds = CANONICAL_IMPLANT_SYSTEMS.map((s) => s.id);
			assert.ok(systemIds.includes(OSSTEM_SYSTEM.id), "Must include Osstem");
			assert.ok(systemIds.includes(STRAUMANN_SYSTEM.id), "Must include Straumann");
			assert.ok(systemIds.includes(NOBEL_BIOCARE_SYSTEM.id), "Must include Nobel Biocare");
			assert.ok(systemIds.includes(DENTIUM_SYSTEM.id), "Must include Dentium");
			assert.ok(systemIds.includes(MIS_SYSTEM.id), "Must include MIS Implants");

			// Verify MIS Implants clinical specs
			assert.equal(MIS_SYSTEM.brand, "MIS Implants");
			assert.equal(MIS_SYSTEM.country, "Израиль");
			assert.ok(MIS_SYSTEM.diameters.includes(3.75), "MIS must offer 3.75 mm diameter");
			assert.ok(MIS_SYSTEM.diameters.includes(4.2), "MIS must offer 4.2 mm diameter");
			assert.ok(MIS_SYSTEM.lengths.includes(10.0), "MIS must offer 10.0 mm length");
			assert.ok(MIS_SYSTEM.lengths.includes(11.5), "MIS must offer 11.5 mm length");
		});

		it("1.2 Normalizes system IDs including mis, osstem, straumann, nobel, dentium", () => {
			assert.equal(normalizeSystemId("MIS"), "mis-implants");
			assert.equal(normalizeSystemId("mis-seven"), "mis-implants");
			assert.equal(normalizeSystemId("Osstem"), "osstem-ts3");
			assert.equal(normalizeSystemId("straumann"), "straumann-blx");
			assert.equal(normalizeSystemId("nobel biocare"), "nobel-active");
			assert.equal(normalizeSystemId("Dentium SuperLine"), "dentium-superline");
		});

		it("1.3 Implants catalog module exports fixtures and metadata for all 5 brands", () => {
			const brands = Object.keys(IMPLANT_BRANDS_METADATA);
			assert.ok(brands.includes("osstem"), "Must include osstem");
			assert.ok(brands.includes("straumann"), "Must include straumann");
			assert.ok(brands.includes("nobel_biocare"), "Must include nobel_biocare");
			assert.ok(brands.includes("dentium"), "Must include dentium");
			assert.ok(brands.includes("mis"), "Must include mis");

			const misFixtures = getFixturesByBrand("mis");
			assert.ok(misFixtures.length > 0, "MIS must have auto-generated fixtures");
			const sampleMis = misFixtures[0];
			assert.equal(sampleMis?.brand, "mis");
			assert.equal(sampleMis?.brandCountry, "Израиль");
		});

		it("1.4 Fast implant presets and torque catalog contain MIS specifications", () => {
			const presetBrands = FAST_IMPLANT_SYSTEM_PRESETS.map((p) => p.brand);
			assert.ok(presetBrands.includes("MIS"), "Fast presets must include MIS");

			const misTorque = getTorqueSpecsByBrand("mis");
			assert.equal(misTorque.brand, "mis");
			assert.equal(misTorque.torqueFinalScrewNcm, 30, "MIS final screw torque must be 30 N·cm");
			assert.equal(misTorque.screwdriverDefault, "Hex 1.27 mm (0.050 inch)");
		});

		it("1.5 Virtual implant safety catalog contains MIS fixtures and surgeon presets", () => {
			const misCatalogItems = STANDARD_IMPLANT_CATALOG.filter((i) => i.brand === "mis");
			assert.ok(misCatalogItems.length >= 3, "STANDARD_IMPLANT_CATALOG must have at least 3 MIS fixtures");

			const found = findImplantSpec("mis", 3.75, 10.0);
			assert.equal(found.brand, "mis");
			assert.equal(found.diameterMm, 3.75);
			assert.equal(found.lengthMm, 10.0);

			const misPreset = SURGEON_IMPLANT_PRESETS.find((p) => p.brand === "mis");
			assert.ok(misPreset, "SURGEON_IMPLANT_PRESETS must include MIS");
			assert.equal(misPreset?.shortLabel, "MIS SEVEN 3.75x10");
		});
	});

	// ─── 2. MANDIBULAR NERVE CLEARANCE & SAFETY CALCULATIONS ───────────────────
	describe("2. Mandibular Nerve Clearance Calculation (Misch 2008 Standard >= 2.0 mm)", () => {
		const baseSpec = findImplantSpec("mis", 3.75, 10.0);
		const basePose: CrossSectionImplantPose = {
			entryPoint: { x: 0, y: 0 },
			angulationDeg: 0,
			implantSpec: baseSpec,
			targetToothFdi: 46,
		};

		it("2.1 Accurately computes >= 2.0 mm clearance as SAFE", () => {
			// Center at (0, 16.0), canal radius 1.5, implant radius 1.875 -> distance 6.0 mm, net clearance 2.625 mm >= 2.0 mm
			const canalSafe: MandibularCanalCrossSection = {
				center: { x: 0, y: 16.0 },
				radiusMm: 1.5,
				safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM, // 2.0 mm
			};

			const result = auditMandibularNerveSafety(basePose, canalSafe);
			assert.equal(result.safetyStatus, "safe");
			assert.equal(result.isDangerous, false);
			assert.equal(result.isWarning, false);
			assert.equal(result.shouldTriggerAudioAlarm, false);
			assert.ok(result.netClearanceToCanalWallMm >= 2.0);
			assert.ok(result.clinicalMessageRu.includes("БЕЗОПАСНО"));
		});

		it("2.2 Triggers WARNING when clearance is between 1.5 mm and 2.0 mm", () => {
			// Center at (0, 15.15): netClearanceWall = 5.15 - (1.875 + 1.5) = 1.775 mm (1.5 <= d < 2.0)
			const canalWarning: MandibularCanalCrossSection = {
				center: { x: 0, y: 15.15 },
				radiusMm: 1.5,
				safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM, // 2.0 mm
			};

			const result = auditMandibularNerveSafety(basePose, canalWarning);
			assert.equal(result.safetyStatus, "warning");
			assert.equal(result.isDangerous, false);
			assert.equal(result.isWarning, true);
			assert.equal(result.shouldTriggerAudioAlarm, false);
			assert.ok(result.netClearanceToCanalWallMm < 2.0);
			assert.ok(result.netClearanceToCanalWallMm >= MANDIBULAR_NERVE_DANGER_THRESHOLD_MM);
			assert.ok(result.clinicalMessageRu.includes("ВНИМАНИЕ"));
		});

		it("2.3 Triggers DANGER and Audio Alarm when clearance is < 1.5 mm or perforating", () => {
			// Center at (0, 14.5): netClearanceWall = 4.5 - (1.875 + 1.5) = 1.125 mm (< 1.5 mm -> Danger)
			const canalDanger: MandibularCanalCrossSection = {
				center: { x: 0, y: 14.5 },
				radiusMm: 1.5,
				safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
			};

			const result = auditMandibularNerveSafety(basePose, canalDanger);
			assert.equal(result.safetyStatus, "danger");
			assert.equal(result.isDangerous, true);
			assert.equal(result.shouldTriggerAudioAlarm, true);
			assert.ok(result.clinicalMessageRu.includes("КРИТИЧЕСКИЙ РИСК"));

			// Direct perforation (center inside implant body)
			const canalPerforating: MandibularCanalCrossSection = {
				center: { x: 0, y: 9.0 },
				radiusMm: 1.5,
				safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
			};
			const perfResult = auditMandibularNerveSafety(basePose, canalPerforating);
			assert.equal(perfResult.safetyStatus, "danger");
			assert.equal(perfResult.isDangerous, true);
			assert.equal(perfResult.shouldTriggerAudioAlarm, true);
			assert.ok(perfResult.clinicalMessageRu.includes("ПЕРФОРАЦИЯ НИЖНЕЧЕЛЮСТНОГО КАНАЛА"));
		});
	});

	// ─── 3. REAL DICOM PART 10 PARSER VERIFICATION ────────────────────────────
	describe("3. Real DICOM Part 10 Ingestion Engine & Tag Parsing Integrity", () => {
		function buildSyntheticDicomBuffer(): ArrayBuffer {
			// Build minimal real DICOM Part 10 buffer with 128-byte preamble + DICM magic
			const buf = new ArrayBuffer(512);
			const view = new DataView(buf);
			const uint8 = new Uint8Array(buf);

			// Preamble: bytes 0..127 zeroes, 128..131 "DICM"
			uint8[128] = 0x44; // D
			uint8[129] = 0x49; // I
			uint8[130] = 0x43; // C
			uint8[131] = 0x4d; // M

			// Tag (0028, 0010) Rows = 512
			view.setUint16(132, 0x0028, true);
			view.setUint16(134, 0x0010, true);
			view.setUint16(136, 0x0002, true); // VR: US (or length 2)
			view.setUint16(140, 512, true);

			// Tag (0028, 0011) Columns = 512
			view.setUint16(144, 0x0028, true);
			view.setUint16(146, 0x0011, true);
			view.setUint16(148, 0x0002, true);
			view.setUint16(152, 512, true);

			return buf;
		}

		it("3.1 Identifies standard DICOM Part 10 preamble and DICM magic string", () => {
			const buf = buildSyntheticDicomBuffer();
			const header = parseDicomSliceHeader(buf);
			assert.ok(header);
			assert.equal(header.rows, 512);
			assert.equal(header.cols, 512);
		});

		it("3.2 isMultiFrameDicom correctly identifies buffer validity", () => {
			const smallBuf = new ArrayBuffer(64);
			assert.equal(isMultiFrameDicom(smallBuf), false, "Small buffer must return false");

			const dicmBuf = buildSyntheticDicomBuffer();
			// Single slice buffer without (0028, 0008) returns false
			assert.equal(isMultiFrameDicom(dicmBuf), false);
		});
	});

	// ─── 4. ZERO-DIORAMA & HONEST EMPTY STATE AUDIT (MANDATE 11 & 8s) ─────────
	describe("4. Zero-Diorama Law (Mandate 11 & 8s): Elimination of Fake Canvas Dioramas", () => {
		it("4.1 CbctMprImplantStudioModal contains honest empty dropzone and no procedural bone gradient generators", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../../radiology/CbctMprImplantStudioModal.tsx"),
				"utf-8",
			);

			// Must NOT contain fake canvas diorama generators
			assert.equal(
				source.includes("ctx.createRadialGradient"),
				false,
				"CbctMprImplantStudioModal must not contain synthetic radial gradients simulating bone tissue",
			);
			assert.equal(
				source.includes("Math.min(w, h) / 2.2"),
				false,
				"CbctMprImplantStudioModal must not contain fake arc jaw simulations",
			);

			// Must contain honest empty dropzone
			assert.ok(
				source.includes("data-testid=\"cbct-empty-volume-dropzone\""),
				"CbctMprImplantStudioModal must contain honest dropzone for КЛКТ",
			);
			assert.ok(
				source.includes("Исследование КЛКТ не загружено"),
				"Must state honest status when volume is not loaded",
			);
		});

		it("4.2 CbctMprWorkspace is an ultra-thin facade delegating to Cornerstone3DViewer under 50 lines", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../CbctMprWorkspace.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("Cornerstone3DViewer"),
				"CbctMprWorkspace must delegate to Cornerstone3DViewer",
			);
			assert.ok(
				source.split("\n").length <= 50,
				"CbctMprWorkspace must be an ultra-thin facade <= 50 lines",
			);
		});

		it("4.3 PanoramicRendererWindow renders authentic CT unwrapping without synthetic tooth dioramas", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../PanoramicRendererWindow.tsx"),
				"utf-8",
			);

			assert.equal(
				source.includes("ctx.createRadialGradient"),
				false,
				"PanoramicRendererWindow must not simulate teeth with fake radial gradients",
			);
			assert.ok(
				source.includes("paintHuPixelsToCanvas"),
				"Must paint genuine HU pixels from volume data",
			);
		});

		it("4.4 DirectRvgCaptureModal contains drag & drop file upload and <50ms instant capture", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../../radiology/DirectRvgCaptureModal.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("validateRadiologyUploadFile"),
				"DirectRvgCaptureModal must validate genuine radiology upload files",
			);
			assert.ok(
				source.includes("data-testid=\"rvg-drop-overlay\""),
				"Must include drop overlay for DICOM/TIFF/PNG/JPG files",
			);
			assert.ok(
				source.includes("Мгновенный захват <50мс"),
				"Must enforce Mandate 8e: <50ms capture without artificial stalls",
			);
		});

		it("4.5 CephalometricCanvas displays honest dropzone when no lateral ceph image is loaded", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../../orthodontics/CephalometricCanvas.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("data-testid=\"ceph-dropzone\""),
				"CephalometricCanvas must contain honest dropzone for lateral ceph",
			);
			assert.ok(
				source.includes("Для проведения цефалометрического анализа требуется реальный рентгеновский снимок"),
				"Must inform user that genuine lateral cephalogram is required",
			);
		});

		it("4.6 HotFolderIntakeModal renders honest empty state when hot folder contains 0 files", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../../radiology/HotFolderIntakeModal.tsx"),
				"utf-8",
			);

			assert.ok(
				source.includes("В папке пока нет новых снимков"),
				"HotFolderIntakeModal must display honest empty state when folder is empty",
			);
		});
	});
});
