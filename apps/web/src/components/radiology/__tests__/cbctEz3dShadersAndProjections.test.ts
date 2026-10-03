/**
 * DENTE CRM — Vatech Ez3D Volume Shaders, Two-Sided Lighting, G-Buffer Picking & Skull Projections Test Suite
 * Standards: Vatech Ez3D 2009 / Zeus3D / OBJShader.fx / CanalCore, WebGL2 PS 3.3
 *
 * Verifies:
 * 1. Two-sided diffuse lighting formula (0.25 ambient + 0.75 * abs(dot(-lightDir, normal))) preventing sinus/canal darkness collapse.
 * 2. G-Buffer ObjectID packing in WebGL2 fragment shader for 0-ms mouse picking of implants, nerves, and volume features.
 * 3. decodeEz3dGBufferPixel and pickVolume3DObjectAtPixel decode logic.
 * 4. Vatech Ez3D bone and soft tissue presets (ez3d_bone, ez3d_soft_tissue) in transfer function registry.
 * 5. Synchronization of CbctSkullProjectionsToolbar with canonical Ez3D cube navigation angles (A, P, L, R, F, H).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CBCT_VOLUME_3D_FRAGMENT_SHADER,
	CBCT_VOLUME_3D_VERTEX_SHADER,
	decodeEz3dGBufferPixel,
	pickVolume3DObjectAtPixel,
} from "../mpr/cbctVolume3DShaders";
import {
	CBCT_CLINICAL_VOLUME_PRESETS,
	ALL_CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
} from "../mpr/cbctVolume3DMath";
import {
	SKULL_PROJECTIONS,
	type SkullProjectionDefinition,
} from "../mpr/CbctSkullProjectionsToolbar";

describe("Vatech Ez3D Volume Shaders, Two-Sided Lighting & G-Buffer Picking", () => {
	describe("1. Two-Sided Diffuse Lighting Engine (Vatech OBJShader.fx)", () => {
		it("enforces Vatech two-sided absolute dot product abs(dot(norm, lightDir))", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float NdotL = abs(dot(norm, lightDir));"),
				"Fragment shader must compute two-sided diffuse response via abs(dot(norm, lightDir))",
			);
		});

		it("enforces canonical Vatech Ez3D weighting: 25% ambient + 75% diffuse amplitude", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float ambient = 0.25;"),
				"Fragment shader must provide 25% ambient floor (ambient = 0.25) to prevent cavity blackouts",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float diffuse = NdotL * 0.75;"),
				"Fragment shader must provide 75% diffuse amplitude (diffuse = NdotL * 0.75)",
			);
		});

		it("preserves clinical ceiling <= 178/255 for enamel burnout protection", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("float clinicalCeiling = 178.0 / 255.0;"),
				"Fragment shader must preserve clinical ceiling <= 178/255 to eliminate enamel blinding burnout",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("min(rawLit, vec3(clinicalCeiling))"),
				"Fragment shader must clamp rawLit against clinical ceiling",
			);
		});
	});

	describe("2. Vatech Ez3D G-Buffer ObjectID Packing for 0-ms Mouse Picking", () => {
		it("declares u_renderMode and u_objectId uniforms in WebGL2 fragment shader", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform int u_renderMode;"),
				"Fragment shader must declare uniform int u_renderMode",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("uniform float u_objectId;"),
				"Fragment shader must declare uniform float u_objectId",
			);
		});

		it("encodes color, ObjectID, and depth in G-Buffer mode (u_renderMode == 1)", () => {
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("if (u_renderMode == 1)"),
				"Fragment shader must branch into G-Buffer encoding when u_renderMode == 1",
			);
			assert.ok(
				CBCT_VOLUME_3D_FRAGMENT_SHADER.includes("fragColor = vec4(lit.r, lit.g, u_objectId / 255.0, hitDepth);"),
				"Fragment shader must pack ObjectID into channel B and hitDepth into channel A",
			);
		});

		it("decodes G-Buffer pixel into color, objectId, and depth accurately", () => {
			// Simulate an implant object with ObjectID = 3, Depth = 0.5 (128 / 255), Color = RGB(200, 150, 138)
			const pR = 200;
			const pG = 150;
			const pB = 3; // ObjectID = 3
			const pA = 128; // Depth = 128 / 255 ~= 0.502

			const decoded = decodeEz3dGBufferPixel(new Uint8Array([pR, pG, pB, pA]));
			assert.equal(decoded.objectId, 3, "ObjectID must decode to 3");
			assert.equal(decoded.r, 200, "Red channel must decode to 200");
			assert.equal(decoded.g, 150, "Green channel must decode to 150");
			assert.ok(Math.abs(decoded.depth - 128 / 255) < 0.01, "Depth must decode to normalized hit depth");
		});

		it("pickVolume3DObjectAtPixel handles mock WebGL context gracefully", () => {
			const mockGl: any = {
				RGBA: 0x1908,
				UNSIGNED_BYTE: 0x1401,
				readPixels(_x: number, _y: number, _w: number, _h: number, _f: number, _t: number, out: Uint8Array) {
					out[0] = 50;
					out[1] = 120;
					out[2] = 7; // ObjectID = 7 (e.g. mandibular nerve canal)
					out[3] = 200; // Depth = 200 / 255
				},
			};

			const result = pickVolume3DObjectAtPixel(mockGl, 50, 50);
			assert.ok(result !== null);
			assert.equal(result.objectId, 7);
			assert.ok(Math.abs(result.depth - 200 / 255) < 0.01);
		});
	});

	describe("3. Vatech Ez3D Bone & Soft Tissue Palettes", () => {
		it("includes ez3d_bone preset in clinical transfer function registry", () => {
			const preset = getVolume3DPreset("ez3d_bone");
			assert.ok(preset, "ez3d_bone preset must exist");
			assert.equal(preset.id, "ez3d_bone");
			assert.equal(preset.huMin, 350);
			assert.equal(preset.huMax, 2200);
			assert.deepEqual(preset.colorRgb, [242, 235, 222], "Must use Vatech Ez3D warm bone ivory");
		});

		it("includes ez3d_soft_tissue preset in clinical transfer function registry", () => {
			const preset = getVolume3DPreset("ez3d_soft_tissue");
			assert.ok(preset, "ez3d_soft_tissue preset must exist");
			assert.equal(preset.id, "ez3d_soft_tissue");
			assert.equal(preset.huMin, -150);
			assert.equal(preset.huMax, 350);
			assert.deepEqual(preset.colorRgb, [228, 188, 172], "Must use Vatech Ez3D anatomical mucosa tint");
		});

		it("registers ez3d presets in ALL_CBCT_VOLUME_3D_PRESETS", () => {
			const ids = ALL_CBCT_VOLUME_3D_PRESETS.map((p) => p.id);
			assert.ok(ids.includes("ez3d_bone"), "ALL_CBCT_VOLUME_3D_PRESETS must include ez3d_bone");
			assert.ok(ids.includes("ez3d_soft_tissue"), "ALL_CBCT_VOLUME_3D_PRESETS must include ez3d_soft_tissue");
		});
	});

	describe("4. Canonical Ez3D Cube Projections Navigation Sync", () => {
		it("synchronizes all 6 canonical Ez3D cube faces (A, P, L, R, F, H) with exact angles", () => {
			const aProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "A");
			assert.ok(aProj, "A (Anterior) projection must exist");
			assert.equal(aProj.yaw, 0, "A Yaw must be 0°");
			assert.equal(aProj.pitch, 0, "A Pitch must be 0°");

			const pProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "P");
			assert.ok(pProj, "P (Posterior) projection must exist");
			assert.equal(pProj.yaw, 180, "P Yaw must be 180°");
			assert.equal(pProj.pitch, 0, "P Pitch must be 0°");

			const lProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "L");
			assert.ok(lProj, "L (Left) projection must exist");
			assert.equal(lProj.yaw, -90, "L Yaw must be -90°");
			assert.equal(lProj.pitch, 0, "L Pitch must be 0°");

			const rProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "R");
			assert.ok(rProj, "R (Right) projection must exist");
			assert.equal(rProj.yaw, 90, "R Yaw must be 90°");
			assert.equal(rProj.pitch, 0, "R Pitch must be 0°");

			const fProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "F");
			assert.ok(fProj, "F (Foot/Inferior) projection must exist");
			assert.equal(fProj.yaw, 0, "F Yaw must be 0°");
			assert.equal(fProj.pitch, -85, "F Pitch must be -85°");

			const hProj = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "H");
			assert.ok(hProj, "H (Head/Superior) projection must exist");
			assert.equal(hProj.yaw, 0, "H Yaw must be 0°");
			assert.equal(hProj.pitch, 85, "H Pitch must be +85°");
		});

		it("includes 3/4 isometric projections (3/4R, 3/4L)", () => {
			const rObl = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "3/4R");
			assert.ok(rObl);
			assert.equal(rObl.yaw, 45);
			assert.equal(rObl.pitch, 15);

			const lObl = SKULL_PROJECTIONS.find((p) => p.ez3dCode === "3/4L");
			assert.ok(lObl);
			assert.equal(lObl.yaw, -45);
			assert.equal(lObl.pitch, 15);
		});

		it("maintains backward compatibility with projection keys for all existing components", () => {
			const expectedKeys = [
				"anterior",
				"posterior",
				"left_lateral",
				"right_lateral",
				"inferior",
				"superior",
				"right_oblique",
				"left_oblique",
			];
			const keys = SKULL_PROJECTIONS.map((p) => p.key);
			for (const exp of expectedKeys) {
				assert.ok(keys.includes(exp as any), `Must include projection key: ${exp}`);
			}
		});
	});
});
