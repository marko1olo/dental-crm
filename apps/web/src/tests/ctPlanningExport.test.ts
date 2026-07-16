import assert from "node:assert";
import { describe, test } from "node:test";
import { buildCtPlanningRuntimeTruthPolicy } from "../ctPlanningExport.js";
import type { DicomGpuRenderPlan, ImagingSourceKind } from "@dental/shared";

describe("buildCtPlanningRuntimeTruthPolicy", () => {
	const defaultRenderPlan: DicomGpuRenderPlan = {
		gpuClass: "integrated_ok",
		textureStrategy: "stack_2d_textures",
		qualityMode: "balanced_mpr",
		downsampleFactor: 1,
		targetSliceBatch: 4,
		maxTextureEdge: 2048,
		max3dTextureEdge: 512,
		estimatedGpuMemoryMb: 500,
		memoryBudgetClass: "standard",
		hardwareQualityWeight: 0.5,
		progressiveSliceWindowCap: 32,
		diagnosticPixelPolicy: "browser_preview_not_diagnostic",
		useWebWorker: true,
		useOffscreenCanvas: true,
		interactionBudgetMs: 16,
		firstPaintStrategy: "fast",
		warnings: [],
		nextAction: "",
	};

	test("handles null renderPlan and missing sourceKind", () => {
		const policy = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: null,
			sourceKind: null,
		});

		assert.strictEqual(policy.executionLane, "metadata_only_no_pixels");
		assert.strictEqual(policy.sourceMode, "server_or_uploaded_copy");
		assert.strictEqual(policy.hardwareQualityWeight, 0);
		assert.strictEqual(policy.progressiveSliceWindowCap, 1);
		assert.strictEqual(policy.targetSliceBatch, 1);
		assert.strictEqual(policy.memoryBudgetClass, "minimum");
		assert.strictEqual(policy.estimatedGpuMemoryMb, 0);
		assert.strictEqual(policy.diagnosticPixelPolicy, "metadata_only_no_pixels");
		assert.strictEqual(policy.containsDiagnosticPixels, false);
		assert.strictEqual(policy.containsMeshGeometry, false);
	});

	test("sourceMode remote_online_required for dicomweb/pacs", () => {
		const sources: ImagingSourceKind[] = ["dicomweb", "pacs"];
		for (const source of sources) {
			const policy = buildCtPlanningRuntimeTruthPolicy({
				renderPlan: null,
				sourceKind: source,
			});
			assert.strictEqual(policy.sourceMode, "remote_online_required", `failed for ${source}`);
		}
	});

	test("sourceMode local_offline_available for file/watch/twain/sensor", () => {
		const sources: ImagingSourceKind[] = [
			"dicom_file",
			"folder_watch",
			"twain_wia",
			"sensor_bridge",
		];
		for (const source of sources) {
			const policy = buildCtPlanningRuntimeTruthPolicy({
				renderPlan: null,
				sourceKind: source,
			});
			assert.strictEqual(policy.sourceMode, "local_offline_available", `failed for ${source}`);
		}
	});

	test("sourceMode server_or_uploaded_copy for manual_upload", () => {
		const policy = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: null,
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy.sourceMode, "server_or_uploaded_copy");
	});

	test("executionLane metadata_only_no_pixels when metadata strategy or policy", () => {
		const policy1 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, textureStrategy: "metadata_only" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy1.executionLane, "metadata_only_no_pixels");

		const policy2 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, diagnosticPixelPolicy: "metadata_only_no_pixels" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy2.executionLane, "metadata_only_no_pixels");
	});

	test("executionLane desktop_app_or_external_diagnostic when app review or external strategy", () => {
		const policy1 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, diagnosticPixelPolicy: "desktop_app_or_external_review" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy1.executionLane, "desktop_app_or_external_diagnostic");

		const policy2 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, textureStrategy: "external_viewer" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy2.executionLane, "desktop_app_or_external_diagnostic");
	});

	test("executionLane mobile_or_constrained_preview when hardware weight low or memory constrained", () => {
		const policy1 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, hardwareQualityWeight: 0.35 },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy1.executionLane, "mobile_or_constrained_preview");

		const policy2 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, memoryBudgetClass: "minimum" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy2.executionLane, "mobile_or_constrained_preview");

		const policy3 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, memoryBudgetClass: "constrained" },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy3.executionLane, "mobile_or_constrained_preview");
	});

	test("executionLane desktop_browser_planning_preview for standard/high capabilities", () => {
		const policy = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: {
				...defaultRenderPlan,
				hardwareQualityWeight: 0.8,
				memoryBudgetClass: "standard"
			},
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy.executionLane, "desktop_browser_planning_preview");
	});

	test("clamps runtime weights properly", () => {
		const policy1 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, hardwareQualityWeight: -0.5 },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy1.hardwareQualityWeight, 0);

		const policy2 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, hardwareQualityWeight: 1.5 },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy2.hardwareQualityWeight, 1);

		const policy3 = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: { ...defaultRenderPlan, hardwareQualityWeight: 0.5678 },
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy3.hardwareQualityWeight, 0.57);
	});

	test("caps targetSliceBatch based on progressiveSliceWindowCap", () => {
		const policy = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: {
				...defaultRenderPlan,
				progressiveSliceWindowCap: 4,
				targetSliceBatch: 8
			},
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy.progressiveSliceWindowCap, 4);
		assert.strictEqual(policy.targetSliceBatch, 4); // Capped at progressiveSliceWindowCap
	});

	test("handles negative estimatedGpuMemoryMb and 0 values", () => {
		const policy = buildCtPlanningRuntimeTruthPolicy({
			renderPlan: {
				...defaultRenderPlan,
				estimatedGpuMemoryMb: -100,
				targetSliceBatch: -10,
				progressiveSliceWindowCap: -5
			},
			sourceKind: "manual_upload",
		});
		assert.strictEqual(policy.estimatedGpuMemoryMb, 0);
		assert.strictEqual(policy.targetSliceBatch, 1); // Min 1
		assert.strictEqual(policy.progressiveSliceWindowCap, 1); // Min 1
	});
});
