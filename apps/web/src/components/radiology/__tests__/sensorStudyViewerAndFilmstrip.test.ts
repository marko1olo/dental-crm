import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	EMBOSS_45_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	TOOTH_ANATOMICAL_NAMES,
	UNSHARP_MASK_KERNEL_3X3,
	apply2DSpatialConvolution,
	calculateDapDose,
	calculateScaleRulerHeightPx,
	formatRadiationDap,
} from "../dentalViewerMath.js";
import { formatFilmstripDateTime, getModalityBadge } from "../RadiologyFilmstripDock.js";
import { DEFAULT_QUICK_FILTERS_STATE } from "../RadiologyQuickFiltersPanel.js";
import { SensorStudyViewer } from "../SensorStudyViewer.js";
import { DicomViewerModal } from "../../imaging/DicomViewerModal.js";

describe("EzDent-i 2D X-Ray & VisioGraphy Workstation — Clean Architecture & Ergonomics", () => {
	describe("Filmstrip Dock Ergonomics & Metadata Formatting", () => {
		it("formats ISO date and time into clean human-readable clinical strings", () => {
			const res = formatFilmstripDateTime("2026-09-20T09:14:20.000Z");
			assert.ok(res.dateStr.includes("2026"));
			assert.ok(res.timeStr.length > 0);
		});

		it("preserves pre-formatted DD.MM.YYYY HH:mm:ss and handles empty strings", () => {
			assert.deepEqual(formatFilmstripDateTime("20.09.2026 09:14:20"), { dateStr: "20.09.2026", timeStr: "09:14:20" });
			assert.deepEqual(formatFilmstripDateTime(""), { dateStr: "—", timeStr: "—" });
		});

		it("assigns clinical modality badges matching EzDent-i color themes", () => {
			assert.equal(getModalityBadge("intraoral_rvg").label, "IO-СЕНСОР");
			assert.equal(getModalityBadge("optg_panoramic").label, "ПАНОРАМА");
			assert.equal(getModalityBadge("cbct_3d").label, "КЛКТ 3D");
			assert.equal(getModalityBadge("trg_ceph").label, "ТРГ");
		});
	});

	describe("1-Click Quick Filter Toggles", () => {
		it("initializes with all quick filters disabled by default and verifies 3x3 kernels", () => {
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.sharpness, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.maxSharpness, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.invert, false);
			assert.equal(DEFAULT_QUICK_FILTERS_STATE.pseudoRelief, false);
			assert.equal(UNSHARP_MASK_KERNEL_3X3.reduce((a, b) => a + b, 0), 1);
			assert.equal(HIGH_BOOST_KERNEL_3X3.reduce((a, b) => a + b, 0), 1);
			assert.equal(EMBOSS_45_KERNEL_3X3[0], -2);
		});

		it("applies 2D spatial convolution without NaN, preserving RGBA channels", () => {
			const src = new Uint8ClampedArray(4 * 4 * 4);
			for (let i = 0; i < src.length; i += 4) {
				src[i] = 100;
				src[i + 1] = 100;
				src[i + 2] = 100;
				src[i + 3] = 255;
			}
			const centerIdx = 5 * 4;
			src[centerIdx] = 240;
			src[centerIdx + 1] = 240;
			src[centerIdx + 2] = 240;
			const filtered = apply2DSpatialConvolution(src, 4, 4, UNSHARP_MASK_KERNEL_3X3);
			assert.equal(filtered.length, src.length);
			assert.ok((filtered[centerIdx] ?? 0) >= 240);
			assert.equal(filtered[centerIdx + 3], 255);
		});
	});

	describe("Vertical 5 mm Calibrated Ladder Scale Ruler & Dosimetry", () => {
		it("calculates exact rendered pixel height for 5 mm across EzSensor resolutions & zoom", () => {
			assert.equal(calculateScaleRulerHeightPx(5.0, 35.0, 1.0), 142.86);
			assert.equal(calculateScaleRulerHeightPx(5.0, 14.8, 1.0), 337.84);
			assert.ok(Math.abs(calculateScaleRulerHeightPx(5.0, 35.0, 2.0) - calculateScaleRulerHeightPx(5.0, 35.0, 1.0) * 2) < 0.05);
			assert.equal(calculateScaleRulerHeightPx(0, 35.0, 1.0), 0);
		});

		it("resolves tooth names and calculates/formats DAP safely", () => {
			assert.equal(TOOTH_ANATOMICAL_NAMES["16"], "Первый моляр ВЧ справа");
			const dap = calculateDapDose(65, 7.0, 0.08, 12.5);
			assert.ok(dap > 0.015 && dap < 0.035);
			assert.equal(formatRadiationDap(0.024), "0,024 dGy*Cm^2[DAP]");
			assert.equal(calculateDapDose(0, 0, 0), 0.0);
		});
	});

	describe("Runtime Viewer Layout Verification (Window 1 & Fullscreen)", () => {
		it("SensorStudyViewer renders toolbar, filmstrip dock, calibrated ruler and DicomViewerModal wires Studio", () => {
			const viewerHtml = renderToString(
				React.createElement(SensorStudyViewer, {
					initialImageUrl: "/radiology/sample_rvg_tooth16.jpg",
					patientName: "Тест Пациент",
					toothFdiCode: "16",
					studiesHistory: [
						{
							id: "st-1",
							title: "RVG 16",
							modality: "intraoral_rvg",
							modalityLabel: "IO-СЕНСОР",
							studyDate: "2026-10-02",
							teethFdi: ["16"],
							imageUrl: "/radiology/sample_rvg_tooth16.jpg",
							thumbnailUrl: "/radiology/sample_rvg_tooth16.jpg",
						},
					],
				}),
			);

			assert.ok(viewerHtml.includes("sensor-viewer-top-toolbar"));
			assert.ok(viewerHtml.includes('data-testid="radiology-filmstrip-dock"'));
			assert.ok(viewerHtml.includes('data-testid="calibrated-scale-ruler-5mm"'));
			assert.equal(viewerHtml.includes("voltageKv"), false);

			const dicomHtml = renderToString(
				React.createElement(DicomViewerModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Тест Пациент",
				}),
			);
			assert.ok(dicomHtml.includes("btn-dicom-run-ai") || dicomHtml.includes("btn-dicom-norma-043"));
		});
	});
});
