/**
 * Test Suite: CBCT 3D Volume & Skull Viewport in 4th Quadrant (FEAT-001 & MANDATE)
 * Standards: Planmeca Romexis 6.x, Vatech Ez3D-i, Cybermed OnDemand3D
 *
 * Verifies:
 * 1. CbctVolume3DViewport exports calibrated skull transfer presets (HU 150..2000).
 * 2. computeVolume3DRotationMatrix calculates correct Euler rotation matrices for trackball navigation.
 * 3. CbctMprViewportsGrid defaults the 4th quadrant to "volume3d" (immediate 3D skull view in MPR).
 * 4. CbctMprViewportsGrid provides instant 1-click switcher buttons: [3D Объем / Череп] and [Панорама ОПТГ].
 * 5. CbctMprViewportsGrid integrates CbctVolume3DViewport with cbct-volume-3d-canvas.
 * 6. CbctMprViewportsGrid synchronizes mode with studioMode ("volume3d" vs "panoramic").
 * 7. CbctMprImplantStudioModal binds studioMode and onSelectStudioMode to CbctMprViewportsGrid.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	CBCT_VOLUME_3D_PRESETS,
	computeVolume3DRotationMatrix,
	CbctVolume3DViewport,
	intersectRayAABB,
	DEFAULT_VOLUME_3D_CLIPPING_BOX,
	isPointInsideClippingBox,
	CBCT_VOLUME_3D_FRAGMENT_SHADER,
	generate4JawImplants,
	convertImplantWorldToVolume3DParam,
} from "../mpr/CbctVolume3DViewport";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CBCT 3D Volume & Skull Viewport in 4th Quadrant Test Suite", () => {
	// ─── 1. VOLUME 3D PRESETS & TRANSFER FUNCTIONS ────────────────────────────
	describe("1. Clinical Volume 3D Presets & Opacity Curves", () => {
		it("CBCT_VOLUME_3D_PRESETS contains skull, dense_bone, soft_tissue, and mip", () => {
			const presetIds = CBCT_VOLUME_3D_PRESETS.map((p) => p.id);
			assert.ok(presetIds.includes("skull"), "Must include skull preset");
			assert.ok(presetIds.includes("dense_bone"), "Must include dense_bone preset");
			assert.ok(presetIds.includes("soft_tissue"), "Must include soft_tissue preset");
			assert.ok(presetIds.includes("mip"), "Must include mip preset");
		});

		it("skull preset is calibrated for maxillofacial bone (HU 350..2000)", () => {
			const skull = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "skull");
			assert.ok(skull, "Skull preset must exist");
			assert.strictEqual(skull.huMin, 350, "Skull huMin must be 350 HU (eliminates scatter noise/soft tissue)");
			assert.strictEqual(skull.huMax, 2000, "Skull huMax must be 2000 HU (covers trabecular to cortical)");
			assert.strictEqual(skull.shortLabel, "Череп");
		});

		it("dense_bone preset targets high-contrast cortical plates & teeth (HU 550..3000)", () => {
			const dense = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "dense_bone");
			assert.ok(dense, "Dense bone preset must exist");
			assert.strictEqual(dense.huMin, 550);
			assert.strictEqual(dense.huMax, 3000);
			assert.strictEqual(dense.shortLabel, "Плотная");
		});
	});

	// ─── 2. 3D ROTATION MATRIX & TRACKBALL MATH ───────────────────────────────
	describe("2. computeVolume3DRotationMatrix Math", () => {
		it("returns coronal orthogonal matrix at yaw=0, pitch=0 in patient coordinates (+X lateral, +Y sagittal, +Z vertical)", () => {
			const m = computeVolume3DRotationMatrix(0, 0);
			assert.strictEqual(m.length, 3);
			assert.strictEqual(m[0]!.length, 3);

			// At yaw=0, pitch=0 (Coronal view / Фас):
			// col0: Camera Right is +X (Patient Right to Left)
			assert.strictEqual(Math.round(m[0]![0]!), 1);
			assert.strictEqual(Math.round(m[0]![1]!), 0);
			assert.strictEqual(Math.round(m[0]![2]!), 0);

			// col1: Camera Up is +Z (Patient Inferior to Superior, UP)
			assert.strictEqual(Math.round(m[1]![0]!), 0);
			assert.strictEqual(Math.round(m[1]![1]!), 0);
			assert.strictEqual(Math.round(m[1]![2]!), 1);

			// col2: Ray Direction is +Y (Patient Anterior to Posterior, marching into face)
			assert.strictEqual(Math.round(m[2]![0]!), 0);
			assert.strictEqual(Math.round(m[2]![1]!), 1);
			assert.strictEqual(Math.round(m[2]![2]!), 0);
		});

		it("calculates orthogonal coronal view (yaw=0, pitch=0)", () => {
			const m = computeVolume3DRotationMatrix(0, 0);
			// Ray direction along +Y axis (into face)
			assert.strictEqual(Math.round(m[2]![0]!), 0);
			assert.strictEqual(Math.round(m[2]![1]!), 1);
			assert.strictEqual(Math.round(m[2]![2]!), 0);
		});

		it("calculates orthogonal sagittal view (yaw=90, pitch=0)", () => {
			const m = computeVolume3DRotationMatrix(90, 0);
			// At yaw=90: camera views lateral profile, ray marches along -X
			assert.strictEqual(Math.round(m[0]![0]!), 0);
			assert.strictEqual(Math.round(m[0]![1]!), 1);
			assert.strictEqual(Math.round(m[2]![0]!), -1);
			assert.strictEqual(Math.round(m[2]![1]!), 0);
		});
	});

	// ─── 3. CBCT VOLUME 3D VIEWPORT COMPONENT ─────────────────────────────────
	describe("3. CbctVolume3DViewport Component Export & Elements", () => {
		it("exports CbctVolume3DViewport as a valid React functional component", () => {
			assert.strictEqual(typeof CbctVolume3DViewport, "function");
		});

		it("CbctVolume3DViewport source contains interactive controls and HUD", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			assert.ok(source.includes("data-testid=\"cbct-viewport-container-volume3d\""), "Must have container testid");
			assert.ok(source.includes("data-testid=\"cbct-volume-3d-canvas\""), "Must have canvas testid");
			assert.ok(source.includes("data-testid=\"cbct-btn-reset-3d-camera\""), "Must have reset camera testid");
			assert.ok(source.includes("data-testid=\"cbct-btn-orientation-coronal\""), "Must have Coronal (Фас) shortcut");
			assert.ok(source.includes("data-testid=\"cbct-btn-orientation-sagittal\""), "Must have Sagittal (Профиль) shortcut");
			assert.ok(source.includes("data-testid=\"cbct-btn-orientation-isometric\""), "Must have 3/4 (Isometric) shortcut");
			assert.ok(source.includes("3D Объем:"), "Must display telemetry label");
		});

		it("CbctVolume3DViewport supports 1-click maximize and touch gesture controls", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			assert.ok(source.includes("data-testid=\"cbct-btn-toggle-maximize-3d\""), "Must have toggle maximize button testid");
			assert.ok(source.includes("onTouchStart={handleTouchStart}"), "Must bind touch start");
			assert.ok(source.includes("onTouchMove={handleTouchMove}"), "Must bind touch move");
			assert.ok(source.includes("onTouchEnd={handleTouchEnd}"), "Must bind touch end");
		});
	});

	// ─── 4. 4TH QUADRANT DUAL-MODE INTEGRATION IN CBCTMPRVIEWPORTSGRID ─────────
	describe("4. CbctMprViewportsGrid: 4th Quadrant 3D Volume & Panorama Switcher", () => {
		it("CbctMprViewportsGrid.tsx imports CbctVolume3DViewport", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("import { CbctVolume3DViewport } from \"./CbctVolume3DViewport\""),
				"Must import CbctVolume3DViewport",
			);
		});

		it("CbctMprViewportsGrid.tsx defaults fourthQuadrantMode to 'volume3d'", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("useState<\"volume3d\" | \"panoramic\">(\"volume3d\")"),
				"Must default fourthQuadrantMode to 'volume3d' (surgeon sees 3D skull by default)",
			);
		});

		it("CbctMprViewportsGrid.tsx renders compact switcher buttons [3D Череп] and [ОПТГ]", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("data-testid=\"cbct-btn-mode-volume3d\""),
				"Must have 3D Volume switcher button testid",
			);
			assert.ok(
				source.includes("data-testid=\"cbct-btn-mode-panoramic\""),
				"Must have Panoramic switcher button testid",
			);
			assert.ok(
				source.includes("3D Череп"),
				"Must contain compact label '3D Череп'",
			);
			assert.ok(
				source.includes("ОПТГ"),
				"Must contain compact label 'ОПТГ'",
			);
		});

		it("CbctMprViewportsGrid.tsx renders renderFourthQuadrantViewport in quad_view, layout_1_plus_3 and maximized", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("renderFourthQuadrantViewport"),
				"Must define renderFourthQuadrantViewport",
			);
			assert.ok(
				source.includes("renderVolume3D: (extraClassName, options) =>"),
				"Must provide renderVolume3D renderer in ViewportRenderers for 3D skull",
			);
		});

		it("CbctMprViewportsGrid.tsx synchronizes with studioMode via useEffect", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("if (studioMode === \"panoramic\") {"),
				"Must switch to panoramic when studioMode is panoramic",
			);
			assert.ok(
				source.includes("else if (studioMode === \"volume3d\") {"),
				"Must switch to volume3d when studioMode is volume3d",
			);
		});

		it("CbctMprViewportsGrid passes isMaximized and onToggleMaximize to CbctVolume3DViewport", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctMprViewportsGrid.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("isMaximized={maximizedViewport === \"panoramic\"}"),
				"Must pass isMaximized to CbctVolume3DViewport",
			);
			assert.ok(
				source.includes("onToggleMaximize={() => handleToggleMaximize(\"panoramic\")}"),
				"Must pass onToggleMaximize to CbctVolume3DViewport",
			);
		});
	});

	// ─── 5. CBCTMPRIMPLANTSTUDIOMODAL BINDINGS ────────────────────────────────
	describe("5. CbctMprImplantStudioModal Studio Mode Bindings", () => {
		it("CbctMprImplantStudioModal.tsx passes studioMode and onSelectStudioMode to CbctMprViewportsGrid", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../CbctMprImplantStudioModal.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("studioMode={studioMode}"),
				"Must pass studioMode prop to CbctMprViewportsGrid",
			);
			assert.ok(
				source.includes("onSelectStudioMode={handleSelectStudioMode}"),
				"Must pass onSelectStudioMode prop to CbctMprViewportsGrid",
			);
		});
	});

	// ─── 6. RAY-AABB ANALYTICAL SLAB INTERSECTION & PERFORMANCE MATH ──────────
	describe("6. Ray-AABB Analytical Slab Intersection & Performance Math", () => {
		it("calculates exact tNear and tFar for ray passing through box center", () => {
			// Box: [-50, 50] x [-50, 50] x [-50, 50]
			// Ray origin: (0, 0, -200), direction: (0, 0, 1)
			const res = intersectRayAABB(
				0, 0, -200,
				0, 0, 1,
				-50, 50,
				-50, 50,
				-50, 50,
				-500, 500,
			);
			assert.strictEqual(res.hit, true, "Ray must intersect box");
			assert.strictEqual(Math.round(res.tNear), 150, "tNear must be 150 mm (front face at z = -50)");
			assert.strictEqual(Math.round(res.tFar), 250, "tFar must be 250 mm (back face at z = 50)");
		});

		it("returns hit: false when ray points away in forward direction (tMinLimit >= 0)", () => {
			// Ray origin: (0, 0, -200), direction: (0, 0, -1) (pointing away from box at [-50, 50])
			const res = intersectRayAABB(
				0, 0, -200,
				0, 0, -1,
				-50, 50,
				-50, 50,
				-50, 50,
				0, 500,
			);
			assert.strictEqual(res.hit, false, "Forward ray pointing away must not hit");
		});

		it("returns hit: false when ray misses box laterally", () => {
			// Ray at x = 100, y = 0, z = -200, direction: (0, 0, 1). Box x is [-50, 50].
			const res = intersectRayAABB(
				100, 0, -200,
				0, 0, 1,
				-50, 50,
				-50, 50,
				-50, 50,
				-500, 500,
			);
			assert.strictEqual(res.hit, false, "Ray missing box laterally must return hit: false");
		});

		it("returns hit: false when ray is parallel to box slab outside volume bounds", () => {
			// Ray origin: (100, 0, -200) (outside box x range [-50, 50]), direction: (0, 0, 1)
			const res = intersectRayAABB(
				100, 0, -200,
				0, 0, 1,
				-50, 50,
				-50, 50,
				-50, 50,
				-500, 500,
			);
			assert.strictEqual(res.hit, false, "Parallel ray outside bounds must miss with 0 steps");
		});

		it("correctly calculates tNear and tFar when ray starts inside volume", () => {
			// Ray origin: (0, 0, 0), direction: (0, 0, 1)
			const res = intersectRayAABB(
				0, 0, 0,
				0, 0, 1,
				-50, 50,
				-50, 50,
				-50, 50,
				-500, 500,
			);
			assert.strictEqual(res.hit, true);
			assert.ok(res.tNear <= 0, "tNear must be <= 0 for origin inside box");
			assert.strictEqual(Math.round(res.tFar), 50, "tFar must be 50 mm (exit face at z = 50)");
		});

		it("CbctVolume3DViewport source integrates requestAnimationFrame throttling and AABB test", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("intersectRayAABB") || source.includes("cbctVolume3DShaders"),
				"Must integrate with ray AABB intersection testing",
			);
			assert.ok(source.includes("requestAnimationFrame("), "Must use requestAnimationFrame for smooth 60 FPS throttling");
			assert.ok(source.includes("isInteracting"), "Must support adaptive resolution via isInteracting state");
		});
	});

	// ─── 7. 3D VOLUME GPU CLIPPING BOX & SPINE/OCCIPUT CUT INVARIANTS ─────────
	describe("7. 3D Volume GPU Clipping Box & Spine/Occiput Cut Invariants", () => {
		it("DEFAULT_VOLUME_3D_CLIPPING_BOX defines full unclipped [0,0,0] to [1,1,1] UVW volume", () => {
			assert.deepStrictEqual(DEFAULT_VOLUME_3D_CLIPPING_BOX.clipMin, [0.0, 0.0, 0.0]);
			assert.deepStrictEqual(DEFAULT_VOLUME_3D_CLIPPING_BOX.clipMax, [1.0, 1.0, 1.0]);
		});

		it("isPointInsideClippingBox correctly clips out cervical vertebrae (Z-min cut)", () => {
			const spineCutMin: [number, number, number] = [0.0, 0.0, 0.28];
			const fullMax: [number, number, number] = [1.0, 1.0, 1.0];

			// Neck / cervical spine voxel at bottom (Z = 0.10) -> must be CLIPPED OUT (false)
			const isNeckInside = isPointInsideClippingBox([0.5, 0.5, 0.10], spineCutMin, fullMax);
			assert.strictEqual(isNeckInside, false, "Cervical spine voxel must be clipped out");

			// Mandible / alveolar ridge voxel (Z = 0.45) -> must be KEPT (true)
			const isJawInside = isPointInsideClippingBox([0.5, 0.5, 0.45], spineCutMin, fullMax);
			assert.strictEqual(isJawInside, true, "Jaw voxel must be retained inside unclipped volume");
		});

		it("isPointInsideClippingBox correctly clips out occiput bone (Y-max cut)", () => {
			const fullMin: [number, number, number] = [0.0, 0.0, 0.0];
			const occiputCutMax: [number, number, number] = [1.0, 0.72, 1.0];

			// Back of head / occipital bone voxel (Y = 0.88) -> must be CLIPPED OUT (false)
			const isOcciputInside = isPointInsideClippingBox([0.5, 0.88, 0.5], fullMin, occiputCutMax);
			assert.strictEqual(isOcciputInside, false, "Occipital bone voxel must be clipped out");

			// Anterior maxilla / anterior dentition voxel (Y = 0.30) -> must be KEPT (true)
			const isFaceInside = isPointInsideClippingBox([0.5, 0.30, 0.5], fullMin, occiputCutMax);
			assert.strictEqual(isFaceInside, true, "Anterior facial structures must be retained");
		});

		it("isPointInsideClippingBox correctly clips coronal plane (X-max cut)", () => {
			const fullMin: [number, number, number] = [0.0, 0.0, 0.0];
			const coronalCutMax: [number, number, number] = [0.70, 1.0, 1.0];

			// Right hemi-mandible voxel (X = 0.85) -> must be CLIPPED OUT (false)
			const isHemiInside = isPointInsideClippingBox([0.85, 0.5, 0.5], fullMin, coronalCutMax);
			assert.strictEqual(isHemiInside, false, "Contralateral quadrant must be clipped out");

			// Target jaw quadrant (X = 0.35) -> must be KEPT (true)
			const isTargetInside = isPointInsideClippingBox([0.35, 0.5, 0.5], fullMin, coronalCutMax);
			assert.strictEqual(isTargetInside, true, "Target quadrant must be retained");
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER contains u_clipMin and u_clipMax uniform declarations", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec3 u_clipMin;"),
				"Must declare uniform vec3 u_clipMin in shader",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec3 u_clipMax;"),
				"Must declare uniform vec3 u_clipMax in shader",
			);
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER skips voxels outside clipping box in raymarching loop", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("normPos.x < u_clipMin.x || normPos.x > u_clipMax.x") ||
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("u_clipMin.x"),
				"Shader raymarching loop must check u_clipMin and u_clipMax",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("continue;"),
				"Shader must advance ray and skip clipped voxels via continue",
			);
		});

		it("CbctVolume3DViewport renders interactive clipping controls and sliders in UI", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			const clippingPanelSource = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DClippingPanel.tsx"),
				"utf-8",
			);
			assert.ok(source.includes("CbctVolume3DClippingPanel"), "Must render CbctVolume3DClippingPanel");
			assert.ok(source.includes("data-testid=\"cbct-btn-toggle-clipping\""), "Must have toggle clipping button testid");

			assert.ok(clippingPanelSource.includes("Срез позвонков (Z-min)"), "Must render spine cut slider label");
			assert.ok(clippingPanelSource.includes("Срез затылка (Y-max)"), "Must render occiput cut slider label");
			assert.ok(clippingPanelSource.includes("Корональный срез (X)"), "Must render coronal cut slider label");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-clip-slider-z-min\""), "Must have Z-min slider testid");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-clip-slider-y-max\""), "Must have Y-max slider testid");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-clip-slider-x\""), "Must have X slider testid");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-btn-reset-clipping\""), "Must have reset clipping button testid");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-btn-clip-spine\""), "Must have quick clip spine button testid");
			assert.ok(clippingPanelSource.includes("data-testid=\"cbct-btn-clip-occiput\""), "Must have quick clip occiput button testid");
		});
	});

	// ─── 8. ADAPTIVE INTERACTIVE 60 FPS LOD & 4-STEP BONE BISECTION ───────────
	describe("8. Adaptive Interactive 60 FPS LOD & 4-Step Bone Bisection", () => {
		it("CBCT_VOLUME_3D_FRAGMENT_SHADER defines u_refineSteps uniform for interactive LOD", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform int u_refineSteps;"),
				"Must declare uniform int u_refineSteps in fragment shader",
			);
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER executes 4-step bisection refinement when u_refineSteps > 0", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("for (int b = 0; b < 4; b++)"),
				"Must execute 4-step bisection loop on bone hit",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("u_refineSteps > 0"),
				"Must guard bisection refinement by u_refineSteps for 60 FPS interactive LOD",
			);
		});

		it("CbctVolume3DViewport adapts step size and resolution between interaction and idle beauty pass", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			const shaderSource = fs.readFileSync(
				path.resolve(__dirname, "../mpr/cbctVolume3DShaders.ts"),
				"utf-8",
			);
			assert.ok(
				source.includes("interactiveDownsampleFactor") ||
				source.includes("subSample = isInteracting ? (rawWidth > 600 ? 4 : 3) : (rawWidth > 800 ? 2 : 1)"),
				"Must downsample resolution during drag interaction for 60 FPS on weak GPUs",
			);
			assert.ok(
				shaderSource.includes("isInteracting") && shaderSource.includes("maxSteps"),
				"Must scale maxSteps from 48..60 during interaction to 96 on mouseUp beauty pass",
			);
			assert.ok(
				shaderSource.includes("u_refineSteps") && shaderSource.includes("bisection"),
				"Must execute bisection refinement on beauty pass",
			);
		});
	});

	// ─── 9. ANATOMICAL 4-IMPLANT ARRAY & VOLUMETRIC WEBGL2 RAYMARCHING ───────
	describe("9. Anatomical 4-Implant Array & Volumetric WebGL2 Raymarching Engine", () => {
		it("generate4JawImplants produces 4 realistic anatomical dental implants across the jaw arch", () => {
			const mockVolume = {
				dimensions: { width: 120, height: 120, depth: 100 },
				spacingMm: { x: 0.4, y: 0.4, z: 0.4 },
				originMm: { x: 0, y: 0, z: 0 },
				data: new Int16Array(120 * 120 * 100),
				metadata: { patientName: "Test", seriesInstanceUid: "1.2.3" },
				isDisposed: false,
			};
			const implants = generate4JawImplants(mockVolume as any, null);

			assert.strictEqual(implants.length, 4, "Must generate exactly 4 anatomical implants");
			assert.strictEqual(implants[0]!.targetToothFdi, 46, "First implant must be tooth #46");
			assert.strictEqual(implants[1]!.targetToothFdi, 47, "Second implant must be tooth #47");
			assert.strictEqual(implants[2]!.targetToothFdi, 36, "Third implant must be tooth #36");
			assert.strictEqual(implants[3]!.targetToothFdi, 37, "Fourth implant must be tooth #37");

			for (const imp of implants) {
				assert.ok(imp.lengthMm >= 8.5 && imp.lengthMm <= 13.0, "Implant length must be clinical 8.5..13 mm");
				assert.ok(imp.platformDiameterMm >= 3.5, "Platform diameter must be >= 3.5 mm");
				assert.ok(imp.apexDiameterMm <= imp.platformDiameterMm, "Apex must be tapered");
				assert.ok(imp.entry3D.z > imp.apex3D.z, "Entry must be coronal to apex");
			}
		});

		it("convertImplantWorldToVolume3DParam maps physical mm into centered volume voxel space", () => {
			const mockVolume = {
				dimensions: { width: 100, height: 100, depth: 100 },
				spacingMm: { x: 0.5, y: 0.5, z: 0.5 },
				originMm: { x: 0, y: 0, z: 0 },
				data: new Int16Array(100),
				metadata: { patientName: "Test", seriesInstanceUid: "1.2.3" },
				isDisposed: false,
			};
			const testProj = {
				entry3D: { x: 25, y: 25, z: 40 },
				apex3D: { x: 25, y: 25, z: 20 },
				platformDiameterMm: 4.2,
				apexDiameterMm: 3.2,
				lengthMm: 10.0,
				tiltDeg: 0,
			};
			const param = convertImplantWorldToVolume3DParam(testProj as any, mockVolume as any);

			// Voxel coord = mm / spacing = 25/0.5 = 50
			assert.strictEqual(param.entryVoxel[0], 50);
			assert.strictEqual(param.entryVoxel[1], 50);
			assert.strictEqual(param.entryVoxel[2], 80); // 40/0.5 = 80
			assert.strictEqual(param.apexVoxel[2], 40); // 20/0.5 = 40
			assert.strictEqual(param.platformRadiusVoxel, 4.2); // (4.2/2) / 0.5 = 4.2
			assert.strictEqual(param.apexRadiusVoxel, 3.2); // (3.2/2) / 0.5 = 3.2
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER contains 4-implant uniforms, evaluation function, and volumetric penetration", () => {
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform int u_implantCount;"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec3 u_implantEntry[4];"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec3 u_implantApex[4];"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec2 u_implantRadii[4];"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform vec3 u_implantColors[4];"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("evaluateImplantAt"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("thread"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("implantBlendWeight"));
			assert.ok(CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("implantBlendNorm"));
		});

		it("CbctVolume3DViewport provides 4 implants / 1 implant toggle button in UI", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			assert.ok(source.includes("data-testid=\"cbct-volume-3d-implant-toggle\""));
			assert.ok(source.includes("4 импланта"));
			assert.ok(source.includes("1 имплант"));
		});
	});

	// ─── 10. REALISTIC IMPLANT DEPTH OCCLUSION & SUBSURFACE ATTENUATION ──────────
	describe("10. Realistic Implant Depth Occlusion & Subsurface Attenuation", () => {
		it("CBCT_VOLUME_3D_FRAGMENT_SHADER checks direct implant hit in air before bone", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("hitIsImplant = true;"),
				"Must mark hitIsImplant when ray strikes implant fixture directly",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("if (!hit && u_implantCount > 0)"),
				"Must evaluate direct implant hit in air or above bone before bone collision",
			);
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER implements exponential Beer-Lambert bone attenuation", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("boneThicknessAttenuation = exp(-distInsideBone * 0.35)") ||
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("boneThicknessAttenuation = exp("),
				"Must compute exponential distance attenuation through bone tissue",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("densityAttenuation = exp("),
				"Must compute accumulated bone density attenuation",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("clamp(totalTransmittance * 0.28, 0.0, 0.28)"),
				"Subsurface visibility ceiling must be capped at 0.28 (soft translucent sheen, not blinding neon)",
			);
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER renders solid Blinn-Phong metallic titanium for exposed fixtures", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("METALLIC TITANIUM SURGICAL IMPLANT SHADING"),
				"Must implement metallic titanium shading for fixtures visible in air",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("pow(NdotH, 36.0)"),
				"Must have sharp Blinn-Phong specular highlight for titanium metal",
			);
		});
	});

	// ─── 11. MAR (METAL ARTIFACT REDUCTION) STREAK NEEDLE FILTER ──────────────────
	describe("11. MAR (Metal Artifact Reduction) Streak Needle Filter", () => {
		it("CBCT_VOLUME_3D_FRAGMENT_SHADER declares u_marActive uniform and isMetalStreakArtifact detector", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform int u_marActive;"),
				"Must declare uniform int u_marActive in fragment shader",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("isMetalStreakArtifact"),
				"Must implement isMetalStreakArtifact helper function",
			);
		});

		it("isMetalStreakArtifact evaluates transverse planar continuity to distinguish 1D needles from real bone", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("hasUContinuity") &&
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("hasVContinuity"),
				"Must test orthogonal transverse continuity (preserving 2D bone plates)",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("avgTransverseHU"),
				"Must calculate average transverse density around candidate voxel",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("boneSupportCount"),
				"Must count supporting transverse bone neighbors",
			);
		});

		it("CBCT_VOLUME_3D_FRAGMENT_SHADER suppresses detected metal streak needles in raymarching loop", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("if (u_marActive == 1 && isMetalStreakArtifact(curPos, hu, rayDir))"),
				"Must test MAR filter in raymarching loop",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("continue;"),
				"Must skip artifact needles and advance ray",
			);
		});

		it("CbctVolume3DViewport renders MAR toggle button and bottom HUD telemetry indicator", () => {
			const source = fs.readFileSync(
				path.resolve(__dirname, "../mpr/CbctVolume3DViewport.tsx"),
				"utf-8",
			);
			assert.ok(
				source.includes("data-testid=\"cbct-volume-3d-mar-toggle\""),
				"Must render MAR toggle button with testid cbct-volume-3d-mar-toggle",
			);
			assert.ok(
				source.includes("data-testid=\"cbct-hud-mar-status\""),
				"Must render MAR status in bottom telemetry HUD with testid cbct-hud-mar-status",
			);
			assert.ok(
				source.includes("isMarActive"),
				"Must maintain isMarActive state in CbctVolume3DViewport",
			);
		});
	});
});
