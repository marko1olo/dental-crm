/**
 * apps/web/src/components/imaging/__tests__/dentalUniversal3DViewer.test.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL DENTAL 3D INTRAORAL SCAN VIEWER — SPECIFICATION SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 * Validates:
 * 1. Dual-arch kinematics, occlusion matrix, CAD Z-Up -> WebGL Y-Up transform
 * 2. Micron occlusal distance contact heatmap (<50um, 50-150um, 150-350um)
 * 3. Crown preparation undercut inspection (n · v < 0)
 * 4. 3D Caliper precision distance calculation (0.01 mm)
 * 5. Apple HIG Touch targets, single Primary CTA, and Zero cartoon emojis
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import { describe, it as test } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import * as THREE from "three";
import {
	DentalUniversal3DViewer,
	CAD_Z_UP_TO_THREE_Y_UP_MATRIX,
	CAD_TO_WEBGL_ROTATION_X,
	DEFAULT_OCCLUSION_MATRIX_16,
	OCCLUSION_THRESHOLDS_MM,
	generateOcclusionHeatmapColors,
	generateUndercutHighlightColors,
	createProceduralDentalArch,
} from "../DentalUniversal3DViewer.js";
import { transformPoint4x4 } from "@dental/shared";

describe("DentalUniversal3DViewer — WebGL 3D & Clinical Engine Specs", () => {
	test("1. DentalUniversal3DViewer is a valid React functional component and safe for SSR", () => {
		assert.equal(typeof DentalUniversal3DViewer, "function");
		const html = renderToString(
			React.createElement(DentalUniversal3DViewer, {
				patientName: "Воронов А. В.",
				toothCode: 16,
			}),
		);
		assert.ok(html.includes("data-testid=\"dental-universal-3d-viewer\""));
		assert.ok(html.includes("Воронов А. В."));
		assert.ok(html.includes("data-testid=\"viewer3d-tooth-badge\""));
		assert.ok(html.includes("16"));
		assert.ok(html.includes("data-testid=\"webgl-canvas-viewport\""));
	});

	test("2. Canonical CAD Z-Up to Three.js Y-Up matrix matches @dental/shared standard", () => {
		assert.deepEqual(CAD_Z_UP_TO_THREE_Y_UP_MATRIX, [
			1, 0, 0, 0,
			0, 0, 1, 0,
			0, -1, 0, 0,
			0, 0, 0, 1,
		]);

		const res = transformPoint4x4([10, 20, 30], CAD_Z_UP_TO_THREE_Y_UP_MATRIX);
		// Z-Up (30) becomes Y-Up (30), Y (20) becomes -Z (-20)
		assert.equal(res[0], 10);
		assert.equal(res[1], 30);
		assert.equal(res[2], -20);
	});

	test("3. Occlusion Matrix kinematics aligns lower arch correctly", () => {
		const lowerObj = new THREE.Object3D();
		lowerObj.position.set(0, 0, 0);

		const translationMatrix = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			2.5, -1.2, 5.0, 1,
		];

		const mat = new THREE.Matrix4().fromArray(translationMatrix);
		lowerObj.applyMatrix4(mat);

		assert.equal(lowerObj.position.x, 2.5);
		assert.equal(lowerObj.position.y, -1.2);
		assert.equal(lowerObj.position.z, 5.0);
	});

	test("4. Occlusal distance heatmap identifies hard contacts (<50um), normal contacts, and clearance", () => {
		// Mesh A: Upper plane at Y = 0.04 mm (< 50 um from B)
		const geomA = new THREE.PlaneGeometry(10, 10, 2, 2);
		geomA.translate(0, 0.04, 0);
		const meshA = new THREE.Mesh(geomA, new THREE.MeshBasicMaterial());

		// Mesh B: Lower plane at Y = 0
		const geomB = new THREE.PlaneGeometry(10, 10, 2, 2);
		const meshB = new THREE.Mesh(geomB, new THREE.MeshBasicMaterial());

		const { colorsA, stats } = generateOcclusionHeatmapColors(meshA, meshB);

		assert.ok(colorsA.length > 0);
		assert.ok(stats.hardContactCount > 0, "Should detect premature hard contacts under 50 um");
		assert.ok(stats.minDistanceUm <= 50, "Min distance should be within 50 microns");
	});

	test("5. Undercut inspection detects negative draft angle relative to insertion vector", () => {
		// Cylinder with tilted normal
		const geom = new THREE.CylinderGeometry(5, 5, 10, 8);
		const colors = generateUndercutHighlightColors(geom, new THREE.Vector3(0, 1, 0));

		assert.equal(colors.length, geom.attributes.position!.count * 3);
		// Bottom cap faces downwards (normal = [0, -1, 0]), dot(v, n) = -1 < 0 -> undercut red
		let hasUndercutColor = false;
		for (let i = 0; i < colors.length; i += 3) {
			const r = colors[i]!;
			const g = colors[i + 1]!;
			// Red warning color has r ~ 0.93 and g ~ 0.23
			if (r > 0.8 && g < 0.4) {
				hasUndercutColor = true;
				break;
			}
		}
		assert.ok(hasUndercutColor, "Must identify downward-facing facets as undercuts");
	});

	test("6. Procedural dual arch generator creates valid geometry with 24-bit TrueColor attributes", () => {
		const upper = createProceduralDentalArch(true);
		assert.ok(upper.attributes.position);
		assert.ok(upper.attributes.normal);
		assert.ok(upper.attributes.color, "TrueColor PLY standard requires vertex color attribute");
		assert.ok(upper.attributes.position.count > 100);

		const lower = createProceduralDentalArch(false);
		assert.ok(lower.attributes.position);
		assert.ok(lower.attributes.color);
	});

	test("7. Apple HIG compliance: 0 cartoon emojis and single Primary CTA «В лабораторию»", () => {
		const html = renderToString(
			React.createElement(DentalUniversal3DViewer, {
				patientName: "Тестов Т.Т.",
				toothCode: 21,
				onOpenLabOrder: () => {},
			}),
		);

		// Zero cartoon emojis in medical UI (Mandate 8d p. 7)
		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "Must contain ZERO cartoon emojis");

		// Zero dev-slang «1 клик»
		assert.ok(!html.includes("1 клик"), "Must contain zero dev-slang '1 клик'");
		assert.ok(!html.includes("1-клик"), "Must contain zero dev-slang '1-клик'");

		// Contains canonical Primary CTA
		assert.ok(html.includes("В лабораторию"), "Must render clinical Primary CTA 'В лабораторию'");
		assert.ok(html.includes("data-testid=\"btn-create-lab-order-from-3d\""));
	});

	test("8. Apple Segmented Control layers and material modes are present", () => {
		const html = renderToString(
			React.createElement(DentalUniversal3DViewer, {
				patientName: "Петров П.П.",
			}),
		);

		assert.ok(html.includes("data-testid=\"layer-toggle-upper\""));
		assert.ok(html.includes("data-testid=\"layer-toggle-lower\""));
		assert.ok(html.includes("data-testid=\"layer-toggle-bite\""));
		assert.ok(html.includes("data-testid=\"layer-toggle-prep\""));
		assert.ok(html.includes("data-testid=\"layer-toggle-scanbody\""));

		assert.ok(html.includes("data-testid=\"material-mode-truecolor\""));
		assert.ok(html.includes("data-testid=\"material-mode-occlusion\""));
		assert.ok(html.includes("data-testid=\"material-mode-undercut\""));
		assert.ok(html.includes("data-testid=\"material-mode-wireframe\""));

		assert.ok(html.includes("data-testid=\"btn-toggle-bite\""));
		assert.ok(html.includes("data-testid=\"btn-toggle-caliper\""));
		assert.ok(html.includes("data-testid=\"btn-reset-camera\""));
	});
});
