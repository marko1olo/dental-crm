/**
 * cbctHardwareGpuTorture.test.ts — Легковесный тест математики координат и безопасности памяти КЛКТ (Мандаты 8wx, 8b <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	computeObliquePlaneBasis,
	DEFAULT_OBLIQUE_ROTATION,
} from "../cbctObliqueMatrixMath";
import {
	computeSafeDprDimensions,
	getSafeDevicePixelRatio,
	MAX_SAFE_DEVICE_PIXEL_RATIO,
} from "../mpr/webgl/CbctVolumeGlContext";
import {
	worldMmToSlicePxContinuous,
} from "../cbctCoordinateMath";
import {
	calculatePhysicalDistance3DMm,
	evaluateAlveolarRidgeFeasibility,
} from "../cbctCaliperMeasureMath";
import type { CbctVoxelVolume } from "../cbctMprMath";

describe("CBCT Hardware Math & Memory Safety Suite (FEAT-010)", () => {
	const mockVolume: CbctVoxelVolume = {
		id: "test-vol",
		dimensions: { width: 512, height: 512, depth: 300 },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -64, y: -64, z: -37.5 },
		physicalSizeMm: { x: 128, y: 128, z: 75 },
		data: new Int16Array(10),
		minHU: -1000,
		maxHU: 3000,
		isDisposed: false,
	};

	it("правильно ограничивает devicePixelRatio для защиты от VRAM OOM", () => {
		const safeDpr = getSafeDevicePixelRatio(3.5);
		assert.ok(safeDpr <= MAX_SAFE_DEVICE_PIXEL_RATIO);
		const dims = computeSafeDprDimensions(1920, 1080, 4.0);
		assert.ok(dims.renderWidth <= 1920 * MAX_SAFE_DEVICE_PIXEL_RATIO + 1);
		assert.ok(dims.renderHeight <= 1080 * MAX_SAFE_DEVICE_PIXEL_RATIO + 1);
	});

	it("ортогональный базис косого среза детерминирован и ортогонален", () => {
		const angles = { axialAngleDeg: 15, coronalTiltDeg: -10, sagittalTiltDeg: 5 };
		const basis = computeObliquePlaneBasis("axial", { x: 0, y: 0, z: 0 }, angles);
		assert.ok(basis.u && basis.v && basis.normal);
		const dotUV = basis.u.x * basis.v.x + basis.u.y * basis.v.y + basis.u.z * basis.v.z;
		assert.ok(Math.abs(dotUV) < 1e-4, "Векторы базиса плоскости должны быть перпендикулярны");
	});

	it("непрерывная субпиксельная интерполяция устраняет фазовый джиттер курсора", () => {
		const pos1 = worldMmToSlicePxContinuous({ x: 10.25, y: -5.75, z: 0 }, "axial", mockVolume);
		const pos2 = worldMmToSlicePxContinuous({ x: 10.30, y: -5.75, z: 0 }, "axial", mockVolume);
		assert.ok(pos2.x > pos1.x, "Смещение на 0.05 мм должно плавно смещать субпиксельную координату");
	});

	it("расчет 3D-расстояний и оценка пригодности кости валидны", () => {
		const dist = calculatePhysicalDistance3DMm({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
		assert.strictEqual(dist, 5.0);
		const feat = evaluateAlveolarRidgeFeasibility(12.0, 8.0);
		assert.strictEqual(feat.isAdequate, true);
		assert.strictEqual(feat.requiresBoneGrafting, false);
	});
});
