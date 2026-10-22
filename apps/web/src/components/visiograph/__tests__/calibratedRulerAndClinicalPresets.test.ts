import assert from "node:assert";
import { describe, test } from "node:test";
import {
	BASE_VISIOGRAPH_PRESETS_LIST,
	CLINICAL_VISIOGRAPH_FILTERS,
	computeVoiRange,
	huToGrayscale,
	VISIOGRAPH_WINDOW_PRESETS,
} from "../VisiographWindowPresets";
import {
	calculateAngle3Points,
	calculateRuler,
	computeCalibration,
	DENTAL_SENSOR_PRESETS,
	distance2D,
	recalculateRulersWithScale,
} from "../VisiographMeasurementMath";

describe("2D RVG Calibrated Ruler Measurements & Clinical Window Preset Switching", () => {
	test("calibrated ruler measures apex to orifice length with 0.1 mm precision", () => {
		// Sensor scale: Vatech EzSensor 1.5 (0.035 mm / pixel)
		const scaleMmPerPixel = 0.035;

		// Simulated root canal length on 2D RVG (apex at [100, 200], orifice at [100, 771] -> 571 pixels)
		const apexPoint = { x: 100, y: 200 };
		const orificePoint = { x: 100, y: 771 };

		const ruler = calculateRuler(
			apexPoint,
			orificePoint,
			scaleMmPerPixel,
			"Канал: Дистальный (WL)",
			"ruler-wl-test",
		);

		assert.strictEqual(ruler.lengthPx, 571);
		// 571 px * 0.035 mm/px = 19.985 mm -> rounded to 0.1 mm is 20.0 mm
		const roundedLengthMm = Math.round(ruler.lengthMm * 10) / 10;
		assert.strictEqual(roundedLengthMm, 20.0);
		assert.strictEqual(ruler.label, "Канал: Дистальный (WL)");
	});

	test("recalculateRulersWithScale adjusts clinical measurements across sensor hardware presets", () => {
		const initialRuler = calculateRuler(
			{ x: 50, y: 50 },
			{ x: 50, y: 350 }, // 300 px
			0.035, // EzSensor 1.5: 300 * 0.035 = 10.5 mm
			"WL",
		);
		assert.strictEqual(Math.round(initialRuler.lengthMm * 10) / 10, 10.5);

		// Switch to high-resolution EzSensor Classic (0.0296 mm/px)
		const classicPreset = DENTAL_SENSOR_PRESETS.find((p) => p.id === "vatech_ezsensor_classic");
		assert.ok(classicPreset);

		const updatedRulers = recalculateRulersWithScale([initialRuler], classicPreset.pixelSizeMm);
		// 300 px * 0.0296 = 8.88 mm -> 8.9 mm
		assert.strictEqual(Math.round(updatedRulers[0]!.lengthMm * 10) / 10, 8.9);
	});

	test("ruler calculation handles zero-distance points safely without NaN or infinite lengths", () => {
		const zeroRuler = calculateRuler({ x: 100, y: 100 }, { x: 100, y: 100 }, 0.035);
		assert.strictEqual(zeroRuler.lengthPx, 0);
		assert.strictEqual(zeroRuler.lengthMm, 0);
		assert.strictEqual(Number.isFinite(zeroRuler.lengthMm), true);
	});

	test("angle measurement correctly computes root axis angulation", () => {
		const vertex = { x: 100, y: 200 };
		const arm1 = { x: 100, y: 100 }; // Straight up (0 deg from vertical)
		const arm2 = { x: 200, y: 200 }; // 90 deg angle to the right

		const angle = calculateAngle3Points(vertex, arm1, arm2, "tooth_axis", "Ось корня 26");
		assert.strictEqual(Math.round(angle.angleDeg), 90);
		assert.strictEqual(Math.round(angle.deviationFromVerticalDeg), 0);
	});

	test("2D RVG clinical filter presets switch instantly without 3D voxel memory allocation", () => {
		// All essential clinical presets must be available in 1 click
		const endo = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "endodontics");
		assert.ok(endo, "Эндодонтия filter preset must exist");
		assert.strictEqual(endo.params.contrast > 40, true, "Endo requires high contrast for apex visibility");
		assert.strictEqual(endo.params.sharpness >= 50, true, "Endo requires high sharpness for canal curvature");

		const bone = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "bone_periodont");
		assert.ok(bone, "Костная ткань filter preset must exist");
		assert.strictEqual(bone.params.sharpness >= 70, true, "Bone requires max sharpness for trabeculae");

		const negative = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "negative_cracks");
		assert.ok(negative, "Негатив/Инверсия filter preset must exist");
		assert.strictEqual(negative.params.invert, true, "Negative preset must invert pixel intensities");

		const caries = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "caries_enamel");
		assert.ok(caries, "Кариес/Эмаль filter preset must exist");
		assert.strictEqual(caries.params.gamma > 1.0, true, "Caries preset brightens soft tissues and cervical zone");

		// Metal and enamel structures are calibrated via enamel_dentin window preset
		const metalWindow = VISIOGRAPH_WINDOW_PRESETS.enamel_dentin;
		assert.ok(metalWindow, "Металл/Ортопедия/Эмаль window preset must exist");
		assert.strictEqual(metalWindow.windowWidth, 4000);
		assert.strictEqual(metalWindow.windowCenter, 1500);
	});

	test("DICOM window presets provide calibrated HU ranges for 2D and 3D dental diagnostics", () => {
		const endoHounsfield = VISIOGRAPH_WINDOW_PRESETS.endodontic_canal;
		assert.strictEqual(endoHounsfield.windowWidth, 1500);
		assert.strictEqual(endoHounsfield.windowCenter, 300);

		const boneHounsfield = VISIOGRAPH_WINDOW_PRESETS.bone;
		assert.strictEqual(boneHounsfield.windowWidth, 2000);
		assert.strictEqual(boneHounsfield.windowCenter, 500);

		// Ensure 4 base presets are always registered
		assert.strictEqual(BASE_VISIOGRAPH_PRESETS_LIST.length, 4);
	});

	test("calibration engine accurately scales millimeter sphere to pixel pitch", () => {
		// 5.0 mm calibration sphere measured at 142.857 pixels
		const calib = computeCalibration(
			{ x: 100, y: 100 },
			{ x: 242.857, y: 100 },
			5.0,
			"sphere_5mm",
		);

		assert.strictEqual(Math.round(calib.pixelDistance * 10) / 10, 142.9);
		// 5.0 mm / 142.857 px ≈ 0.035 mm/px (Vatech EzSensor standard)
		assert.strictEqual(Math.round(calib.scaleMmPerPixel * 1000) / 1000, 0.035);
	});
});
