/**
 * sensorStudyViewer.test.tsx
 *
 * Targeted Red Team Test Suite for SensorStudyViewer:
 * 1. Filmstrip Dock timeline navigation & persistent patient history.
 * 2. 1-Click Quick Filters (Unsharp Masking, High-Boost, Invert, Emboss 45°).
 * 3. Vertical 5 mm calibrated ladder scale ruler with physical grounding to EzSensor.
 * 4. Fullscreen Clinical Cockpit HUD with patient telemetry and zero kV/mA physics clutter.
 * 5. Interactive measurements (caliper ruler, curved canal working length, lesion contour area).
 * 6. 1-Click Norma protocol injection into Form 043/u.
 *
 * Standards: EzDent-i clinical screenshots 15..29; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	EMBOSS_45_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	TOOTH_ANATOMICAL_NAMES,
	UNSHARP_MASK_KERNEL_3X3,
	apply2DSpatialConvolution,
	calculateCurvedCanalLengthMm,
	calculateLesionAreaGaussMm2,
	calculatePhysicalDistanceMm,
	calculateScaleRulerHeightPx,
	resolveCalibratedPixelSpacing,
} from "../dentalViewerMath.js";
import { applyRadiologyProtocolToForm043 } from "../radiologyProtocols.js";
import {
	formatFilmstripDateTime,
	getModalityBadge,
	RadiologyFilmstripDock,
} from "../RadiologyFilmstripDock.js";
import {
	DEFAULT_QUICK_FILTERS_STATE,
	RadiologyQuickFiltersPanel,
} from "../RadiologyQuickFiltersPanel.js";
import { RadiologyClinicalHud } from "../RadiologyClinicalHud.js";
import { RadiologyCalibratedScaleRuler } from "../RadiologyCalibratedScaleRuler.js";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("EzDent-i SensorStudyViewer & Clinical Cockpit", () => {
	describe("1. Total Purge of Physics Clutter & Clean Clinical HUD", () => {
		it("ensures RadiologyClinicalHud has zero kV, mA, or exposure time inputs", () => {
			const hudSrc = readSource("components/radiology/RadiologyClinicalHud.tsx");
			assert.ok(!hudSrc.includes("exposureSec"), "exposureSec must not exist in RadiologyClinicalHud");
			assert.ok(!hudSrc.includes("voltageKv"), "voltageKv must not exist in RadiologyClinicalHud");
			assert.ok(!hudSrc.includes("currentMa"), "currentMa must not exist in RadiologyClinicalHud");
			assert.ok(!hudSrc.includes("напряжение на трубке"), "напряжение must not exist in RadiologyClinicalHud");
		});

		it("renders RadiologyClinicalHud with clean patient metadata and FDI tooth", () => {
			const html = renderToString(
				React.createElement(RadiologyClinicalHud, {
					patientName: "Алексеев П.С.",
					medicalCardNumber: "043/у-2026/102",
					studyDate: "02.10.2026 14:15:00",
					toothFdi: "16",
				}),
			);

			assert.ok(html.includes("Алексеев П.С."));
			assert.ok(html.includes("043/у-2026/102"));
			assert.ok(html.includes('data-testid="hud-tooth-fdi"'));
			assert.ok(html.includes("16"));
			assert.ok(html.includes("Режим (Зуб FDI)"));
		});

		it("ensures SensorStudyViewer source contains zero manual exposure controls", () => {
			const viewerSrc = readSource("components/radiology/SensorStudyViewer.tsx");
			assert.ok(!viewerSrc.includes('data-testid="rvg-exposure-select"'));
			assert.ok(!viewerSrc.includes("exposureSec: number"));
		});
	});

	describe("2. Filmstrip Dock & Patient Timeline", () => {
		it("renders persistent Filmstrip Dock with modality badges and thumbnails", () => {
			const html = renderToString(
				React.createElement(RadiologyFilmstripDock, {
					studies: [
						{
							id: "study-1",
							title: "Прицельный снимок зуба 16",
							modality: "intraoral_rvg",
							modalityLabel: "IO-СЕНСОР",
							studyDate: "01.10.2026 10:14:20",
							teethFdi: ["16"],
							thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
						},
					],
					activeStudyId: "study-1",
					onSelectStudy: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="radiology-filmstrip-dock"'));
			assert.ok(html.includes("IO"));
			assert.ok(html.includes("16"));
		});

		it("formats dates into clean human-readable clinical strings", () => {
			const res = formatFilmstripDateTime("2026-10-02T11:30:00.000Z");
			assert.ok(res.dateStr.includes("2026"));
			assert.ok(res.timeStr.length > 0);
		});
	});

	describe("3. 1-Click Quick Filter Toggles (Sharpen, High-Boost, Invert, Emboss)", () => {
		it("renders quick filter buttons with active state feedback", () => {
			const html = renderToString(
				React.createElement(RadiologyQuickFiltersPanel, {
					filterState: DEFAULT_QUICK_FILTERS_STATE,
					onFilterChange: () => {},
					onReset: () => {},
					orientation: "vertical",
					brightnessPct: 0,
					contrastPct: 0,
				}),
			);

			assert.ok(html.includes('data-testid="quick-filter-sharpness"'));
			assert.ok(html.includes('data-testid="quick-filter-brightness-pill"'));
			assert.ok(html.includes('data-testid="quick-filter-contrast-pill"'));
		});

		it("proves 2D convolution filters preserves buffer dimensions", () => {
			const width = 10;
			const height = 10;
			const pixels = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < pixels.length; i += 4) {
				pixels[i] = 128;
				pixels[i + 1] = 128;
				pixels[i + 2] = 128;
				pixels[i + 3] = 255;
			}

			const sharpened = apply2DSpatialConvolution(pixels, width, height, UNSHARP_MASK_KERNEL_3X3);
			assert.equal(sharpened.length, pixels.length);
		});
	});

	describe("4. Calibrated 5 mm Ladder Scale Ruler", () => {
		it("renders vertical scale ruler component with physical grounding", () => {
			const html = renderToString(
				React.createElement(RadiologyCalibratedScaleRuler, {
					pixelPitchMicrons: 35.0,
					zoom: 1.0,
				}),
			);

			assert.ok(html.includes('data-testid="calibrated-scale-ruler-5mm"'));
			assert.ok(html.includes("mm"));
			assert.ok(html.includes("5"));
		});

		it("calculates exact pixel height for 5mm on EzSensor (35.0 µm)", () => {
			const px = calculateScaleRulerHeightPx(5.0, 35.0, 1.0);
			assert.equal(px, 142.86);
		});
	});

	describe("5. Form 043/u Protocol Integration & Measurements", () => {
		it("verifies applyRadiologyProtocolToForm043 formats clinical statement with tooth FDI", () => {
			let capturedStatement = "";
			const res = applyRadiologyProtocolToForm043({
				protocol: "Рентген-норма: периапикальные ткани без патологических изменений",
				options: { toothFdi: "16", modalityLabel: "RVG 2D" },
				onInsertToProtocol: (stmt) => {
					capturedStatement = stmt;
				},
				showNotification: false,
			});
			assert.ok(res.includes("[RVG 2D · область зубов: 16]"));
			assert.ok(res.includes("Рентген-норма"));
			assert.equal(capturedStatement, res);
		});

		it("verifies measurement tools: straight distance, curved canal working length, lesion contour", () => {
			const mmPerPixel = 0.035; // Vatech EzSensor 35 µm
			// 1. Straight distance
			const straightMm = calculatePhysicalDistanceMm({ x: 0, y: 0 }, { x: 100, y: 0 }, mmPerPixel);
			assert.equal(straightMm, 3.5);

			// 2. Curved canal polyline (3 points: 0,0 -> 30,40 -> 30,90: segments of 50px + 50px = 100px)
			const curvedMm = calculateCurvedCanalLengthMm(
				[{ x: 0, y: 0 }, { x: 30, y: 40 }, { x: 30, y: 90 }],
				mmPerPixel,
			);
			assert.equal(curvedMm, 3.5);

			// 3. Lesion area Gauss Shoelace (100x100 square: 10000 px² * 0.035² = 12.25 mm²)
			const lesionArea = calculateLesionAreaGaussMm2(
				[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
				mmPerPixel,
			);
			assert.equal(lesionArea, 12.25);
		});
	});
});
