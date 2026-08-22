/**
 * Unit Test Suite for Direct Dental Lab CAD/CAM STL 3D Mesh Preview & Margin Line Annotator
 * (DOMAIN: LAB 3D)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateTriangleNormal,
	computeAreaAndVolume,
	computeMeshBoundingBox,
	generateTestCubeMesh,
	parseAsciiStl,
	parseBinaryStl,
	parseStl,
	serializeBinaryStl,
} from "../components/lab3d/stlParserMath";
import {
	DENTAL_MATERIAL_THICKNESS_STANDARDS,
	analyzePrepMarginLine,
	analyzeUndercuts,
	calculateMarginPerimeter,
	evaluateCrownThickness,
	evaluateMarginSmoothness,
	generateSyntheticMarginLine,
	resolveFitApprovalStatus,
	type MarginControlPoint,
} from "../components/lab3d/marginLineEngine";

describe("Dental Lab STL Parser - Geometry & Topology Engine", () => {
	it("generates a synthetic calibration cube and computes exact analytical volume and surface area", () => {
		const cube = generateTestCubeMesh(10); // 10mm x 10mm x 10mm
		assert.equal(cube.triangleCount, 12);
		assert.equal(cube.vertexCount, 36);

		// Surface Area of 10mm cube: 6 faces * 100 mm² = 600 mm²
		assert.equal(cube.surfaceAreaMm2, 600);

		// Volume of 10mm cube: 10 * 10 * 10 = 1000 mm³
		assert.equal(cube.enclosedVolumeMm3, 1000);
		assert.equal(cube.isWatertight, true);

		// Bounding Box
		const bbox = cube.boundingBox;
		assert.deepEqual(bbox.min, [-5, -5, -5]);
		assert.deepEqual(bbox.max, [5, 5, 5]);
		assert.deepEqual(bbox.center, [0, 0, 0]);
		assert.deepEqual(bbox.dimensions, [10, 10, 10]);
	});

	it("serializes to Binary STL and parses back with byte-for-byte fidelity (Round-Trip)", () => {
		const originalCube = generateTestCubeMesh(8);
		const binaryBuffer = serializeBinaryStl({
			positions: originalCube.positions,
			normals: originalCube.normals,
			header: "DENTE CAD/CAM Crown #16 Model",
		});

		assert.ok(binaryBuffer instanceof Uint8Array);
		assert.equal(binaryBuffer.byteLength, 84 + 12 * 50); // 84 header + 12 triangles * 50 bytes = 684 bytes

		const parsed = parseBinaryStl(binaryBuffer);
		assert.equal(parsed.triangleCount, 12);
		assert.equal(parsed.surfaceAreaMm2, 6 * 64); // 384 mm²
		assert.equal(parsed.enclosedVolumeMm3, 512); // 8^3 = 512 mm³
		assert.match(parsed.header, /DENTE CAD\/CAM/);
	});

	it("parses ASCII STL format accurately", () => {
		const asciiStl = `solid DentalCrownSimple
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 10.0 0.0 0.0
      vertex 10.0 10.0 0.0
    endloop
  endfacet
  facet normal 0.0 0.0 1.0
    outer loop
      vertex 0.0 0.0 0.0
      vertex 10.0 10.0 0.0
      vertex 0.0 10.0 0.0
    endloop
  endfacet
endsolid DentalCrownSimple`;

		const parsed = parseAsciiStl(asciiStl);
		assert.equal(parsed.triangleCount, 2);
		assert.equal(parsed.vertexCount, 6);
		assert.equal(parsed.surfaceAreaMm2, 100); // 2 triangles forming 10x10 square = 100 mm²
		assert.equal(parsed.format, "ascii");
		assert.equal(parsed.header, "DentalCrownSimple");
	});

	it("universal parseStl autodetects binary vs ASCII inputs", () => {
		const ascii = "solid Sample\n facet normal 0 0 1\n outer loop\n vertex 0 0 0\n vertex 1 0 0\n vertex 0 1 0\n endloop\n endfacet\n endsolid Sample";
		const parsedAscii = parseStl(ascii);
		assert.equal(parsedAscii.format, "ascii");
		assert.equal(parsedAscii.triangleCount, 1);

		const cube = generateTestCubeMesh(5);
		const binary = serializeBinaryStl({ positions: cube.positions });
		const parsedBinary = parseStl(binary);
		assert.equal(parsedBinary.format, "binary");
		assert.equal(parsedBinary.triangleCount, 12);
	});

	it("computes accurate triangle normal vectors and repairs degenerate normals", () => {
		// XY plane triangle (Normal should be +Z = [0, 0, 1])
		const norm = calculateTriangleNormal(0, 0, 0, 10, 0, 0, 0, 10, 0);
		assert.equal(norm[0], 0);
		assert.equal(norm[1], 0);
		assert.equal(norm[2], 1);

		// Degenerate collinear triangle (returns default safe normal [0, 0, 1])
		const degen = calculateTriangleNormal(0, 0, 0, 5, 0, 0, 10, 0, 0);
		assert.deepEqual(degen, [0, 0, 1]);
	});
});

describe("Dental Lab Margin Line & Finish Line Engine (marginLineEngine.ts)", () => {
	it("generates synthetic anatomical finish line and computes closed perimeter", () => {
		const margin = generateSyntheticMarginLine("1.6", 4.0, 4.0, 32);
		assert.equal(margin.toothFdi, "1.6");
		assert.equal(margin.isClosed, true);
		assert.equal(margin.isSmooth, true);
		assert.equal(margin.kinks.length, 0);

		// Circle radius 4.0 has perimeter approx 2 * PI * 4 = 25.13 mm
		assert.ok(margin.perimeterMm >= 24.5 && margin.perimeterMm <= 26.5);
		assert.ok(margin.cervicalWidthMm > 7.5 && margin.cervicalWidthMm <= 8.5);
	});

	it("detects sharp kinks and step jumps on prep margin line", () => {
		// Margin line with intentional 90 degree kink and 1.2mm step jump
		const faultyPoints: MarginControlPoint[] = [
			[0, 0, 0],
			[4, 0, 0],
			[4, 4, 1.2], // Sharp 90 deg turn + 1.2mm Z jump
			[0, 4, 0],
		];

		const perimeter = calculateMarginPerimeter(faultyPoints);
		assert.ok(perimeter > 0);

		const { kinks, stepJumps, isSmooth } = evaluateMarginSmoothness(faultyPoints, {
			maxKinkAngleDeg: 45,
			maxStepJumpMm: 0.5,
		});

		assert.equal(isSmooth, false);
		assert.ok(kinks.length > 0, "Must detect sharp corner kinks");
		assert.ok(stepJumps.length > 0, "Must detect vertical step jumps > 0.5mm");
		assert.match(kinks[0]?.message ?? "", /Острый излом линии уступа/);
		assert.match(stepJumps[0]?.message ?? "", /Вертикальная ступенька на уступе/);
	});

	it("analyzes finish line geometry and calculates cervical bounding spans", () => {
		const points: MarginControlPoint[] = [
			[-4, -3, 0],
			[4, -3, 0],
			[4, 3, 0.5],
			[-4, 3, 0.5],
		];

		const analysis = analyzePrepMarginLine("margin-21", "2.1", points);
		assert.equal(analysis.cervicalLengthMm, 8); // [-4, 4] = 8 mm
		assert.equal(analysis.cervicalWidthMm, 6); // [-3, 3] = 6 mm
		assert.equal(analysis.meanHeightZ, 0.25);
	});
});

describe("Crown Thickness Standards & Undercut Analysis", () => {
	it("contains clinical thickness standards for all key dental restoration materials", () => {
		const standards = DENTAL_MATERIAL_THICKNESS_STANDARDS;
		assert.ok(standards.zirconia_multilayer);
		assert.equal(standards.zirconia_multilayer.minOcclusalMm, 1.0);
		assert.equal(standards.zirconia_multilayer.minMarginMm, 0.5);

		assert.ok(standards.emax_lithium_disilicate);
		assert.equal(standards.emax_lithium_disilicate.minOcclusalMm, 1.5);

		assert.ok(standards.pfm_cocr);
		assert.equal(standards.pfm_cocr.minOcclusalMm, 1.5);
	});

	it("evaluates material thickness compliance and flags dangerous thin spots", () => {
		// Compliant 1.2 mm for Zirconia (norm is 1.0)
		const goodZirconia = evaluateCrownThickness(1.2, "zirconia_multilayer", "occlusal");
		assert.equal(goodZirconia.isCompliant, true);
		assert.equal(goodZirconia.deltaMm, 0.2);
		assert.equal(goodZirconia.warning, undefined);

		// Non-compliant 0.7 mm for Zirconia (norm is 1.0)
		const thinZirconia = evaluateCrownThickness(0.7, "zirconia_multilayer", "occlusal");
		assert.equal(thinZirconia.isCompliant, false);
		assert.equal(thinZirconia.deltaMm, -0.3);
		assert.match(thinZirconia.warning ?? "", /Недостаточная толщина/);

		// Non-compliant 1.1 mm for E.max (norm is 1.5)
		const thinEmax = evaluateCrownThickness(1.1, "emax_lithium_disilicate", "occlusal");
		assert.equal(thinEmax.isCompliant, false);
	});

	it("analyzes undercuts relative to insertion vector [0, 0, 1]", () => {
		const cube = generateTestCubeMesh(10);
		const undercutResult = analyzeUndercuts(cube, [0, 0, 1]);

		assert.equal(undercutResult.totalTriangles, 12);
		// Bottom face (2 triangles with normal [0, -1, 0] or [0, 0, -1]) faces away from [0, 0, 1]
		assert.ok(undercutResult.undercutTrianglesCount > 0);
		assert.ok(undercutResult.colorBuffer.length === 12 * 9);
	});
});

describe("Lab-to-Clinic Fit Approval Protocol", () => {
	it("approves crown when all clinical criteria pass", () => {
		const report = resolveFitApprovalStatus({
			marginFitPassed: true,
			occlusalClearancePassed: true,
			proximalContactsPassed: true,
			wallThicknessPassed: true,
			undercutsClearPassed: true,
		});

		assert.equal(report.isFullyApproved, true);
		assert.equal(report.decision, "approved");
		assert.equal(report.passedCount, 5);
		assert.equal(report.blockingIssues.length, 0);
	});

	it("requests revision when 1-2 criteria fail", () => {
		const report = resolveFitApprovalStatus({
			marginFitPassed: false, // failed
			occlusalClearancePassed: true,
			proximalContactsPassed: true,
			wallThicknessPassed: true,
			undercutsClearPassed: true,
		});

		assert.equal(report.isFullyApproved, false);
		assert.equal(report.decision, "revision_requested");
		assert.equal(report.passedCount, 4);
		assert.equal(report.blockingIssues.length, 1);
		assert.match(report.blockingIssues[0] ?? "", /Краевое прилегание/);
	});

	it("rejects crown when >= 3 criteria fail", () => {
		const report = resolveFitApprovalStatus({
			marginFitPassed: false,
			occlusalClearancePassed: false,
			proximalContactsPassed: false,
			wallThicknessPassed: true,
			undercutsClearPassed: true,
		});

		assert.equal(report.isFullyApproved, false);
		assert.equal(report.decision, "rejected");
		assert.equal(report.passedCount, 2);
		assert.equal(report.blockingIssues.length, 3);
	});
});
