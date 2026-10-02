/**
 * DENTE CRM — Ez3D-i Tooling, Window/Level & HU Bone Density Parity Test Suite
 * Mandate 8l: Red Team Inquisitor #3
 * Tests Carl E. Misch density classification, Hounsfield profiling math,
 * convolution filter kernels, and Mandate 8b line-budget invariants.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
	classifyMischDensity,
	calculateBoneDensityProfile,
	SMOOTH_KERNEL_3X3,
	MAX_RES_KERNEL_3X3,
} from "../components/imaging/rvgViewerEngine.js";

describe("Mandate 8l: Ez3D-i Clinical Tooling & HU Bone Density Math", () => {
	it("should accurately classify bone density according to Carl E. Misch (D1..D5)", () => {
		// D1: Dense cortical bone (>1250 HU)
		assert.equal(classifyMischDensity(1450), "D1");
		assert.equal(classifyMischDensity(1251), "D1");

		// D2: Thick porous cortical and coarse trabecular bone (850..1250 HU)
		assert.equal(classifyMischDensity(1250), "D2");
		assert.equal(classifyMischDensity(1000), "D2");
		assert.equal(classifyMischDensity(850), "D2");

		// D3: Thin porous cortical and fine trabecular bone (350..850 HU)
		assert.equal(classifyMischDensity(849), "D3");
		assert.equal(classifyMischDensity(600), "D3");
		assert.equal(classifyMischDensity(350), "D3");

		// D4: Fine trabecular bone / soft bone (150..350 HU)
		assert.equal(classifyMischDensity(349), "D4");
		assert.equal(classifyMischDensity(200), "D4");
		assert.equal(classifyMischDensity(150), "D4");

		// D5: Immature or unmineralized bone / defect (<150 HU)
		assert.equal(classifyMischDensity(149), "D5");
		assert.equal(classifyMischDensity(0), "D5");
		assert.equal(classifyMischDensity(-200), "D5");
	});

	it("should compute calibrated HU bone density profile along measurement trajectory", () => {
		const p1 = { x: 50, y: 100 };
		const p2 = { x: 150, y: 100 }; // 100 px horizontal
		const windowWidth = 2000;
		const windowCenter = 500;
		const calibrationMmPerPixel = 0.05; // 100 px * 0.05 = 5.0 mm
		const sampleCount = 20;

		const stats = calculateBoneDensityProfile(
			p1,
			p2,
			windowWidth,
			windowCenter,
			calibrationMmPerPixel,
			sampleCount,
			null, // synthetic fallback
		);

		assert.equal(stats.lengthMm, 5.0);
		assert.equal(stats.samples.length, 20);
		assert.ok(stats.minHu <= stats.maxHu, "minHu must be <= maxHu");
		assert.ok(stats.meanHu >= stats.minHu && stats.meanHu <= stats.maxHu, "meanHu must be between min and max");
		assert.ok(["D1", "D2", "D3", "D4", "D5"].includes(stats.dominantClass), "dominantClass must be valid Misch class");
	});

	it("should provide valid 3x3 convolution filter kernels for Smooth and Max Resolution", () => {
		// SMOOTH_KERNEL_3X3: Gaussian 3x3 blur, 3 rows of 3, total weight == 16
		assert.equal(SMOOTH_KERNEL_3X3.length, 3);
		assert.equal(SMOOTH_KERNEL_3X3.flat().length, 9);
		const smoothSum = SMOOTH_KERNEL_3X3.flat().reduce((acc, v) => acc + v, 0);
		assert.equal(smoothSum, 16, "Smooth kernel must sum to 16 for integer normalization");

		// MAX_RES_KERNEL_3X3: Laplacian high-boost sharpness filter, 3 rows of 3, sum == 1
		assert.equal(MAX_RES_KERNEL_3X3.length, 3);
		assert.equal(MAX_RES_KERNEL_3X3.flat().length, 9);
		const maxResSum = MAX_RES_KERNEL_3X3.flat().reduce((acc, v) => acc + v, 0);
		assert.equal(maxResSum, 1, "Max Res kernel must sum to 1");
		assert.equal(MAX_RES_KERNEL_3X3[1]![1], 9, "Center pixel of Max Res must be boosted to 9");
	});

	it("should enforce Mandate 8b line-budget invariant (strictly <= 800 lines per file)", () => {
		const filesToAudit = [
			"apps/web/src/components/imaging/DicomToolboxRibbon.tsx",
			"apps/web/src/components/imaging/DicomMprCockpit.tsx",
			"apps/web/src/components/imaging/DicomSectioningView.tsx",
			"apps/web/src/components/imaging/DicomViewerModal.tsx",
			"apps/web/src/components/imaging/DicomAiFindingsDrawer.tsx",
			"apps/web/src/components/imaging/rvgViewerEngine.ts",
			"apps/web/src/components/imaging/DicomViewport.tsx",
		];

		for (const fileRelPath of filesToAudit) {
			const fullPath = path.resolve(fileRelPath);
			assert.ok(fs.existsSync(fullPath), `File must exist: ${fileRelPath}`);
			const content = fs.readFileSync(fullPath, "utf8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${fileRelPath} has ${lineCount} lines, which violates Mandate 8b (must be <= 800 lines)!`,
			);
		}
	});

	it("should contain zero mock markers or fake stubs in DicomToolboxRibbon", () => {
		const fullPath = path.resolve("apps/web/src/components/imaging/DicomToolboxRibbon.tsx");
		const content = fs.readFileSync(fullPath, "utf8");
		assert.ok(!content.includes("// TODO:"), "Forbidden // TODO stub found in DicomToolboxRibbon.tsx");
		assert.ok(!content.includes("mockData"), "Forbidden mockData found in DicomToolboxRibbon.tsx");
	});
});
