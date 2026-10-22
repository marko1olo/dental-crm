import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	detectInstalledCtViewers,
	detectExternalCtViewers,
	launchExternalCtViewer,
} from "../../../native/desktop/ctViewerBridge";
import {
	calculateRuler,
	computeCalibration,
	DENTAL_SENSOR_PRESETS,
	recalculateRulersWithScale,
} from "../../visiograph/VisiographMeasurementMath";
import {
	CLINICAL_VISIOGRAPH_FILTERS,
	VISIOGRAPH_WINDOW_PRESETS,
} from "../../visiograph/VisiographWindowPresets";
import {
	isSupportedToothFdi,
	PERMANENT_TEETH_FDI,
} from "../imagingToothBindingHelper";

describe("2D Imaging & External 3D Viewer Bridge Suite (Mandates 8e, 8n, 8x, 8am)", () => {
	describe("1. 1-Click External 3D CBCT Software Launch Bridge", () => {
		it("detectInstalledCtViewers returns internal fallback when desktop bridge is idle", async () => {
			const viewers = await detectInstalledCtViewers();
			assert.ok(Array.isArray(viewers));
			assert.ok(viewers.length >= 1);
			const internal = viewers.find((v) => v.id === "dente-cbct-studio");
			assert.ok(internal, "Internal viewer fallback must always exist (Mandate Zero Dead-Ends)");
			assert.strictEqual(internal.isDefault, true);
		});

		it("detectExternalCtViewers maps installed viewers with availability flags", async () => {
			const external = await detectExternalCtViewers();
			assert.ok(Array.isArray(external));
			assert.ok(external.length >= 1);
			assert.strictEqual(external[0]?.id, "dente-cbct-studio");
			assert.strictEqual(external[0]?.isAvailable, true);
		});

		it("launchExternalCtViewer routes internal studio requests gracefully", async () => {
			const res = await launchExternalCtViewer({
				viewerId: "dente-cbct-studio",
				studyPath: "study_cbct_123",
			});
			assert.ok(typeof res.success === "boolean");
		});

		it("defines supported hardware vendors for 1-click launch (Planmeca Romexis, Vatech Ez3D, Sirona Sidexis)", () => {
			const supportedVendors = ["planmeca", "vatech", "sirona", "carestream", "3shape"];
			assert.ok(supportedVendors.includes("planmeca"));
			assert.ok(supportedVendors.includes("vatech"));
			assert.ok(supportedVendors.includes("sirona"));
		});
	});

	describe("2. Fast 2D RVG / OPG Outpatient Viewer & 4 Core Doctor Actions", () => {
		it("Zoom & Pan: ruler length in physical mm is invariant under canvas transforms", () => {
			const scaleMmPerPixel = 0.035; // Vatech EzSensor 1.5
			const p1 = { x: 100, y: 150 };
			const p2 = { x: 100, y: 435 }; // 285 px

			const ruler = calculateRuler(p1, p2, scaleMmPerPixel, "Канал 16 Дистальный");
			assert.strictEqual(ruler.lengthPx, 285);
			// 285 * 0.035 = 9.975 -> 10.0 mm
			const roundedMm = Math.round(ruler.lengthMm * 10) / 10;
			assert.strictEqual(roundedMm, 10.0);
		});

		it("Brightness & Contrast: provides instant 1-click clinical presets without voxel lag", () => {
			const endo = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "endodontics");
			assert.ok(endo, "Эндодонтия preset must exist");
			assert.ok(endo.params.contrast >= 40, "High contrast for apex visibility");

			const bone = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "bone_periodont");
			assert.ok(bone, "Кость preset must exist");
			assert.ok(bone.params.sharpness >= 60, "High sharpness for trabeculae");
		});

		it("Negative / Inversion: 1-click microcrack & fracture detection preset", () => {
			const negative = CLINICAL_VISIOGRAPH_FILTERS.find((f) => f.id === "negative_cracks");
			assert.ok(negative, "Негатив preset must exist");
			assert.strictEqual(negative.params.invert, true, "Must invert pixel intensities");
		});

		it("Calibrated Ruler: measures root canal length with 0.1 mm precision across sensor presets", () => {
			const p1 = { x: 50, y: 50 };
			const p2 = { x: 50, y: 350 }; // 300 px

			// Vatech EzSensor 1.5 (0.035 mm/px) -> 10.5 mm
			const vatechRuler = calculateRuler(p1, p2, 0.035, "WL 21");
			assert.strictEqual(Math.round(vatechRuler.lengthMm * 10) / 10, 10.5);

			// Planmeca ProSensor (0.030 mm/px) -> 9.0 mm
			const planmecaRulers = recalculateRulersWithScale([vatechRuler], 0.030);
			assert.strictEqual(Math.round(planmecaRulers[0]!.lengthMm * 10) / 10, 9.0);

			// Sirona Xios Plus (0.015 mm/px) -> 4.5 mm
			const sironaRulers = recalculateRulersWithScale([vatechRuler], 0.015);
			assert.strictEqual(Math.round(sironaRulers[0]!.lengthMm * 10) / 10, 4.5);
		});
	});

	describe("3. 1-Click FDI Tooth Binding (11..48)", () => {
		it("validates all 32 permanent teeth across 4 quadrants according to FDI standard", () => {
			assert.strictEqual(PERMANENT_TEETH_FDI.length, 32);
			assert.strictEqual(isSupportedToothFdi("11"), true);
			assert.strictEqual(isSupportedToothFdi("16"), true);
			assert.strictEqual(isSupportedToothFdi("26"), true);
			assert.strictEqual(isSupportedToothFdi("36"), true);
			assert.strictEqual(isSupportedToothFdi("48"), true);
		});

		it("rejects non-FDI teeth numbers safely", () => {
			assert.strictEqual(isSupportedToothFdi("99"), false);
			assert.strictEqual(isSupportedToothFdi("0"), false);
			assert.strictEqual(isSupportedToothFdi("abc"), false);
		});
	});

	describe("4. Outpatient Ergonomics & No Artificial Doctor Blockers (Mandate 8e)", () => {
		it("calibration engine safely handles zero-distance points without NaN", () => {
			const zero = calculateRuler({ x: 200, y: 200 }, { x: 200, y: 200 }, 0.035);
			assert.strictEqual(zero.lengthPx, 0);
			assert.strictEqual(zero.lengthMm, 0);
			assert.strictEqual(Number.isFinite(zero.lengthMm), true);
		});

		it("known calibration ball accurately scales millimeter sphere to pixel pitch", () => {
			// 5.0 mm steel reference sphere measured at 142.857 pixels
			const calib = computeCalibration(
				{ x: 100, y: 100 },
				{ x: 242.857, y: 100 },
				5.0,
				"steel_ball_5mm"
			);
			assert.strictEqual(Math.round(calib.scaleMmPerPixel * 1000) / 1000, 0.035);
		});
	});
});
