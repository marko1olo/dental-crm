import assert from "node:assert";
import { describe, test } from "node:test";
import { buildCtPlanningExportPacket } from "../ctPlanningExport.js";
import type { DicomViewerToolStateBundleResponse } from "@dental/shared";
import type { CtPlanningGeometrySummary } from "../utils/math/toothGeometry.js";
import type { CtPlanningValidationSummary } from "../ctPlanningValidation.js";
import type { CtPlanningMeasurementPlan } from "../ctPlanningMeasurementPlan.js";
import type { CtPlanningImplantModelPlan } from "../ctPlanningImplantModel.js";
import type { CtPlanningReconstructionPlan } from "../ctPlanningReconstruction.js";

function makeDefaultInput() {
	return {
		toolStateBundle: {
			renderPlan: {
				hardwareQualityWeight: 1,
				progressiveSliceWindowCap: 10,
				targetSliceBatch: 5,
				memoryBudgetClass: "maximum" as const,
				estimatedGpuMemoryMb: 500,
				textureStrategy: "full_volume" as const,
				diagnosticPixelPolicy: "desktop_app_or_external_review" as const,
			},
			seriesRef: {
				id: "s1",
				studyId: "st1",
				patientId: "p1",
				sourceKind: "dicomweb" as const,
			},
			viewports: [],
		} as unknown as DicomViewerToolStateBundleResponse,
		activeQuickActionId: null,
		geometrySummary: {
			areaCount: 1,
			volumeCount: 0,
			minimumClearanceMm: null,
		} as unknown as CtPlanningGeometrySummary,
		validationSummary: {
			status: "pass" as const,
			score: 100,
			label: "All checks passed",
			checks: [],
		} as unknown as CtPlanningValidationSummary,
		readinessScore: 100,
		totalTasks: 10,
		blockedTasks: 0,
		volumeBlockedTasks: 0,
		unsavedArtifactCount: 0,
		measurementPlan: {
			status: "ready" as const,
			cards: [],
			readyCardCount: 1,
			summaryLabel: "Measurements ready",
			roiVolumeTotalLabel: "0",
			roiAreaTotalLabel: "0",
			roiVolumeSlabMm: 0,
			roiDraftCount: 0,
			densityValueCount: 0,
			densityRangeLabel: "0",
			densityProbeCount: 0,
			densityProtocolLabel: "Standard",
		} as unknown as CtPlanningMeasurementPlan,
		implantModelPlan: {
			status: "ready" as const,
			implantDiameterMm: 4.0,
			implantLengthMm: 10.0,
			sleeveDiameterMm: 5.0,
			sleeveLengthMm: 6.0,
			axisLengthMm: 15.0,
			hasGuideRoute: true,
			hasAxis: true,
			guideReady: true,
			guideRouteLengthMm: 20.0,
		} as unknown as CtPlanningImplantModelPlan,
		reconstructionPlan: {
			status: "ready" as const,
			crossSectionCount: 50,
			crossSectionRequiredCount: 50,
			crossSectionCoveragePercent: 100,
			crossSectionStationPreview: "Preview",
			curvePointCount: 10,
			curveLengthMm: 50.0,
		} as unknown as CtPlanningReconstructionPlan,
		hasImplantPlan: true,
		hasPanoramicRoute: true,
		hasCanalRoute: true,
		hasGuideRoute: true,
	};
}

describe("buildCtPlanningExportPacket", () => {
	test("returns ready status with default valid input", () => {
		const input = makeDefaultInput();
		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.status, "ready");
		assert.strictEqual(result.volumeReady, true);
		assert.strictEqual(result.missingArtifacts.length, 0);
	});

	test("returns blocked status when validation is blocked", () => {
		const input = makeDefaultInput();
		input.validationSummary.status = "fail";

		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.status, "blocked");
	});

	test("returns warning status when unsavedArtifactCount > 0", () => {
		const input = makeDefaultInput();
		input.unsavedArtifactCount = 5;

		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.status, "warning");
		assert.ok(result.missingArtifacts.some((a) => a.includes("5 элементов")));
	});

	test("missing artifacts populated correctly when empty input", () => {
		const input = makeDefaultInput();
		input.toolStateBundle = null as unknown as DicomViewerToolStateBundleResponse;
		input.hasPanoramicRoute = false;
		input.hasCanalRoute = false;
		input.hasImplantPlan = false;
		input.implantModelPlan.status = "draft";
		input.implantModelPlan.guideReady = false;
		input.reconstructionPlan.status = "draft";

		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.status, "blocked"); // since toolStateBundle is null -> transferPartial is false -> blocked
		assert.ok(result.missingArtifacts.includes("состояние просмотрщика"));
		assert.ok(result.missingArtifacts.includes("ОПТГ-дуга и поперечные срезы"));
		assert.ok(result.missingArtifacts.includes("трасса нижнечелюстного канала"));
		assert.ok(result.missingArtifacts.includes("типоразмер импланта"));
	});

	test("lanes are correctly built for full ready plan", () => {
	    const input = makeDefaultInput();
		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.lanes.length, 5);
		assert.strictEqual(result.lanes[0]?.status, "ready"); // doctor-check
		assert.strictEqual(result.lanes[1]?.status, "ready"); // measurements readyCardCount=0 -> ready when fixed
		assert.strictEqual(result.lanes[2]?.status, "ready"); // opg-canal
		assert.strictEqual(result.lanes[3]?.status, "ready"); // admin-transfer
		assert.strictEqual(result.lanes[4]?.status, "ready"); // lab-handoff
	});

    test("clinical facts are correctly built", () => {
		const input = makeDefaultInput();
		const result = buildCtPlanningExportPacket(input);

		assert.strictEqual(result.clinicalFacts.length, 5);
		assert.strictEqual(result.clinicalFacts[0]?.id, "implant");
		assert.strictEqual(result.clinicalFacts[1]?.id, "opg-coverage");
		assert.strictEqual(result.clinicalFacts[2]?.id, "roi");
		assert.strictEqual(result.clinicalFacts[3]?.id, "density");
		assert.strictEqual(result.clinicalFacts[4]?.id, "canal-guide");
	});
});
