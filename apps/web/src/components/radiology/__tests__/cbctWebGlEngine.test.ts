/**
 * cbctWebGlEngine.test.ts — Модульный тест чистой математики матриц срезов и WebGL шейдеров (Мандаты 8wx, 8b <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_OBLIQUE_ROTATION,
	computeObliqueRotationMatrix,
} from "../cbctObliqueMatrixMath";
import {
	CBCT_COLORMAP_MODES,
	computeGlSliceCoordinates,
	resolveColorMapCode,
} from "../mpr/webgl/CbctVolumeGlContext";
import {
	CBCT_MPR_FRAGMENT_SHADER,
	CBCT_MPR_VERTEX_SHADER,
} from "../mpr/webgl/cbctMprShaders";
import type { CbctVoxelVolume } from "../cbctMprMath";

describe("CBCT WebGL Engine Pure Coordinates & Shaders (FEAT-010)", () => {
	const mockVolume: CbctVoxelVolume = {
		id: "test-gl-vol",
		dimensions: { width: 512, height: 512, depth: 300 },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -64, y: -64, z: -37.5 },
		physicalSizeMm: { x: 128, y: 128, z: 75 },
		data: new Int16Array(10),
		minHU: -1000,
		maxHU: 3000,
		isDisposed: false,
	};

	it("GLSL ES 3.00 шейдеры содержат корректный синтаксис uniform-переменных и текстур", () => {
		assert.ok(CBCT_MPR_VERTEX_SHADER.includes("#version 300 es"));
		assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("#version 300 es"));
		assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("uniform isampler3D u_volume;"));
		assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("uniform float u_windowWidth;"));
		assert.ok(CBCT_MPR_FRAGMENT_SHADER.includes("uniform float u_windowLevel;"));
	});

	it("матрица вращения единична при нулевых углах", () => {
		const mat = computeObliqueRotationMatrix(DEFAULT_OBLIQUE_ROTATION);
		assert.strictEqual(mat.length, 3);
		assert.ok(Math.abs(mat[0]![0]! - 1) < 1e-6);
		assert.ok(Math.abs(mat[1]![1]! - 1) < 1e-6);
		assert.ok(Math.abs(mat[2]![2]! - 1) < 1e-6);
	});

	it("вычисление GL-координат плоскости детерминировано для аксиального среза", () => {
		const crosshair = { x: 0, y: 0, z: 0 };
		const coords = computeGlSliceCoordinates(mockVolume, "axial", crosshair, DEFAULT_OBLIQUE_ROTATION);
		assert.ok(coords.sliceOrigin);
		assert.ok(coords.axisU && coords.axisV);
		assert.strictEqual(coords.sliceOrigin.length, 3);
	});

	it("коды цветовых карт разрешаются однозначно", () => {
		assert.strictEqual(resolveColorMapCode("grayscale"), 0);
		assert.strictEqual(resolveColorMapCode("bone_density"), 1);
		assert.strictEqual(resolveColorMapCode("endo"), 2);
		assert.strictEqual(resolveColorMapCode("inverted"), 3);
	});
});
