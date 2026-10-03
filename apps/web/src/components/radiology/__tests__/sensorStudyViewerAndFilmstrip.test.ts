import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EMBOSS_45_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	TOOTH_ANATOMICAL_NAMES,
	UNSHARP_MASK_KERNEL_3X3,
	apply2DSpatialConvolution,
	calculateDapDose,
	calculateScaleRulerHeightPx,
	formatRadiationDap,
	resolveCalibratedPixelSpacing,
	VATECH_DEVICE_CALIBRATION_PRESETS,
} from "../dentalViewerMath.js";
import {
	formatFilmstripDateTime,
	getModalityBadge,
	type RadiologyFilmstripItem,
} from "../RadiologyFilmstripDock.js";
import {
	DEFAULT_QUICK_FILTERS_STATE,
	type RadiologyQuickFilterState,
} from "../RadiologyQuickFiltersPanel.js";

describe("EzDent-i 2D X-Ray & VisioGraphy Workstation — Clean Architecture & Ergonomics", () => {
	describe("Filmstrip Dock Ergonomics & Metadata Formatting (EzDent-i Screenshots 15, 16, 22)", () => {
		it("formats ISO date and time into clean human-readable clinical strings", () => {
			const res = formatFilmstripDateTime("2026-09-20T09:14:20.000Z");
			assert.ok(res.dateStr.includes("2026"), `Expected date string to contain 2026, got ${res.dateStr}`);
			assert.ok(res.timeStr.length > 0, "Expected time string to be present");
		});

		it("preserves pre-formatted DD.MM.YYYY HH:mm:ss strings without corrupting", () => {
			const res = formatFilmstripDateTime("20.09.2026 09:14:20");
			assert.equal(res.dateStr, "20.09.2026");
			assert.equal(res.timeStr, "09:14:20");
		});

		it("handles empty or missing date string gracefully", () => {
			const res = formatFilmstripDateTime("");
			assert.equal(res.dateStr, "—");
			assert.equal(res.timeStr, "—");
		});

		it("assigns clinical modality badges matching EzDent-i color themes", () => {
			const ioBadge = getModalityBadge("intraoral_rvg");
			assert.equal(ioBadge.label, "IO-СЕНСОР");
			assert.equal(ioBadge.color, "#10b981");

			const panoBadge = getModalityBadge("optg_panoramic");
			assert.equal(panoBadge.label, "ПАНОРАМА");
			assert.equal(panoBadge.color, "#06b6d4");

			const cbctBadge = getModalityBadge("cbct_3d");
			assert.equal(cbctBadge.label, "КЛКТ 3D");
			assert.equal(cbctBadge.color, "#818cf8");

			const cephBadge = getModalityBadge("trg_ceph");
			assert.equal(cephBadge.label, "ТРГ");
			assert.equal(cephBadge.color, "#fbbf24");
		});
	});

	describe("1-Click Quick Filter Toggles (EzDent-i Screenshot 22)", () => {
		it("initializes with all quick filters disabled by default", () => {
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.sharpness, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.maxSharpness, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.invert, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.pseudoRelief, false);
		});

		it("verifies mathematical kernels for Unsharp Masking, High-Boost, and Emboss 45°", () => {
			// Unsharp mask 3x3: center = 9, sum = 1
			assert.equal(UNSHARP_MASK_KERNEL_3X3.length, 9);
			assert.equal(UNSHARP_MASK_KERNEL_3X3[4], 9);
			assert.equal(UNSHARP_MASK_KERNEL_3X3.reduce((a, b) => a + b, 0), 1);

			// High-Boost 3x3: center = 13, sum = 1
			assert.equal(HIGH_BOOST_KERNEL_3X3.length, 9);
			assert.equal(HIGH_BOOST_KERNEL_3X3[4], 13);
			assert.equal(HIGH_BOOST_KERNEL_3X3.reduce((a, b) => a + b, 0), 1);

			// Emboss 45°: asymmetric diagonal gradient with sum = 1
			assert.equal(EMBOSS_45_KERNEL_3X3.length, 9);
			assert.equal(EMBOSS_45_KERNEL_3X3[0], -2);
			assert.equal(EMBOSS_45_KERNEL_3X3[8], 2);
		});

		it("applies 2D spatial convolution without NaN, preserving RGBA channels", () => {
			const width = 4;
			const height = 4;
			// 4x4 image buffer with white pixel in center
			const src = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < src.length; i += 4) {
				src[i] = 100;
				src[i + 1] = 100;
				src[i + 2] = 100;
				src[i + 3] = 255;
			}
			// Center pixel is bright 240
			const centerIdx = (1 * width + 1) * 4;
			src[centerIdx] = 240;
			src[centerIdx + 1] = 240;
			src[centerIdx + 2] = 240;

			const filtered = apply2DSpatialConvolution(src, width, height, UNSHARP_MASK_KERNEL_3X3);
			assert.equal(filtered.length, src.length);
			// Center pixel should be sharpened
			assert.ok(filtered[centerIdx]! >= 240, "Sharpened center pixel should be boosted");
			// Alpha channel must remain 255
			assert.equal(filtered[centerIdx + 3], 255);
		});
	});

	describe("Vertical 5 mm Calibrated Ladder Scale Ruler (Ground Truth from Vatech EzSensor)", () => {
		it("calculates exact rendered pixel height for 5 mm on EzSensor 1.5 (35.0 µm)", () => {
			// EzSensor 1.5 standard = 35.0 µm/px = 0.0350 mm/px
			// 5.0 mm / 0.0350 mm/px = 142.857 px
			const heightPx = calculateScaleRulerHeightPx(5.0, 35.0, 1.0);
			assert.equal(heightPx, 142.86);
		});

		it("calculates rendered height for EzSensor Soft High Resolution (14.8 µm)", () => {
			// EzSensor Soft HR = 14.8 µm/px = 0.0148 mm/px
			// 5.0 mm / 0.0148 mm/px = 337.838 px
			const heightPx = calculateScaleRulerHeightPx(5.0, 14.8, 1.0);
			assert.equal(heightPx, 337.84);
		});

		it("scales rendered height proportionally with viewport zoom", () => {
			const height1x = calculateScaleRulerHeightPx(5.0, 35.0, 1.0);
			const height2x = calculateScaleRulerHeightPx(5.0, 35.0, 2.0);
			assert.ok(
				Math.abs(height2x - height1x * 2) < 0.05,
				`Expected height2x (${height2x}) to be proportional to height1x (${height1x})`,
			);
		});

		it("returns 0 for non-positive input dimensions", () => {
			assert.equal(calculateScaleRulerHeightPx(0, 35.0, 1.0), 0);
			assert.equal(calculateScaleRulerHeightPx(5.0, 0, 1.0), 0);
			assert.equal(calculateScaleRulerHeightPx(5.0, 35.0, 0), 0);
		});
	});

	describe("Clinical Cockpit HUD & Radiation Dosimetry (EzDent-i Screenshot 24, 27)", () => {
		it("resolves anatomical tooth names from FDI tooth codes", () => {
			assert.equal(TOOTH_ANATOMICAL_NAMES["14"], "Первый премоляр ВЧ справа");
			assert.equal(TOOTH_ANATOMICAL_NAMES["16"], "Первый моляр ВЧ справа");
			assert.equal(TOOTH_ANATOMICAL_NAMES["36"], "Первый моляр НЧ слева");
			assert.equal(TOOTH_ANATOMICAL_NAMES["48"], "Третий моляр (зуб мудрости) НЧ справа");
		});

		it("calculates Dose Area Product (DAP) matching SanPiN 2.6.1.1192-03", () => {
			// At 65 kVp, 7 mA, 0.08 sec exposure:
			const dap = calculateDapDose(65, 7.0, 0.08, 12.5);
			assert.ok(dap > 0.015 && dap < 0.035, `Expected realistic dental DAP ~0.022..0.025, got ${dap}`);
		});

		it("formats DAP dose string matching EzDent-i report standard", () => {
			const formatted = formatRadiationDap(0.024);
			assert.equal(formatted, "0,024 dGy*Cm^2[DAP]");
		});

		it("handles zero exposure values safely without throwing", () => {
			const dap = calculateDapDose(0, 0, 0);
			assert.equal(dap, 0.0);
			assert.equal(formatRadiationDap(0), "0,000 dGy*Cm^2[DAP]");
		});
	});
});
