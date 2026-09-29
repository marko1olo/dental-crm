/**
 * cornerstone3DVolume.test.ts
 *
 * Exhaustive unit test suite for FEAT-001: 3D Volume Rendering & 4th Quadrant Architecture
 * - 4th Viewport: ViewportType.VOLUME_3D with VIEWPORT_IDS.volume3d ("VOLUME_3D")
 * - 4th Quadrant Toggle / Tabs: "3D Объём (Volume 3D)" vs "Хирургический протокол" (Form 043/u)
 * - Volume 3D ToolGroup: TrackballRotateTool (LMB), ZoomTool (MMB), PanTool (RMB)
 * - Transfer Functions & Presets: Bone & Skull HU 150..2000 (DENTAL_SKULL_BONE_PRESET, CT-Bone, etc.)
 * - Camera Controls: Reset Camera, Orthogonal Angles (Coronal/Sagittal/Axial)
 * - Leak Protection: Complete unmount cleanup and ResizeObserver handling
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
	VIEWPORT_IDS,
	VOLUME_3D_PRESETS,
	DENTAL_SKULL_BONE_PRESET,
	applyVolume3DPreset,
	resetVolume3DCamera,
	setVolume3DOrientation,
	setupVolume3DToolGroup,
} from "../cornerstoneEngineHelper";
import {
	CornerstoneVolume3DViewport,
	CornerstoneMprViewports,
} from "../CornerstoneMprViewports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("FEAT-001: 3D Volume Rendering & 4th Quadrant Architect Test Suite", () => {
	// ─── 1. VIEWPORT_IDS CONSTANT & ENUM EXTENSION ────────────────────────────
	describe("1. VIEWPORT_IDS: volume3d Viewport ID Definition", () => {
		it("VIEWPORT_IDS exports volume3d: 'VOLUME_3D' alongside axial, sagittal, coronal", () => {
			assert.strictEqual(VIEWPORT_IDS.axial, "AXIAL");
			assert.strictEqual(VIEWPORT_IDS.sagittal, "SAGITTAL");
			assert.strictEqual(VIEWPORT_IDS.coronal, "CORONAL");
			assert.strictEqual(VIEWPORT_IDS.volume3d, "VOLUME_3D");
		});

		it("cornerstoneEngineHelper.ts re-exports augmented VIEWPORT_IDS with volume3d", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);
			assert.ok(
				source.includes('volume3d: "VOLUME_3D"'),
				"cornerstoneEngineHelper.ts must declare volume3d in VIEWPORT_IDS",
			);
		});
	});

	// ─── 2. 3D VOLUME TOOLGROUP CONFIGURATION ────────────────────────────────
	describe("2. setupVolume3DToolGroup: TrackballRotateTool, ZoomTool & PanTool", () => {
		it("setupVolume3DToolGroup registers TrackballRotateTool with Primary mouse button", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);
			assert.ok(
				source.includes("export function setupVolume3DToolGroup"),
				"Must export setupVolume3DToolGroup function",
			);
			assert.ok(
				source.includes("cornerstoneTools.TrackballRotateTool.toolName"),
				"Must add TrackballRotateTool to 3D volume tool group",
			);
			assert.ok(
				source.includes("mouseButton: cornerstoneTools.Enums.MouseBindings.Primary"),
				"TrackballRotateTool must bind to Primary mouse button for 3D rotation",
			);
		});

		it("setupVolume3DToolGroup registers ZoomTool (Auxiliary) and PanTool (Secondary)", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../cornerstoneEngineHelper.ts"),
				"utf-8",
			);
			assert.ok(
				source.includes("toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)"),
				"Must add ZoomTool to 3D volume tool group",
			);
			assert.ok(
				source.includes("toolGroup.addTool(cornerstoneTools.PanTool.toolName)"),
				"Must add PanTool to 3D volume tool group",
			);
			assert.ok(
				source.includes("toolGroup.addViewport(VIEWPORT_IDS.volume3d, renderingEngineId)"),
				"Must bind volume3d viewport to the 3D tool group",
			);
		});
	});

	// ─── 3. TRANSFER FUNCTIONS & 3D PRESETS (HU 150..2000) ───────────────────
	describe("3. Transfer Functions & Volume 3D Presets", () => {
		it("DENTAL_SKULL_BONE_PRESET defines calibrated bone & skull transfer function", () => {
			assert.strictEqual(DENTAL_SKULL_BONE_PRESET.name, "Dental-Skull-Bone");
			assert.ok(typeof DENTAL_SKULL_BONE_PRESET.scalarOpacity === "string");
			assert.ok(typeof DENTAL_SKULL_BONE_PRESET.colorTransfer === "string");

			// Check opacity string format: starts with number of values, HU 150 is transparent, 350-2000 is bone
			const opacityTokens = DENTAL_SKULL_BONE_PRESET.scalarOpacity.split(" ");
			assert.strictEqual(opacityTokens[0], "10", "Should declare 10 scalar opacity tokens (5 points)");
			// Air/soft tissue (<150 HU) has 0 opacity
			assert.ok(DENTAL_SKULL_BONE_PRESET.scalarOpacity.includes("150 0"), "HU 150 threshold has 0 opacity");
			assert.ok(DENTAL_SKULL_BONE_PRESET.scalarOpacity.includes("2000 0.85"), "HU 2000 cortical bone has high opacity");

			// Check color transfer: warm apricot/ivory for spongy bone, white for enamel/implants
			assert.ok(DENTAL_SKULL_BONE_PRESET.colorTransfer.includes("2000 1 1 1"), "Dense bone & implants map to bright white");
			assert.strictEqual(DENTAL_SKULL_BONE_PRESET.shade, "1", "Shading must be enabled for 3D depth perception");
		});

		it("VOLUME_3D_PRESETS catalog contains all required clinical volume presets", () => {
			assert.ok(Array.isArray(VOLUME_3D_PRESETS));
			assert.ok(VOLUME_3D_PRESETS.length >= 4, "Should offer at least 4 presets");

			const presetIds = VOLUME_3D_PRESETS.map((p) => p.id);
			assert.ok(presetIds.includes("bone"), "Must contain bone (CT-Bone) preset");
			assert.ok(presetIds.includes("skull_jaw"), "Must contain maxillofacial skull/jaw preset");
			assert.ok(presetIds.includes("dense_bone"), "Must contain dense bone (CT-Bones) preset");
			assert.ok(presetIds.includes("airway"), "Must contain airway (CT-Air) preset");

			for (const p of VOLUME_3D_PRESETS) {
				assert.ok(p.label && p.label.length > 0, `Preset ${p.id} must have a non-empty label`);
				assert.ok(p.huRange && p.huRange.includes("HU"), `Preset ${p.id} must specify HU range`);
			}
		});

		it("applyVolume3DPreset safely applies preset and triggers render", () => {
			let propertiesApplied: any = null;
			let renderCalled = false;

			const mockViewport = {
				setProperties: (props: any) => {
					propertiesApplied = props;
				},
				render: () => {
					renderCalled = true;
				},
			};

			const success = applyVolume3DPreset(mockViewport, "CT-Bone");
			assert.strictEqual(success, true);
			assert.deepStrictEqual(propertiesApplied, { preset: "CT-Bone" });
			assert.strictEqual(renderCalled, true);
		});

		it("applyVolume3DPreset gracefully returns false when viewport is null or invalid", () => {
			assert.strictEqual(applyVolume3DPreset(null, "CT-Bone"), false);
			assert.strictEqual(applyVolume3DPreset({}, "CT-Bone"), false);
		});
	});

	// ─── 4. CAMERA CONTROLS & ORIENTATION HELPERS ────────────────────────────
	describe("4. 3D Camera Controls: Reset Camera & Orientation", () => {
		it("resetVolume3DCamera resets camera parameters with pan, zoom and center reset", () => {
			let resetParams: any = null;
			let renderCalled = false;

			const mockViewport = {
				resetCamera: (opts: any) => {
					resetParams = opts;
					return true;
				},
				render: () => {
					renderCalled = true;
				},
			};

			const success = resetVolume3DCamera(mockViewport);
			assert.strictEqual(success, true);
			assert.deepStrictEqual(resetParams, { resetPan: true, resetZoom: true, resetToCenter: true });
			assert.strictEqual(renderCalled, true);
		});

		it("setVolume3DOrientation applies coronal, sagittal, and axial angles", () => {
			const appliedOrientations: string[] = [];

			const mockViewport = {
				applyViewOrientation: (orientation: string) => {
					appliedOrientations.push(orientation);
				},
				render: () => {},
			};

			assert.strictEqual(setVolume3DOrientation(mockViewport, "coronal"), true);
			assert.strictEqual(setVolume3DOrientation(mockViewport, "sagittal"), true);
			assert.strictEqual(setVolume3DOrientation(mockViewport, "axial"), true);

			assert.strictEqual(appliedOrientations.length, 3);
			assert.strictEqual(appliedOrientations[0], "coronal");
			assert.strictEqual(appliedOrientations[1], "sagittal");
			assert.strictEqual(appliedOrientations[2], "axial");
		});
	});

	// ─── 5. CORNERSTONE MPR VIEWPORTS & CORNERSTONE VOLUME 3D VIEWPORT ────────
	describe("5. CornerstoneMprViewports & CornerstoneVolume3DViewport Components", () => {
		it("CornerstoneMprViewports.tsx exports CornerstoneVolume3DViewport", () => {
			assert.ok(typeof CornerstoneVolume3DViewport === "function");
			assert.ok(typeof CornerstoneMprViewports === "function");
		});

		it("CornerstoneMprViewports.tsx includes 3D Volume badge, controls and canvas", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../CornerstoneMprViewports.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("3D ОБЪЁМ (VOLUME 3D)"),
				"Must render 3D Volume badge in uppercase with accent styling",
			);
			assert.ok(
				source.includes('data-testid="cornerstone-volume-3d-viewport"'),
				"Must have data-testid for the 3D volume viewport wrapper",
			);
			assert.ok(
				source.includes("Вращение 3D: ЛКМ (Trackball)"),
				"Must display user interaction hint for Trackball rotation",
			);
			assert.ok(
				source.includes("volume3dRef"),
				"Must support volume3dRef in viewport props",
			);
		});
	});

	// ─── 6. CORNERSTONE PLANNING QUADRANT HEADER DEDUPLICATION ────────────────
	describe("6. CornerstonePlanningQuadrant: showInternalHeader support", () => {
		it("CornerstonePlanningQuadrant.tsx supports showInternalHeader prop", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../CornerstonePlanningQuadrant.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("showInternalHeader?: boolean"),
				"Must declare showInternalHeader in CornerstonePlanningQuadrantProps",
			);
			assert.ok(
				source.includes("{showInternalHeader && ("),
				"Must conditionally render internal header when showInternalHeader is true",
			);
		});
	});

	// ─── 7. CORNERSTONE 3D VIEWER: ROMEXIS 4-VIEWPORT GRID INTEGRATION ─────────
	describe("7. Cornerstone3DViewer: ViewportType.VOLUME_3D & Romexis 4-Viewport Grid", () => {
		it("Cornerstone3DViewer.tsx registers ViewportType.VOLUME_3D in viewportInputArray", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("cornerstone.Enums.ViewportType.VOLUME_3D"),
				"Must register 4th viewport with ViewportType.VOLUME_3D",
			);
			assert.ok(
				source.includes("viewportId: VIEWPORT_IDS.volume3d"),
				"Must use VIEWPORT_IDS.volume3d for the 4th viewport",
			);
		});

		it("Cornerstone3DViewer.tsx registers TrackballRotateTool in toolsToAdd", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("cornerstoneTools.TrackballRotateTool"),
				"Must add TrackballRotateTool to toolsToAdd array",
			);
		});

		it("Cornerstone3DViewer.tsx strictly evicts tablist and tab buttons (No tabs in 4th quadrant)", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.strictEqual(
				source.includes('data-testid="quadrant-tab-volume3d"'),
				false,
				"Must NOT contain quadrant-tab-volume3d button",
			);
			assert.strictEqual(
				source.includes('data-testid="quadrant-tab-planning"'),
				false,
				"Must NOT contain quadrant-tab-planning button",
			);
			assert.strictEqual(
				source.includes('role="tablist"'),
				false,
				"Must NOT contain tablist role in 4th quadrant",
			);
			assert.strictEqual(
				source.includes("activeQuadrantTab"),
				false,
				"Must NOT have activeQuadrantTab state",
			);
			assert.strictEqual(
				source.includes("<CornerstonePlanningQuadrant"),
				false,
				"Must NOT render CornerstonePlanningQuadrant in the 4th quadrant of MPR",
			);
		});

		it("Cornerstone3DViewer.tsx unconditionally renders CornerstoneVolume3DViewport in the 4th quadrant", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("<CornerstoneVolume3DViewport"),
				"Must unconditionally render CornerstoneVolume3DViewport",
			);
			assert.ok(
				source.includes("volume3dRef={volume3dRef}"),
				"Must bind volume3dRef to CornerstoneVolume3DViewport",
			);
		});

		it("Cornerstone3DViewer.tsx sets volumes for viewports including volume3d", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("viewportsToSet.push(VIEWPORT_IDS.volume3d)"),
				"Must include VIEWPORT_IDS.volume3d in setVolumesForViewports",
			);
			assert.ok(
				source.includes("setupVolume3DToolGroup(volume3dToolGroupIdRef.current, renderingEngineId)"),
				"Must initialize volume3d tool group",
			);
		});

		it("Cornerstone3DViewer.tsx cleans up volume3d tool group and canvases on unmount", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("destroyToolGroup(volume3dToolGroupIdRef.current)"),
				"Must destroy volume3d tool group on unmount",
			);
			assert.ok(
				source.includes("teardownViewportCanvases(volume3dRef.current)"),
				"Must teardown volume3d canvas to prevent WebGL context leaks",
			);
		});

		it("Cornerstone3DViewer.tsx includes window resize and ResizeObserver handling", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../Cornerstone3DViewer.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("renderingEngine.resize()"),
				"Must call renderingEngine.resize() on window/container resize",
			);
			assert.ok(
				source.includes("ResizeObserver"),
				"Must attach ResizeObserver to prevent canvas aspect ratio distortion",
			);
		});
	});
});
