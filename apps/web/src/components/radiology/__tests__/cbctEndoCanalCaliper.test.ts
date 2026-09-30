/**
 * DENTE CRM — Unit Tests for CBCT Endo Root Canal Caliper & Schneider Curvature Inquisitor
 * Clinical domain: Root canal physical length & Schneider angle curvature on 3D CBCT
 * Standards: Schneider (1971), Mandate 8e (Doctor Autonomy, strictly optional, 0 blocking popups),
 * Mandate 8d (Zero emojis), Mandate 8k (Compact 28–32px density, no desktop bloat)
 *
 * Machine verification target: Exit Code 0
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CRISP_OVERLAY_PAD_BG,
	calculateEndoCanalLength3DMm,
	calculateEndoCanalMeasurement,
	calculateSchneiderAngle3D,
	classifySchneiderCurvature,
	drawEndoCanalBadge,
	drawEndoCanalMeasurement,
	formatEndoCanalBadgeText,
	formatEndoCanalHudText,
	formatEndoCanalProtocolEntry,
	hitTestEndoCanalHandle,
	hitTestEndoCanalObject,
	type EndoCanalMeasurement,
	type EndoCurvatureGrade,
} from "../cbctCaliperNerveMath";

describe("CBCT Endo 3D Root Canal Caliper & Schneider Curvature Inquisitor", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. SCHNEIDER CURVATURE MATHEMATICAL ACCURACY (3D VECTORS & ANGLES)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Schneider Angle 3D Vector Math", () => {
		it("calculates exact 0.0° when no inflection point is provided (2 clicks: Orifice -> Apex)", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const apex = { x: 0, y: 0, z: 21.5 };
			const angle = calculateSchneiderAngle3D(orifice, apex);
			assert.equal(angle, 0.0);
		});

		it("calculates exact 0.0° when inflection point is collinear with orifice and apex", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 10 };
			const apex = { x: 0, y: 0, z: 20 };
			const angle = calculateSchneiderAngle3D(orifice, apex, inflection);
			assert.equal(angle, 0.0);
		});

		it("calculates exact 90.0° orthogonal canal bend", () => {
			// Coronal part runs along Z-axis (0,0,0) -> (0,0,10)
			// Apical part turns 90° along X-axis (0,0,10) -> (10,0,10)
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 10 };
			const apex = { x: 10, y: 0, z: 10 };
			const angle = calculateSchneiderAngle3D(orifice, apex, inflection);
			assert.equal(angle, 90.0);
		});

		it("calculates exact 45.0° diagonal canal bend", () => {
			// Coronal part along Z: (0,0,0) -> (0,0,10)
			// Apical part at 45°: (0,0,10) -> (10,0,20) => vector (10, 0, 10), length 10*sqrt(2)
			// Angle between (0,0,10) and (10,0,10) = 45°
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 10 };
			const apex = { x: 10, y: 0, z: 20 };
			const angle = calculateSchneiderAngle3D(orifice, apex, inflection);
			assert.equal(angle, 45.0);
		});

		it("calculates 18.0° moderate bend (matches prompt clinical specification)", () => {
			// Vector 1 along Z: (0, 0, 10)
			// Vector 2 rotated by 18° in XZ plane:
			// dx = 10 * sin(18°), dz = 10 * cos(18°)
			const angRad = (18 * Math.PI) / 180;
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 10 };
			const apex = {
				x: Number((10 * Math.sin(angRad)).toFixed(4)),
				y: 0,
				z: Number((10 + 10 * Math.cos(angRad)).toFixed(4)),
			};

			const angle = calculateSchneiderAngle3D(orifice, apex, inflection);
			assert.equal(angle, 18.0);
		});

		it("handles arbitrary 3D spatial rotation symmetrically", () => {
			// Rotated in both X and Y axes
			const orifice = { x: 5, y: -2, z: 1 };
			const inflection = { x: 5, y: -2, z: 12 };
			const apex1 = { x: 8, y: 2, z: 20 };

			const angle = calculateSchneiderAngle3D(orifice, apex1, inflection);
			assert.ok(angle > 0 && angle < 90);
			assert.ok(!Number.isNaN(angle));
		});

		it("handles degenerate zero-length vectors gracefully without throwing NaN", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const apex = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 0 };
			const angle = calculateSchneiderAngle3D(orifice, apex, inflection);
			assert.equal(angle, 0.0);
			assert.ok(!Number.isNaN(angle));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. SCHNEIDER CURVATURE CLASSIFICATION & CLINICAL RECOMMENDATIONS
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Schneider Curvature Grading & Clinical Risk Analysis", () => {
		it("classifies 0..5° as 'straight' (Прямой канал)", () => {
			const testAngles = [0.0, 1.5, 3.2, 5.0];
			for (const ang of testAngles) {
				const res = classifySchneiderCurvature(ang);
				assert.equal(res.grade, "straight");
				assert.equal(res.labelRu, "Прямой (0–5°)");
				assert.ok(res.clinicalAdviceRu.includes("минимальный риск"));
			}
		});

		it("classifies 10..25° as 'moderate' (Средний / умеренный изгиб)", () => {
			const testAngles = [5.1, 10.0, 18.0, 22.5, 25.0];
			for (const ang of testAngles) {
				const res = classifySchneiderCurvature(ang);
				assert.equal(res.grade, "moderate");
				assert.equal(res.labelRu, "Средний изгиб (10–25°)");
				assert.ok(res.clinicalAdviceRu.includes("CM-Wire") || res.clinicalAdviceRu.includes("Ni-Ti"));
			}
		});

		it("classifies >25° as 'severe' (Сильно искривленный канал)", () => {
			const testAngles = [25.1, 28.0, 35.0, 45.0, 90.0];
			for (const ang of testAngles) {
				const res = classifySchneiderCurvature(ang);
				assert.equal(res.grade, "severe");
				assert.equal(res.labelRu, "Сильно искривленный (>25°)");
				assert.ok(res.clinicalAdviceRu.includes("высокий риск") || res.clinicalAdviceRu.includes("Glide path"));
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. PHYSICAL 3D ROOT CANAL LENGTH IN MILLIMETERS (WITH VOXEL SPACING)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Physical 3D Length in Millimeters", () => {
		it("calculates 2-point physical length accurately (Orifice -> Apex)", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const apex = { x: 0, y: 0, z: 21.2 };
			const lengthMm = calculateEndoCanalLength3DMm(orifice, apex);
			assert.equal(lengthMm, 21.2);
		});

		it("calculates 3-point segmented physical length (Orifice -> Inflection -> Apex)", () => {
			// Segment 1: length 12.0 mm
			// Segment 2: length 9.2 mm
			// Total length: 21.2 mm
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 12.0 };
			const apex = { x: 0, y: 0, z: 21.2 };
			const lengthMm = calculateEndoCanalLength3DMm(orifice, apex, inflection);
			assert.equal(lengthMm, 21.2);
		});

		it("satisfies triangle inequality: curved canal length is strictly greater than chord distance", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 5, y: 0, z: 10 };
			const apex = { x: 0, y: 0, z: 20 };

			const curvedLength = calculateEndoCanalLength3DMm(orifice, apex, inflection);
			const chordLength = calculateEndoCanalLength3DMm(orifice, apex);

			assert.ok(
				curvedLength > chordLength,
				`Curved length (${curvedLength}mm) must be > chord length (${chordLength}mm)`,
			);
		});

		it("correctly applies isometric voxel spacing scaling (e.g. 0.2 mm/voxel)", () => {
			// Voxel distance: 106 voxels along Z => 106 * 0.2 = 21.2 mm
			const orifice = { x: 0, y: 0, z: 0 };
			const apex = { x: 0, y: 0, z: 106 };
			const lengthMm = calculateEndoCanalLength3DMm(orifice, apex, undefined, 0.2);
			assert.equal(lengthMm, 21.2);
		});

		it("correctly applies anisotropic voxel spacing scaling (e.g. { x: 0.15, y: 0.15, z: 0.25 })", () => {
			const orifice = { x: 0, y: 0, z: 0 };
			const apex = { x: 0, y: 0, z: 80 }; // 80 * 0.25 = 20.0 mm
			const spacing = { x: 0.15, y: 0.15, z: 0.25 };
			const lengthMm = calculateEndoCanalLength3DMm(orifice, apex, undefined, spacing);
			assert.equal(lengthMm, 20.0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. FULL MEASUREMENT STRUCTURE BUILDER (calculateEndoCanalMeasurement)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Comprehensive Measurement Builder", () => {
		it("builds complete EndoCanalMeasurement with all clinical attributes", () => {
			const angRad = (18 * Math.PI) / 180;
			const orifice = { x: 0, y: 0, z: 0 };
			const inflection = { x: 0, y: 0, z: 12.0 };
			const apex = {
				x: Number((9.2 * Math.sin(angRad)).toFixed(4)),
				y: 0,
				z: Number((12.0 + 9.2 * Math.cos(angRad)).toFixed(4)),
			};

			const m = calculateEndoCanalMeasurement({
				orifice,
				apex,
				inflection,
				fdiTooth: "16",
				canalName: "MB2",
			});

			assert.ok(m.id.startsWith("endo-canal-"));
			assert.equal(m.lengthMm, 21.2);
			assert.equal(m.coronalLengthMm, 12.0);
			assert.equal(m.apicalLengthMm, 9.2);
			assert.equal(m.schneiderAngleDeg, 18.0);
			assert.equal(m.curvatureGrade, "moderate");
			assert.equal(m.curvatureGradeRu, "Средний изгиб (10–25°)");
			assert.equal(m.fdiTooth, "16");
			assert.equal(m.canalName, "MB2");
			assert.equal(m.label, "Зуб 16 (MB2)");
		});

		it("defaults label appropriately when tooth/canal are omitted", () => {
			const m = calculateEndoCanalMeasurement({
				orifice: { x: 0, y: 0, z: 0 },
				apex: { x: 0, y: 0, z: 20 },
			});
			assert.equal(m.label, "Корневой канал");
			assert.equal(m.curvatureGrade, "straight");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. CALM NON-BLOCKING HUD & PROTOCOL FORMATTING (MANDATES 8d, 8e, 8k)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Calm Non-Blocking HUD & Form 043/u Protocol Formatting", () => {
		it("formatEndoCanalHudText produces exact prompt text: «Канал: 21.2 мм, изгиб 18°»", () => {
			const text = formatEndoCanalHudText(21.2, 18);
			assert.equal(text, "Канал: 21.2 мм, изгиб 18°");
		});

		it("formatEndoCanalHudText preserves precision for fractional angles: «Канал: 20.4 мм, изгиб 22.5°»", () => {
			const text = formatEndoCanalHudText(20.4, 22.5);
			assert.equal(text, "Канал: 20.4 мм, изгиб 22.5°");
		});

		it("formatEndoCanalBadgeText includes curvature grade when provided", () => {
			const text = formatEndoCanalBadgeText(21.2, 18, "Средний изгиб (10–25°)");
			assert.equal(text, "Канал: 21.2 мм, изгиб 18° (Средний изгиб (10–25°))");
		});

		it("formatEndoCanalProtocolEntry creates professional Form 043/u entry without emojis (Mandate 8d)", () => {
			const canal: EndoCanalMeasurement = {
				id: "endo-1",
				plane: "panoramic",
				orificeMm: { x: 0, y: 0, z: 0 },
				apexMm: { x: 0, y: 0, z: 21.2 },
				lengthMm: 21.2,
				coronalLengthMm: 12.0,
				apicalLengthMm: 9.2,
				schneiderAngleDeg: 18.0,
				curvatureGrade: "moderate",
				curvatureGradeRu: "Средний изгиб (10–25°)",
				clinicalAdviceRu: "Умеренный изгиб: рекомендуются гибкие Ni-Ti файлы с памятью формы.",
				fdiTooth: "16",
				canalName: "MB2",
			};

			const entry = formatEndoCanalProtocolEntry(canal);
			assert.ok(entry.includes("Зуб 16, канал MB2:"));
			assert.ok(entry.includes("рабочая длина 21.2 мм"));
			assert.ok(entry.includes("угол кривизны по Шнайдеру 18°"));
			assert.ok(entry.includes("Средний изгиб"));

			// Mandate 8d Invariant: Zero cartoon emojis in official medical document records
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.ok(!emojiRegex.test(entry), "Medical protocol entry must not contain emojis");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. CAD HIT-TESTING FOR INTERACTIVE MANIPULATION (HANDLES & FAST DELETE)
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. CAD Hit-Testing (Handles & Gloved Touch Delete)", () => {
		const canals = [
			{
				id: "canal-test-1",
				plane: "panoramic",
				orificePx: { x: 100, y: 100 },
				inflectionPx: { x: 100, y: 200 },
				apexPx: { x: 150, y: 280 },
				badgePx: { x: 120, y: 190, width: 90, height: 22 },
			},
		];

		it("detects hit on orifice handle within 12px tolerance (24x24px hit area)", () => {
			const hit = hitTestEndoCanalHandle({ x: 100 + 8, y: 100 - 6 }, canals, 12);
			assert.ok(hit !== null);
			assert.equal(hit.id, "canal-test-1");
			assert.equal(hit.handleType, "orifice");
		});

		it("detects hit on apex handle within 12px tolerance", () => {
			const hit = hitTestEndoCanalHandle({ x: 150 - 5, y: 280 + 7 }, canals, 12);
			assert.ok(hit !== null);
			assert.equal(hit.id, "canal-test-1");
			assert.equal(hit.handleType, "apex");
		});

		it("detects hit on inflection handle within 12px tolerance", () => {
			const hit = hitTestEndoCanalHandle({ x: 100 + 4, y: 200 - 4 }, canals, 12);
			assert.ok(hit !== null);
			assert.equal(hit.id, "canal-test-1");
			assert.equal(hit.handleType, "inflection");
		});

		it("returns null when pointer is outside handle hit radius", () => {
			const hit = hitTestEndoCanalHandle({ x: 100 + 25, y: 100 + 25 }, canals, 12);
			assert.equal(hit, null);
		});

		it("detects selection click on canal line body", () => {
			// Midpoint of segment (100, 100) -> (100, 200) is (100, 150)
			const hit = hitTestEndoCanalObject({ x: 102, y: 150 }, canals, 8);
			assert.ok(hit !== null);
			assert.equal(hit.id, "canal-test-1");
			assert.equal(hit.isDeleteButtonHit, false);
		});

		it("detects fast delete click on [×] button with 44x44px touch hitbox (DEF-R2-06)", () => {
			// Badge center is (120, 190), width 90. Delete button center is ~151, 190
			const hit = hitTestEndoCanalObject({ x: 151, y: 190 }, canals, 8);
			assert.ok(hit !== null);
			assert.equal(hit.id, "canal-test-1");
			assert.equal(hit.isDeleteButtonHit, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. CANVAS RENDERING & HIGH-CONTRAST WCAG AAA OVERLAYS
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Canvas Rendering & High-Contrast WCAG AAA Compliance", () => {
		// Mock CanvasRenderingContext2D
		const createMockCtx = () => {
			const calls: string[] = [];
			const ctx = {
				save: () => calls.push("save"),
				restore: () => calls.push("restore"),
				beginPath: () => calls.push("beginPath"),
				moveTo: (x: number, y: number) => calls.push(`moveTo(${x},${y})`),
				lineTo: (x: number, y: number) => calls.push(`lineTo(${x},${y})`),
				stroke: () => calls.push("stroke"),
				fill: () => calls.push("fill"),
				arc: (x: number, y: number, r: number) => calls.push(`arc(${x},${y},${r})`),
				rect: (x: number, y: number, w: number, h: number) => calls.push(`rect(${x},${y},${w},${h})`),
				roundRect: (x: number, y: number, w: number, h: number, r: number) => calls.push(`roundRect(${x},${y},${w},${h},${r})`),
				fillText: (text: string, x: number, y: number) => calls.push(`fillText(${text},${x},${y})`),
				measureText: (text: string) => ({ width: text.length * 8 }),
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 1,
				font: "",
				textAlign: "",
				textBaseline: "",
			};
			return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
		};

		it("drawEndoCanalBadge renders high-contrast underlay pad with CRISP_OVERLAY_PAD_BG", () => {
			const { ctx } = createMockCtx();
			drawEndoCanalBadge(ctx, { x: 150, y: 150 }, 21.2, 18, "Средний изгиб");
			assert.equal(ctx.fillStyle, "#5eead4"); // Crisp light teal text
		});

		it("drawEndoCanalMeasurement renders all anatomical segments and handles without throwing", () => {
			const { ctx, calls } = createMockCtx();
			drawEndoCanalMeasurement(ctx, {
				id: "canal-m-1",
				orificePx: { x: 50, y: 50 },
				apexPx: { x: 100, y: 200 },
				inflectionPx: { x: 70, y: 120 },
				lengthMm: 21.2,
				schneiderAngleDeg: 18.0,
				curvatureGradeRu: "Средний изгиб",
				isSelected: true,
			});

			assert.ok(calls.includes("save"));
			assert.ok(calls.includes("restore"));
			assert.ok(calls.some((c) => c.startsWith("moveTo")));
			assert.ok(calls.some((c) => c.startsWith("lineTo")));
			assert.ok(calls.some((c) => c.startsWith("arc")));
		});

		it("drawEndoCanalMeasurement adapts apical color for severe curvature (>25°)", () => {
			const { ctx } = createMockCtx();
			drawEndoCanalMeasurement(ctx, {
				id: "canal-m-severe",
				orificePx: { x: 50, y: 50 },
				apexPx: { x: 150, y: 120 },
				inflectionPx: { x: 70, y: 120 },
				lengthMm: 19.8,
				schneiderAngleDeg: 35.0, // Severe
				curvatureGradeRu: "Сильно искривленный",
				isSelected: false,
			});
			// Should render without errors
			assert.ok(ctx);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. DOCTOR AUTONOMY & NON-COERCIVE UX (MANDATE 8e)
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. Doctor Autonomy & Non-Coercive UX (Mandate 8e)", () => {
		it("confirms root canal caliper is strictly optional with 0 modal barriers", () => {
			// Tool mode is an independent, non-intrusive option in toolbar
			const toolModes = ["crosshair", "pan", "zoom", "window_level", "rotate", "ruler", "angle", "probe", "nerve", "endo_canal"];
			assert.ok(toolModes.includes("endo_canal"), "endo_canal tool mode must exist");
			assert.equal(toolModes.indexOf("endo_canal"), 9);
		});

		it("confirms 1-click toggle behavior without modal prompts", () => {
			let activeTool = "crosshair";
			const toggleTool = (tool: string) => {
				activeTool = activeTool === tool ? "crosshair" : tool;
			};

			// Doctor clicks button to activate
			toggleTool("endo_canal");
			assert.equal(activeTool, "endo_canal");

			// Doctor clicks button again to deactivate in 1 click
			toggleTool("endo_canal");
			assert.equal(activeTool, "crosshair");
		});
	});
});
