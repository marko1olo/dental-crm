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

		it("skull preset is calibrated for maxillofacial bone (HU 150..2000)", () => {
			const skull = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "skull");
			assert.ok(skull, "Skull preset must exist");
			assert.strictEqual(skull.huMin, 150, "Skull huMin must be 150 HU (eliminates air/soft tissue)");
			assert.strictEqual(skull.huMax, 2000, "Skull huMax must be 2000 HU (covers trabecular to cortical)");
			assert.strictEqual(skull.shortLabel, "Череп");
		});

		it("dense_bone preset targets high-contrast cortical plates & teeth (HU 400..3000)", () => {
			const dense = CBCT_VOLUME_3D_PRESETS.find((p) => p.id === "dense_bone");
			assert.ok(dense, "Dense bone preset must exist");
			assert.strictEqual(dense.huMin, 400);
			assert.strictEqual(dense.huMax, 3000);
			assert.strictEqual(dense.shortLabel, "Плотная");
		});
	});

	// ─── 2. 3D ROTATION MATRIX & TRACKBALL MATH ───────────────────────────────
	describe("2. computeVolume3DRotationMatrix Math", () => {
		it("returns identity-like matrix at yaw=0, pitch=0", () => {
			const m = computeVolume3DRotationMatrix(0, 0);
			assert.strictEqual(m.length, 3);
			assert.strictEqual(m[0]!.length, 3);

			// At 0, 0: cos(0)=1, sin(0)=0
			assert.strictEqual(Math.round(m[0]![0]!), 1);
			assert.strictEqual(Math.round(m[0]![1]!), 0);
			assert.strictEqual(Math.round(m[0]![2]!), 0);
			assert.strictEqual(Math.round(m[1]![0]!), 0);
			assert.strictEqual(Math.round(m[1]![1]!), 1);
			assert.strictEqual(Math.round(m[1]![2]!), 0);
			assert.strictEqual(Math.round(m[2]![0]!), 0);
			assert.strictEqual(Math.round(m[2]![1]!), 0);
			assert.strictEqual(Math.round(m[2]![2]!), 1);
		});

		it("calculates orthogonal coronal view (yaw=0, pitch=0)", () => {
			const m = computeVolume3DRotationMatrix(0, 0);
			// Ray direction along Z axis
			assert.strictEqual(Math.round(m[0]![2]!), 0);
			assert.strictEqual(Math.round(m[1]![2]!), 0);
			assert.strictEqual(Math.round(m[2]![2]!), 1);
		});

		it("calculates orthogonal sagittal view (yaw=90, pitch=0)", () => {
			const m = computeVolume3DRotationMatrix(90, 0);
			// At yaw=90: cos(90)=0, sin(90)=1
			assert.strictEqual(Math.round(m[0]![0]!), 0);
			assert.strictEqual(Math.round(m[0]![2]!), 1);
			assert.strictEqual(Math.round(m[2]![0]!), -1);
			assert.strictEqual(Math.round(m[2]![2]!), 0);
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
			assert.ok(source.includes("data-testid=\"cbct-btn-orientation-isometric\""), "Must have 3D (Isometric) shortcut");
			assert.ok(source.includes("3D Объем:"), "Must display telemetry label");
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

		it("CbctMprViewportsGrid.tsx renders 1-click switcher buttons [3D Объем / Череп] and [Панорама ОПТГ]", () => {
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
				source.includes("3D Объем / Череп"),
				"Must contain label '3D Объем / Череп'",
			);
			assert.ok(
				source.includes("Панорама ОПТГ"),
				"Must contain label 'Панорама ОПТГ'",
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
			const count = (source.match(/renderFourthQuadrantViewport\(/g) || []).length;
			assert.ok(count >= 3, "renderFourthQuadrantViewport must be invoked in all 3 layout locations");
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
});
