/**
 * CBCT Comparison & Treatment Dynamics Test Suite
 *
 * Validates:
 * 1. Synchronized Slice scrolling with slice thickness compensation (Axial / Coronal / Sagittal)
 * 2. Pre-op vs Post-op Bone Gain Delta Analysis (Height, Width, % Gain, HU Density)
 * 3. Clinical Osteointegration vs Peri-implantitis Diagnostic classification
 * 4. 1-Click Form 043/u protocol generation matching exact clinical standard:
 *    «Прирост костной ткани в обл. 16 зуба: +4.2 мм. Имплантат остеоинтегрирован без периимплантита»
 * 5. Synchronous Pan & Zoom calculations
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateSliceIndexFromZ,
	calculateZCoordinateFromSlice,
	computeSynchronizedSliceIndices,
	calculateBoneDynamicsDelta,
	generateBoneDynamics043Protocol,
	applySynchronizedZoom,
	applySynchronizedPan,
	type StudySliceSeriesInfo,
	type BoneDimensionPoint,
} from "../cbctComparisonMath.js";

describe("CBCT Multi-Study Comparison & Treatment Dynamics Engine", () => {
	describe("1. Slice Coordinate Mapping & Thickness Synchronization", () => {
		it("converts discrete slice index to physical Z coordinate in millimeters", () => {
			assert.equal(calculateZCoordinateFromSlice(0, 0.5), 0.0);
			assert.equal(calculateZCoordinateFromSlice(10, 0.5), 5.0);
			assert.equal(calculateZCoordinateFromSlice(20, 1.0), 20.0);
			assert.equal(calculateZCoordinateFromSlice(30, 0.25), 7.5);
		});

		it("converts physical Z coordinate to discrete slice index with clamping", () => {
			// 300 slices of 0.5 mm = span 0..149.5 mm
			assert.equal(calculateSliceIndexFromZ(0.0, 0.5, 300), 0);
			assert.equal(calculateSliceIndexFromZ(5.0, 0.5, 300), 10);
			assert.equal(calculateSliceIndexFromZ(7.2, 0.5, 300), 14); // 7.2 / 0.5 = 14.4 -> 14
			assert.equal(calculateSliceIndexFromZ(7.3, 0.5, 300), 15); // 7.3 / 0.5 = 14.6 -> 15

			// Clamping at boundaries
			assert.equal(calculateSliceIndexFromZ(-10.0, 0.5, 300), 0);
			assert.equal(calculateSliceIndexFromZ(500.0, 0.5, 300), 299);
		});

		it("synchronizes slices when baseline and follow-up have identical thickness (1.0 mm)", () => {
			const baseline: StudySliceSeriesInfo = { sliceCount: 150, sliceThicknessMm: 1.0 };
			const followup: StudySliceSeriesInfo = { sliceCount: 150, sliceThicknessMm: 1.0 };

			const syncState = computeSynchronizedSliceIndices({
				currentZMm: 25.0,
				baseline,
				followup,
				scrollDeltaZMm: 5.0,
			});

			assert.equal(syncState.physicalZMm, 30.0);
			assert.equal(syncState.baselineIndex, 30);
			assert.equal(syncState.followupIndex, 30);
			assert.equal(syncState.baselineSliceThicknessMm, 1.0);
			assert.equal(syncState.followupSliceThicknessMm, 1.0);
		});

		it("synchronizes slices when studies have different slice thickness (0.5 mm vs 1.0 mm)", () => {
			// Baseline (Pre-op CBCT): high-res 0.5 mm slices (300 slices, span 149.5 mm)
			// Followup (Post-op CBCT): standard 1.0 mm slices (150 slices, span 149 mm)
			const baseline: StudySliceSeriesInfo = { sliceCount: 300, sliceThicknessMm: 0.5 };
			const followup: StudySliceSeriesInfo = { sliceCount: 150, sliceThicknessMm: 1.0 };

			// At Z = 20.0 mm: baseline should be slice 40, followup should be slice 20
			const at20 = computeSynchronizedSliceIndices({
				currentZMm: 20.0,
				baseline,
				followup,
			});

			assert.equal(at20.physicalZMm, 20.0);
			assert.equal(at20.baselineIndex, 40, "Slice index for 0.5mm at 20mm must be 40");
			assert.equal(at20.followupIndex, 20, "Slice index for 1.0mm at 20mm must be 20");

			// Scroll down by 2.0 mm (Z = 22.0 mm)
			const at22 = computeSynchronizedSliceIndices({
				currentZMm: 20.0,
				baseline,
				followup,
				scrollDeltaZMm: 2.0,
			});

			assert.equal(at22.physicalZMm, 22.0);
			assert.equal(at22.baselineIndex, 44);
			assert.equal(at22.followupIndex, 22);
		});

		it("handles non-integer thickness ratios (0.25 mm micro-CT vs 0.75 mm standard)", () => {
			const baseline: StudySliceSeriesInfo = { sliceCount: 400, sliceThicknessMm: 0.25 };
			const followup: StudySliceSeriesInfo = { sliceCount: 150, sliceThicknessMm: 0.75 };

			const state = computeSynchronizedSliceIndices({
				currentZMm: 15.0,
				baseline,
				followup,
			});

			assert.equal(state.physicalZMm, 15.0);
			assert.equal(state.baselineIndex, 60); // 15 / 0.25 = 60
			assert.equal(state.followupIndex, 20); // 15 / 0.75 = 20
		});
	});

	describe("2. Bone Gain Delta Analysis (Pre-Op vs Post-Op Dynamics)", () => {
		it("calculates positive bone gain and osteointegration (Pre=7.5mm -> Post=11.7mm, delta=+4.2mm)", () => {
			const baseline: BoneDimensionPoint = {
				heightMm: 7.5,
				widthMm: 5.0,
				densityHU: 420,
				measurementDate: "12.01.2024",
			};
			const followup: BoneDimensionPoint = {
				heightMm: 11.7,
				widthMm: 6.5,
				densityHU: 840,
				measurementDate: "15.07.2024",
			};

			const delta = calculateBoneDynamicsDelta({
				baseline,
				followup,
				toothFdi: 16,
				isImplantPlaced: true,
			});

			assert.equal(delta.toothFdi, "16");
			assert.equal(delta.deltaHeightMm, 4.2, "Expected +4.2mm bone height gain");
			assert.equal(delta.deltaWidthMm, 1.5, "Expected +1.5mm bone width gain");
			assert.equal(delta.deltaDensityHU, 420, "Expected +420 HU mineralization increase");
			assert.equal(delta.heightGainPercent, 56.0, "Expected 56.0% height gain");
			assert.equal(delta.dynamicsStatus, "positive_gain");
			assert.equal(delta.osteointegrationStatus, "osteointegrated");
			assert.equal(delta.isAdequateForLoading, true);

			// Verify clinical summary text contains exact required wording
			assert.ok(
				delta.clinicalSummaryRu.includes("Прирост костной ткани в обл. 16 зуба: +4.2 мм"),
				`Expected exact summary but got: ${delta.clinicalSummaryRu}`,
			);
			assert.ok(
				delta.clinicalSummaryRu.includes("Имплантат остеоинтегрирован без периимплантита"),
				`Expected osseointegration statement but got: ${delta.clinicalSummaryRu}`,
			);
		});

		it("detects marginal bone resorption and triggers periimplantitis alert", () => {
			const baseline: BoneDimensionPoint = {
				heightMm: 12.0,
				widthMm: 7.0,
				densityHU: 800,
			};
			const followup: BoneDimensionPoint = {
				heightMm: 9.5, // -2.5mm bone loss around implant neck
				widthMm: 6.0,
				densityHU: 650,
			};

			const delta = calculateBoneDynamicsDelta({
				baseline,
				followup,
				toothFdi: 36,
				isImplantPlaced: true,
			});

			assert.equal(delta.deltaHeightMm, -2.5);
			assert.equal(delta.dynamicsStatus, "resorption_alert");
			assert.equal(delta.osteointegrationStatus, "periimplantitis_risk");
			assert.ok(delta.clinicalSummaryRu.includes("краевая резорбция кости"));
			assert.ok(delta.clinicalSummaryRu.includes("Риск периимплантита"));
		});

		it("handles stable bone level without changes", () => {
			const baseline: BoneDimensionPoint = { heightMm: 11.0, widthMm: 6.5, densityHU: 750 };
			const followup: BoneDimensionPoint = { heightMm: 11.1, widthMm: 6.5, densityHU: 760 };

			const delta = calculateBoneDynamicsDelta({
				baseline,
				followup,
				toothFdi: 21,
				isImplantPlaced: true,
			});

			assert.equal(delta.deltaHeightMm, 0.1);
			assert.equal(delta.dynamicsStatus, "stable");
			assert.equal(delta.osteointegrationStatus, "osteointegrated");
		});
	});

	describe("3. 1-Click Form 043/u Protocol Generation", () => {
		it("generates compact protocol matching exact clinical requirement", () => {
			const delta = calculateBoneDynamicsDelta({
				baseline: { heightMm: 7.5, widthMm: 5.0, densityHU: 420 },
				followup: { heightMm: 11.7, widthMm: 6.5, densityHU: 840 },
				toothFdi: 16,
			});

			const compactNote = generateBoneDynamics043Protocol(delta, true);
			assert.equal(
				compactNote,
				"Прирост костной ткани в обл. 16 зуба: +4.2 мм. Имплантат остеоинтегрирован без периимплантита.",
			);
		});

		it("generates full detailed medical protocol statement for outpatient record", () => {
			const delta = calculateBoneDynamicsDelta({
				baseline: { heightMm: 7.5, widthMm: 5.0, densityHU: 420 },
				followup: { heightMm: 11.7, widthMm: 6.5, densityHU: 840 },
				toothFdi: 16,
			});

			const fullNote = generateBoneDynamics043Protocol(delta, false);
			assert.ok(fullNote.startsWith("Динамика КТ (сравнение До/После, зуб 16):"));
			assert.ok(fullNote.includes("высота гребня 7.5 -> 11.7 мм (+4.2 мм, +56%)"));
			assert.ok(fullNote.includes("ширина 5.0 -> 6.5 мм (+1.5 мм)"));
			assert.ok(fullNote.includes("минерализация регенерата 840 HU (дельта +420 HU)"));
			assert.ok(fullNote.includes("Имплантат остеоинтегрирован без периимплантита."));
		});
	});

	describe("4. Synchronous Zoom & Pan Calculations", () => {
		it("applies synchronized zoom factor and clamps to bounds", () => {
			const init = { zoom: 1.0, panX: 0, panY: 0 };
			const zoomedIn = applySynchronizedZoom(init, -100);
			assert.equal(zoomedIn.zoom, 1.15);

			const zoomedOut = applySynchronizedZoom(init, 100);
			assert.equal(zoomedOut.zoom, 0.87);

			// Upper clamp
			const maxClamped = applySynchronizedZoom({ zoom: 15.0, panX: 0, panY: 0 }, -100, 0.2, 16.0);
			assert.equal(maxClamped.zoom, 16.0);

			// Lower clamp
			const minClamped = applySynchronizedZoom({ zoom: 0.22, panX: 0, panY: 0 }, 100, 0.2, 16.0);
			assert.equal(minClamped.zoom, 0.2);
		});

		it("applies synchronized pan offset", () => {
			const start = { x: 50, y: -20 };
			const offset = applySynchronizedPan(start, { dx: 15, dy: 10 });
			assert.equal(offset.panX, 65);
			assert.equal(offset.panY, -10);
		});
	});
});
