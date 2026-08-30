/**
 * DENTE CRM — Unit Tests for CBCT Angle & Caliper Measurement Tools (CAD Mode)
 * Testing: cbctCaliperNerveMath.ts & cbctMprMath.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CRISP_OVERLAY_PAD_BG,
	CRISP_OVERLAY_BORDER_GOLD,
	CRISP_OVERLAY_BORDER_CYAN,
	calculateAngleBetween3Points2D,
	calculateAngleBetween3Points3D,
	drawMeasurementDeleteButton,
	drawCaliperDeleteButton,
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
	hitTestMeasurementHandle,
	hitTestMeasurementObject,
} from "../cbctCaliperNerveMath";
import {
	drawCbctMeasurementRuler,
	drawCbctAngleMeasurement,
	drawCbctProbeMarker,
	formatHuProbe,
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

		it("drawMeasurementDeleteButton renders 11px circular badge with red tint and centered cross (DEF-03 / DEF-18.1)", () => {
			const calls: string[] = [];
			const fills: string[] = [];
			const strokes: string[] = [];
			let arcRadius = 0;

			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				arc: (_x: number, _y: number, r: number) => {
					arcRadius = r;
					calls.push(`arc(r=${r})`);
				},
				fill: () => {
					fills.push(String(mockCtx.fillStyle));
					calls.push("fill");
				},
				stroke: () => {
					strokes.push(String(mockCtx.strokeStyle));
					calls.push("stroke");
				},
				fillText: (text: string, x: number, y: number) => {
					calls.push(`fillText(${text}, x=${x}, y=${y})`);
				},
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
			} as unknown as CanvasRenderingContext2D;

			drawMeasurementDeleteButton(mockCtx, 100, 100, 11);

			// Radius must be 11px (diameter 22px)
			assert.equal(arcRadius, 11, "Radius must be 11px (22px diameter)");
			// Background must be red tint rgba(239, 68, 68, 0.35)
			assert.ok(fills.includes("rgba(239, 68, 68, 0.35)"), "Must use rgba(239, 68, 68, 0.35) fill");
			// Stroke border must be #ef4444
			assert.ok(strokes.includes("#ef4444"), "Must use #ef4444 stroke border");
			// Must draw centered white cross
			assert.ok(calls.some((c) => c.includes("fillText(×")), "Must render centered × glyph");

			// Also verify alias works identically
			assert.equal(typeof drawCaliperDeleteButton, "function");
		});

		it("drawCbctMeasurementRuler with isActive=true renders delete [×] badge with 12px bold font (DEF-03 / DEF-18.1)", () => {
			const calls: string[] = [];
			const fonts: string[] = [];
			let currentFont = "";
			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: () => calls.push("arc"),
				roundRect: () => calls.push("roundRect"),
				rect: () => calls.push("rect"),
				fillText: (text: string) => calls.push(`fillText(${text})`),
				measureText: (text: string) => ({ width: text.length * 8 }),
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				get font() { return currentFont; },
				set font(v: string) { currentFont = v; fonts.push(v); },
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctMeasurementRuler(mockCtx, { x: 10, y: 10 }, { x: 110, y: 10 }, 25.4, true, null, false);
			assert.ok(calls.some((c) => c.includes("25.4 мм")), "Should render distance label");
			assert.ok(calls.some((c) => c.includes("fillText(×)")), "Should render delete [×] button");
			assert.ok(fonts.includes("bold 12px monospace"), "Must use bold 12px monospace for ruler text");
		});

		it("formatHuProbe eliminates duplicate HU strings and formats strictly (DEF-17.1)", () => {
			// 1. Raw HU value
			assert.equal(formatHuProbe(1200), "+1200 HU (Кортикальная кость / Дентин)");
			assert.equal(formatHuProbe(-500), "-500 HU (Воздух / Синус / Дыхательные пути)");
			assert.equal(formatHuProbe(0), "0 HU (Мягкие ткани / Слизистая / Хрящ)");

			// 2. Tissue name supplied as raw string
			assert.equal(formatHuProbe(950, "D2 • Кортикальная кость"), "+950 HU (D2 • Кортикальная кость)");

			// 3. Pre-formatted string should not get duplicated
			assert.equal(formatHuProbe(950, "+950 HU (D2 • Кортикальная кость)"), "+950 HU (D2 • Кортикальная кость)");
			assert.equal(formatHuProbe(950, "950 HU · D2 • Кортикальная кость"), "+950 HU (D2 • Кортикальная кость)");
			assert.equal(formatHuProbe(950, "+950 HU • D2 • Кортикальная кость"), "+950 HU (D2 • Кортикальная кость)");
		});

		it("drawCbctProbeMarker renders label without double HU repetition (DEF-17.1)", () => {
			const calls: string[] = [];
			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: () => calls.push("arc"),
				roundRect: () => calls.push("roundRect"),
				rect: () => calls.push("rect"),
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

			drawCbctProbeMarker(mockCtx, { x: 50, y: 50 }, 950, "D2 • Кортикальная кость", true);
			assert.ok(calls.some((c) => c.includes("+950 HU (D2 • Кортикальная кость)")));
			// Ensure there is NO repetition like "950 HU · +950 HU" or "950 HU • 950 HU"
			assert.ok(!calls.some((c) => /HU.*HU/.test(c)));
		});

		it("hitTestMeasurementObject detects 44x44px touch hitbox for delete button (DEF-R2-06 / DEF-18.1)", () => {
			const mockRulers = [
				{
					id: "r1",
					plane: "axial",
					startPx: { x: 100, y: 100 },
					endPx: { x: 200, y: 100 },
					badgePx: { x: 150, y: 100, width: 80, height: 22 },
				},
			];
			// Delete target is at badgeX + badgeW/2 - 14 = 150 + 40 - 14 = 176, y = 100
			// Hit within 22px radius (44x44 hitbox for medical gloved touch)
			const hitInside22px = hitTestMeasurementObject({ x: 176 + 21, y: 100 - 21 }, mockRulers, []);
			assert.ok(hitInside22px !== null);
			assert.equal(hitInside22px.isDeleteButtonHit, true, "Hit at offset (21, -21) must register as delete button click");

			const hitCenter = hitTestMeasurementObject({ x: 176, y: 100 }, mockRulers, []);
			assert.ok(hitCenter !== null);
			assert.equal(hitCenter.isDeleteButtonHit, true);

			// Click on badge body (left side, e.g. x = 120, y = 100) -> hits badge but not delete button
			const hitBadgeBody = hitTestMeasurementObject({ x: 120, y: 100 }, mockRulers, []);
			assert.ok(hitBadgeBody !== null);
			assert.equal(hitBadgeBody.isDeleteButtonHit, false);

			// Click outside 44x44 hitbox (dx = 24px)
			const hitOutsideHitbox = hitTestMeasurementObject({ x: 176 + 25, y: 100 }, mockRulers, []);
			assert.ok(hitOutsideHitbox === null || !hitOutsideHitbox.isDeleteButtonHit);

			// Click completely outside badge (e.g. x = 230, y = 100)
			const hitOutside = hitTestMeasurementObject({ x: 230, y: 100 }, mockRulers, []);
			assert.ok(hitOutside === null);
		});

		it("drawMandibularNerveBadge renders high-contrast tooltip with bold 12px monospace font and >=6px/3px padding (DEF-R2-03)", () => {
			const calls: string[] = [];
			const fills: string[] = [];
			const strokes: string[] = [];
			const fonts: string[] = [];
			let currentFont = "";
			let currentFill = "";
			let currentStroke = "";
			let currentLineWidth = 0;
			let roundRectW = 0;
			let roundRectH = 0;

			const mockCtx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				roundRect: (_x: number, _y: number, w: number, h: number, _r?: number) => {
					roundRectW = w;
					roundRectH = h;
					calls.push(`roundRect(w=${w}, h=${h})`);
				},
				rect: (_x: number, _y: number, w: number, h: number) => {
					roundRectW = w;
					roundRectH = h;
					calls.push(`rect(w=${w}, h=${h})`);
				},
				fill: () => {
					fills.push(currentFill);
					calls.push("fill");
				},
				stroke: () => {
					strokes.push(currentStroke);
					calls.push("stroke");
				},
				fillText: (text: string, x: number, y: number) => {
					calls.push(`fillText(${text}, x=${x}, y=${y})`);
				},
				measureText: (text: string) => ({ width: text.length * 8 }),
				get fillStyle() { return currentFill; },
				set fillStyle(v: string) { currentFill = v; fills.push(v); },
				get strokeStyle() { return currentStroke; },
				set strokeStyle(v: string) { currentStroke = v; strokes.push(v); },
				get lineWidth() { return currentLineWidth; },
				set lineWidth(v: number) { currentLineWidth = v; },
				get font() { return currentFont; },
				set font(v: string) { currentFont = v; fonts.push(v); },
				textAlign: "",
				textBaseline: "",
			} as unknown as CanvasRenderingContext2D;

			drawMandibularNerveBadge(mockCtx, { x: 200, y: 150 }, 48.5, 2.0);

			// 1. Font must be bold 12px monospace
			assert.ok(fonts.includes("bold 12px monospace"), "Must use bold 12px monospace font");

			// 2. Background fill must be dense slate rgba(15, 23, 42, 0.92)
			assert.ok(fills.includes("rgba(15, 23, 42, 0.92)"), "Must use rgba(15, 23, 42, 0.92) background fill");

			// 3. Border stroke must be #f59e0b with lineWidth 1.0
			assert.ok(strokes.includes("#f59e0b"), "Must use #f59e0b border stroke");
			assert.equal(currentLineWidth, 1.0, "Border lineWidth must be 1.0px");

			// 4. Text must include channel length and buffer
			assert.ok(
				calls.some((c) => c.includes("Канал IAN (3D 48.5 мм · 2.0 мм буфер)")),
				"Must render correct IAN canal text",
			);

			// 5. Padding verification:
			// Text width for "Канал IAN (3D 48.5 мм · 2.0 мм буфер)" is 37 chars * 8 = 296px
			// badgeW must be textWidth + 2*padX = 296 + 16 = 312px (padX = 8px >= 6px)
			// badgeH must be 22px (padY = 5px >= 3px)
			assert.ok(roundRectW >= 296 + 12, `Horizontal padding must be >= 6px per side: width=${roundRectW}`);
			assert.ok(roundRectH >= 12 + 6, `Vertical padding must be >= 3px per side: height=${roundRectH}`);

			// 6. Verify drawNerveCanalBadge alias
			assert.equal(typeof drawNerveCanalBadge, "function");
		});

		it("drawCbctMeasurementRuler ensures 6px gap between length text and [×] delete button (DEF-R2-06)", () => {
			let textRenderedX = 0;
			let btnRenderedX = 0;
			let badgeWidth = 0;
			let midX = 100;

			const mockCtx = {
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				stroke: () => {},
				fill: () => {},
				arc: (x: number, _y: number, _r: number) => {
					btnRenderedX = x;
				},
				roundRect: (_x: number, _y: number, w: number, _h: number) => {
					badgeWidth = w;
				},
				rect: (_x: number, _y: number, w: number, _h: number) => {
					badgeWidth = w;
				},
				fillText: (text: string, x: number, _y: number) => {
					if (text.includes("мм")) {
						textRenderedX = x;
					}
				},
				measureText: (text: string) => ({ width: text.length * 8 }),
				strokeStyle: "",
				fillStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			// Draw active ruler with length "115.7 мм" (8 chars * 8 = 64px)
			drawCbctMeasurementRuler(mockCtx, { x: 50, y: 50 }, { x: 150, y: 50 }, 115.7, true, null, false);

			const textLengthPx = "115.7 мм".length * 8; // 64px
			const textRightEdge = textRenderedX + textLengthPx;
			const btnLeftEdge = btnRenderedX - 11; // 11px radius
			const gapPx = btnLeftEdge - textRightEdge;

			assert.equal(gapPx, 6, `Gap between text right edge and delete button must be exactly 6px (actual: ${gapPx}px)`);
		});
	});

	describe("Squad 5: Crisp Overlays & High-Contrast Typography Suite (WCAG AAA)", () => {
		it("ensures CRISP_OVERLAY_PAD_BG is rgba(15, 23, 42, 0.92) with gold and cyan borders", () => {
			assert.equal(CRISP_OVERLAY_PAD_BG, "rgba(15, 23, 42, 0.92)");
			assert.equal(CRISP_OVERLAY_BORDER_GOLD, "#f59e0b");
			assert.equal(CRISP_OVERLAY_BORDER_CYAN, "#06b6d4");
		});

		it("drawMandibularNerveBadge uses CRISP_OVERLAY_PAD_BG underlay pad and 1px gold border", () => {
			const fills: string[] = [];
			const strokes: string[] = [];
			const lineThicknesses: number[] = [];
			const mockCtx = {
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				roundRect: () => {},
				rect: () => {},
				fill: () => fills.push(String(mockCtx.fillStyle)),
				stroke: () => {
					strokes.push(String(mockCtx.strokeStyle));
					lineThicknesses.push(mockCtx.lineWidth);
				},
				fillText: () => {},
				measureText: (text: string) => ({ width: text.length * 8 }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
			} as unknown as CanvasRenderingContext2D;

			drawMandibularNerveBadge(mockCtx, { x: 100, y: 100 }, 42.5, 2.0);

			assert.ok(fills.includes(CRISP_OVERLAY_PAD_BG), "Nerve badge must use rgba(15, 23, 42, 0.92) underlay pad");
			assert.ok(strokes.includes(CRISP_OVERLAY_BORDER_GOLD), "Nerve badge must use #f59e0b gold border");
			assert.ok(lineThicknesses.includes(1.0), "Nerve badge border width must be 1.0px");
		});

		it("drawCbctMeasurementRuler uses CRISP_OVERLAY_PAD_BG underlay pad with 1px border", () => {
			const fills: string[] = [];
			const strokes: string[] = [];
			const lineThicknesses: number[] = [];
			const mockCtx = {
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				roundRect: () => {},
				rect: () => {},
				fill: () => fills.push(String(mockCtx.fillStyle)),
				stroke: () => {
					strokes.push(String(mockCtx.strokeStyle));
					lineThicknesses.push(mockCtx.lineWidth);
				},
				fillText: () => {},
				measureText: (text: string) => ({ width: text.length * 8 }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctMeasurementRuler(mockCtx, { x: 10, y: 10 }, { x: 110, y: 10 }, 15.0, false, null, false);

			assert.ok(fills.includes(CRISP_OVERLAY_PAD_BG), "Measurement ruler badge must use rgba(15, 23, 42, 0.92) underlay pad");
			assert.ok(strokes.includes(CRISP_OVERLAY_BORDER_CYAN), "Measurement ruler badge must use cyan border in non-active mode");
			assert.ok(lineThicknesses.includes(1.0), "Ruler badge border width must be 1.0px");
		});

		it("drawCbctAngleMeasurement uses CRISP_OVERLAY_PAD_BG underlay pad with 1px border", () => {
			const fills: string[] = [];
			const strokes: string[] = [];
			const lineThicknesses: number[] = [];
			const mockCtx = {
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				closePath: () => {},
				roundRect: () => {},
				rect: () => {},
				fill: () => fills.push(String(mockCtx.fillStyle)),
				stroke: () => {
					strokes.push(String(mockCtx.strokeStyle));
					lineThicknesses.push(mockCtx.lineWidth);
				},
				fillText: () => {},
				measureText: (text: string) => ({ width: text.length * 8 }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctAngleMeasurement(mockCtx, { x: 50, y: 20 }, { x: 50, y: 80 }, { x: 120, y: 80 }, 90.0, false, null);

			assert.ok(fills.includes(CRISP_OVERLAY_PAD_BG), "Angle badge must use rgba(15, 23, 42, 0.92) underlay pad");
			assert.ok(strokes.includes(CRISP_OVERLAY_BORDER_CYAN), "Angle badge must use cyan border in non-active mode");
			assert.ok(lineThicknesses.includes(1.0), "Angle badge border width must be 1.0px");
		});

		it("drawCbctProbeMarker uses CRISP_OVERLAY_PAD_BG underlay pad with 1px border", () => {
			const fills: string[] = [];
			const strokes: string[] = [];
			const lineThicknesses: number[] = [];
			const mockCtx = {
				save: () => {},
				restore: () => {},
				beginPath: () => {},
				moveTo: () => {},
				lineTo: () => {},
				arc: () => {},
				roundRect: () => {},
				rect: () => {},
				fill: () => fills.push(String(mockCtx.fillStyle)),
				stroke: () => {
					strokes.push(String(mockCtx.strokeStyle));
					lineThicknesses.push(mockCtx.lineWidth);
				},
				fillText: () => {},
				measureText: (text: string) => ({ width: text.length * 8 }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
				shadowColor: "",
				shadowBlur: 0,
			} as unknown as CanvasRenderingContext2D;

			drawCbctProbeMarker(mockCtx, { x: 50, y: 50 }, 1250, "Кортикальная кость", false);

			assert.ok(fills.includes(CRISP_OVERLAY_PAD_BG), "Probe marker badge must use rgba(15, 23, 42, 0.92) underlay pad");
			assert.ok(strokes.includes("#38bdf8"), "Probe marker badge must use sky border in non-active mode");
			assert.ok(lineThicknesses.includes(1.0), "Probe marker badge border width must be 1.0px");
		});
	});
});
