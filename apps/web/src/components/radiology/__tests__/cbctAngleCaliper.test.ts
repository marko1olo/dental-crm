/**
 * DENTE CRM — Unit Tests for CBCT Angle & Caliper Measurement Tools (CAD Mode)
 * Testing: cbctCaliperNerveMath.ts & cbctMprMath.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
} from "../cbctCaliperNerveMath";
import {
	drawCbctMeasurementRuler,
	drawCbctAngleMeasurement,
	drawCbctProbeMarker,
	getCbctToolCursor,
} from "../cbctMprMath";

describe("CBCT Angle & Measurement Math (CAD Caliper & Protractor)", () => {
	describe("calculateAngleBetween3Points2D", () => {
		it("calculates exact 90.0° for orthogonal arms", () => {
			const p1 = { x: 10, y: 0 };
			const vertex = { x: 0, y: 0 };
			const p2 = { x: 0, y: 10 };
			const angle = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.equal(angle, 90);
		});

		it("calculates exact 45.0° for diagonal arm", () => {
			const p1 = { x: 10, y: 0 };
			const vertex = { x: 0, y: 0 };
			const p2 = { x: 10, y: 10 };
			const angle = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.equal(angle, 45);
		});

		it("calculates exact 180.0° for collinear opposite arms", () => {
			const p1 = { x: -20, y: 0 };
			const vertex = { x: 0, y: 0 };
			const p2 = { x: 30, y: 0 };
			const angle = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.equal(angle, 180);
		});

		it("calculates 0.0° for identical arm directions", () => {
			const p1 = { x: 15, y: 0 };
			const vertex = { x: 0, y: 0 };
			const p2 = { x: 45, y: 0 };
			const angle = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.equal(angle, 0);
		});

		it("is symmetric with respect to arm order (p1 vs p2)", () => {
			const p1 = { x: 12, y: 5 };
			const vertex = { x: 2, y: -3 };
			const p2 = { x: -8, y: 14 };
			const angle1 = calculateAngleBetween3Points2D(p1, vertex, p2);
			const angle2 = calculateAngleBetween3Points2D(p2, vertex, p1);
			assert.equal(angle1, angle2);
		});

		it("handles zero-length degenerate vectors gracefully without NaN", () => {
			const p1 = { x: 0, y: 0 };
			const vertex = { x: 0, y: 0 };
			const p2 = { x: 10, y: 10 };
			const angle = calculateAngleBetween3Points2D(p1, vertex, p2);
			assert.equal(angle, 0);
			assert.ok(!Number.isNaN(angle));
		});
	});

	describe("calculateAngleBetween3Points3D", () => {
		it("calculates exact 90.0° for 3D orthogonal axes (X-axis and Z-axis)", () => {
			const p1 = { x: 25, y: 0, z: 0 };
			const vertex = { x: 0, y: 0, z: 0 };
			const p2 = { x: 0, y: 0, z: 25 };
			const angle = calculateAngleBetween3Points3D(p1, vertex, p2);
			assert.equal(angle, 90);
		});

		it("calculates 3D angle across arbitrary spatial planes", () => {
			const p1 = { x: 10, y: 10, z: 0 };
			const vertex = { x: 0, y: 0, z: 0 };
			const p2 = { x: 0, y: 10, z: 10 };
			const angle = calculateAngleBetween3Points3D(p1, vertex, p2);
			assert.equal(angle, 60);
		});

		it("handles zero-length 3D vector without throwing", () => {
			const p1 = { x: 5, y: 5, z: 5 };
			const vertex = { x: 5, y: 5, z: 5 };
			const p2 = { x: 10, y: 10, z: 10 };
			const angle = calculateAngleBetween3Points3D(p1, vertex, p2);
			assert.equal(angle, 0);
		});
	});

	describe("hitTestMeasurementHandle (24x24px Hit-Area)", () => {
		const rulers = [
			{
				id: "ruler-1",
				plane: "axial" as const,
				startPx: { x: 50, y: 50 },
				endPx: { x: 150, y: 50 },
			},
		];

		const angles = [
			{
				id: "angle-1",
				plane: "axial" as const,
				startPx: { x: 100, y: 100 },
				vertexPx: { x: 100, y: 200 },
				endPx: { x: 200, y: 200 },
			},
		];

		it("detects hit on ruler start handle within 12px (24x24px hit area)", () => {
			const hit = hitTestMeasurementHandle({ x: 50 + 11, y: 50 - 4 }, rulers, angles, 12);
			assert.ok(hit !== null);
			assert.equal(hit.type, "ruler");
			assert.equal(hit.id, "ruler-1");
			assert.equal(hit.handleIndex, 0);
		});

		it("detects hit on ruler end handle within 12px (24x24px hit area)", () => {
			const hit = hitTestMeasurementHandle({ x: 150 - 10, y: 50 + 5 }, rulers, angles, 12);
			assert.ok(hit !== null);
			assert.equal(hit.type, "ruler");
			assert.equal(hit.id, "ruler-1");
			assert.equal(hit.handleIndex, 1);
		});

		it("detects hit on angle vertex handle within 12px (24x24px hit area)", () => {
			const hit = hitTestMeasurementHandle({ x: 100 + 8, y: 200 - 8 }, rulers, angles, 12);
			assert.ok(hit !== null);
			assert.equal(hit.type, "angle");
			assert.equal(hit.id, "angle-1");
			assert.equal(hit.handleIndex, 1);
		});

		it("detects hit on angle start and end handles within 12px tolerance", () => {
			const hitStart = hitTestMeasurementHandle({ x: 100 - 6, y: 100 + 8 }, rulers, angles, 12);
			assert.ok(hitStart !== null);
			assert.equal(hitStart.type, "angle");
			assert.equal(hitStart.handleIndex, 0);

			const hitEnd = hitTestMeasurementHandle({ x: 200 - 11, y: 200 - 4 }, rulers, angles, 12);
			assert.ok(hitEnd !== null);
			assert.equal(hitEnd.type, "angle");
			assert.equal(hitEnd.handleIndex, 2);
		});

		it("returns null when pointer is outside 12px hit radius", () => {
			const hit = hitTestMeasurementHandle({ x: 50 + 20, y: 50 + 20 }, rulers, angles, 12);
			assert.equal(hit, null);
		});
	});

	describe("hitTestMeasurementObject (Selection & Fast Delete)", () => {
		const rulers = [
			{
				id: "ruler-101",
				plane: "axial" as const,
				startPx: { x: 50, y: 100 },
				endPx: { x: 250, y: 100 },
				badgePx: { x: 150, y: 100, width: 64, height: 18 },
			},
		];

		const angles = [
			{
				id: "angle-202",
				plane: "axial" as const,
				startPx: { x: 100, y: 50 },
				vertexPx: { x: 100, y: 150 },
				endPx: { x: 200, y: 150 },
			},
		];

		const probes = [
			{
				id: "probe-303",
				plane: "axial" as const,
				posPx: { x: 80, y: 80 },
			},
		];

		it("detects selection click on ruler line body", () => {
			const hit = hitTestMeasurementObject({ x: 120, y: 103 }, rulers, angles, probes, 8);
			assert.ok(hit !== null);
			assert.equal(hit.type, "ruler");
			assert.equal(hit.id, "ruler-101");
			assert.equal(hit.isDeleteButtonHit, false);
		});

		it("detects fast delete click on ruler badge [×] trigger", () => {
			const hit = hitTestMeasurementObject({ x: 150 + 32 - 4, y: 100 }, rulers, angles, probes, 8);
			assert.ok(hit !== null);
			assert.equal(hit.type, "ruler");
			assert.equal(hit.id, "ruler-101");
			assert.equal(hit.isDeleteButtonHit, true);
		});

		it("detects selection click on angle arm", () => {
			const hit = hitTestMeasurementObject({ x: 102, y: 110 }, rulers, angles, probes, 8);
			assert.ok(hit !== null);
			assert.equal(hit.type, "angle");
			assert.equal(hit.id, "angle-202");
			assert.equal(hit.isDeleteButtonHit, false);
		});

		it("detects selection click on probe marker", () => {
			const hit = hitTestMeasurementObject({ x: 82, y: 81 }, rulers, angles, probes, 8);
			assert.ok(hit !== null);
			assert.equal(hit.type, "probe");
			assert.equal(hit.id, "probe-303");
		});
	});

	describe("Canvas Rendering & Cursors", () => {
		it("returns correct cursor for tool and hover states", () => {
			const cursorDefault = getCbctToolCursor("angle", false);
			assert.equal(cursorDefault, "crosshair");

			const cursorGrab = getCbctToolCursor("ruler", false, true);
			assert.equal(cursorGrab, "grab");

			const cursorGrabbing = getCbctToolCursor("pan", true, false);
			assert.equal(cursorGrabbing, "grabbing");
		});

		it("draws ruler with amber halo, 6-8px handles, and fast delete [×] badge without throwing", () => {
			const calls: string[] = [];
			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				closePath: () => calls.push("closePath"),
				moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
				lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: (x: number, y: number, r: number) => calls.push(`arc(${x},${y},${r})`),
				rect: () => calls.push("rect"),
				roundRect: () => calls.push("roundRect"),
				fillText: (text: string) => calls.push(`fillText(${text})`),
				measureText: (text: string) => ({ width: text.length * 7 }),
				setLineDash: () => {},
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctMeasurementRuler(
				mockCtx,
				{ x: 10, y: 10 },
				{ x: 100, y: 10 },
				12.5,
				true,
				0,
			);

			assert.ok(calls.includes("save"));
			assert.ok(calls.includes("restore"));
			assert.ok(calls.some((c) => c.includes("fillText(12.5 мм)")));
			assert.ok(calls.some((c) => c.includes("fillText(×)")));
			assert.ok(calls.some((c) => c.includes("arc(10,10,4.2)")));
		});

		it("draws angle measurement with arc, fill, and degree badge without throwing", () => {
			const calls: string[] = [];
			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				closePath: () => calls.push("closePath"),
				moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
				lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: (x: number, y: number, r: number) => calls.push(`arc(${x},${y},${r})`),
				rect: () => calls.push("rect"),
				roundRect: () => calls.push("roundRect"),
				fillText: (text: string) => calls.push(`fillText(${text})`),
				measureText: (text: string) => ({ width: text.length * 7 }),
				setLineDash: () => {},
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctAngleMeasurement(
				mockCtx,
				{ x: 100, y: 50 },
				{ x: 100, y: 150 },
				{ x: 200, y: 150 },
				90.0,
				true,
				1,
			);

			assert.ok(calls.includes("save"));
			assert.ok(calls.includes("restore"));
			assert.ok(calls.some((c) => c.includes("fillText(90.0°)")));
			assert.ok(calls.some((c) => c.includes("fillText(×)")));
		});

		it("draws probe marker with HU density badge without throwing", () => {
			const calls: string[] = [];
			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				closePath: () => calls.push("closePath"),
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: () => calls.push("arc"),
				roundRect: () => calls.push("roundRect"),
				fillText: (text: string) => calls.push(`fillText(${text})`),
				measureText: (text: string) => ({ width: text.length * 7 }),
				setLineDash: () => {},
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctProbeMarker(mockCtx, { x: 75, y: 75 }, 950, "+950 HU (D2 • Кортикальная кость)", true);
			assert.ok(calls.some((c) => c.includes("+950 HU (D2 • Кортикальная кость)")));
			assert.ok(calls.some((c) => c.includes("fillText(×)")));
		});
	});
});
