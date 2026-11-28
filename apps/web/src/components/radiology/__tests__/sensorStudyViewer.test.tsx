/**
 * sensorStudyViewer.test.tsx
 * Runtime Behavioral Test Suite for SensorStudyViewer & Clinical Cockpit.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	UNSHARP_MASK_KERNEL_3X3,
	apply2DSpatialConvolution,
	calculateCurvedCanalLengthMm,
	calculateLesionAreaGaussMm2,
	calculatePhysicalDistanceMm,
	calculateScaleRulerHeightPx,
} from "../dentalViewerMath.js";
import { applyRadiologyProtocolToForm043 } from "../radiologyProtocols.js";
import {
	formatFilmstripDateTime,
	RadiologyFilmstripDock,
} from "../RadiologyFilmstripDock.js";
import {
	DEFAULT_QUICK_FILTERS_STATE,
	RadiologyQuickFiltersPanel,
} from "../RadiologyQuickFiltersPanel.js";
import { RadiologyClinicalHud } from "../RadiologyClinicalHud.js";
import { RadiologyCalibratedScaleRuler } from "../RadiologyCalibratedScaleRuler.js";
import { SensorStudyViewer } from "../SensorStudyViewer.js";

describe("EzDent-i SensorStudyViewer & Clinical Cockpit", () => {
	describe("1. Total Purge of Physics Clutter & Clean Clinical HUD", () => {
		it("renders RadiologyClinicalHud & SensorStudyViewer with zero kV, mA, or manual exposure inputs", () => {
			const hudHtml = renderToString(
				React.createElement(RadiologyClinicalHud, {
					patientName: "Алексеев П.С.",
					medicalCardNumber: "ЭМК №2026-102",
					studyDate: "02.10.2026 14:15:00",
					toothFdi: "16",
				}),
			);

			assert.ok(hudHtml.includes("Алексеев П.С."));
			assert.ok(hudHtml.includes("ЭМК №2026-102"));
			assert.ok(hudHtml.includes('data-testid="hud-tooth-fdi"'));
			assert.ok(hudHtml.includes("16"));
			assert.ok(hudHtml.includes("Режим (Зуб FDI)"));
			assert.equal(hudHtml.includes("напряжение на трубке"), false);
			assert.equal(hudHtml.includes("exposureSec"), false);

			const viewerHtml = renderToString(
				React.createElement(SensorStudyViewer, {
					imageUrl: "/radiology/sample_rvg_tooth16.jpg",
					patientName: "Алексеев П.С.",
					toothFdi: "16",
				}),
			);
			assert.equal(viewerHtml.includes('data-testid="rvg-exposure-select"'), false);
			assert.ok(viewerHtml.includes("sensor-viewer-top-toolbar"));
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

		it("proves 2D convolution filters preserve buffer dimensions", () => {
			const pixels = new Uint8ClampedArray(10 * 10 * 4).fill(128);
			const sharpened = apply2DSpatialConvolution(pixels, 10, 10, UNSHARP_MASK_KERNEL_3X3);
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
			assert.equal(calculateScaleRulerHeightPx(5.0, 35.0, 1.0), 142.86);
		});
	});

	describe("5. Clinical Protocol Integration & Measurements", () => {
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
			const mmPerPixel = 0.035;
			assert.equal(calculatePhysicalDistanceMm({ x: 0, y: 0 }, { x: 100, y: 0 }, mmPerPixel), 3.5);
			assert.equal(calculateCurvedCanalLengthMm([{ x: 0, y: 0 }, { x: 30, y: 40 }, { x: 30, y: 90 }], mmPerPixel), 3.5);
			assert.equal(
				calculateLesionAreaGaussMm2(
					[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
					mmPerPixel,
				),
				12.25,
			);
		});
	});
});
