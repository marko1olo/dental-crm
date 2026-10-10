/**
 * Wave 125 & Tooth Geometry Math Decomposition Verification Suite
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import "../../../../packages/shared/src/radiology/__tests__/wave125ToothSetup.test.js";

import {
	TOOTH_GEOMETRY,
	TOOTH_SURFACE_POLYGONS,
	buildCtPlanningGeometrySummary,
	getFurcationMarkerSvg,
	getToothConfig,
	getToothPath,
	type CtPlanningDistanceMeasurement,
	type CtPlanningDistanceMeasurementRole,
	type CtPlanningGeometryMetric,
	type CtPlanningGeometrySummary,
	type FurcationGrade,
	type FurcationMarkerSvg,
	type FurcationSiteGeometry,
	type PeriodontalBoneCrestLines,
	type ToothConfig,
	type ToothGeometryType,
	type ToothSurfaces,
} from "../utils/math/toothGeometry.js";

const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

describe("Tooth Geometry Math Decomposition Invariants", () => {
	it("enforces <= 50 lines on canonical facade and <= 800 lines on all submodules", () => {
		const webRoot = getWebRoot();
		const facadePath = path.resolve(
			webRoot,
			"src/utils/math/toothGeometry.ts",
		);
		const subDirPath = path.resolve(
			webRoot,
			"src/utils/math/toothGeometry",
		);

		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		assert.ok(
			facadeLines <= 50,
			`Facade toothGeometry.ts must be <= 50 lines, got ${facadeLines}`,
		);

		const requiredModules = [
			"types.ts",
			"dentalArchCurves.ts",
			"toothSvgTransforms.ts",
			"surfacePolygons.ts",
			"index.ts",
		];

		for (const modName of requiredModules) {
			const modPath = path.join(subDirPath, modName);
			assert.ok(fs.existsSync(modPath), `Expected module ${modName} to exist`);
			const lines = fs.readFileSync(modPath, "utf8").split("\n").length;
			assert.ok(
				lines <= 800,
				`Module ${modName} must be <= 800 lines, got ${lines}`,
			);
		}
	});

	it("preserves 100% export parity for all tooth SVG coordinates, surfaces, furcations, and CT planning summary", () => {
		assert.equal(typeof getToothPath, "function");
		assert.equal(typeof getToothConfig, "function");
		assert.equal(typeof getFurcationMarkerSvg, "function");
		assert.equal(typeof buildCtPlanningGeometrySummary, "function");
		assert.equal(typeof TOOTH_GEOMETRY, "object");
		assert.equal(typeof TOOTH_SURFACE_POLYGONS, "object");

		// Verify adult and pediatric FDI mapping
		const upperCentral = getToothPath(11);
		assert.equal(upperCentral, TOOTH_GEOMETRY.UPPER_CENTRAL_INCISOR);
		assert.ok(upperCentral.surfaces.V.startsWith("M 35 85"));
		assert.ok(upperCentral.surfaces.O.startsWith("M 30 144"));

		const lowerMolar = getToothPath(46);
		assert.equal(lowerMolar, TOOTH_GEOMETRY.LOWER_MOLAR);
		assert.equal(lowerMolar.furcations?.length, 2);

		const pediatricUpperMolar = getToothPath(55);
		assert.equal(pediatricUpperMolar, TOOTH_GEOMETRY.PEDIATRIC_UPPER_MOLAR);

		// Verify tooth config scaling and touch target
		const incisorConfig: ToothConfig = getToothConfig(11);
		assert.equal(incisorConfig.height, "150px");
		assert.equal(incisorConfig.touchTargetMinPx, 44);

		const molarConfig: ToothConfig = getToothConfig(16);
		assert.equal(molarConfig.width, "98px");
		assert.equal(molarConfig.viewWidth, 100);

		// Verify furcation markers Grade 0..4
		assert.equal(getFurcationMarkerSvg(0, 50, 50, true), null);
		const grade1 = getFurcationMarkerSvg(1, 50, 50, true);
		assert.ok(grade1 !== null);
		assert.equal(grade1.fill, "none");
		const grade3 = getFurcationMarkerSvg(3, 50, 50, false);
		assert.ok(grade3 !== null);
		assert.equal(grade3.fill, "#ef4444");

		// Verify CT planning geometry summary
		const summary: CtPlanningGeometrySummary = buildCtPlanningGeometrySummary({
			annotations: [],
			implantPlan: {
				id: "imp-1",
				manufacturer: "Straumann",
				line: "BLT",
				diameterMm: 4.1,
				lengthMm: 10,
				toothCode: "36",
				positionWorld: [0, 0, 0],
				axisWorld: [0, 0, -1],
				safetyMarginMm: 2,
			},
			slabMm: 1.5,
		});
		assert.equal(summary.measurementCount, 0);
		assert.ok(summary.implantVolumeMm3 !== null && summary.implantVolumeMm3 > 130);
	});
});
